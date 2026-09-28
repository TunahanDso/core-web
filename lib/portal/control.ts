import { env } from "cloudflare:workers";
import type { PortalMember } from "@/lib/portal/auth";
import { canAccessPortalTeam, PORTAL_CAPABILITY_OPTIONS } from "@/lib/portal/governance";

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
  const normalized = code(teamCode);
  const explicit: Record<string, unknown>[] = [];
  try {
    const response = await db().prepare(
      "SELECT tm.team_code,tm.team_role,tm.status,tm.capabilities_json,m.id,m.full_name,m.email,m.role,m.teams_json,m.last_login_at " +
      "FROM portal_team_memberships tm JOIN portal_members m ON m.id=tm.member_id " +
      "WHERE tm.team_code=? AND tm.status='active' ORDER BY " +
      "CASE tm.team_role WHEN 'owner' THEN 0 WHEN 'captain' THEN 1 WHEN 'lead' THEN 2 WHEN 'engineer' THEN 3 WHEN 'contributor' THEN 4 ELSE 5 END," +
      "m.full_name"
    ).bind(normalized).all<Record<string, unknown>>();
    explicit.push(...(response.results ?? []));
  } catch {
    // V6 may not be applied yet. Legacy membership fallback is handled below.
  }

  const known = new Set(explicit.map((item) => String(item.id)));
  try {
    const legacy = await db().prepare(
      "SELECT id,full_name,email,role,teams_json,last_login_at FROM portal_members WHERE status='active' ORDER BY full_name"
    ).all<Record<string, unknown>>();
    for (const member of legacy.results ?? []) {
      if (known.has(String(member.id))) continue;
      let teams: string[] = [];
      try {
        const parsed = JSON.parse(String(member.teams_json || "[]"));
        if (Array.isArray(parsed)) teams = parsed.map((item) => String(item).trim().toUpperCase());
      } catch {
        teams = [];
      }
      if (!teams.includes(normalized)) continue;
      explicit.push({
        ...member,
        team_code: normalized,
        team_role: String(member.role) === "lead" ? "lead" : "engineer",
        status: "active",
        capabilities_json: "[]",
        legacy: 1,
      });
    }
  } catch {
    // If the legacy member table is unavailable, return what the V6 query produced.
  }
  return explicit;
}

export async function listPortalCapabilityGrants() {
  try {
    const response = await db().prepare(
      "SELECT c.member_id,c.capability,c.granted_by,c.created_at,m.full_name,m.email,m.role " +
      "FROM portal_member_capabilities c JOIN portal_members m ON m.id=c.member_id " +
      "ORDER BY m.full_name,c.capability"
    ).all<Record<string, unknown>>();
    return response.results ?? [];
  } catch {
    return [];
  }
}

export async function listPortalAllTeamMemberships() {
  try {
    const response = await db().prepare(
      "SELECT tm.team_code,tm.member_id,tm.team_role,tm.status,tm.capabilities_json,tm.updated_at," +
      "m.full_name,m.email,t.name AS team_name " +
      "FROM portal_team_memberships tm " +
      "JOIN portal_members m ON m.id=tm.member_id " +
      "JOIN portal_teams t ON t.code=tm.team_code " +
      "WHERE tm.status='active' ORDER BY t.name,m.full_name"
    ).all<Record<string, unknown>>();
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



export async function createOrUpdatePortalTeam(input: {
  code: string;
  name: string;
  domain: string;
  description: string;
  visibility: string;
  actorEmail: string;
}) {
  const teamCode = code(input.code);
  if (!/^[A-Z0-9-]{2,16}$/.test(teamCode)) {
    throw new Error("Takım kodu 2-16 karakter; yalnız A-Z, 0-9 ve '-' içerebilir.");
  }
  if (!input.name.trim()) throw new Error("Takım adı gerekli.");
  if (!["restricted","members"].includes(input.visibility)) {
    throw new Error("Geçersiz takım görünürlüğü.");
  }

  const database = db();
  await database.batch([
    database.prepare(
      "INSERT INTO portal_teams (code,name,domain,description,visibility,status) VALUES (?,?,?,?,?,'active') " +
      "ON CONFLICT(code) DO UPDATE SET name=excluded.name,domain=excluded.domain,description=excluded.description," +
      "visibility=excluded.visibility,status='active',updated_at=CURRENT_TIMESTAMP"
    ).bind(teamCode,input.name.trim(),input.domain.trim(),input.description.trim(),input.visibility),
    database.prepare(
      "INSERT INTO portal_activity_log (actor,action,entity_type,entity_id,details_json) VALUES (?,'control.team.upsert','team',?,?)"
    ).bind(input.actorEmail,teamCode,JSON.stringify({
      name:input.name.trim(),
      domain:input.domain.trim(),
      visibility:input.visibility,
    })),
  ]);
  return teamCode;
}

export async function deletePortalTeam(input: {
  teamCode: string;
  actorEmail: string;
}) {
  const teamCode = code(input.teamCode);
  if (!teamCode) throw new Error("Takım kodu gerekli.");
  const database = db();
  const existing = await database.prepare(
    "SELECT code,name FROM portal_teams WHERE code=? LIMIT 1"
  ).bind(teamCode).first<{ code:string; name:string }>();
  if (!existing) throw new Error("Takım bulunamadı.");

  const members = await database.prepare(
    "SELECT id,teams_json FROM portal_members WHERE teams_json LIKE ?"
  ).bind("%" + teamCode + "%").all<{ id:string; teams_json:string }>();

  const legacyUpdates = (members.results ?? []).map((member) => {
    let teams: string[] = [];
    try {
      const parsed = JSON.parse(member.teams_json || "[]");
      if (Array.isArray(parsed)) teams = parsed.map((item) => String(item));
    } catch {
      teams = [];
    }
    const next = teams.filter((item) => code(item) !== teamCode);
    return database.prepare(
      "UPDATE portal_members SET teams_json=?,updated_at=CURRENT_TIMESTAMP WHERE id=?"
    ).bind(JSON.stringify(next),member.id);
  });

  await database.batch([
    ...legacyUpdates,
    database.prepare("UPDATE portal_tasks SET team_code=NULL WHERE team_code=?").bind(teamCode),
    database.prepare("UPDATE portal_resources SET team_code=NULL WHERE team_code=?").bind(teamCode),
    database.prepare("UPDATE portal_repositories SET team_code=NULL WHERE team_code=?").bind(teamCode),
    database.prepare("UPDATE portal_channels SET team_code=NULL WHERE team_code=?").bind(teamCode),
    database.prepare("UPDATE portal_calendar_events SET team_code=NULL WHERE team_code=?").bind(teamCode),
    database.prepare("UPDATE portal_vault_files SET team_code=NULL WHERE team_code=?").bind(teamCode),
    database.prepare("UPDATE portal_native_repositories SET team_code=NULL WHERE team_code=?").bind(teamCode),
    database.prepare("UPDATE portal_project_registry SET team_code=NULL,updated_at=CURRENT_TIMESTAMP WHERE team_code=?").bind(teamCode),
    database.prepare("UPDATE portal_vehicle_profiles SET team_code=NULL,updated_at=CURRENT_TIMESTAMP WHERE team_code=?").bind(teamCode),
    database.prepare(
      "DELETE FROM portal_project_map_edges WHERE (source_type='team' AND source_ref=?) OR (target_type='team' AND target_ref=?)"
    ).bind(teamCode,teamCode),
    database.prepare("DELETE FROM portal_team_memberships WHERE team_code=?").bind(teamCode),
    database.prepare("DELETE FROM portal_teams WHERE code=?").bind(teamCode),
    database.prepare(
      "INSERT INTO portal_activity_log (actor,action,entity_type,entity_id,details_json) VALUES (?,'control.team.delete','team',?,?)"
    ).bind(input.actorEmail,teamCode,JSON.stringify({
      name:existing.name,
      detached:["tasks","resources","repositories","channels","calendar","vault","native-repositories","projects","vehicles"],
      legacyMembershipsUpdated:legacyUpdates.length,
    })),
  ]);
  return true;
}

export async function removePortalTeamMembership(input: {
  teamCode: string;
  memberId: string;
  actorEmail: string;
}) {
  const teamCode = code(input.teamCode);
  if (!teamCode || !input.memberId) throw new Error("Takım ve üye gerekli.");
  const database = db();

  const member = await database.prepare(
    "SELECT teams_json FROM portal_members WHERE id=? LIMIT 1"
  ).bind(input.memberId).first<{ teams_json:string }>();
  let teams: string[] = [];
  try {
    const parsed = JSON.parse(member?.teams_json || "[]");
    if (Array.isArray(parsed)) teams = parsed.map((item) => String(item));
  } catch {
    teams = [];
  }
  const next = teams.filter((item) => code(item) !== teamCode);

  await database.batch([
    database.prepare(
      "DELETE FROM portal_team_memberships WHERE team_code=? AND member_id=?"
    ).bind(teamCode,input.memberId),
    database.prepare(
      "UPDATE portal_members SET teams_json=?,updated_at=CURRENT_TIMESTAMP WHERE id=?"
    ).bind(JSON.stringify(next),input.memberId),
    database.prepare(
      "INSERT INTO portal_activity_log (actor,action,entity_type,entity_id,details_json) VALUES (?,'control.team.membership.remove','team',?,?)"
    ).bind(input.actorEmail,teamCode,JSON.stringify({ memberId:input.memberId })),
  ]);
}

export async function updatePortalRoleProfile(input: {
  roleKey: string;
  description: string;
  capabilities: string[];
  actorEmail: string;
}) {
  const roleKey = input.roleKey.trim();
  if (!/^[a-z0-9_-]{2,40}$/.test(roleKey)) throw new Error("Geçersiz rol anahtarı.");
  const allowed = new Set<string>(PORTAL_CAPABILITY_OPTIONS);
  const capabilities = Array.from(new Set(input.capabilities.map((item) => item.trim()).filter((item) => allowed.has(item))));
  if (roleKey === "admin" && !capabilities.includes("portal.admin")) capabilities.unshift("portal.admin");

  const database = db();
  const existing = await database.prepare(
    "SELECT role_key,scope FROM portal_role_profiles WHERE role_key=? LIMIT 1"
  ).bind(roleKey).first<{ role_key:string; scope:string }>();
  if (!existing) throw new Error("Rol profili bulunamadı.");

  await database.batch([
    database.prepare(
      "UPDATE portal_role_profiles SET description=?,capabilities_json=?,updated_at=CURRENT_TIMESTAMP WHERE role_key=?"
    ).bind(input.description.trim(),JSON.stringify(capabilities),roleKey),
    database.prepare(
      "INSERT INTO portal_activity_log (actor,action,entity_type,entity_id,details_json) VALUES (?,'control.role.profile.update','role',?,?)"
    ).bind(input.actorEmail,roleKey,JSON.stringify({ scope:existing.scope,capabilities })),
  ]);
}

export async function updatePortalMemberGlobalRole(input: {
  memberId: string;
  role: string;
  actorMemberId: string;
  actorEmail: string;
}) {
  const allowed = ["admin","lead","member","alumni","viewer"];
  if (!allowed.includes(input.role)) throw new Error("Geçersiz global rol.");
  const database = db();
  const target = await database.prepare(
    "SELECT id,role,full_name,email FROM portal_members WHERE id=? LIMIT 1"
  ).bind(input.memberId).first<{ id:string; role:string; full_name:string; email:string }>();
  if (!target) throw new Error("Portal üyesi bulunamadı.");

  if (target.id === input.actorMemberId && target.role === "admin" && input.role !== "admin") {
    throw new Error("Kendi yönetici rolünü bu ekrandan düşüremezsin.");
  }
  if (target.role === "admin" && input.role !== "admin") {
    const admins = await database.prepare(
      "SELECT COUNT(*) AS count FROM portal_members WHERE role='admin' AND status='active'"
    ).first<{ count:number }>();
    if (Number(admins?.count || 0) <= 1) {
      throw new Error("Son aktif portal yöneticisinin rolü düşürülemez.");
    }
  }

  await database.batch([
    database.prepare(
      "UPDATE portal_members SET role=?,updated_at=CURRENT_TIMESTAMP WHERE id=?"
    ).bind(input.role,input.memberId),
    database.prepare(
      "INSERT INTO portal_activity_log (actor,action,entity_type,entity_id,details_json) VALUES (?,'control.member.role.update','member',?,?)"
    ).bind(input.actorEmail,input.memberId,JSON.stringify({
      from:target.role,
      to:input.role,
      member:target.full_name || target.email,
    })),
  ]);
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


export async function deletePortalProject(input: {
  slug: string;
  actorEmail: string;
}) {
  const projectSlug = slug(input.slug);
  if (!projectSlug) throw new Error("Proje slug değeri gerekli.");

  const database = db();
  const existing = await database.prepare(
    "SELECT title FROM portal_project_registry WHERE slug=? LIMIT 1"
  ).bind(projectSlug).first<{ title: string }>();

  await database.batch([
    database.prepare("UPDATE portal_tasks SET project_slug=NULL WHERE project_slug=?").bind(projectSlug),
    database.prepare("UPDATE portal_resources SET project_slug=NULL WHERE project_slug=?").bind(projectSlug),
    database.prepare("UPDATE portal_repositories SET project_slug=NULL WHERE project_slug=?").bind(projectSlug),
    database.prepare("UPDATE portal_inventory_movements SET project_slug=NULL WHERE project_slug=?").bind(projectSlug),
    database.prepare("UPDATE portal_calendar_events SET project_slug=NULL WHERE project_slug=?").bind(projectSlug),
    database.prepare("UPDATE portal_vault_files SET project_slug=NULL WHERE project_slug=?").bind(projectSlug),
    database.prepare("UPDATE portal_native_repositories SET project_slug=NULL WHERE project_slug=?").bind(projectSlug),
    database.prepare("UPDATE portal_vehicle_profiles SET project_slug=NULL WHERE project_slug=?").bind(projectSlug),
    database.prepare(
      "DELETE FROM portal_project_map_edges WHERE (source_type='project' AND source_ref=?) OR (target_type='project' AND target_ref=?)"
    ).bind(projectSlug,projectSlug),
    database.prepare("DELETE FROM portal_project_registry WHERE slug=?").bind(projectSlug),
    database.prepare(
      "INSERT INTO portal_activity_log (actor,action,entity_type,entity_id,details_json) " +
      "VALUES (?,'control.project.delete','project',?,?)"
    ).bind(input.actorEmail,projectSlug,JSON.stringify({
      title: existing?.title || projectSlug,
      detached: ["tasks","resources","repositories","inventory-movements","calendar","vault","native-repositories","vehicles"],
    })),
  ]);

  return Boolean(existing);
}

export async function resetPortalProjectCatalog(input: {
  actorEmail: string;
}) {
  const database = db();
  const count = Number(
    (await database.prepare("SELECT COUNT(*) AS count FROM portal_project_registry").first<{ count: number }>())?.count ?? 0
  );

  await database.batch([
    database.prepare("UPDATE portal_tasks SET project_slug=NULL WHERE project_slug IS NOT NULL"),
    database.prepare("UPDATE portal_resources SET project_slug=NULL WHERE project_slug IS NOT NULL"),
    database.prepare("UPDATE portal_repositories SET project_slug=NULL WHERE project_slug IS NOT NULL"),
    database.prepare("UPDATE portal_inventory_movements SET project_slug=NULL WHERE project_slug IS NOT NULL"),
    database.prepare("UPDATE portal_calendar_events SET project_slug=NULL WHERE project_slug IS NOT NULL"),
    database.prepare("UPDATE portal_vault_files SET project_slug=NULL WHERE project_slug IS NOT NULL"),
    database.prepare("UPDATE portal_native_repositories SET project_slug=NULL WHERE project_slug IS NOT NULL"),
    database.prepare("UPDATE portal_vehicle_profiles SET project_slug=NULL WHERE project_slug IS NOT NULL"),
    database.prepare("DELETE FROM portal_project_map_edges WHERE source_type='project' OR target_type='project'"),
    database.prepare("DELETE FROM portal_project_registry"),
    database.prepare(
      "INSERT INTO portal_activity_log (actor,action,entity_type,entity_id,details_json) " +
      "VALUES (?,'control.project.reset','project','*',?)"
    ).bind(input.actorEmail,JSON.stringify({
      count,
      preserved: ["members","teams","chat","mail","vault-files","repositories","inventory","vehicles"],
    })),
  ]);

  return count;
}
