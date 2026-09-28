import { env } from "cloudflare:workers";
import {
  requirePortalMember,
  type PortalMember,
  type PortalRole,
} from "@/lib/portal/auth";

export const PORTAL_CAPABILITY_OPTIONS = [
  "portal.admin",
  "teams.read_all",
  "teams.manage",
  "roles.manage",
  "control.projects",
  "control.vehicles",
  "project.map.edit",
  "vault.approve",
  "ops.read_all",
  "team.manage",
  "team.project.manage",
  "team.vehicle.manage",
] as const;

export type PortalCapability = typeof PORTAL_CAPABILITY_OPTIONS[number];

export type PortalTeamRole =
  | "owner"
  | "captain"
  | "lead"
  | "engineer"
  | "contributor"
  | "observer";

const GLOBAL_ROLE_CAPABILITIES: Record<PortalRole, PortalCapability[]> = {
  admin: [
    "portal.admin",
    "teams.read_all",
    "teams.manage",
    "roles.manage",
    "control.projects",
    "control.vehicles",
    "project.map.edit",
    "vault.approve",
    "ops.read_all",
  ],
  lead: [
    "control.projects",
    "control.vehicles",
    "project.map.edit",
    "vault.approve",
  ],
  member: [],
  alumni: [],
  viewer: [],
};

const TEAM_ROLE_CAPABILITIES: Record<PortalTeamRole, PortalCapability[]> = {
  owner: ["team.manage","team.project.manage","team.vehicle.manage"],
  captain: ["team.project.manage","team.vehicle.manage"],
  lead: ["team.project.manage"],
  engineer: [],
  contributor: [],
  observer: [],
};

function db() {
  if (!env.DB) throw new Error("DB bağlantısı kullanılamıyor.");
  return env.DB;
}

function normalizeCode(value: string) {
  return value.trim().toUpperCase();
}

export function portalGlobalRoleCapabilities(role: PortalRole) {
  return GLOBAL_ROLE_CAPABILITIES[role] ?? [];
}

export function portalTeamRoleCapabilities(role: string) {
  return TEAM_ROLE_CAPABILITIES[role as PortalTeamRole] ?? [];
}

function safeCapabilities(value: unknown) {
  try {
    const parsed = JSON.parse(String(value || "[]"));
    if (!Array.isArray(parsed)) return [];
    const allowed = new Set<string>(PORTAL_CAPABILITY_OPTIONS);
    return parsed
      .map((item) => String(item))
      .filter((item): item is PortalCapability => allowed.has(item));
  } catch {
    return [];
  }
}

export async function portalRoleProfileCapabilities(roleKey: string) {
  try {
    const row = await db().prepare(
      "SELECT capabilities_json FROM portal_role_profiles WHERE role_key=? LIMIT 1"
    ).bind(roleKey).first<{ capabilities_json: string }>();
    if (row) return safeCapabilities(row.capabilities_json);
  } catch {
    // V6 bootstrap fallback below.
  }

  if (roleKey.startsWith("team_")) {
    return portalTeamRoleCapabilities(roleKey.slice(5));
  }
  return portalGlobalRoleCapabilities(roleKey as PortalRole);
}

function teamRoleProfileKey(role: string) {
  if (role === "owner") return "team_owner";
  if (role === "captain") return "team_captain";
  if (role === "lead") return "team_lead";
  return role;
}

export async function listPortalMemberCapabilities(memberId: string) {
  try {
    const result = await db().prepare(
      "SELECT capability FROM portal_member_capabilities WHERE member_id=? ORDER BY capability"
    ).bind(memberId).all<{ capability: string }>();
    return (result.results ?? []).map((row) => String(row.capability));
  } catch {
    return [];
  }
}

export async function listPortalMemberTeamMemberships(memberId: string) {
  try {
    const result = await db().prepare(
      "SELECT tm.team_code,tm.team_role,tm.status,tm.capabilities_json,t.name,t.domain,t.visibility " +
      "FROM portal_team_memberships tm JOIN portal_teams t ON t.code=tm.team_code " +
      "WHERE tm.member_id=? AND tm.status='active' ORDER BY t.name"
    ).bind(memberId).all<Record<string, unknown>>();
    return result.results ?? [];
  } catch {
    return [];
  }
}

export async function portalMemberCapabilitySet(member: PortalMember) {
  const [roleCapabilities,explicit] = await Promise.all([
    portalRoleProfileCapabilities(member.role),
    listPortalMemberCapabilities(member.id),
  ]);
  const capabilities = new Set<string>([
    ...roleCapabilities,
    ...explicit,
  ]);
  // An administrator record must never be able to remove its own emergency
  // administration boundary by editing the role profile.
  if (member.role === "admin") capabilities.add("portal.admin");
  return capabilities;
}

export async function memberHasPortalCapability(
  member: PortalMember,
  capability: PortalCapability
) {
  const set = await portalMemberCapabilitySet(member);
  return set.has("portal.admin") || set.has(capability);
}

export async function requirePortalCapability(capability: PortalCapability) {
  const member = await requirePortalMember();
  if (!(await memberHasPortalCapability(member, capability))) {
    throw new Error("Bu kontrol-plane işlemi için yetkin yok.");
  }
  return member;
}

export async function portalTeamMembershipFor(member: PortalMember, teamCode: string) {
  const code = normalizeCode(teamCode);
  try {
    const row = await db().prepare(
      "SELECT tm.*,t.name,t.domain,t.description,t.visibility,t.status AS team_status " +
      "FROM portal_team_memberships tm JOIN portal_teams t ON t.code=tm.team_code " +
      "WHERE tm.member_id=? AND tm.team_code=? AND tm.status='active' LIMIT 1"
    ).bind(member.id,code).first<Record<string, unknown>>();
    if (row) return row;
  } catch {
    // V6 may not be applied yet. Fall back to legacy teams_json below.
  }

  if (member.teams.some((item) => normalizeCode(item) === code)) {
    return {
      team_code: code,
      team_role: member.role === "lead" ? "lead" : "engineer",
      status: "active",
      capabilities_json: "[]",
      legacy: 1,
    };
  }
  return null;
}

export async function canAccessPortalTeam(member: PortalMember, teamCode: string) {
  const code = normalizeCode(teamCode);
  if (member.role === "admin") return true;
  if (await memberHasPortalCapability(member,"teams.read_all")) return true;
  if (await portalTeamMembershipFor(member,code)) return true;

  try {
    const team = await db().prepare(
      "SELECT visibility,status FROM portal_teams WHERE code=? LIMIT 1"
    ).bind(code).first<{ visibility: string; status: string }>();
    return team?.status === "active" && team.visibility === "members";
  } catch {
    return false;
  }
}

export async function canManagePortalTeam(member: PortalMember, teamCode: string) {
  if (member.role === "admin") return true;
  if (await memberHasPortalCapability(member,"teams.manage")) return true;

  const membership = await portalTeamMembershipFor(member,teamCode);
  if (!membership) return false;
  const role = String(membership.team_role || "observer");
  const roleCapabilities = await portalRoleProfileCapabilities(teamRoleProfileKey(role));
  if (roleCapabilities.includes("team.manage")) return true;

  try {
    const explicit = JSON.parse(String(membership.capabilities_json || "[]"));
    return Array.isArray(explicit) && explicit.includes("team.manage");
  } catch {
    return false;
  }
}

export async function canManageTeamProjects(member: PortalMember, teamCode: string) {
  if (await memberHasPortalCapability(member,"control.projects")) return true;
  const membership = await portalTeamMembershipFor(member,teamCode);
  if (!membership) return false;
  const role = String(membership.team_role || "observer");
  if ((await portalRoleProfileCapabilities(teamRoleProfileKey(role))).includes("team.project.manage")) return true;
  try {
    const explicit = JSON.parse(String(membership.capabilities_json || "[]"));
    return Array.isArray(explicit) && explicit.includes("team.project.manage");
  } catch {
    return false;
  }
}

export async function canManageTeamVehicles(member: PortalMember, teamCode: string) {
  if (await memberHasPortalCapability(member,"control.vehicles")) return true;
  const membership = await portalTeamMembershipFor(member,teamCode);
  if (!membership) return false;
  const role = String(membership.team_role || "observer");
  if ((await portalRoleProfileCapabilities(teamRoleProfileKey(role))).includes("team.vehicle.manage")) return true;
  try {
    const explicit = JSON.parse(String(membership.capabilities_json || "[]"));
    return Array.isArray(explicit) && explicit.includes("team.vehicle.manage");
  } catch {
    return false;
  }
}

export function portalRoleLabelDetailed(role: string) {
  const labels: Record<string,string> = {
    admin: "Portal Yöneticisi",
    lead: "Program / Takım Lideri",
    member: "Mühendis / Üye",
    alumni: "Mezun",
    viewer: "Görüntüleyici",
    owner: "Takım Sahibi",
    captain: "Kaptan",
    engineer: "Mühendis",
    contributor: "Katkıcı",
    observer: "Gözlemci",
  };
  return labels[role] || role;
}
