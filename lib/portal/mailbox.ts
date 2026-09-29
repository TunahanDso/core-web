import { env } from "cloudflare:workers";
import { listPortalMailThreads } from "@/lib/portal/db";
import { ensurePortalMailWorkspaceSchema } from "@/lib/portal/bootstrap";

function database() {
  if (!env.DB) throw new Error("Portal database binding is not available.");
  return env.DB;
}

export type PortalMailboxFolder = "inbox" | "sent" | "starred" | "archive" | "trash";

export async function listPortalMailboxThreads(
  memberId: string,
  folder: PortalMailboxFolder = "inbox"
): Promise<Record<string, unknown>[]> {
  const db = database();
  try {
    let condition = "COALESCE(s.folder,'inbox')='inbox'";
    if (folder === "archive") condition = "COALESCE(s.folder,'inbox')='archive'";
    if (folder === "trash") condition = "COALESCE(s.folder,'inbox')='trash'";
    if (folder === "starred") condition = "COALESCE(s.starred,0)=1 AND COALESCE(s.folder,'inbox')!='trash'";
    if (folder === "sent") {
      condition = "COALESCE(s.folder,'inbox')!='trash' AND EXISTS (SELECT 1 FROM portal_mail_messages sx WHERE sx.thread_id=t.id AND sx.author_id=?)";
    }

    const sql =
      "SELECT t.id,t.subject,t.created_by,t.updated_at," +
      "(SELECT body FROM portal_mail_messages mm WHERE mm.thread_id=t.id ORDER BY mm.created_at DESC LIMIT 1) AS preview," +
      "(SELECT m.full_name FROM portal_mail_messages mm JOIN portal_members m ON m.id=mm.author_id WHERE mm.thread_id=t.id ORDER BY mm.created_at DESC LIMIT 1) AS last_author," +
      "(SELECT COUNT(*) FROM portal_mail_messages mm WHERE mm.thread_id=t.id) AS message_count," +
      "(SELECT COUNT(*) FROM portal_mail_participants pp WHERE pp.thread_id=t.id) AS participant_count," +
      "COALESCE(s.folder,'inbox') AS folder,COALESCE(s.starred,0) AS starred,COALESCE(s.unread,0) AS unread " +
      "FROM portal_mail_threads t " +
      "JOIN portal_mail_participants p ON p.thread_id=t.id AND p.member_id=? " +
      "LEFT JOIN portal_mail_state s ON s.thread_id=t.id AND s.member_id=? " +
      "WHERE " + condition + " ORDER BY t.updated_at DESC LIMIT 150";

    const bindings = folder === "sent" ? [memberId,memberId,memberId] : [memberId,memberId];
    const response = await db.prepare(sql).bind(...bindings).all<Record<string, unknown>>();
    return response.results ?? [];
  } catch {
    if (folder !== "inbox") return [];
    const legacy = await listPortalMailThreads(memberId);
    return legacy.map((item) => ({ ...item, folder: "inbox", starred: 0, unread: 0 }) as Record<string, unknown>);
  }
}

export async function listPortalMailDrafts(memberId: string) {
  try {
    const response = await database().prepare(
      "SELECT * FROM portal_mail_drafts WHERE owner_id=? ORDER BY updated_at DESC LIMIT 100"
    ).bind(memberId).all<Record<string, unknown>>();
    return response.results ?? [];
  } catch {
    return [];
  }
}

export async function savePortalMailDraft(input: {
  draftId?: string | null;
  ownerId: string;
  subject: string;
  body: string;
  recipientIds: string[];
  replyToThreadId?: string | null;
}) {
  const db = database();
  const id = input.draftId || crypto.randomUUID();
  await db.prepare(
    "INSERT INTO portal_mail_drafts (id,owner_id,subject,body,recipients_json,reply_to_thread_id,updated_at) " +
    "VALUES (?,?,?,?,?,?,CURRENT_TIMESTAMP) " +
    "ON CONFLICT(id) DO UPDATE SET subject=excluded.subject,body=excluded.body,recipients_json=excluded.recipients_json,reply_to_thread_id=excluded.reply_to_thread_id,updated_at=CURRENT_TIMESTAMP " +
    "WHERE portal_mail_drafts.owner_id=excluded.owner_id"
  ).bind(
    id,input.ownerId,input.subject,input.body,JSON.stringify(input.recipientIds),input.replyToThreadId || null
  ).run();
  return id;
}

export async function deletePortalMailDraft(draftId: string, ownerId: string) {
  await database().prepare(
    "DELETE FROM portal_mail_drafts WHERE id=? AND owner_id=?"
  ).bind(draftId,ownerId).run();
}

export async function initializePortalMailState(threadId: string, senderId: string, participantIds: string[]) {
  const db = database();
  const ids = Array.from(new Set([senderId,...participantIds]));
  try {
    await db.batch(ids.map((memberId) =>
      db.prepare(
        "INSERT INTO portal_mail_state (thread_id,member_id,folder,starred,unread,updated_at) VALUES (?,?, 'inbox',0,?,CURRENT_TIMESTAMP) " +
        "ON CONFLICT(thread_id,member_id) DO UPDATE SET folder='inbox',unread=excluded.unread,updated_at=CURRENT_TIMESTAMP"
      ).bind(threadId,memberId,memberId === senderId ? 0 : 1)
    ));
  } catch {
    // V2 compatibility until the additive V4 migration is applied.
  }
}

export async function markPortalMailReplyState(threadId: string, authorId: string) {
  const db = database();
  try {
    const participants = await db.prepare(
      "SELECT member_id FROM portal_mail_participants WHERE thread_id=?"
    ).bind(threadId).all<{ member_id: string }>();
    await db.batch((participants.results ?? []).map((row) =>
      db.prepare(
        "INSERT INTO portal_mail_state (thread_id,member_id,folder,starred,unread,updated_at) VALUES (?,?, 'inbox',0,?,CURRENT_TIMESTAMP) " +
        "ON CONFLICT(thread_id,member_id) DO UPDATE SET folder=CASE WHEN portal_mail_state.folder='trash' THEN 'trash' ELSE 'inbox' END,unread=excluded.unread,updated_at=CURRENT_TIMESTAMP"
      ).bind(threadId,row.member_id,row.member_id === authorId ? 0 : 1)
    ));
  } catch {
    // V2 compatibility.
  }
}

export async function markPortalMailOpened(threadId: string, memberId: string) {
  try {
    await database().prepare(
      "INSERT INTO portal_mail_state (thread_id,member_id,folder,starred,unread,updated_at) VALUES (?,?, 'inbox',0,0,CURRENT_TIMESTAMP) " +
      "ON CONFLICT(thread_id,member_id) DO UPDATE SET unread=0,updated_at=CURRENT_TIMESTAMP"
    ).bind(threadId,memberId).run();
  } catch {
    // V2 compatibility.
  }
}

export async function mutatePortalMailState(input: {
  threadId: string;
  memberId: string;
  operation: "archive" | "trash" | "restore" | "star" | "unstar" | "read" | "unread";
}) {
  const db = database();
  const participant = await db.prepare(
    "SELECT 1 AS ok FROM portal_mail_participants WHERE thread_id=? AND member_id=? LIMIT 1"
  ).bind(input.threadId,input.memberId).first<{ ok: number }>();
  if (!participant) throw new Error("Bu yazışmaya erişim yok.");

  const operation = input.operation;
  const folder = operation === "archive" ? "archive" : operation === "trash" ? "trash" : operation === "restore" ? "inbox" : null;
  const starred = operation === "star" ? 1 : operation === "unstar" ? 0 : null;
  const unread = operation === "unread" ? 1 : operation === "read" ? 0 : null;

  await db.prepare(
    "INSERT INTO portal_mail_state (thread_id,member_id,folder,starred,unread,updated_at) VALUES (?,?, ?,?,?,CURRENT_TIMESTAMP) " +
    "ON CONFLICT(thread_id,member_id) DO UPDATE SET " +
    "folder=COALESCE(?,portal_mail_state.folder),starred=COALESCE(?,portal_mail_state.starred),unread=COALESCE(?,portal_mail_state.unread),updated_at=CURRENT_TIMESTAMP"
  ).bind(
    input.threadId,input.memberId,folder || "inbox",starred ?? 0,unread ?? 0,
    folder,starred,unread
  ).run();
}

export async function getPortalMailboxCounts(memberId: string) {
  try {
    const row = await database().prepare(
      "SELECT " +
      "SUM(CASE WHEN COALESCE(s.folder,'inbox')='inbox' THEN 1 ELSE 0 END) AS inbox," +
      "SUM(CASE WHEN COALESCE(s.folder,'inbox')='inbox' AND COALESCE(s.unread,0)=1 THEN 1 ELSE 0 END) AS unread," +
      "SUM(CASE WHEN COALESCE(s.starred,0)=1 AND COALESCE(s.folder,'inbox')!='trash' THEN 1 ELSE 0 END) AS starred," +
      "SUM(CASE WHEN COALESCE(s.folder,'inbox')='archive' THEN 1 ELSE 0 END) AS archive," +
      "SUM(CASE WHEN COALESCE(s.folder,'inbox')='trash' THEN 1 ELSE 0 END) AS trash " +
      "FROM portal_mail_participants p LEFT JOIN portal_mail_state s ON s.thread_id=p.thread_id AND s.member_id=p.member_id WHERE p.member_id=?"
    ).bind(memberId).first<Record<string, unknown>>();
    return {
      inbox: Number(row?.inbox || 0),
      unread: Number(row?.unread || 0),
      starred: Number(row?.starred || 0),
      archive: Number(row?.archive || 0),
      trash: Number(row?.trash || 0),
    };
  } catch {
    const legacy = await listPortalMailThreads(memberId);
    return { inbox: legacy.length, unread: 0, starred: 0, archive: 0, trash: 0 };
  }
}


export async function getPortalMailDraft(draftId: string, memberId: string) {
  try {
    return await database().prepare(
      "SELECT * FROM portal_mail_drafts WHERE id=? AND owner_id=? LIMIT 1"
    ).bind(draftId,memberId).first<Record<string, unknown>>();
  } catch {
    return null;
  }
}

export async function listPortalMailParticipants(threadId: string) {
  const response = await database().prepare(
    "SELECT m.id,m.full_name,m.email,m.role FROM portal_mail_participants p JOIN portal_members m ON m.id=p.member_id WHERE p.thread_id=? ORDER BY m.full_name,m.email"
  ).bind(threadId).all<Record<string, unknown>>();
  return response.results ?? [];
}


export async function attachPortalVaultFilesToLatestMessage(input: {
  threadId: string;
  authorId: string;
  vaultFileIds: string[];
}) {
  const ids = Array.from(new Set(input.vaultFileIds.filter(Boolean))).slice(0, 12);
  if (!ids.length) return;

  const db = database();
  const message = await db.prepare(
    "SELECT id FROM portal_mail_messages WHERE thread_id=? AND author_id=? ORDER BY created_at DESC LIMIT 1"
  ).bind(input.threadId,input.authorId).first<{ id: string }>();
  if (!message) throw new Error("Eklenecek mail mesajı bulunamadı.");

  await db.batch(ids.map((fileId) =>
    db.prepare(
      "INSERT OR IGNORE INTO portal_mail_attachments (id,message_id,vault_file_id) VALUES (?,?,?)"
    ).bind(crypto.randomUUID(),message.id,fileId)
  ));
}

export async function listPortalMailAttachments(threadId: string) {
  try {
    const response = await database().prepare(
      "SELECT a.id,a.message_id,a.vault_file_id,v.title,v.original_name,v.extension,v.mime_type,v.size_bytes,v.revision " +
      "FROM portal_mail_attachments a JOIN portal_vault_files v ON v.id=a.vault_file_id " +
      "JOIN portal_mail_messages mm ON mm.id=a.message_id WHERE mm.thread_id=? ORDER BY mm.created_at,a.created_at"
    ).bind(threadId).all<Record<string, unknown>>();
    return response.results ?? [];
  } catch {
    return [];
  }
}


function mailGroupBytesToBase64(bytes: Uint8Array) {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

function mailGroupBase64ToBytes(value: string) {
  const binary = atob(value);
  return Uint8Array.from(binary, (char) => char.charCodeAt(0));
}

async function deriveMailGroupAccessHash(code: string, salt: Uint8Array) {
  const saltBuffer = new ArrayBuffer(salt.byteLength);
  new Uint8Array(saltBuffer).set(salt);
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(code),
    "PBKDF2",
    false,
    ["deriveBits"]
  );
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", salt: saltBuffer, iterations: 100000, hash: "SHA-256" },
    key,
    256
  );
  return mailGroupBytesToBase64(new Uint8Array(bits));
}

function constantTimeStringEqual(left: string, right: string) {
  const a = new TextEncoder().encode(left);
  const b = new TextEncoder().encode(right);
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let index = 0; index < a.length; index += 1) diff |= a[index] ^ b[index];
  return diff === 0;
}

export async function listPortalMailGroups(memberId: string) {
  await ensurePortalMailWorkspaceSchema();
  try {
    const response = await database().prepare(
      "SELECT g.id,g.name,g.description,g.owner_id,g.access_mode,g.created_at,g.updated_at," +
      "gm.member_role,(SELECT COUNT(*) FROM portal_mail_group_members x WHERE x.group_id=g.id) AS member_count " +
      "FROM portal_mail_groups g JOIN portal_mail_group_members gm ON gm.group_id=g.id AND gm.member_id=? " +
      "ORDER BY CASE gm.member_role WHEN 'owner' THEN 0 ELSE 1 END,g.name"
    ).bind(memberId).all<Record<string, unknown>>();
    return response.results ?? [];
  } catch {
    return [];
  }
}

export async function listPortalJoinableMailGroups(memberId: string) {
  await ensurePortalMailWorkspaceSchema();
  try {
    const response = await database().prepare(
      "SELECT g.id,g.name,g.description,g.owner_id,g.access_mode,g.created_at,g.updated_at," +
      "(SELECT COUNT(*) FROM portal_mail_group_members x WHERE x.group_id=g.id) AS member_count " +
      "FROM portal_mail_groups g WHERE g.access_mode='locked' " +
      "AND NOT EXISTS (SELECT 1 FROM portal_mail_group_members gm WHERE gm.group_id=g.id AND gm.member_id=?) " +
      "ORDER BY g.name LIMIT 100"
    ).bind(memberId).all<Record<string, unknown>>();
    return response.results ?? [];
  } catch {
    return [];
  }
}

export async function listPortalMailGroupMembers(groupId: string, viewerId: string) {
  await ensurePortalMailWorkspaceSchema();
  const access = await database().prepare(
    "SELECT 1 AS ok FROM portal_mail_group_members WHERE group_id=? AND member_id=? LIMIT 1"
  ).bind(groupId,viewerId).first<{ ok: number }>();
  if (!access) throw new Error("Bu grubu görüntüleme yetkiniz yok.");

  const response = await database().prepare(
    "SELECT m.id,m.full_name,m.email,m.role,gm.member_role,gm.created_at " +
    "FROM portal_mail_group_members gm JOIN portal_members m ON m.id=gm.member_id " +
    "WHERE gm.group_id=? ORDER BY CASE gm.member_role WHEN 'owner' THEN 0 ELSE 1 END,m.full_name,m.email"
  ).bind(groupId).all<Record<string, unknown>>();
  return response.results ?? [];
}

export async function createPortalMailGroup(input: {
  ownerId: string;
  name: string;
  description: string;
  accessMode: "private" | "locked";
  accessCode?: string | null;
  memberIds: string[];
}) {
  await ensurePortalMailWorkspaceSchema();
  const name = input.name.trim().slice(0,80);
  if (!name) throw new Error("Grup adı gerekli.");

  let accessCodeSalt: string | null = null;
  let accessCodeHash: string | null = null;
  if (input.accessMode === "locked") {
    const code = String(input.accessCode || "");
    if (code.length < 6) throw new Error("Erişim kodu en az 6 karakter olmalı.");
    const salt = crypto.getRandomValues(new Uint8Array(16));
    accessCodeSalt = mailGroupBytesToBase64(salt);
    accessCodeHash = await deriveMailGroupAccessHash(code,salt);
  }

  const db = database();
  const id = crypto.randomUUID();
  const members = Array.from(new Set([input.ownerId,...input.memberIds.filter(Boolean)])).slice(0,100);
  await db.batch([
    db.prepare(
      "INSERT INTO portal_mail_groups (id,name,description,owner_id,access_mode,access_code_salt,access_code_hash) VALUES (?,?,?,?,?,?,?)"
    ).bind(id,name,input.description.trim().slice(0,500),input.ownerId,input.accessMode,accessCodeSalt,accessCodeHash),
    ...members.map((memberId) =>
      db.prepare(
        "INSERT INTO portal_mail_group_members (group_id,member_id,member_role,added_by) VALUES (?,?,?,?)"
      ).bind(id,memberId,memberId === input.ownerId ? "owner" : "member",input.ownerId)
    ),
  ]);
  return id;
}

export async function joinPortalMailGroup(input: {
  groupId: string;
  memberId: string;
  accessCode: string;
}) {
  await ensurePortalMailWorkspaceSchema();
  const group = await database().prepare(
    "SELECT id,access_mode,access_code_salt,access_code_hash FROM portal_mail_groups WHERE id=? LIMIT 1"
  ).bind(input.groupId).first<Record<string, unknown>>();
  if (!group || String(group.access_mode) !== "locked") {
    throw new Error("Erişim kodlu grup bulunamadı.");
  }

  const salt = mailGroupBase64ToBytes(String(group.access_code_salt || ""));
  const expected = String(group.access_code_hash || "");
  const actual = await deriveMailGroupAccessHash(input.accessCode,salt);
  if (!expected || !constantTimeStringEqual(actual,expected)) {
    throw new Error("Erişim kodu geçersiz.");
  }

  await database().prepare(
    "INSERT OR IGNORE INTO portal_mail_group_members (group_id,member_id,member_role,added_by) VALUES (?,?,'member',?)"
  ).bind(input.groupId,input.memberId,input.memberId).run();
}

export async function deletePortalMailGroup(groupId: string, ownerId: string) {
  await ensurePortalMailWorkspaceSchema();
  const owned = await database().prepare(
    "SELECT 1 AS ok FROM portal_mail_groups WHERE id=? AND owner_id=? LIMIT 1"
  ).bind(groupId,ownerId).first<{ ok: number }>();
  if (!owned) throw new Error("Bu grubu silme yetkiniz yok.");
  await database().prepare("DELETE FROM portal_mail_groups WHERE id=?").bind(groupId).run();
}

export async function resolvePortalMailGroupRecipients(groupIds: string[], memberId: string) {
  await ensurePortalMailWorkspaceSchema();
  const ids = Array.from(new Set(groupIds.filter(Boolean))).slice(0,20);
  if (!ids.length) return [] as string[];

  const recipients = new Set<string>();
  for (const groupId of ids) {
    const access = await database().prepare(
      "SELECT 1 AS ok FROM portal_mail_group_members WHERE group_id=? AND member_id=? LIMIT 1"
    ).bind(groupId,memberId).first<{ ok: number }>();
    if (!access) continue;

    const members = await database().prepare(
      "SELECT member_id FROM portal_mail_group_members WHERE group_id=?"
    ).bind(groupId).all<{ member_id: string }>();
    for (const row of members.results ?? []) {
      if (row.member_id !== memberId) recipients.add(row.member_id);
    }
  }
  return Array.from(recipients).slice(0,100);
}

export async function linkPortalMailThreadGroups(threadId: string, groupIds: string[], memberId: string) {
  await ensurePortalMailWorkspaceSchema();
  const ids = Array.from(new Set(groupIds.filter(Boolean))).slice(0,20);
  if (!ids.length) return;
  const db = database();
  const statements = [];
  for (const groupId of ids) {
    const access = await db.prepare(
      "SELECT 1 AS ok FROM portal_mail_group_members WHERE group_id=? AND member_id=? LIMIT 1"
    ).bind(groupId,memberId).first<{ ok: number }>();
    if (access) {
      statements.push(
        db.prepare("INSERT OR IGNORE INTO portal_mail_thread_groups (thread_id,group_id) VALUES (?,?)")
          .bind(threadId,groupId)
      );
    }
  }
  if (statements.length) await db.batch(statements);
}

export async function listPortalMailThreadGroups(threadId: string, memberId: string) {
  await ensurePortalMailWorkspaceSchema();
  const participant = await database().prepare(
    "SELECT 1 AS ok FROM portal_mail_participants WHERE thread_id=? AND member_id=? LIMIT 1"
  ).bind(threadId,memberId).first<{ ok: number }>();
  if (!participant) return [];

  try {
    const response = await database().prepare(
      "SELECT g.id,g.name,g.access_mode FROM portal_mail_thread_groups tg " +
      "JOIN portal_mail_groups g ON g.id=tg.group_id WHERE tg.thread_id=? ORDER BY g.name"
    ).bind(threadId).all<Record<string, unknown>>();
    return response.results ?? [];
  } catch {
    return [];
  }
}
