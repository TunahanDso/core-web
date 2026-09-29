import { env } from "cloudflare:workers";
import { ensurePortalVaultUploadSchema } from "@/lib/portal/bootstrap";
import {
  PORTAL_VAULT_MAX_BYTES,
  getPortalVaultFile,
  normalizeVaultKind,
  portalVaultPreviewKind,
} from "@/lib/portal/vault";

type UploadMode = "new" | "revision";

type VaultUploadSession = {
  id: string;
  member_id: string;
  actor_email: string;
  mode: UploadMode;
  target_file_id: string | null;
  file_id: string;
  revision: number;
  original_name: string;
  mime_type: string;
  expected_size: number;
  actual_size: number | null;
  checksum_sha256: string | null;
  object_key: string;
  capability_token: string;
  metadata_json: string;
  status: "initiated" | "uploaded" | "completed" | "failed" | "expired";
  expires_at: string;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
};

function database() {
  if (!env.DB) throw new Error("Portal database binding is not available.");
  return env.DB;
}

function mediaBucket() {
  if (!env.MEDIA) throw new Error("Portal R2 media binding is not available.");
  return env.MEDIA;
}

function safeObjectName(name: string) {
  const ascii = name
    .normalize("NFKD")
    .replace(/[^\x20-\x7E]/g, "")
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^[-.]+|[-.]+$/g, "");
  return (ascii || "engineering-file").slice(0, 140);
}

function normalizeExtension(name: string) {
  const clean = name.trim().toLowerCase();
  const dot = clean.lastIndexOf(".");
  return dot >= 0 ? clean.slice(dot + 1).replace(/[^a-z0-9_+-]/g, "") : "";
}

function token() {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return Array.from(bytes).map((value) => value.toString(16).padStart(2,"0")).join("");
}

async function sha256Hex(bytes: ArrayBuffer) {
  const digest = await crypto.subtle.digest("SHA-256",bytes);
  return Array.from(new Uint8Array(digest))
    .map((value) => value.toString(16).padStart(2,"0"))
    .join("");
}

function parseMetadata(value: string) {
  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === "object" ? parsed as Record<string,unknown> : {};
  } catch {
    return {};
  }
}

function expired(session: VaultUploadSession) {
  const at = new Date(session.expires_at).getTime();
  return Number.isFinite(at) && at <= Date.now();
}

async function loadSession(sessionId: string, memberId: string) {
  await ensurePortalVaultUploadSchema();
  const row = await database().prepare(
    "SELECT * FROM portal_vault_upload_sessions WHERE id=? AND member_id=? LIMIT 1"
  ).bind(sessionId,memberId).first<VaultUploadSession>();
  if (!row) throw new Error("Vault upload session bulunamadı.");
  if (expired(row) && !["completed","expired"].includes(row.status)) {
    await database().prepare(
      "UPDATE portal_vault_upload_sessions SET status='expired',updated_at=CURRENT_TIMESTAMP WHERE id=?"
    ).bind(sessionId).run();
    throw new Error("Vault upload session süresi doldu.");
  }
  return row;
}

export async function createVaultUploadSession(input: {
  memberId: string;
  actorEmail: string;
  mode: UploadMode;
  targetFileId?: string | null;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  metadata: Record<string,unknown>;
}) {
  await ensurePortalVaultUploadSchema();
  const sizeBytes = Number(input.sizeBytes || 0);
  if (!Number.isFinite(sizeBytes) || sizeBytes <= 0) throw new Error("Dosya boyutu geçersiz.");
  if (sizeBytes > PORTAL_VAULT_MAX_BYTES) throw new Error("Tek dosya üst sınırı 25 MB.");

  const originalName = input.fileName.trim() || "engineering-file";
  const mimeType = input.mimeType.trim() || "application/octet-stream";
  const sessionId = crypto.randomUUID();
  const capabilityToken = token();
  const expiresAt = new Date(Date.now() + 30 * 60 * 1000).toISOString();

  let fileId = crypto.randomUUID();
  let revision = 1;
  let targetFileId: string | null = null;

  if (input.mode === "revision") {
    targetFileId = String(input.targetFileId || "").trim();
    if (!targetFileId) throw new Error("Revision hedefi gerekli.");
    const current = await getPortalVaultFile(targetFileId);
    if (!current) throw new Error("Vault kaydı bulunamadı.");
    fileId = targetFileId;
    revision = Number(current.revision || 0) + 1;
  }

  const objectKey = `portal/vault/${fileId}/r${revision}/${safeObjectName(originalName)}`;
  await database().prepare(
    "INSERT INTO portal_vault_upload_sessions " +
    "(id,member_id,actor_email,mode,target_file_id,file_id,revision,original_name,mime_type,expected_size,object_key,capability_token,metadata_json,status,expires_at) " +
    "VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,'initiated',?)"
  ).bind(
    sessionId,
    input.memberId,
    input.actorEmail,
    input.mode,
    targetFileId,
    fileId,
    revision,
    originalName,
    mimeType,
    sizeBytes,
    objectKey,
    JSON.stringify(input.metadata || {}),
    expiresAt
  ).run();

  return {
    sessionId,
    capabilityToken,
    fileId,
    revision,
    expiresAt,
    uploadUrl:"/api/portal/vault/uploads/" + encodeURIComponent(sessionId),
    completeUrl:"/api/portal/vault/uploads/" + encodeURIComponent(sessionId) + "/complete",
  };
}

export async function writeVaultUploadBody(input: {
  sessionId: string;
  memberId: string;
  request: Request;
}) {
  const session = await loadSession(input.sessionId,input.memberId);
  if (session.status === "completed") {
    return {
      uploaded:true,
      sessionId:session.id,
      sizeBytes:Number(session.actual_size || session.expected_size),
      checksum:session.checksum_sha256,
    };
  }
  if (!["initiated","uploaded"].includes(session.status)) {
    throw new Error("Vault upload session dosya kabul etmiyor.");
  }

  const declaredLength = Number(input.request.headers.get("content-length") || 0);
  if (declaredLength && declaredLength !== Number(session.expected_size)) {
    throw new Error("Gönderilen dosya boyutu upload session ile eşleşmiyor.");
  }
  if (declaredLength > PORTAL_VAULT_MAX_BYTES) throw new Error("Tek dosya üst sınırı 25 MB.");

  const bytes = await input.request.arrayBuffer();
  if (bytes.byteLength !== Number(session.expected_size)) {
    throw new Error("Dosya boyutu beklenen değerle eşleşmiyor.");
  }
  if (bytes.byteLength > PORTAL_VAULT_MAX_BYTES) throw new Error("Tek dosya üst sınırı 25 MB.");

  const checksum = await sha256Hex(bytes);
  await mediaBucket().put(session.object_key,bytes,{
    httpMetadata:{ contentType:session.mime_type || "application/octet-stream" },
  });

  await database().prepare(
    "UPDATE portal_vault_upload_sessions SET status='uploaded',actual_size=?,checksum_sha256=?,updated_at=CURRENT_TIMESTAMP WHERE id=?"
  ).bind(bytes.byteLength,checksum,session.id).run();

  return {
    uploaded:true,
    sessionId:session.id,
    sizeBytes:bytes.byteLength,
    checksum,
  };
}

export async function completeVaultUploadSession(input: {
  sessionId: string;
  memberId: string;
}) {
  const session = await loadSession(input.sessionId,input.memberId);
  if (session.status === "completed") {
    return {
      completed:true,
      fileId:session.file_id,
      revision:Number(session.revision),
      href:"/portal/library/" + encodeURIComponent(session.file_id),
    };
  }
  if (session.status !== "uploaded" || !session.checksum_sha256 || !session.actual_size) {
    throw new Error("Dosya R2'ye yüklenmeden Vault kaydı finalize edilemez.");
  }

  const metadata = parseMetadata(session.metadata_json);
  const databaseRef = database();
  const extension = normalizeExtension(session.original_name);
  const previewKind = portalVaultPreviewKind(session.original_name,session.mime_type);

  if (session.mode === "new") {
    const visibilityRaw = String(metadata.visibility || "members");
    const visibility = ["members","team","leads","admins"].includes(visibilityRaw) ? visibilityRaw : "members";
    const kind = normalizeVaultKind(String(metadata.kind || "document"));
    const tags = Array.isArray(metadata.tags)
      ? Array.from(new Set(metadata.tags.map((item) => String(item).trim().toLowerCase()).filter(Boolean))).slice(0,30)
      : [];
    try {
      await databaseRef.batch([
        databaseRef.prepare(
          "INSERT INTO portal_vault_files " +
          "(id,title,description,kind,original_name,extension,mime_type,size_bytes,checksum_sha256,object_key,preview_kind,team_code,project_slug,tags_json,visibility,revision,created_by) " +
          "VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)"
        ).bind(
          session.file_id,
          String(metadata.title || "").trim() || session.original_name,
          String(metadata.description || "").trim(),
          kind,
          session.original_name,
          extension,
          session.mime_type,
          session.actual_size,
          session.checksum_sha256,
          session.object_key,
          previewKind,
          String(metadata.teamCode || "").trim() || null,
          String(metadata.projectSlug || "").trim() || null,
          JSON.stringify(tags),
          visibility,
          session.revision,
          session.actor_email
        ),
        databaseRef.prepare(
          "INSERT INTO portal_vault_versions " +
          "(id,file_id,revision,original_name,mime_type,size_bytes,checksum_sha256,object_key,note,created_by) " +
          "VALUES (?,?,?,?,?,?,?,?,?,?)"
        ).bind(
          crypto.randomUUID(),
          session.file_id,
          session.revision,
          session.original_name,
          session.mime_type,
          session.actual_size,
          session.checksum_sha256,
          session.object_key,
          "Initial Vault upload",
          session.actor_email
        ),
        databaseRef.prepare(
          "UPDATE portal_vault_upload_sessions SET status='completed',completed_at=CURRENT_TIMESTAMP,updated_at=CURRENT_TIMESTAMP WHERE id=?"
        ).bind(session.id),
        databaseRef.prepare(
          "INSERT INTO portal_activity_log (actor,action,entity_type,entity_id,details_json) VALUES (?,'vault.file.create','vault_file',?,?)"
        ).bind(session.actor_email,session.file_id,JSON.stringify({
          originalName:session.original_name,
          checksum:session.checksum_sha256,
          revision:session.revision,
          transport:"raw-put",
        })),
      ]);
    } catch (error) {
      await databaseRef.prepare(
        "UPDATE portal_vault_upload_sessions SET status='failed',updated_at=CURRENT_TIMESTAMP WHERE id=?"
      ).bind(session.id).run();
      throw error;
    }

    return {
      completed:true,
      fileId:session.file_id,
      revision:session.revision,
      href:"/portal/library/" + encodeURIComponent(session.file_id) + "?uploaded=1",
    };
  }

  const current = await getPortalVaultFile(String(session.target_file_id || ""));
  if (!current) throw new Error("Revision hedefi artık bulunamıyor.");
  const expectedRevision = Number(current.revision || 0) + 1;
  if (expectedRevision !== Number(session.revision)) {
    throw new Error("Bu Vault kaydına başka bir revision eklendi. Yeni upload session başlat.");
  }

  try {
    await databaseRef.batch([
      databaseRef.prepare(
        "INSERT INTO portal_vault_versions " +
        "(id,file_id,revision,original_name,mime_type,size_bytes,checksum_sha256,object_key,note,created_by) " +
        "VALUES (?,?,?,?,?,?,?,?,?,?)"
      ).bind(
        crypto.randomUUID(),
        session.file_id,
        session.revision,
        session.original_name,
        session.mime_type,
        session.actual_size,
        session.checksum_sha256,
        session.object_key,
        String(metadata.note || "").trim(),
        session.actor_email
      ),
      databaseRef.prepare(
        "UPDATE portal_vault_files SET original_name=?,extension=?,mime_type=?,size_bytes=?,checksum_sha256=?,object_key=?,preview_kind=?,revision=?,approval_state='draft',updated_at=CURRENT_TIMESTAMP WHERE id=?"
      ).bind(
        session.original_name,
        extension,
        session.mime_type,
        session.actual_size,
        session.checksum_sha256,
        session.object_key,
        previewKind,
        session.revision,
        session.file_id
      ),
      databaseRef.prepare(
        "UPDATE portal_vault_upload_sessions SET status='completed',completed_at=CURRENT_TIMESTAMP,updated_at=CURRENT_TIMESTAMP WHERE id=?"
      ).bind(session.id),
      databaseRef.prepare(
        "INSERT INTO portal_activity_log (actor,action,entity_type,entity_id,details_json) VALUES (?,'vault.file.version','vault_file',?,?)"
      ).bind(session.actor_email,session.file_id,JSON.stringify({
        revision:session.revision,
        originalName:session.original_name,
        checksum:session.checksum_sha256,
        transport:"raw-put",
      })),
    ]);
  } catch (error) {
    await databaseRef.prepare(
      "UPDATE portal_vault_upload_sessions SET status='failed',updated_at=CURRENT_TIMESTAMP WHERE id=?"
    ).bind(session.id).run();
    throw error;
  }

  return {
    completed:true,
    fileId:session.file_id,
    revision:session.revision,
    href:"/portal/library/" + encodeURIComponent(session.file_id) + "?versioned=1",
  };
}
