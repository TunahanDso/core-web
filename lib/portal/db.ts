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
    "SELECT m.id,m.email,m.full_name,m.role,m.status,m.teams_json,m.activated_at,m.last_login_at,m.created_at," +
    "(SELECT d.status FROM portal_invites i JOIN portal_invite_deliveries d ON d.invite_id=i.id WHERE i.member_id=m.id ORDER BY d.attempted_at DESC LIMIT 1) AS invite_delivery_status," +
    "(SELECT d.provider FROM portal_invites i JOIN portal_invite_deliveries d ON d.invite_id=i.id WHERE i.member_id=m.id ORDER BY d.attempted_at DESC LIMIT 1) AS invite_delivery_provider," +
    "(SELECT d.attempted_at FROM portal_invites i JOIN portal_invite_deliveries d ON d.invite_id=i.id WHERE i.member_id=m.id ORDER BY d.attempted_at DESC LIMIT 1) AS invite_delivery_at " +
    "FROM portal_members m ORDER BY CASE m.status WHEN 'active' THEN 0 WHEN 'invited' THEN 1 ELSE 2 END,m.full_name,m.email"
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

  return {
    inviteId,
    memberId: effectiveMemberId,
    code,
    email,
    fullName: input.fullName.trim(),
    expiresAt,
  };
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
  assigneeId?: string | null;
  actorId: string;
  actorEmail: string;
}) {
  const id = crypto.randomUUID();
  const db = database();
  await db.batch([
    db.prepare("INSERT INTO portal_tasks (id,title,description,project_slug,team_code,assignee_id,status,priority,due_at,created_by) VALUES (?,?,?,?,?,?,'todo',?,?,?)")
      .bind(id,input.title,input.description,input.projectSlug,input.teamCode,input.assigneeId ?? null,input.priority,input.dueAt,input.actorId),
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


export async function createPortalMailThread(input: {
  subject: string;
  body: string;
  senderId: string;
  participantIds: string[];
}) {
  const db = database();
  const threadId = crypto.randomUUID();
  const messageId = crypto.randomUUID();
  const uniqueParticipants = Array.from(new Set([input.senderId, ...input.participantIds]));

  const statements = [
    db.prepare("INSERT INTO portal_mail_threads (id,subject,created_by) VALUES (?,?,?)")
      .bind(threadId,input.subject,input.senderId),
    db.prepare("INSERT INTO portal_mail_messages (id,thread_id,author_id,body) VALUES (?,?,?,?)")
      .bind(messageId,threadId,input.senderId,input.body),
    ...uniqueParticipants.map((memberId) =>
      db.prepare("INSERT OR IGNORE INTO portal_mail_participants (thread_id,member_id) VALUES (?,?)")
        .bind(threadId,memberId)
    ),
  ];
  await db.batch(statements);
  return threadId;
}

export async function createPortalCalendarEvent(input: {
  title: string;
  description: string;
  startsAt: string;
  endsAt: string | null;
  location: string;
  teamCode: string | null;
  projectSlug: string | null;
  actorId: string;
  actorEmail: string;
}) {
  const id = crypto.randomUUID();
  const db = database();
  await db.batch([
    db.prepare("INSERT INTO portal_calendar_events (id,title,description,starts_at,ends_at,location,team_code,project_slug,created_by) VALUES (?,?,?,?,?,?,?,?,?)")
      .bind(id,input.title,input.description,input.startsAt,input.endsAt,input.location,input.teamCode,input.projectSlug,input.actorId),
    db.prepare("INSERT INTO portal_activity_log (actor,action,entity_type,entity_id,details_json) VALUES (?,'calendar.create','calendar',?,?)")
      .bind(input.actorEmail,id,JSON.stringify({ title: input.title, startsAt: input.startsAt })),
  ]);
  return id;
}

export async function createPortalNotification(input: {
  memberId: string | null;
  kind: string;
  title: string;
  body: string;
  href: string | null;
  actorEmail: string;
}) {
  const id = crypto.randomUUID();
  const db = database();
  await db.batch([
    db.prepare("INSERT INTO portal_notifications (id,member_id,kind,title,body,href) VALUES (?,?,?,?,?,?)")
      .bind(id,input.memberId,input.kind,input.title,input.body,input.href),
    db.prepare("INSERT INTO portal_activity_log (actor,action,entity_type,entity_id,details_json) VALUES (?,'notification.create','notification',?,?)")
      .bind(input.actorEmail,id,JSON.stringify({ title: input.title, memberId: input.memberId })),
  ]);
  return id;
}

export async function markPortalNotificationRead(id: string, memberId: string) {
  await database().prepare(
    "UPDATE portal_notifications SET read_at=CURRENT_TIMESTAMP WHERE id=? AND (member_id=? OR member_id IS NULL)"
  ).bind(id,memberId).run();
}

export async function getPortalAnalytics() {
  const row = await database().prepare(
    "SELECT " +
    "(SELECT COUNT(*) FROM portal_members) AS members_total," +
    "(SELECT COUNT(*) FROM portal_members WHERE status='active') AS members_active," +
    "(SELECT COUNT(*) FROM portal_tasks) AS tasks_total," +
    "(SELECT COUNT(*) FROM portal_tasks WHERE status='done') AS tasks_done," +
    "(SELECT COUNT(*) FROM portal_resources) AS resources_total," +
    "(SELECT COUNT(*) FROM portal_inventory_items) AS inventory_total," +
    "(SELECT COUNT(*) FROM portal_messages) AS messages_total," +
    "(SELECT COUNT(*) FROM audit_log) AS cms_audit_total," +
    "(SELECT COUNT(*) FROM portal_activity_log) AS portal_activity_total"
  ).first<Record<string, unknown>>();
  return row ?? {};
}

export async function getPortalMailThread(threadId: string, memberId: string) {
  const participant = await database().prepare(
    "SELECT 1 AS ok FROM portal_mail_participants WHERE thread_id=? AND member_id=? LIMIT 1"
  ).bind(threadId,memberId).first<{ ok: number }>();
  if (!participant) return null;

  const thread = await database().prepare(
    "SELECT * FROM portal_mail_threads WHERE id=? LIMIT 1"
  ).bind(threadId).first<Record<string, unknown>>();
  if (!thread) return null;

  const messages = await database().prepare(
    "SELECT mm.id,mm.body,mm.created_at,m.full_name,m.email FROM portal_mail_messages mm JOIN portal_members m ON m.id=mm.author_id WHERE mm.thread_id=? ORDER BY mm.created_at"
  ).bind(threadId).all<Record<string, unknown>>();

  return { thread, messages: messages.results ?? [] };
}


export async function setPortalMemberStatus(
  memberId: string,
  status: "active" | "suspended" | "archived",
  actorEmail: string
) {
  const db = database();
  const statements = [
    db.prepare("UPDATE portal_members SET status=?,updated_at=CURRENT_TIMESTAMP WHERE id=?").bind(status,memberId),
    db.prepare("INSERT INTO portal_activity_log (actor,action,entity_type,entity_id,details_json) VALUES (?,'member.status','member',?,?)")
      .bind(actorEmail,memberId,JSON.stringify({ status })),
  ];
  if (status !== "active") {
    statements.push(db.prepare("DELETE FROM portal_sessions WHERE member_id=?").bind(memberId));
  }
  await db.batch(statements);
}


export async function recordPortalInviteDelivery(input: {
  inviteId: string;
  recipient: string;
  provider: string;
  status: "pending" | "sent" | "failed" | "not_configured";
  messageId?: string;
  error?: string;
}) {
  await database().prepare(
    "INSERT INTO portal_invite_deliveries (id,invite_id,recipient,provider,status,message_id,error) VALUES (?,?,?,?,?,?,?)"
  ).bind(
    crypto.randomUUID(),
    input.inviteId,
    input.recipient,
    input.provider,
    input.status,
    input.messageId ?? null,
    input.error ?? null
  ).run();
}

export async function getPortalMemberById(memberId: string) {
  return database().prepare(
    "SELECT id,email,full_name,role,status,teams_json,activated_at,last_login_at,created_at FROM portal_members WHERE id=? LIMIT 1"
  ).bind(memberId).first<Record<string, unknown>>();
}

export async function reissuePortalInvite(memberId: string, createdBy: string) {
  const member = await getPortalMemberById(memberId);
  if (!member) throw new Error("Üye bulunamadı.");
  let teams: string[] = [];
  try {
    const parsed = JSON.parse(String(member.teams_json || "[]"));
    if (Array.isArray(parsed)) teams = parsed.filter((item): item is string => typeof item === "string");
  } catch {
    teams = [];
  }
  return createPortalInvite({
    email: String(member.email),
    fullName: String(member.full_name || member.email),
    role: String(member.role) as PortalRole,
    teams,
    createdBy,
  });
}

export async function getPortalTask(taskId: string) {
  const task = await database().prepare(
    "SELECT t.*,m.full_name AS assignee_name,m.email AS assignee_email,c.full_name AS creator_name,c.email AS creator_email " +
    "FROM portal_tasks t LEFT JOIN portal_members m ON m.id=t.assignee_id LEFT JOIN portal_members c ON c.id=t.created_by WHERE t.id=? LIMIT 1"
  ).bind(taskId).first<Record<string, unknown>>();
  if (!task) return null;

  const comments = await database().prepare(
    "SELECT c.id,c.body,c.created_at,m.full_name,m.email,m.role FROM portal_task_comments c JOIN portal_members m ON m.id=c.author_id WHERE c.task_id=? ORDER BY c.created_at"
  ).bind(taskId).all<Record<string, unknown>>();

  return { task, comments: comments.results ?? [] };
}

export async function addPortalTaskComment(input: {
  taskId: string;
  authorId: string;
  actorEmail: string;
  body: string;
}) {
  const db = database();
  await db.batch([
    db.prepare("INSERT INTO portal_task_comments (id,task_id,author_id,body) VALUES (?,?,?,?)")
      .bind(crypto.randomUUID(),input.taskId,input.authorId,input.body),
    db.prepare("UPDATE portal_tasks SET updated_at=CURRENT_TIMESTAMP WHERE id=?").bind(input.taskId),
    db.prepare("INSERT INTO portal_activity_log (actor,action,entity_type,entity_id,details_json) VALUES (?,'task.comment','task',?,?)")
      .bind(input.actorEmail,input.taskId,JSON.stringify({ length: input.body.length })),
  ]);
}

export async function updatePortalTaskDetails(input: {
  taskId: string;
  status: string;
  priority: string;
  assigneeId: string | null;
  dueAt: string | null;
  actorEmail: string;
}) {
  const statuses = ["backlog","todo","doing","review","blocked","done"];
  const priorities = ["low","medium","high","critical"];
  if (!statuses.includes(input.status)) throw new Error("Geçersiz görev durumu.");
  if (!priorities.includes(input.priority)) throw new Error("Geçersiz öncelik.");

  const db = database();
  await db.batch([
    db.prepare("UPDATE portal_tasks SET status=?,priority=?,assignee_id=?,due_at=?,updated_at=CURRENT_TIMESTAMP WHERE id=?")
      .bind(input.status,input.priority,input.assigneeId,input.dueAt,input.taskId),
    db.prepare("INSERT INTO portal_activity_log (actor,action,entity_type,entity_id,details_json) VALUES (?,'task.update','task',?,?)")
      .bind(input.actorEmail,input.taskId,JSON.stringify({
        status: input.status,
        priority: input.priority,
        assigneeId: input.assigneeId,
        dueAt: input.dueAt,
      })),
  ]);
}

export async function listMyPortalTasks(memberId: string, limit = 12) {
  const response = await database().prepare(
    "SELECT t.*,m.full_name AS assignee_name FROM portal_tasks t LEFT JOIN portal_members m ON m.id=t.assignee_id " +
    "WHERE t.assignee_id=? AND t.status!='done' ORDER BY CASE t.priority WHEN 'critical' THEN 0 WHEN 'high' THEN 1 WHEN 'medium' THEN 2 ELSE 3 END,datetime(t.due_at) IS NULL,datetime(t.due_at),t.updated_at DESC LIMIT ?"
  ).bind(memberId,limit).all<Record<string, unknown>>();
  return response.results ?? [];
}

export async function listPortalInventoryMovements(limit = 100) {
  const response = await database().prepare(
    "SELECT mv.id,mv.delta,mv.reason,mv.project_slug,mv.created_at,i.sku,i.name,i.unit,m.full_name AS member_name,m.email AS member_email " +
    "FROM portal_inventory_movements mv JOIN portal_inventory_items i ON i.id=mv.item_id LEFT JOIN portal_members m ON m.id=mv.member_id " +
    "ORDER BY mv.created_at DESC LIMIT ?"
  ).bind(limit).all<Record<string, unknown>>();
  return response.results ?? [];
}

export async function createPortalInventoryMovement(input: {
  itemId: string;
  delta: number;
  reason: string;
  projectSlug: string | null;
  memberId: string;
  actorEmail: string;
}) {
  const db = database();
  const item = await db.prepare("SELECT id,quantity,name,sku FROM portal_inventory_items WHERE id=? LIMIT 1")
    .bind(input.itemId)
    .first<{ id: string; quantity: number; name: string; sku: string }>();
  if (!item) throw new Error("Envanter ürünü bulunamadı.");
  const next = Number(item.quantity) + input.delta;
  if (next < 0) throw new Error("Stok miktarı sıfırın altına düşemez.");

  await db.batch([
    db.prepare("UPDATE portal_inventory_items SET quantity=?,updated_at=CURRENT_TIMESTAMP WHERE id=?")
      .bind(next,input.itemId),
    db.prepare("INSERT INTO portal_inventory_movements (id,item_id,member_id,delta,reason,project_slug) VALUES (?,?,?,?,?,?)")
      .bind(crypto.randomUUID(),input.itemId,input.memberId,input.delta,input.reason,input.projectSlug),
    db.prepare("INSERT INTO portal_activity_log (actor,action,entity_type,entity_id,details_json) VALUES (?,'inventory.movement','inventory',?,?)")
      .bind(input.actorEmail,input.itemId,JSON.stringify({ delta: input.delta, reason: input.reason, projectSlug: input.projectSlug })),
  ]);
}

export async function getPortalMemberProfile(memberId: string) {
  const member = await database().prepare(
    "SELECT id,email,full_name,role,status,teams_json,activated_at,last_login_at FROM portal_members WHERE id=? LIMIT 1"
  ).bind(memberId).first<Record<string, unknown>>();
  if (!member) return null;
  const profile = await database().prepare(
    "SELECT * FROM portal_member_profiles WHERE member_id=? LIMIT 1"
  ).bind(memberId).first<Record<string, unknown>>();
  return { member, profile };
}

export async function savePortalMemberProfile(input: {
  memberId: string;
  headline: string;
  bio: string;
  skills: string[];
  githubUrl: string | null;
  linkedinUrl: string | null;
  phone: string | null;
  availability: string;
  actorEmail: string;
}) {
  const db = database();
  await db.batch([
    db.prepare(
      "INSERT INTO portal_member_profiles (member_id,headline,bio,skills_json,github_url,linkedin_url,phone,availability,updated_at) " +
      "VALUES (?,?,?,?,?,?,?,?,CURRENT_TIMESTAMP) ON CONFLICT(member_id) DO UPDATE SET headline=excluded.headline,bio=excluded.bio,skills_json=excluded.skills_json,github_url=excluded.github_url,linkedin_url=excluded.linkedin_url,phone=excluded.phone,availability=excluded.availability,updated_at=CURRENT_TIMESTAMP"
    ).bind(input.memberId,input.headline,input.bio,JSON.stringify(input.skills),input.githubUrl,input.linkedinUrl,input.phone,input.availability),
    db.prepare("INSERT INTO portal_activity_log (actor,action,entity_type,entity_id,details_json) VALUES (?,'profile.update','member',?,'{}')")
      .bind(input.actorEmail,input.memberId),
  ]);
}

export async function searchPortal(query: string) {
  const q = "%" + query.trim().slice(0, 80) + "%";
  if (q === "%%") return { tasks: [], resources: [], repositories: [], inventory: [], members: [] };
  const db = database();
  const [tasks, resources, repositories, inventory, members] = await Promise.all([
    db.prepare("SELECT id,title,description,project_slug,status,priority FROM portal_tasks WHERE title LIKE ? OR description LIKE ? OR project_slug LIKE ? LIMIT 20").bind(q,q,q).all<Record<string, unknown>>(),
    db.prepare("SELECT id,kind,title,description,project_slug,external_url FROM portal_resources WHERE title LIKE ? OR description LIKE ? OR tags_json LIKE ? LIMIT 20").bind(q,q,q).all<Record<string, unknown>>(),
    db.prepare("SELECT id,name,repo_url,project_slug,team_code,health FROM portal_repositories WHERE name LIKE ? OR project_slug LIKE ? OR team_code LIKE ? LIMIT 20").bind(q,q,q).all<Record<string, unknown>>(),
    db.prepare("SELECT id,sku,name,category,location,quantity,unit FROM portal_inventory_items WHERE sku LIKE ? OR name LIKE ? OR category LIKE ? OR location LIKE ? LIMIT 20").bind(q,q,q,q).all<Record<string, unknown>>(),
    db.prepare("SELECT id,full_name,email,role,status,teams_json FROM portal_members WHERE full_name LIKE ? OR email LIKE ? OR teams_json LIKE ? LIMIT 20").bind(q,q,q).all<Record<string, unknown>>(),
  ]);
  return {
    tasks: tasks.results ?? [],
    resources: resources.results ?? [],
    repositories: repositories.results ?? [],
    inventory: inventory.results ?? [],
    members: members.results ?? [],
  };
}

export async function sendPortalMailReply(input: {
  threadId: string;
  authorId: string;
  body: string;
}) {
  const db = database();
  await db.batch([
    db.prepare("INSERT INTO portal_mail_messages (id,thread_id,author_id,body) VALUES (?,?,?,?)")
      .bind(crypto.randomUUID(),input.threadId,input.authorId,input.body),
    db.prepare("UPDATE portal_mail_threads SET updated_at=CURRENT_TIMESTAMP WHERE id=?").bind(input.threadId),
  ]);
}

export async function markPortalChannelRead(channelId: string, memberId: string) {
  await database().prepare(
    "INSERT INTO portal_channel_reads (channel_id,member_id,last_read_at) VALUES (?,?,CURRENT_TIMESTAMP) " +
    "ON CONFLICT(channel_id,member_id) DO UPDATE SET last_read_at=CURRENT_TIMESTAMP"
  ).bind(channelId,memberId).run();
}

export async function listPortalChannelsForMember(memberId: string) {
  const response = await database().prepare(
    "SELECT ch.*," +
    "(SELECT COUNT(*) FROM portal_messages msg WHERE msg.channel_id=ch.id AND datetime(msg.created_at)>datetime(COALESCE((SELECT cr.last_read_at FROM portal_channel_reads cr WHERE cr.channel_id=ch.id AND cr.member_id=?),'1970-01-01'))) AS unread_count," +
    "(SELECT msg.body FROM portal_messages msg WHERE msg.channel_id=ch.id ORDER BY msg.created_at DESC LIMIT 1) AS last_message " +
    "FROM portal_channels ch ORDER BY CASE ch.slug WHEN 'announcements' THEN 0 WHEN 'general' THEN 1 ELSE 2 END,ch.name"
  ).bind(memberId).all<Record<string, unknown>>();
  return response.results ?? [];
}
