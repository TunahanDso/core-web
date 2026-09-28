import { env } from "cloudflare:workers";

const MAX_PORTAL_FILE_BYTES = 25 * 1024 * 1024;

function database() {
  if (!env.DB) throw new Error("DB bağlantısı kullanılamıyor.");
  return env.DB;
}

function bucket() {
  if (!env.MEDIA) throw new Error("MEDIA / R2 bağlantısı kullanılamıyor.");
  return env.MEDIA;
}

export function portalFileExtension(name: string) {
  const cleaned = name.trim();
  const dot = cleaned.lastIndexOf(".");
  return dot >= 0 ? cleaned.slice(dot + 1).toLowerCase() : "";
}

export function portalPreviewKind(name: string, mimeType: string) {
  const ext = portalFileExtension(name);
  if (mimeType.startsWith("image/")) return "image";
  if (mimeType === "application/pdf" || ext === "pdf") return "pdf";
  if (["csv","tsv"].includes(ext)) return "csv";
  if (["stl","obj"].includes(ext)) return "stl";
  if (ext === "kicad_pcb") return "kicad-pcb";
  if (["step","stp","iges","igs","sldprt","sldasm","f3d","ipt","iam"].includes(ext)) return "cad";
  if (["gbr","ger","gtl","gbl","gto","gbo","drl"].includes(ext)) return "pcb";
  if ([
    "txt","md","json","yaml","yml","xml","ini","cfg","toml","log","sql",
    "c","h","cpp","hpp","cc","cs","py","js","jsx","ts","tsx","java","kt",
    "rs","go","sh","ino","cmake","gradle","css","html","svg","kicad_sch"
  ].includes(ext) || mimeType.startsWith("text/")) return "text";
  return "download";
}

function safeName(name: string) {
  return name
    .normalize("NFKC")
    .replace(/[^\p{L}\p{N}._()\- +]/gu, "_")
    .replace(/\s+/g, " ")
    .slice(0, 180) || "file";
}

async function checksumHex(buffer: ArrayBuffer) {
  const digest = await crypto.subtle.digest("SHA-256", buffer);
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

export async function uploadPortalFile(input: {
  file: File;
  memberId: string;
  kind?: string;
  projectSlug?: string | null;
  teamCode?: string | null;
  note?: string;
  existingFileId?: string | null;
}) {
  if (!(input.file instanceof File) || input.file.size <= 0) {
    throw new Error("Yüklenecek dosya seçilmedi.");
  }
  if (input.file.size > MAX_PORTAL_FILE_BYTES) {
    throw new Error("Tek dosya için üst sınır 25 MB.");
  }

  const db = database();
  const media = bucket();
  const name = safeName(input.file.name);
  const extension = portalFileExtension(name);
  const mimeType = input.file.type || "application/octet-stream";
  const previewKind = portalPreviewKind(name, mimeType);
  const bytes = await input.file.arrayBuffer();
  const checksum = await checksumHex(bytes);
  const nowId = crypto.randomUUID();

  let fileId = input.existingFileId || null;
  let versionNo = 1;

  if (fileId) {
    const existing = await db.prepare(
      "SELECT id FROM portal_files WHERE id=? LIMIT 1"
    ).bind(fileId).first<{ id: string }>();
    if (!existing) throw new Error("Sürümlenecek dosya bulunamadı.");
    const row = await db.prepare(
      "SELECT COALESCE(MAX(version_no),0)+1 AS next_version FROM portal_file_versions WHERE file_id=?"
    ).bind(fileId).first<{ next_version: number }>();
    versionNo = Number(row?.next_version ?? 1);
  } else {
    fileId = nowId;
  }

  const objectKey =
    "portal/" +
    (input.projectSlug ? "projects/" + input.projectSlug + "/" : "library/") +
    fileId + "/v" + versionNo + "/" + name;

  await media.put(objectKey, bytes, {
    httpMetadata: { contentType: mimeType },
  });

  const statements = [];
  if (versionNo === 1) {
    statements.push(
      db.prepare(
        "INSERT INTO portal_files (id,name,object_key,mime_type,extension,size_bytes,kind,preview_kind,project_slug,team_code,uploaded_by) VALUES (?,?,?,?,?,?,?,?,?,?,?)"
      ).bind(
        fileId,name,objectKey,mimeType,extension,input.file.size,input.kind || "file",
        previewKind,input.projectSlug || null,input.teamCode || null,input.memberId
      )
    );
  } else {
    statements.push(
      db.prepare(
        "UPDATE portal_files SET name=?,object_key=?,mime_type=?,extension=?,size_bytes=?,preview_kind=?,project_slug=?,team_code=?,updated_at=CURRENT_TIMESTAMP WHERE id=?"
      ).bind(
        name,objectKey,mimeType,extension,input.file.size,previewKind,
        input.projectSlug || null,input.teamCode || null,fileId
      )
    );
  }

  statements.push(
    db.prepare(
      "INSERT INTO portal_file_versions (id,file_id,version_no,object_key,size_bytes,mime_type,checksum,note,created_by) VALUES (?,?,?,?,?,?,?,?,?)"
    ).bind(
      crypto.randomUUID(),fileId,versionNo,objectKey,input.file.size,mimeType,checksum,
      input.note || "",input.memberId
    )
  );

  await db.batch(statements);

  return { id: fileId, versionNo, objectKey, previewKind, checksum };
}

export async function listPortalFiles(input?: {
  projectSlug?: string | null;
  kind?: string | null;
  limit?: number;
}) {
  const db = database();
  const conditions: string[] = [];
  const values: unknown[] = [];
  if (input?.projectSlug) {
    conditions.push("f.project_slug=?");
    values.push(input.projectSlug);
  }
  if (input?.kind) {
    conditions.push("f.kind=?");
    values.push(input.kind);
  }

  const sql =
    "SELECT f.*,m.full_name AS uploader_name," +
    "(SELECT COUNT(*) FROM portal_file_versions v WHERE v.file_id=f.id) AS version_count " +
    "FROM portal_files f LEFT JOIN portal_members m ON m.id=f.uploaded_by " +
    (conditions.length ? "WHERE " + conditions.join(" AND ") + " " : "") +
    "ORDER BY f.updated_at DESC LIMIT ?";

  values.push(Math.min(Math.max(input?.limit ?? 200,1),500));
  const result = await db.prepare(sql).bind(...values).all<Record<string, unknown>>();
  return result.results ?? [];
}

export async function getPortalFile(fileId: string) {
  return database().prepare(
    "SELECT f.*,m.full_name AS uploader_name,m.email AS uploader_email FROM portal_files f LEFT JOIN portal_members m ON m.id=f.uploaded_by WHERE f.id=? LIMIT 1"
  ).bind(fileId).first<Record<string, unknown>>();
}

export async function listPortalFileVersions(fileId: string) {
  const result = await database().prepare(
    "SELECT v.*,m.full_name AS creator_name,m.email AS creator_email FROM portal_file_versions v LEFT JOIN portal_members m ON m.id=v.created_by WHERE v.file_id=? ORDER BY v.version_no DESC"
  ).bind(fileId).all<Record<string, unknown>>();
  return result.results ?? [];
}

export async function readPortalTextFile(fileId: string, maxBytes = 1024 * 1024) {
  const metadata = await getPortalFile(fileId);
  if (!metadata) return null;
  if (Number(metadata.size_bytes || 0) > maxBytes) return null;
  const object = await bucket().get(String(metadata.object_key));
  if (!object) return null;
  return new Response(object.body).text();
}

export async function getPortalFileObject(fileId: string) {
  const metadata = await getPortalFile(fileId);
  if (!metadata) return null;
  const object = await bucket().get(String(metadata.object_key));
  if (!object) return null;
  return { metadata, object };
}

export async function createPortalFileResource(input: {
  fileId: string;
  title: string;
  description: string;
  kind: string;
  teamCode: string | null;
  projectSlug: string | null;
  tags: string[];
  actorId: string;
  actorEmail: string;
}) {
  const db = database();
  const resourceId = crypto.randomUUID();
  await db.batch([
    db.prepare(
      "INSERT INTO portal_resources (id,kind,title,description,team_code,project_slug,object_key,tags_json,created_by) " +
      "SELECT ?,?,?,?,?,?,object_key,?,? FROM portal_files WHERE id=?"
    ).bind(
      resourceId,input.kind,input.title,input.description,input.teamCode,input.projectSlug,
      JSON.stringify(input.tags),input.actorId,input.fileId
    ),
    db.prepare(
      "INSERT INTO portal_activity_log (actor,action,entity_type,entity_id,details_json) VALUES (?,'file.upload','file',?,?)"
    ).bind(input.actorEmail,input.fileId,JSON.stringify({ title: input.title, kind: input.kind })),
  ]);
  return resourceId;
}
