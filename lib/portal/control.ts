import { env } from "cloudflare:workers";
import type { PortalMember } from "@/lib/portal/auth";
import { canAccessPortalTeam } from "@/lib/portal/governance";

function db() {
  if (!env.DB) throw new Error("DB bağlantısı kullanılamıyor.");
  return env.DB;
}

function code(value: string) {
  return value.trim().toUpperCase();
}

function slug(value: string) {
  return value.trim().toLowerCase()
    .replace(/[^a-z0-9ğüşöçı-]+/gi,"-")
    .replace(/^-+|-+$/g,"");
}

export async function listPortalTeams() {
  try {
    const response = await db().prepare(
      "SELECT t.*," +
      "(SELECT COUNT(*) FROM portal_team_memberships tm WHERE tm.team_code=t.code AND tm.status='active') AS member_count," +
      "(SELECT COUNT(*) FROM portal_project_registry p WHERE p.team_code=t.code AND p.status!='archived') AS project_count," +
      "(SELECT COUNT(*) FROM portal_vehicle_profiles vp WHERE vp.team_code=t.code AND vp.lifecycle!='retired') AS vehicle_count " +
      "FROM portal_teams t WHERE t.status='active' ORDER BY t.name"
    ).all<Record<string, unknown>>();
    return response.results ?? [];
  } catch {
    return [];
  }
}

export async function listAccessiblePortalTeams(member: PortalMember) {
  const teams = await listPortalTeams();
  const allowed: Record<string, unknown>[] = [];
  for (const team of teams) {
    if (await canAccessPortalTeam(member,String(team.code))) allowed.push(team);
  }
  return allowed;
}

export async function getPortalTeam(codeValue: string) {
  try {
    return await db().prepare(
      "SELECT * FROM portal_teams WHERE code=? AND status='active' LIMIT 1"
    ).bind(code(codeValue)).first<Record<string, unknown>>();
  } catch {
    return null;
  }
}

export async function listPortalTeamMembers(teamCode: string) {
  try {
    const response = await db().prepare(
      "SELECT tm.team_code,tm.team_role,tm.status,tm.capabilities_json,m.id,m.full_name,m.email,m.role,m.last_login_at " +
      "FROM portal_team_memberships tm JOIN portal_members m ON m.id=tm.member_id " +
      "WHERE tm.team_code=? AND tm.status='active' ORDER BY " +
      "CASE tm.team_role WHEN 'owner' THEN 0 WHEN 'captain' THEN 1 WHEN 'lead' THEN 2 WHEN 'engineer' THEN 3 WHEN 'contributor' THEN 4 ELSE 5 END," +
      "m.full_name"
    ).bind(code(teamCode)).all<Record<string, unknown>>();
    return response.results ?? [];
  } catch {
    return [];
  }
}

export async function listPortalRoleProfiles() {
  try {
    const response = await db().prepare(
      "SELECT * FROM portal_role_profiles ORDER BY scope,label"
    ).all<Record<string, unknown>>();
    return response.results ?? [];
  } catch {
    return [];
  }
}

export async function listPortalProjectRegistry() {
  try {
    const response = await db().prepare(
      "SELECT p.*,m.full_name AS owner_name,t.name AS team_name," +
      "(SELECT COUNT(*) FROM portal_tasks task WHERE task.project_slug=p.slug AND task.status!='done') AS open_tasks," +
      "(SELECT COUNT(*) FROM portal_vault_files vf WHERE vf.project_slug=p.slug AND vf.lifecycle_state='active') AS vault_files," +
      "(SELECT COUNT(*) FROM portal_native_repositories nr WHERE nr.project_slug=p.slug AND nr.status!='archived') AS native_repos " +
      "FROM portal_project_registry p " +
      "LEFT JOIN portal_members m ON m.id=p.owner_member_id " +
      "LEFT JOIN portal_teams t ON t.code=p.team_code " +
      "ORDER BY CASE p.status WHEN 'operational' THEN 0 WHEN 'testing' THEN 1 WHEN 'prototype' THEN 2 WHEN 'design' THEN 3 ELSE 4 END,p.updated_at DESC"
    ).all<Record<string, unknown>>();
    return response.results ?? [];
  } catch {
    return [];
  }
}

export async function getPortalProjectRegistry(projectSlug: string) {
  try {
    return await db().prepare(
      "SELECT p.*,m.full_name AS owner_name,t.name AS team_name " +
      "FROM portal_project_registry p " +
      "LEFT JOIN portal_members m ON m.id=p.owner_member_id " +
      "LEFT JOIN portal_teams t ON t.code=p.team_code WHERE p.slug=? LIMIT 1"
    ).bind(slug(projectSlug)).first<Record<string, unknown>>();
  } catch {
    return null;
  }
}

export async function listPortalProjectMapEdges() {
  try {
    const response = await db().prepare(
      "SELECT * FROM portal_project_map_edges ORDER BY created_at"
    ).all<Record<string, unknown>>();
    return response.results ?? [];
  } catch {
    return [];
  }
}

export async function listPortalVehicleProfiles() {
  try {
    const response = await db().prepare(
      "SELECT v.id,v.code,v.name,v.domain,v.status,v.last_seen_at,v.metadata_json," +
      "vp.team_code,vp.project_slug,vp.platform_type,vp.lifecycle,vp.serial_number,vp.criticality,vp.description,vp.owner_member_id," +
      "m.full_name AS owner_name,t.name AS team_name,p.title AS project_title," +
      "(SELECT battery FROM portal_telemetry_snapshots ts WHERE ts.vehicle_id=v.id ORDER BY ts.recorded_at DESC LIMIT 1) AS battery," +
      "(SELECT mode FROM portal_telemetry_snapshots ts WHERE ts.vehicle_id=v.id ORDER BY ts.recorded_at DESC LIMIT 1) AS telemetry_mode " +
      "FROM portal_vehicle_units v " +
      "LEFT JOIN portal_vehicle_profiles vp ON vp.vehicle_id=v.id " +
      "LEFT JOIN portal_members m ON m.id=vp.owner_member_id " +
      "LEFT JOIN portal_teams t ON t.code=vp.team_code " +
      "LEFT JOIN portal_project_registry p ON p.slug=vp.project_slug " +
      "ORDER BY v.name"
    ).all<Record<string, unknown>>();
    return response.results ?? [];
  } catch {
    return [];
  }
}

export async function createOrUpdatePortalProject(input: {
  slug: string;
  title: string;
  summary: string;
  domain: string;
  teamCode: string | null;
  status: string;
  visibility: string;
  ownerMemberId: string | null;
  startAt: string | null;
  targetAt: string | null;
  riskLevel: string;
  readiness: number;
  actorEmail: string;
}) {
  const allowedStatus = ["concept","design","prototype","testing","operational","paused","archived"];
  const allowedVisibility = ["team","members","leads","admins"];
  const allowedRisk = ["low","medium","high","critical"];
  const projectSlug = slug(input.slug);
  if (!projectSlug || !input.title.trim()) throw new Error("Proje slug ve başlık gerekli.");
  if (!allowedStatus.includes(input.status)) throw new Error("Geçersiz proje durumu.");
  if (!allowedVisibility.includes(input.visibility)) throw new Error("Geçersiz proje görünürlüğü.");
  if (!allowedRisk.includes(input.riskLevel)) throw new Error("Geçersiz risk seviyesi.");
  const readiness = Math.max(0,Math.min(100,Math.round(input.readiness || 0)));
  const teamCode = input.teamCode ? code(input.teamCode) : null;

  const database = db();
  await database.batch([
    database.prepare(
      "INSERT INTO portal_project_registry " +
      "(slug,title,summary,domain,team_code,status,visibility,owner_member_id,start_at,target_at,risk_level,readiness,created_by) " +
      "VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?) " +
      "ON CONFLICT(slug) DO UPDATE SET title=excluded.title,summary=excluded.summary,domain=excluded.domain,team_code=excluded.team_code," +
      "status=excluded.status,visibility=excluded.visibility,owner_member_id=excluded.owner_member_id,start_at=excluded.start_at,target_at=excluded.target_at," +
      "risk_level=excluded.risk_level,readiness=excluded.readiness,updated_at=CURRENT_TIMESTAMP"
    ).bind(
      projectSlug,input.title.trim(),input.summary.trim(),input.domain.trim(),teamCode,input.status,input.visibility,
      input.ownerMemberId || null,input.startAt || null,input.targetAt || null,input.riskLevel,readiness,input.actorEmail
    ),
    database.prepare(
      "INSERT INTO portal_activity_log (actor,action,entity_type,entity_id,details_json) VALUES (?,'control.project.upsert','project',?,?)"
    ).bind(input.actorEmail,projectSlug,JSON.stringify({ title: input.title, teamCode, status: input.status })),
  ]);

  if (teamCode) {
    await createPortalMapEdge({
      sourceType: "team",
      sourceRef: teamCode,
      targetType: "project",
      targetRef: projectSlug,
      relation: "owns",
      label: "owns",
      actorEmail: input.actorEmail,
    });
  }
  return projectSlug;
}

export async function createPortalVehicleControl(input: {
  code: string;
  name: string;
  domain: string;
  teamCode: string | null;
  projectSlug: string | null;
  platformType: string;
  lifecycle: string;
  serialNumber: string;
  criticality: string;
  description: string;
  ownerMemberId: string | null;
  actorEmail: string;
}) {
  const allowedLifecycle = ["concept","prototype","testing","operational","maintenance","retired"];
  const allowedCriticality = ["low","medium","high","critical"];
  const vehicleCode = code(input.code);
  if (!vehicleCode || !input.name.trim()) throw new Error("Araç kodu ve adı gerekli.");
  if (!allowedLifecycle.includes(input.lifecycle)) throw new Error("Geçersiz araç yaşam döngüsü.");
  if (!allowedCriticality.includes(input.criticality)) throw new Error("Geçersiz araç kritiklik seviyesi.");

  const database = db();
  const existing = await database.prepare(
    "SELECT id FROM portal_vehicle_units WHERE code=? LIMIT 1"
  ).bind(vehicleCode).first<{ id: string }>();
  const vehicleId = existing?.id || crypto.randomUUID();
  const teamCode = input.teamCode ? code(input.teamCode) : null;
  const projectSlug = input.projectSlug ? slug(input.projectSlug) : null;

  await database.batch([
    database.prepare(
      "INSERT INTO portal_vehicle_units (id,code,name,domain,status,metadata_json) VALUES (?,?,?,?, 'offline','{}') " +
      "ON CONFLICT(code) DO UPDATE SET name=excluded.name,domain=excluded.domain,updated_at=CURRENT_TIMESTAMP"
    ).bind(vehicleId,vehicleCode,input.name.trim(),input.domain.trim()),
    database.prepare(
      "INSERT INTO portal_vehicle_profiles " +
      "(vehicle_id,team_code,project_slug,platform_type,lifecycle,serial_number,criticality,description,owner_member_id) " +
      "VALUES (?,?,?,?,?,?,?,?,?) " +
      "ON CONFLICT(vehicle_id) DO UPDATE SET team_code=excluded.team_code,project_slug=excluded.project_slug,platform_type=excluded.platform_type," +
      "lifecycle=excluded.lifecycle,serial_number=excluded.serial_number,criticality=excluded.criticality,description=excluded.description," +
      "owner_member_id=excluded.owner_member_id,updated_at=CURRENT_TIMESTAMP"
    ).bind(
      vehicleId,teamCode,projectSlug,input.platformType.trim() || "vehicle",input.lifecycle,input.serialNumber.trim(),
      input.criticality,input.description.trim(),input.ownerMemberId || null
    ),
    database.prepare(
      "INSERT INTO portal_activity_log (actor,action,entity_type,entity_id,details_json) VALUES (?,'control.vehicle.upsert','vehicle',?,?)"
    ).bind(input.actorEmail,vehicleId,JSON.stringify({ code: vehicleCode, teamCode, projectSlug, lifecycle: input.lifecycle })),
  ]);

  if (projectSlug) {
    await createPortalMapEdge({
      sourceType: "project",
      sourceRef: projectSlug,
      targetType: "vehicle",
      targetRef: vehicleId,
      relation: "vehicle",
      label: "vehicle",
      actorEmail: input.actorEmail,
    });
  }
  return vehicleId;
}

export async function upsertPortalTeamMembership(input: {
  teamCode: string;
  memberId: string;
  teamRole: string;
  capabilities: string[];
  actorEmail: string;
}) {
  const allowed = ["owner","captain","lead","engineer","contributor","observer"];
  if (!allowed.includes(input.teamRole)) throw new Error("Geçersiz takım rolü.");
  const teamCode = code(input.teamCode);
  const database = db();
  await database.batch([
    database.prepare(
      "INSERT INTO portal_team_memberships (team_code,member_id,team_role,status,capabilities_json) VALUES (?,?,?,'active',?) " +
      "ON CONFLICT(team_code,member_id) DO UPDATE SET team_role=excluded.team_role,status='active',capabilities_json=excluded.capabilities_json,updated_at=CURRENT_TIMESTAMP"
    ).bind(teamCode,input.memberId,input.teamRole,JSON.stringify(input.capabilities.slice(0,30))),
    database.prepare(
      "INSERT INTO portal_activity_log (actor,action,entity_type,entity_id,details_json) VALUES (?,'control.team.membership','team',?,?)"
    ).bind(input.actorEmail,teamCode,JSON.stringify({ memberId: input.memberId, teamRole: input.teamRole })),
  ]);
}

export async function grantPortalMemberCapability(input: {
  memberId: string;
  capability: string;
  actorEmail: string;
}) {
  if (!/^[a-z0-9._-]{3,80}$/.test(input.capability)) throw new Error("Geçersiz capability.");
  const database = db();
  await database.batch([
    database.prepare(
      "INSERT OR IGNORE INTO portal_member_capabilities (member_id,capability,granted_by) VALUES (?,?,?)"
    ).bind(input.memberId,input.capability,input.actorEmail),
    database.prepare(
      "INSERT INTO portal_activity_log (actor,action,entity_type,entity_id,details_json) VALUES (?,'control.capability.grant','member',?,?)"
    ).bind(input.actorEmail,input.memberId,JSON.stringify({ capability: input.capability })),
  ]);
}

export async function revokePortalMemberCapability(input: {
  memberId: string;
  capability: string;
  actorEmail: string;
}) {
  const database = db();
  await database.batch([
    database.prepare(
      "DELETE FROM portal_member_capabilities WHERE member_id=? AND capability=?"
    ).bind(input.memberId,input.capability),
    database.prepare(
      "INSERT INTO portal_activity_log (actor,action,entity_type,entity_id,details_json) VALUES (?,'control.capability.revoke','member',?,?)"
    ).bind(input.actorEmail,input.memberId,JSON.stringify({ capability: input.capability })),
  ]);
}

export async function createPortalMapEdge(input: {
  sourceType: string;
  sourceRef: string;
  targetType: string;
  targetRef: string;
  relation: string;
  label: string;
  actorEmail: string;
}) {
  const allowedTypes = ["project","team","vehicle","repo","vault","task"];
  if (!allowedTypes.includes(input.sourceType) || !allowedTypes.includes(input.targetType)) {
    throw new Error("Geçersiz map node türü.");
  }
  const sourceRef = input.sourceRef.trim();
  const targetRef = input.targetRef.trim();
  if (!sourceRef || !targetRef) throw new Error("Map bağlantı referansları gerekli.");
  await db().prepare(
    "INSERT OR IGNORE INTO portal_project_map_edges " +
    "(id,source_type,source_ref,target_type,target_ref,relation,label,created_by) VALUES (?,?,?,?,?,?,?,?)"
  ).bind(
    crypto.randomUUID(),input.sourceType,sourceRef,input.targetType,targetRef,
    input.relation.trim() || "depends_on",input.label.trim(),input.actorEmail
  ).run();
}
