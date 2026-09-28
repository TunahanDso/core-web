import { env } from "cloudflare:workers";
import {
  generatePortalInviteCode,
  hashPortalInviteCode,
  isAllowedPortalEmail,
  normalizePortalEmail,
  type PortalRole,
} from "@/lib/portal/auth";

function database() {
  if (!env.DB) throw new Error("DB binding is not available.");
  return env.DB;
}

export async function getPortalMetrics(memberId: string) {
  const db = database();
  const row = await db.prepare(
    "SELECT " +
      "(SELECT COUNT(*) FROM portal_members WHERE status='active') AS members," +
      "(SELECT COUNT(*) FROM portal_tasks WHERE status!='done') AS open_tasks," +
      "(SELECT COUNT(*) FROM portal_resources) AS resources," +
      "(SELECT COUNT(*) FROM portal_inventory_items WHERE quantity-reserved_quantity<=minimum_quantity) AS low_stock," +
      "(SELECT COUNT(*) FROM portal_notifications WHERE (member_id=? OR member_id IS NULL) AND read_at IS NULL) AS unread," +
      "(SELECT COUNT(*) FROM portal_vehicle_units WHERE status!='offline') AS vehicles_online," +
      "(SELECT COUNT(*) FROM content_items WHERE status='published') AS public_content"
  ).bind(memberId).first<{
    members: number;
    open_tasks: number;
    resources: number;
    low_stock: number;
    unread: number;
    vehicles_online: number;
    public_content: number;
  }>();

  return {
    members: Number(row?.members ?? 0),
    openTasks: Number(row?.open_tasks ?? 0),
    resources: Number(row?.resources ?? 0),
    lowStock: Number(row?.low_stock ?? 0),
    unread: Number(row?.unread ?? 0),
    vehiclesOnline: Number(row?.vehicles_online ?? 0),
    publicContent: Number(row?.public_content ?? 0),
  };
}

export async function listPortalMembers() {
  const response = await database().prepare(
    "SELECT id,email,full_name,role,status,teams_json,activated_at,last_login_at,created_at FROM portal_members ORDER BY CASE status WHEN 'active' THEN 0 WHEN 'invited' THEN 1 ELSE 2 END,full_name,email"
  ).all<Record<string, unknown>>();
  return response.results ?? [];
}

export async function createPortalInvite(input: {
  email: string;
  fullName: string;
  role: PortalRole;
  teams: string[];
  createdBy: string;
}) {
  const db = database();
  const email = normalizePortalEmail(input.email);
  if (!isAllowedPortalEmail(email)) {
    throw new Error("Only approved student email domains can be invited.");
  }

  const code = generatePortalInviteCode();
  const codeHash = await hashPortalInviteCode(email, code);
  const memberId = crypto.randomUUID();
  const inviteId = crypto.randomUUID();
  const expiresAt = new Date(Date.now() + 72 * 60 * 60 * 1000).toISOString();

  const existing = await db.prepare("SELECT id,status FROM portal_members WHERE email=? LIMIT 1")
    .bind(email)
    .first<{ id: string; status: string }>();

  const effectiveMemberId = existing?.id ?? memberId;

  await db.batch([
    existing
      ? db.prepare("UPDATE portal_members SET full_name=?,role=?,teams_json=?,status=CASE WHEN status='active' THEN status ELSE 'invited' END,updated_at=CURRENT_TIMESTAMP WHERE id=?")
          .bind(input.fullName.trim(), input.role, JSON.stringify(input.teams), effectiveMemberId)
      : db.prepare("INSERT INTO portal_members (id,email,full_name,role,status,teams_json) VALUES (?,?,?,?, 'invited', ?)")
          .bind(effectiveMemberId, email, input.fullName.trim(), input.role, JSON.stringify(input.teams)),
    db.prepare("UPDATE portal_invites SET used_at=CURRENT_TIMESTAMP WHERE member_id=? AND used_at IS NULL")
      .bind(effectiveMemberId),
    db.prepare("INSERT INTO portal_invites (id,member_id,email,code_hash,expires_at,created_by) VALUES (?,?,?,?,?,?)")
      .bind(inviteId, effectiveMemberId, email, codeHash, expiresAt, input.createdBy),
    db.prepare("INSERT INTO portal_activity_log (actor,action,entity_type,entity_id,details_json) VALUES (?,'member.invite','member',?,?)")
      .bind(input.createdBy, effectiveMemberId, JSON.stringify({ email, role: input.role, teams: input.teams })),
  ]);

  return { code, email, expiresAt };
}

export async function listPortalTasks(limit = 100) {
  const response = await database().prepare(
    "SELECT t.id,t.title,t.description,t.project_slug,t.team_code,t.status,t.priority,t.due_at,t.created_at,t.updated_at,m.full_name AS assignee_name FROM portal_tasks t LEFT JOIN portal_members m ON m.id=t.assignee_id ORDER BY CASE t.status WHEN 'doing' THEN 0 WHEN 'review' THEN 1 WHEN 'todo' THEN 2 WHEN 'blocked' THEN 3 WHEN 'backlog' THEN 4 ELSE 5 END,t.updated_at DESC LIMIT ?"
  ).bind(limit).all<Record<string, unknown>>();
  return response.results ?? [];
}

export async function createPortalTask(input: {
  title: string;
  description: string;
  projectSlug: string | null;
  teamCode: string | null;
  priority: "low" | "medium" | "high" | "critical";
  dueAt: string | null;
  actorId: string;
  actorEmail: string;
}) {
  const id = crypto.randomUUID();
  const db = database();
  await db.batch([
    db.prepare("INSERT INTO portal_tasks (id,title,description,project_slug,team_code,status,priority,due_at,created_by) VALUES (?,?,?,?,?,'todo',?,?,?)")
      .bind(id,input.title,input.description,input.projectSlug,input.teamCode,input.priority,input.dueAt,input.actorId),
    db.prepare("INSERT INTO portal_activity_log (actor,action,entity_type,entity_id,details_json) VALUES (?,'task.create','task',?,?)")
      .bind(input.actorEmail,id,JSON.stringify({ title: input.title, projectSlug: input.projectSlug })),
  ]);
  return id;
}

export async function updatePortalTaskStatus(id: string, status: string, actor: string) {
  if (!["backlog","todo","doing","review","blocked","done"].includes(status)) {
    throw new Error("Invalid task status.");
  }
  const db = database();
  await db.batch([
    db.prepare("UPDATE portal_tasks SET status=?,updated_at=CURRENT_TIMESTAMP WHERE id=?").bind(status,id),
    db.prepare("INSERT INTO portal_activity_log (actor,action,entity_type,entity_id,details_json) VALUES (?,'task.status','task',?,?)")
      .bind(actor,id,JSON.stringify({ status })),
  ]);
}

export async function listPortalResources(kind?: string) {
  const sql = kind
    ? "SELECT * FROM portal_resources WHERE kind=? ORDER BY updated_at DESC LIMIT 150"
    : "SELECT * FROM portal_resources ORDER BY updated_at DESC LIMIT 150";
  const stmt = database().prepare(sql);
  const response = kind ? await stmt.bind(kind).all<Record<string, unknown>>() : await stmt.all<Record<string, unknown>>();
  return response.results ?? [];
}

export async function createPortalResource(input: {
  kind: string;
  title: string;
  description: string;
  teamCode: string | null;
  projectSlug: string | null;
  externalUrl: string | null;
  tags: string[];
  actorId: string;
  actorEmail: string;
}) {
  const allowed = ["document","archive","library","drawing","pcb","bom","code","procedure","dataset","media"];
  if (!allowed.includes(input.kind)) throw new Error("Invalid resource kind.");
  const id = crypto.randomUUID();
  const db = database();
  await db.batch([
    db.prepare("INSERT INTO portal_resources (id,kind,title,description,team_code,project_slug,external_url,tags_json,created_by) VALUES (?,?,?,?,?,?,?,?,?)")
      .bind(id,input.kind,input.title,input.description,input.teamCode,input.projectSlug,input.externalUrl,JSON.stringify(input.tags),input.actorId),
    db.prepare("INSERT INTO portal_activity_log (actor,action,entity_type,entity_id,details_json) VALUES (?,'resource.create','resource',?,?)")
      .bind(input.actorEmail,id,JSON.stringify({ kind: input.kind, title: input.title })),
  ]);
  return id;
}

export async function listPortalRepositories() {
  const response = await database().prepare("SELECT * FROM portal_repositories ORDER BY name").all<Record<string, unknown>>();
  return response.results ?? [];
}

export async function createPortalRepository(input: {
  name: string;
  repoUrl: string;
  projectSlug: string | null;
  teamCode: string | null;
  visibility: string;
  actorEmail: string;
}) {
  const id = crypto.randomUUID();
  const db = database();
  await db.batch([
    db.prepare("INSERT INTO portal_repositories (id,name,repo_url,project_slug,team_code,visibility) VALUES (?,?,?,?,?,?)")
      .bind(id,input.name,input.repoUrl,input.projectSlug,input.teamCode,input.visibility),
    db.prepare("INSERT INTO portal_activity_log (actor,action,entity_type,entity_id,details_json) VALUES (?,'repository.register','repository',?,?)")
      .bind(input.actorEmail,id,JSON.stringify({ name: input.name, url: input.repoUrl })),
  ]);
  return id;
}

export async function listPortalInventory() {
  const response = await database().prepare(
    "SELECT *,quantity-reserved_quantity AS available_quantity FROM portal_inventory_items ORDER BY CASE WHEN quantity-reserved_quantity<=minimum_quantity THEN 0 ELSE 1 END,category,name"
  ).all<Record<string, unknown>>();
  return response.results ?? [];
}

export async function upsertPortalInventoryItem(input: {
  sku: string;
  name: string;
  category: string;
  location: string;
  unit: string;
  quantity: number;
  minimumQuantity: number;
  actorEmail: string;
}) {
  const db = database();
  const existing = await db.prepare("SELECT id,quantity FROM portal_inventory_items WHERE sku=? LIMIT 1")
    .bind(input.sku)
    .first<{ id: string; quantity: number }>();
  const id = existing?.id ?? crypto.randomUUID();
  const delta = input.quantity - Number(existing?.quantity ?? 0);

  await db.batch([
    db.prepare("INSERT INTO portal_inventory_items (id,sku,name,category,location,unit,quantity,minimum_quantity) VALUES (?,?,?,?,?,?,?,?) ON CONFLICT(sku) DO UPDATE SET name=excluded.name,category=excluded.category,location=excluded.location,unit=excluded.unit,quantity=excluded.quantity,minimum_quantity=excluded.minimum_quantity,updated_at=CURRENT_TIMESTAMP")
      .bind(id,input.sku,input.name,input.category,input.location,input.unit,input.quantity,input.minimumQuantity),
    db.prepare("INSERT INTO portal_inventory_movements (id,item_id,delta,reason) VALUES (?,?,?,'manual sync')")
      .bind(crypto.randomUUID(),id,delta),
    db.prepare("INSERT INTO portal_activity_log (actor,action,entity_type,entity_id,details_json) VALUES (?,'inventory.sync','inventory',?,?)")
      .bind(input.actorEmail,id,JSON.stringify({ sku: input.sku, quantity: input.quantity })),
  ]);
  return id;
}

export async function listPortalChannels() {
  const response = await database().prepare("SELECT * FROM portal_channels ORDER BY name").all<Record<string, unknown>>();
  return response.results ?? [];
}

export async function listPortalMessages(channelId: string, limit = 80) {
  const response = await database().prepare(
    "SELECT msg.id,msg.body,msg.created_at,msg.edited_at,m.full_name,m.email,m.role FROM portal_messages msg JOIN portal_members m ON m.id=msg.author_id WHERE msg.channel_id=? ORDER BY msg.created_at DESC LIMIT ?"
  ).bind(channelId,limit).all<Record<string, unknown>>();
  return (response.results ?? []).reverse();
}

export async function sendPortalMessage(channelId: string, memberId: string, body: string) {
  const id = crypto.randomUUID();
  await database().prepare("INSERT INTO portal_messages (id,channel_id,author_id,body) VALUES (?,?,?,?)")
    .bind(id,channelId,memberId,body).run();
  return id;
}

export async function listPortalMailThreads(memberId: string) {
  const response = await database().prepare(
    "SELECT t.id,t.subject,t.updated_at,(SELECT body FROM portal_mail_messages mm WHERE mm.thread_id=t.id ORDER BY mm.created_at DESC LIMIT 1) AS preview FROM portal_mail_threads t JOIN portal_mail_participants p ON p.thread_id=t.id WHERE p.member_id=? ORDER BY t.updated_at DESC LIMIT 100"
  ).bind(memberId).all<Record<string, unknown>>();
  return response.results ?? [];
}

export async function listPortalCalendar() {
  const response = await database().prepare(
    "SELECT * FROM portal_calendar_events WHERE datetime(starts_at)>=datetime('now','-1 day') ORDER BY datetime(starts_at) ASC LIMIT 100"
  ).all<Record<string, unknown>>();
  return response.results ?? [];
}

export async function listPortalNotifications(memberId: string) {
  const response = await database().prepare(
    "SELECT * FROM portal_notifications WHERE member_id=? OR member_id IS NULL ORDER BY read_at IS NULL DESC,created_at DESC LIMIT 100"
  ).bind(memberId).all<Record<string, unknown>>();
  return response.results ?? [];
}

export async function listPortalVehicles() {
  const response = await database().prepare(
    "SELECT v.*,(SELECT latitude FROM portal_telemetry_snapshots t WHERE t.vehicle_id=v.id ORDER BY t.recorded_at DESC LIMIT 1) AS latitude,(SELECT longitude FROM portal_telemetry_snapshots t WHERE t.vehicle_id=v.id ORDER BY t.recorded_at DESC LIMIT 1) AS longitude,(SELECT battery FROM portal_telemetry_snapshots t WHERE t.vehicle_id=v.id ORDER BY t.recorded_at DESC LIMIT 1) AS battery,(SELECT mode FROM portal_telemetry_snapshots t WHERE t.vehicle_id=v.id ORDER BY t.recorded_at DESC LIMIT 1) AS telemetry_mode FROM portal_vehicle_units v ORDER BY v.name"
  ).all<Record<string, unknown>>();
  return response.results ?? [];
}

export async function listPortalActivity(limit = 40) {
  const response = await database().prepare("SELECT * FROM portal_activity_log ORDER BY created_at DESC LIMIT ?")
    .bind(limit).all<Record<string, unknown>>();
  return response.results ?? [];
}
