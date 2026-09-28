import { env } from "cloudflare:workers";

export const PORTAL_VAULT_MAX_BYTES = 25 * 1024 * 1024;

export type PortalVaultKind =
  | "document"
  | "archive"
  | "library"
  | "drawing"
  | "mechanical"
  | "cad"
  | "pcb"
  | "electronics"
  | "bom"
  | "code"
  | "procedure"
  | "dataset"
  | "media"
  | "firmware"
  | "simulation";

const ALLOWED_KINDS = new Set<PortalVaultKind>([
  "document","archive","library","drawing","mechanical","cad","pcb","electronics",
  "bom","code","procedure","dataset","media","firmware","simulation",
]);

const TEXT_EXTENSIONS = new Set([
  "txt","md","markdown","csv","json","xml","yaml","yml","toml","ini","log",
  "c","cc","cpp","cxx","h","hh","hpp","hxx","ino","py","js","jsx","ts","tsx",
  "css","scss","html","sql","sh","cmake","kicad_pcb","kicad_sch","gbr","ger",
  "gerber","drl","pos","bom",
]);

const IMAGE_EXTENSIONS = new Set(["png","jpg","jpeg","webp","gif"]);
const MODEL_EXTENSIONS = new Set(["stl","obj"]);
const CAD_SOURCE_EXTENSIONS = new Set([
  "step","stp","iges","igs","3mf","gltf","glb","sldprt","sldasm","f3d","ipt","iam",
]);
const PCB_SOURCE_EXTENSIONS = new Set([
  "kicad_pcb","kicad_sch","gbr","ger","gerber","drl","pos","bom",
]);

function database() {
  if (!env.DB) throw new Error("Portal database binding is not available.");
  return env.DB;
}

function mediaBucket() {
  if (!env.MEDIA) throw new Error("Portal R2 media binding is not available.");
  return env.MEDIA;
}

function normalizeExtension(name: string) {
  const clean = name.trim().toLowerCase();
  const dot = clean.lastIndexOf(".");
  return dot >= 0 ? clean.slice(dot + 1).replace(/[^a-z0-9_+-]/g, "") : "";
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

export function portalVaultPreviewKind(filename: string, mimeType = "") {
  const ext = normalizeExtension(filename);
  const mime = mimeType.toLowerCase();
  if (ext === "pdf" || mime === "application/pdf") return "pdf";
  if (IMAGE_EXTENSIONS.has(ext) || /^image\/(png|jpeg|webp|gif)$/.test(mime)) return "image";
  if (MODEL_EXTENSIONS.has(ext)) return "model3d";
  if (PCB_SOURCE_EXTENSIONS.has(ext)) return "pcb-source";
  if (TEXT_EXTENSIONS.has(ext) || mime.startsWith("text/")) return "text";
  if (CAD_SOURCE_EXTENSIONS.has(ext)) return "cad-source";
  if (ext === "zip") return "archive";
  return "download";
}

export function normalizeVaultKind(value: string): PortalVaultKind {
  return ALLOWED_KINDS.has(value as PortalVaultKind)
    ? value as PortalVaultKind
    : "document";
}

async function sha256Hex(bytes: ArrayBuffer) {
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest))
    .map((value) => value.toString(16).padStart(2, "0"))
    .join("");
}

export async function listPortalVaultFiles(options: {
  kind?: string;
  query?: string;
  lifecycle?: "active" | "archived" | "trashed";
  limit?: number;
  viewer?: { role: string; teams: string[] };
} = {}) {
  const clauses = ["lifecycle_state=?"];
  const bindings: unknown[] = [options.lifecycle || "active"];

  if (options.kind) {
    clauses.push("kind=?");
    bindings.push(options.kind);
  }
  if (options.query?.trim()) {
    const q = `%${options.query.trim()}%`;
    clauses.push("(title LIKE ? OR description LIKE ? OR original_name LIKE ? OR tags_json LIKE ? OR project_slug LIKE ? OR team_code LIKE ?)");
    bindings.push(q,q,q,q,q,q);
  }

  const limit = Math.min(Math.max(options.limit ?? 200, 1), 500);
  bindings.push(limit);

  try {
    const response = await database().prepare(
      `SELECT * FROM portal_vault_files WHERE ${clauses.join(" AND ")} ORDER BY updated_at DESC LIMIT ?`
    ).bind(...bindings).all<Record<string, unknown>>();
    const rows = response.results ?? [];
    if (!options.viewer) return rows;
    const role = options.viewer.role;
    const teams = new Set(options.viewer.teams.map((item) => item.trim().toUpperCase()));
    return rows.filter((row) => {
      const visibility = String(row.visibility || "members");
      if (visibility === "members") return true;
      if (visibility === "admins") return role === "admin";
      if (visibility === "leads") return role === "admin" || role === "lead";
      if (visibility === "team") {
        const team = String(row.team_code || "").trim().toUpperCase();
        return !team || role === "admin" || teams.has(team);
      }
      return false;
    });
  } catch {
    // Backward compatibility: production can deploy before the additive V4 migration is applied.
    return [];
  }
}

export async function getPortalVaultFile(fileId: string) {
  try {
    return await database().prepare(
      "SELECT * FROM portal_vault_files WHERE id=? LIMIT 1"
    ).bind(fileId).first<Record<string, unknown>>();
  } catch {
    return null;
  }
}

export async function listPortalVaultVersions(fileId: string) {
  try {
    const response = await database().prepare(
      "SELECT * FROM portal_vault_versions WHERE file_id=? ORDER BY revision DESC"
    ).bind(fileId).all<Record<string, unknown>>();
    return response.results ?? [];
  } catch {
    return [];
  }
}

export async function listPortalDesignDerivatives(fileId: string) {
  try {
    const response = await database().prepare(
      "SELECT * FROM portal_design_derivatives WHERE file_id=? ORDER BY source_revision DESC, created_at DESC"
    ).bind(fileId).all<Record<string, unknown>>();
    return response.results ?? [];
  } catch {
    return [];
  }
}

export async function createPortalVaultFile(input: {
  file: File;
  title: string;
  description: string;
  kind: string;
  teamCode: string | null;
  projectSlug: string | null;
  tags: string[];
  visibility: "members" | "team" | "leads" | "admins";
  actorEmail: string;
}) {
  if (!(input.file instanceof File) || input.file.size <= 0) {
    throw new Error("Yüklenecek dosya seçilmedi.");
  }
  if (input.file.size > PORTAL_VAULT_MAX_BYTES) {
    throw new Error("İlk Vault sürümünde tek dosya üst sınırı 25 MB.");
  }

  const id = crypto.randomUUID();
  const versionId = crypto.randomUUID();
  const revision = 1;
  const originalName = input.file.name || "engineering-file";
  const objectName = safeObjectName(originalName);
  const extension = normalizeExtension(originalName);
  const mimeType = input.file.type || "application/octet-stream";
  const kind = normalizeVaultKind(input.kind);
  const visibility = ["members","team","leads","admins"].includes(input.visibility)
    ? input.visibility
    : "members";
  const bytes = await input.file.arrayBuffer();
  const checksum = await sha256Hex(bytes);
  const objectKey = `portal/vault/${id}/r${revision}/${objectName}`;
  const previewKind = portalVaultPreviewKind(originalName, mimeType);

  await mediaBucket().put(objectKey, bytes, { httpMetadata: { contentType: mimeType } });

  const db = database();
  try {
    await db.batch([
      db.prepare(
        "INSERT INTO portal_vault_files " +
        "(id,title,description,kind,original_name,extension,mime_type,size_bytes,checksum_sha256,object_key,preview_kind,team_code,project_slug,tags_json,visibility,revision,created_by) " +
        "VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)"
      ).bind(
        id,
        input.title.trim() || originalName,
        input.description.trim(),
        kind,
        originalName,
        extension,
        mimeType,
        input.file.size,
        checksum,
        objectKey,
        previewKind,
        input.teamCode,
        input.projectSlug,
        JSON.stringify(input.tags.slice(0, 30)),
        visibility,
        revision,
        input.actorEmail
      ),
      db.prepare(
        "INSERT INTO portal_vault_versions " +
        "(id,file_id,revision,original_name,mime_type,size_bytes,checksum_sha256,object_key,note,created_by) " +
        "VALUES (?,?,?,?,?,?,?,?,?,?)"
      ).bind(
        versionId,id,revision,originalName,mimeType,input.file.size,checksum,objectKey,
        "İlk sürüm",input.actorEmail
      ),
      db.prepare(
        "INSERT INTO portal_activity_log (actor,action,entity_type,entity_id,details_json) VALUES (?,'vault.file.create','vault_file',?,?)"
      ).bind(input.actorEmail,id,JSON.stringify({
        originalName,
        sizeBytes: input.file.size,
        checksum,
        kind,
        previewKind,
      })),
    ]);
  } catch (error) {
    await mediaBucket().delete(objectKey);
    throw error;
  }

  return id;
}

export async function createPortalVaultVersion(input: {
  fileId: string;
  file: File;
  note: string;
  actorEmail: string;
}) {
  if (!(input.file instanceof File) || input.file.size <= 0) {
    throw new Error("Yeni sürüm dosyası seçilmedi.");
  }
  if (input.file.size > PORTAL_VAULT_MAX_BYTES) {
    throw new Error("İlk Vault sürümünde tek dosya üst sınırı 25 MB.");
  }

  const current = await getPortalVaultFile(input.fileId);
  if (!current) throw new Error("Vault kaydı bulunamadı.");

  const revision = Number(current.revision || 0) + 1;
  const versionId = crypto.randomUUID();
  const originalName = input.file.name || String(current.original_name || "engineering-file");
  const extension = normalizeExtension(originalName);
  const mimeType = input.file.type || "application/octet-stream";
  const bytes = await input.file.arrayBuffer();
  const checksum = await sha256Hex(bytes);
  const objectKey = `portal/vault/${input.fileId}/r${revision}/${safeObjectName(originalName)}`;
  const previewKind = portalVaultPreviewKind(originalName, mimeType);

  await mediaBucket().put(objectKey, bytes, { httpMetadata: { contentType: mimeType } });

  const db = database();
  try {
    await db.batch([
      db.prepare(
        "INSERT INTO portal_vault_versions " +
        "(id,file_id,revision,original_name,mime_type,size_bytes,checksum_sha256,object_key,note,created_by) " +
        "VALUES (?,?,?,?,?,?,?,?,?,?)"
      ).bind(
        versionId,input.fileId,revision,originalName,mimeType,input.file.size,checksum,objectKey,
        input.note.trim(),input.actorEmail
      ),
      db.prepare(
        "UPDATE portal_vault_files SET original_name=?,extension=?,mime_type=?,size_bytes=?,checksum_sha256=?,object_key=?,preview_kind=?,revision=?,approval_state='draft',updated_at=CURRENT_TIMESTAMP WHERE id=?"
      ).bind(
        originalName,extension,mimeType,input.file.size,checksum,objectKey,previewKind,revision,input.fileId
      ),
      db.prepare(
        "INSERT INTO portal_activity_log (actor,action,entity_type,entity_id,details_json) VALUES (?,'vault.file.version','vault_file',?,?)"
      ).bind(input.actorEmail,input.fileId,JSON.stringify({ revision, originalName, checksum })),
    ]);
  } catch (error) {
    await mediaBucket().delete(objectKey);
    throw error;
  }

  return revision;
}

export async function updatePortalVaultLifecycle(input: {
  fileId: string;
  lifecycle: "active" | "archived" | "trashed";
  actorEmail: string;
}) {
  const db = database();
  await db.batch([
    db.prepare(
      "UPDATE portal_vault_files SET lifecycle_state=?,updated_at=CURRENT_TIMESTAMP WHERE id=?"
    ).bind(input.lifecycle,input.fileId),
    db.prepare(
      "INSERT INTO portal_activity_log (actor,action,entity_type,entity_id,details_json) VALUES (?,'vault.file.lifecycle','vault_file',?,?)"
    ).bind(input.actorEmail,input.fileId,JSON.stringify({ lifecycle: input.lifecycle })),
  ]);
}

export async function updatePortalVaultApproval(input: {
  fileId: string;
  approval: "draft" | "review" | "approved" | "rejected";
  actorEmail: string;
}) {
  const db = database();
  await db.batch([
    db.prepare(
      "UPDATE portal_vault_files SET approval_state=?,updated_at=CURRENT_TIMESTAMP WHERE id=?"
    ).bind(input.approval,input.fileId),
    db.prepare(
      "INSERT INTO portal_activity_log (actor,action,entity_type,entity_id,details_json) VALUES (?,'vault.file.approval','vault_file',?,?)"
    ).bind(input.actorEmail,input.fileId,JSON.stringify({ approval: input.approval })),
  ]);
}

export async function getPortalVaultObjectDescriptor(fileId: string, revision?: number | null) {
  const file = await getPortalVaultFile(fileId);
  if (!file) return null;

  if (revision && revision > 0 && revision !== Number(file.revision)) {
    const version = await database().prepare(
      "SELECT * FROM portal_vault_versions WHERE file_id=? AND revision=? LIMIT 1"
    ).bind(fileId,revision).first<Record<string, unknown>>();
    if (!version) return null;
    return {
      file,
      revision: Number(version.revision),
      objectKey: String(version.object_key),
      originalName: String(version.original_name),
      mimeType: String(version.mime_type || "application/octet-stream"),
      sizeBytes: Number(version.size_bytes || 0),
    };
  }

  return {
    file,
    revision: Number(file.revision || 1),
    objectKey: String(file.object_key),
    originalName: String(file.original_name),
    mimeType: String(file.mime_type || "application/octet-stream"),
    sizeBytes: Number(file.size_bytes || 0),
  };
}

export async function readPortalVaultTextPreview(fileId: string, revision?: number | null) {
  const descriptor = await getPortalVaultObjectDescriptor(fileId, revision);
  if (!descriptor) return null;
  if (descriptor.sizeBytes > 512 * 1024) {
    return {
      text: "",
      truncated: true,
      reason: "Metin önizlemesi 512 KB ile sınırlı.",
    };
  }

  const object = await mediaBucket().get(descriptor.objectKey);
  if (!object) return null;
  const bytes = await new Response(object.body).arrayBuffer();
  const text = new TextDecoder("utf-8", { fatal: false }).decode(bytes);
  return {
    text: text.slice(0, 300_000),
    truncated: text.length > 300_000,
    reason: text.length > 300_000 ? "Önizleme 300.000 karakterde kesildi." : "",
  };
}

export async function getPortalVaultObject(fileId: string, revision?: number | null) {
  const descriptor = await getPortalVaultObjectDescriptor(fileId, revision);
  if (!descriptor) return null;
  const object = await mediaBucket().get(descriptor.objectKey);
  if (!object) return null;
  return { descriptor, object };
}

export function formatVaultBytes(value: unknown) {
  const bytes = Math.max(0, Number(value || 0));
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}


export async function queuePortalDesignDerivative(input: {
  fileId: string;
  derivativeType: "gltf" | "glb" | "preview-svg" | "preview-png" | "pcb-3d" | "thumbnail" | "pdf";
  actorEmail: string;
}) {
  const file = await getPortalVaultFile(input.fileId);
  if (!file) throw new Error("Vault kaydı bulunamadı.");

  const revision = Number(file.revision || 1);
  const existing = await database().prepare(
    "SELECT id,status FROM portal_design_derivatives WHERE file_id=? AND source_revision=? AND derivative_type=? AND status IN ('queued','processing','ready') ORDER BY created_at DESC LIMIT 1"
  ).bind(input.fileId,revision,input.derivativeType).first<Record<string, unknown>>();
  if (existing) return { id: String(existing.id), status: String(existing.status) };

  const id = crypto.randomUUID();
  const db = database();
  await db.batch([
    db.prepare(
      "INSERT INTO portal_design_derivatives (id,file_id,source_revision,derivative_type,status) VALUES (?,?,?,?, 'queued')"
    ).bind(id,input.fileId,revision,input.derivativeType),
    db.prepare(
      "INSERT INTO portal_activity_log (actor,action,entity_type,entity_id,details_json) VALUES (?,'vault.derivative.queue','vault_file',?,?)"
    ).bind(input.actorEmail,input.fileId,JSON.stringify({
      derivativeId: id,
      revision,
      derivativeType: input.derivativeType,
    })),
  ]);
  return { id, status: "queued" };
}
