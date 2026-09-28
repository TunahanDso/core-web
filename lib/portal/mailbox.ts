import { env } from "cloudflare:workers";
import { listPortalMailThreads } from "@/lib/portal/db";

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
