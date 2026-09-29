import { env } from "cloudflare:workers";
import { deletePortalProject, deletePortalTeam } from "@/lib/portal/control";

function db() {
  if (!env.DB) throw new Error("DB bağlantısı kullanılamıyor.");
  return env.DB;
}

function text(value: unknown) {
  return String(value ?? "").trim();
}
function upper(value: unknown) {
  return text(value).toUpperCase();
}
function nullable(value: unknown) {
  const valueText = text(value);
  return valueText ? valueText : null;
}
function int(value: unknown, min: number, max: number, fallback = 0) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(min, Math.min(max, Math.round(parsed)));
}
function number(value: unknown, min = 0) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return min;
  return Math.max(min, parsed);
}

export type ControlCenterEntityType =
  | "members"
  | "roles"
  | "teams"
  | "projects"
  | "tasks"
  | "vehicles"
  | "repositories"
  | "vault"
  | "inventory";

export async function getControlCenterView(entityType: ControlCenterEntityType) {
  const database = db();
  const queryByType: Record<ControlCenterEntityType,string> = {
    members:"SELECT id,email,full_name,role,status,teams_json,last_login_at,created_at FROM portal_members ORDER BY full_name,email LIMIT 200",
    roles:"SELECT role_key,label,scope,description,capabilities_json,updated_at FROM portal_role_profiles ORDER BY scope,role_key LIMIT 200",
    teams:"SELECT code,name,domain,description,visibility,status,updated_at FROM portal_teams ORDER BY name LIMIT 200",
    projects:"SELECT slug,title,summary,domain,team_code,status,visibility,owner_member_id,risk_level,readiness,updated_at FROM portal_project_registry ORDER BY updated_at DESC LIMIT 200",
    tasks:"SELECT t.id,t.title,t.description,t.project_slug,t.team_code,t.assignee_id,t.status,t.priority,t.due_at,t.updated_at,m.full_name AS assignee_name FROM portal_tasks t LEFT JOIN portal_members m ON m.id=t.assignee_id ORDER BY t.updated_at DESC LIMIT 150",
    vehicles:"SELECT v.id,v.code,v.name,v.domain,v.status,v.last_seen_at,vp.team_code,vp.project_slug,vp.platform_type,vp.lifecycle,vp.serial_number,vp.criticality,vp.description,vp.owner_member_id FROM portal_vehicle_units v LEFT JOIN portal_vehicle_profiles vp ON vp.vehicle_id=v.id ORDER BY v.name LIMIT 200",
    repositories:"SELECT id,name,slug,project_slug,team_code,visibility,default_branch,status,created_by,updated_at FROM portal_native_repositories ORDER BY updated_at DESC LIMIT 150",
    vault:"SELECT id,title,kind,original_name,extension,size_bytes,team_code,project_slug,visibility,revision,approval_state,lifecycle_state,created_by,updated_at FROM portal_vault_files ORDER BY updated_at DESC LIMIT 150",
    inventory:"SELECT id,sku,name,category,location,unit,quantity,minimum_quantity,reserved_quantity,updated_at FROM portal_inventory_items ORDER BY category,name LIMIT 200",
  };

  const lookupNeeds = {
    teams:["projects","tasks","vehicles","repositories","vault"].includes(entityType),
    projects:["tasks","vehicles","repositories","vault"].includes(entityType),
    members:entityType === "tasks",
  };

  const [rows, counts, teams, projects, members] = await Promise.all([
    database.prepare(queryByType[entityType]).all<Record<string,unknown>>(),
    database.prepare(
      "SELECT " +
      "(SELECT COUNT(*) FROM portal_members) AS members," +
      "(SELECT COUNT(*) FROM portal_project_registry) AS projects," +
      "(SELECT COUNT(*) FROM portal_tasks) AS tasks," +
      "(SELECT COUNT(*) FROM portal_vault_files) AS vault," +
      "(SELECT COUNT(*) FROM portal_native_repositories) AS repositories"
    ).first<Record<string,number>>(),
    lookupNeeds.teams
      ? database.prepare("SELECT code,name FROM portal_teams WHERE status!='archived' ORDER BY name LIMIT 200").all<Record<string,unknown>>()
      : Promise.resolve({ results: [] as Record<string,unknown>[] }),
    lookupNeeds.projects
      ? database.prepare("SELECT slug,title FROM portal_project_registry WHERE status!='archived' ORDER BY updated_at DESC LIMIT 250").all<Record<string,unknown>>()
      : Promise.resolve({ results: [] as Record<string,unknown>[] }),
    lookupNeeds.members
      ? database.prepare("SELECT id,full_name,email,status FROM portal_members WHERE status!='archived' ORDER BY full_name,email LIMIT 250").all<Record<string,unknown>>()
      : Promise.resolve({ results: [] as Record<string,unknown>[] }),
  ]);

  return {
    rows: rows.results ?? [],
    counts: {
      members:Number(counts?.members || 0),
      projects:Number(counts?.projects || 0),
      tasks:Number(counts?.tasks || 0),
      vault:Number(counts?.vault || 0),
      repositories:Number(counts?.repositories || 0),
    },
    teams: teams.results ?? [],
    projects: projects.results ?? [],
    members: members.results ?? [],
  };
}

export async function updateControlCenterEntity(input: {
  entityType: ControlCenterEntityType;
  entityId: string;
  fields: Record<string,string>;
  actorMemberId: string;
  actorEmail: string;
}) {
  const database = db();
  const id = text(input.entityId);
  if (!id) throw new Error("Nesne kimliği eksik.");

  if (input.entityType === "members") {
    const role = text(input.fields.role);
    const status = text(input.fields.status);
    if (!["admin","lead","member","alumni","viewer"].includes(role)) throw new Error("Geçersiz global rol.");
    if (!["invited","active","suspended","archived"].includes(status)) throw new Error("Geçersiz üye durumu.");
    const target = await database.prepare("SELECT id,role,status FROM portal_members WHERE id=? LIMIT 1")
      .bind(id).first<{ id:string; role:string; status:string }>();
    if (!target) throw new Error("Üye bulunamadı.");
    if (target.id === input.actorMemberId && target.role === "admin" && role !== "admin") {
      throw new Error("Kendi admin rolünü Control Center üzerinden düşüremezsin.");
    }
    if (target.role === "admin" && role !== "admin") {
      const admins = await database.prepare(
        "SELECT COUNT(*) AS count FROM portal_members WHERE role='admin' AND status='active'"
      ).first<{ count:number }>();
      if (Number(admins?.count || 0) <= 1) throw new Error("Son aktif adminin rolü düşürülemez.");
    }
    await database.batch([
      database.prepare(
        "UPDATE portal_members SET full_name=?,role=?,status=?,updated_at=CURRENT_TIMESTAMP WHERE id=?"
      ).bind(text(input.fields.fullName),role,status,id),
      database.prepare(
        "INSERT INTO portal_activity_log (actor,action,entity_type,entity_id,details_json) VALUES (?,'control-center.member.update','member',?,?)"
      ).bind(input.actorEmail,id,JSON.stringify({ role,status })),
    ]);
    return;
  }

  if (input.entityType === "roles") {
    const scope = text(input.fields.scope);
    if (!["global","team"].includes(scope)) throw new Error("Geçersiz rol scope.");
    await database.batch([
      database.prepare(
        "UPDATE portal_role_profiles SET label=?,description=?,updated_at=CURRENT_TIMESTAMP WHERE role_key=?"
      ).bind(text(input.fields.label),text(input.fields.description),id),
      database.prepare(
        "INSERT INTO portal_activity_log (actor,action,entity_type,entity_id,details_json) VALUES (?,'control-center.role.update','role',?,?)"
      ).bind(input.actorEmail,id,JSON.stringify({ scope })),
    ]);
    return;
  }

  if (input.entityType === "teams") {
    const visibility = text(input.fields.visibility);
    const status = text(input.fields.status);
    if (!["restricted","members"].includes(visibility)) throw new Error("Geçersiz takım görünürlüğü.");
    if (!["active","archived"].includes(status)) throw new Error("Geçersiz takım durumu.");
    await database.batch([
      database.prepare(
        "UPDATE portal_teams SET name=?,domain=?,description=?,visibility=?,status=?,updated_at=CURRENT_TIMESTAMP WHERE code=?"
      ).bind(text(input.fields.name),text(input.fields.domain),text(input.fields.description),visibility,status,upper(id)),
      database.prepare(
        "INSERT INTO portal_activity_log (actor,action,entity_type,entity_id,details_json) VALUES (?,'control-center.team.update','team',?,?)"
      ).bind(input.actorEmail,upper(id),JSON.stringify({ visibility,status })),
    ]);
    return;
  }

  if (input.entityType === "projects") {
    const status = text(input.fields.status);
    const visibility = text(input.fields.visibility);
    const risk = text(input.fields.riskLevel);
    if (!["concept","design","prototype","testing","operational","paused","archived"].includes(status)) throw new Error("Geçersiz proje durumu.");
    if (!["team","members","leads","admins"].includes(visibility)) throw new Error("Geçersiz proje görünürlüğü.");
    if (!["low","medium","high","critical"].includes(risk)) throw new Error("Geçersiz risk seviyesi.");
    await database.batch([
      database.prepare(
        "UPDATE portal_project_registry SET title=?,team_code=?,status=?,visibility=?,risk_level=?,readiness=?,updated_at=CURRENT_TIMESTAMP WHERE slug=?"
      ).bind(
        text(input.fields.title),
        nullable(upper(input.fields.teamCode)),
        status,
        visibility,
        risk,
        int(input.fields.readiness,0,100,0),
        id
      ),
      database.prepare(
        "INSERT INTO portal_activity_log (actor,action,entity_type,entity_id,details_json) VALUES (?,'control-center.project.update','project',?,?)"
      ).bind(input.actorEmail,id,JSON.stringify({ status,visibility,risk })),
    ]);
    return;
  }

  if (input.entityType === "tasks") {
    const status = text(input.fields.status);
    const priority = text(input.fields.priority);
    if (!["backlog","todo","doing","review","blocked","done"].includes(status)) throw new Error("Geçersiz görev durumu.");
    if (!["low","medium","high","critical"].includes(priority)) throw new Error("Geçersiz görev önceliği.");
    await database.batch([
      database.prepare(
        "UPDATE portal_tasks SET title=?,project_slug=?,team_code=?,assignee_id=?,status=?,priority=?,due_at=?,updated_at=CURRENT_TIMESTAMP WHERE id=?"
      ).bind(
        text(input.fields.title),
        nullable(input.fields.projectSlug),
        nullable(upper(input.fields.teamCode)),
        nullable(input.fields.assigneeId),
        status,
        priority,
        nullable(input.fields.dueAt),
        id
      ),
      database.prepare(
        "INSERT INTO portal_activity_log (actor,action,entity_type,entity_id,details_json) VALUES (?,'control-center.task.update','task',?,?)"
      ).bind(input.actorEmail,id,JSON.stringify({ status,priority })),
    ]);
    return;
  }

  if (input.entityType === "vehicles") {
    const unitStatus = text(input.fields.status);
    const lifecycle = text(input.fields.lifecycle);
    if (!["offline","idle","testing","mission","maintenance"].includes(unitStatus)) throw new Error("Geçersiz araç runtime durumu.");
    if (!["concept","prototype","testing","operational","maintenance","retired"].includes(lifecycle)) throw new Error("Geçersiz araç lifecycle.");
    await database.batch([
      database.prepare(
        "UPDATE portal_vehicle_units SET name=?,domain=?,status=?,updated_at=CURRENT_TIMESTAMP WHERE id=?"
      ).bind(text(input.fields.name),text(input.fields.domain),unitStatus,id),
      database.prepare(
        "UPDATE portal_vehicle_profiles SET team_code=?,project_slug=?,lifecycle=?,updated_at=CURRENT_TIMESTAMP WHERE vehicle_id=?"
      ).bind(nullable(upper(input.fields.teamCode)),nullable(input.fields.projectSlug),lifecycle,id),
      database.prepare(
        "INSERT INTO portal_activity_log (actor,action,entity_type,entity_id,details_json) VALUES (?,'control-center.vehicle.update','vehicle',?,?)"
      ).bind(input.actorEmail,id,JSON.stringify({ unitStatus,lifecycle })),
    ]);
    return;
  }

  if (input.entityType === "repositories") {
    const visibility = text(input.fields.visibility);
    const status = text(input.fields.status);
    if (!["private","internal","public"].includes(visibility)) throw new Error("Geçersiz repository görünürlüğü.");
    if (!["provisioning","ready","degraded","archived"].includes(status)) throw new Error("Geçersiz repository durumu.");
    await database.batch([
      database.prepare(
        "UPDATE portal_native_repositories SET name=?,team_code=?,project_slug=?,visibility=?,status=?,updated_at=CURRENT_TIMESTAMP WHERE id=?"
      ).bind(
        text(input.fields.name),
        nullable(upper(input.fields.teamCode)),
        nullable(input.fields.projectSlug),
        visibility,
        status,
        id
      ),
      database.prepare(
        "INSERT INTO portal_activity_log (actor,action,entity_type,entity_id,details_json) VALUES (?,'control-center.repository.update','repository',?,?)"
      ).bind(input.actorEmail,id,JSON.stringify({ visibility,status })),
    ]);
    return;
  }

  if (input.entityType === "vault") {
    const visibility = text(input.fields.visibility);
    const lifecycle = text(input.fields.lifecycle);
    const approval = text(input.fields.approval);
    if (!["members","team","leads","admins"].includes(visibility)) throw new Error("Geçersiz Vault görünürlüğü.");
    if (!["active","archived","trashed"].includes(lifecycle)) throw new Error("Geçersiz Vault lifecycle.");
    if (!["draft","review","approved","rejected"].includes(approval)) throw new Error("Geçersiz Vault approval.");
    await database.batch([
      database.prepare(
        "UPDATE portal_vault_files SET title=?,team_code=?,project_slug=?,visibility=?,lifecycle_state=?,approval_state=?,updated_at=CURRENT_TIMESTAMP WHERE id=?"
      ).bind(
        text(input.fields.title),
        nullable(upper(input.fields.teamCode)),
        nullable(input.fields.projectSlug),
        visibility,
        lifecycle,
        approval,
        id
      ),
      database.prepare(
        "INSERT INTO portal_activity_log (actor,action,entity_type,entity_id,details_json) VALUES (?,'control-center.vault.update','vault',?,?)"
      ).bind(input.actorEmail,id,JSON.stringify({ visibility,lifecycle,approval })),
    ]);
    return;
  }

  if (input.entityType === "inventory") {
    const quantity = number(input.fields.quantity,0);
    const minimum = number(input.fields.minimumQuantity,0);
    const reserved = number(input.fields.reservedQuantity,0);
    if (reserved > quantity) throw new Error("Rezerve miktar toplam stoktan büyük olamaz.");
    await database.batch([
      database.prepare(
        "UPDATE portal_inventory_items SET name=?,category=?,location=?,quantity=?,minimum_quantity=?,reserved_quantity=?,updated_at=CURRENT_TIMESTAMP WHERE id=?"
      ).bind(
        text(input.fields.name),
        text(input.fields.category) || "general",
        text(input.fields.location),
        quantity,
        minimum,
        reserved,
        id
      ),
      database.prepare(
        "INSERT INTO portal_activity_log (actor,action,entity_type,entity_id,details_json) VALUES (?,'control-center.inventory.update','inventory',?,?)"
      ).bind(input.actorEmail,id,JSON.stringify({ quantity,minimum,reserved })),
    ]);
    return;
  }

  throw new Error("Desteklenmeyen Control Center nesnesi.");
}

export async function deleteControlCenterEntity(input: {
  entityType: ControlCenterEntityType;
  entityId: string;
  actorMemberId: string;
  actorEmail: string;
}) {
  const database = db();
  const id = text(input.entityId);
  if (!id) throw new Error("Nesne kimliği eksik.");

  if (input.entityType === "members") {
    if (id === input.actorMemberId) throw new Error("Kendi hesabını silemezsin.");
    const target = await database.prepare("SELECT role,status,full_name,email FROM portal_members WHERE id=? LIMIT 1")
      .bind(id).first<{ role:string; status:string; full_name:string; email:string }>();
    if (!target) throw new Error("Üye bulunamadı.");
    if (target.role === "admin" && target.status === "active") {
      const admins = await database.prepare(
        "SELECT COUNT(*) AS count FROM portal_members WHERE role='admin' AND status='active'"
      ).first<{ count:number }>();
      if (Number(admins?.count || 0) <= 1) throw new Error("Son aktif admin arşivlenemez.");
    }
    await database.batch([
      database.prepare(
        "UPDATE portal_members SET status='archived',updated_at=CURRENT_TIMESTAMP WHERE id=?"
      ).bind(id),
      database.prepare(
        "DELETE FROM portal_sessions WHERE member_id=?"
      ).bind(id),
      database.prepare(
        "INSERT INTO portal_activity_log (actor,action,entity_type,entity_id,details_json) VALUES (?,'control-center.member.archive','member',?,?)"
      ).bind(input.actorEmail,id,JSON.stringify({ name:target.full_name,email:target.email })),
    ]);
    return;
  }

  if (input.entityType === "roles") {
    throw new Error("Sistem rol profilleri silinmez; capability ve açıklamalar düzenlenir.");
  }

  if (input.entityType === "teams") {
    await deletePortalTeam({ teamCode:id, actorEmail:input.actorEmail });
    return;
  }

  if (input.entityType === "projects") {
    await deletePortalProject({ slug:id, actorEmail:input.actorEmail });
    return;
  }

  if (input.entityType === "tasks") {
    await database.batch([
      database.prepare("DELETE FROM portal_tasks WHERE id=?").bind(id),
      database.prepare(
        "INSERT INTO portal_activity_log (actor,action,entity_type,entity_id,details_json) VALUES (?,'control-center.task.delete','task',?,'{}')"
      ).bind(input.actorEmail,id),
    ]);
    return;
  }

  if (input.entityType === "vehicles") {
    await database.batch([
      database.prepare(
        "DELETE FROM portal_project_map_edges WHERE (source_type='vehicle' AND source_ref=?) OR (target_type='vehicle' AND target_ref=?)"
      ).bind(id,id),
      database.prepare("DELETE FROM portal_vehicle_units WHERE id=?").bind(id),
      database.prepare(
        "INSERT INTO portal_activity_log (actor,action,entity_type,entity_id,details_json) VALUES (?,'control-center.vehicle.delete','vehicle',?,'{}')"
      ).bind(input.actorEmail,id),
    ]);
    return;
  }

  if (input.entityType === "repositories") {
    await database.batch([
      database.prepare(
        "UPDATE portal_native_repositories SET status='archived',updated_at=CURRENT_TIMESTAMP WHERE id=?"
      ).bind(id),
      database.prepare(
        "DELETE FROM portal_project_map_edges WHERE (source_type='repo' AND source_ref=?) OR (target_type='repo' AND target_ref=?)"
      ).bind(id,id),
      database.prepare(
        "INSERT INTO portal_activity_log (actor,action,entity_type,entity_id,details_json) VALUES (?,'control-center.repository.archive','repository',?,'{}')"
      ).bind(input.actorEmail,id),
    ]);
    return;
  }

  if (input.entityType === "vault") {
    await database.batch([
      database.prepare(
        "UPDATE portal_vault_files SET lifecycle_state='trashed',updated_at=CURRENT_TIMESTAMP WHERE id=?"
      ).bind(id),
      database.prepare(
        "INSERT INTO portal_activity_log (actor,action,entity_type,entity_id,details_json) VALUES (?,'control-center.vault.trash','vault',?,'{}')"
      ).bind(input.actorEmail,id),
    ]);
    return;
  }

  if (input.entityType === "inventory") {
    await database.batch([
      database.prepare("DELETE FROM portal_inventory_items WHERE id=?").bind(id),
      database.prepare(
        "INSERT INTO portal_activity_log (actor,action,entity_type,entity_id,details_json) VALUES (?,'control-center.inventory.delete','inventory',?,'{}')"
      ).bind(input.actorEmail,id),
    ]);
    return;
  }

  throw new Error("Desteklenmeyen Control Center nesnesi.");
}
