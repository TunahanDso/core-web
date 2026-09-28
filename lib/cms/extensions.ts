import { env } from "cloudflare:workers";

function db() {
  if (!env.DB) throw new Error("DB binding is not available.");
  return env.DB;
}

export async function listPublications() {
  const response = await db().prepare(
    "SELECT c.id,c.slug,c.status,c.domain,c.cover_key,c.metadata_json,c.updated_at," +
    "MAX(CASE WHEN l.locale='tr' THEN l.title END) AS title_tr," +
    "MAX(CASE WHEN l.locale='en' THEN l.title END) AS title_en," +
    "MAX(CASE WHEN l.locale='tr' THEN l.summary END) AS summary_tr," +
    "MAX(CASE WHEN l.locale='en' THEN l.summary END) AS summary_en " +
    "FROM content_items c LEFT JOIN content_localizations l ON l.content_id=c.id " +
    "WHERE c.type='publication' GROUP BY c.id ORDER BY c.updated_at DESC"
  ).all<Record<string, unknown>>();
  return response.results ?? [];
}

export async function createPublication(input: {
  titleTr: string;
  titleEn: string;
  summaryTr: string;
  summaryEn: string;
  bodyTr: string;
  bodyEn: string;
  domain: string | null;
  kind: string;
  externalUrl: string | null;
  status: "draft" | "published" | "archived";
  actor: string;
}) {
  const database = db();
  const id = crypto.randomUUID();
  const slugBase = (input.titleEn || input.titleTr)
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 70) || "publication";
  const slug = slugBase + "-" + id.slice(0, 6);
  const localStatus = input.status === "published" ? "published" : "draft";
  const metadata = JSON.stringify({ kind: input.kind, external_url: input.externalUrl });

  await database.batch([
    database.prepare("INSERT INTO content_items (id,type,slug,status,domain,metadata_json,published_at) VALUES (?,'publication',?,?,?,?,CASE WHEN ?='published' THEN CURRENT_TIMESTAMP ELSE NULL END)")
      .bind(id,slug,input.status,input.domain,metadata,input.status),
    database.prepare("INSERT INTO content_localizations (content_id,locale,title,summary,body,seo_title,seo_description,publication_status) VALUES (?,'tr',?,?,?,'','',?)")
      .bind(id,input.titleTr,input.summaryTr,input.bodyTr,localStatus),
    database.prepare("INSERT INTO content_localizations (content_id,locale,title,summary,body,seo_title,seo_description,publication_status) VALUES (?,'en',?,?,?,'','',?)")
      .bind(id,input.titleEn,input.summaryEn,input.bodyEn,localStatus),
    database.prepare("INSERT INTO audit_log (actor,action,entity_type,entity_id,details_json) VALUES (?,'publication.create','publication',?,?)")
      .bind(input.actor,id,JSON.stringify({ kind: input.kind, status: input.status })),
  ]);
  return id;
}

export async function listMediaAssets() {
  const response = await db().prepare("SELECT * FROM media_assets ORDER BY created_at DESC LIMIT 250").all<Record<string, unknown>>();
  return response.results ?? [];
}

export async function storeMediaAsset(input: {
  file: File;
  altTr: string;
  altEn: string;
  actor: string;
}) {
  if (!env.MEDIA) throw new Error("MEDIA binding is not available.");
  const allowed = new Set([
    "image/jpeg","image/png","image/webp","image/svg+xml",
    "application/pdf","text/plain","text/csv","application/zip",
  ]);
  if (!allowed.has(input.file.type)) throw new Error("Unsupported media type.");
  if (input.file.size <= 0 || input.file.size > 25 * 1024 * 1024) {
    throw new Error("File must be between 1 byte and 25 MB.");
  }

  const id = crypto.randomUUID();
  const safeName = input.file.name.replace(/[^a-zA-Z0-9._-]+/g, "-").slice(-120);
  const key = "cms/" + new Date().toISOString().slice(0, 10) + "/" + id + "-" + safeName;
  const bytes = await input.file.arrayBuffer();

  await env.MEDIA.put(key, bytes, { httpMetadata: { contentType: input.file.type } });
  try {
    await db().batch([
      db().prepare("INSERT INTO media_assets (id,object_key,mime_type,size_bytes,alt_tr,alt_en) VALUES (?,?,?,?,?,?)")
        .bind(id,key,input.file.type,input.file.size,input.altTr,input.altEn),
      db().prepare("INSERT INTO audit_log (actor,action,entity_type,entity_id,details_json) VALUES (?,'media.upload','media',?,?)")
        .bind(input.actor,id,JSON.stringify({ key, type: input.file.type, size: input.file.size })),
    ]);
  } catch (error) {
    await env.MEDIA.delete(key);
    throw error;
  }

  return id;
}

export async function getMediaAsset(id: string) {
  return db().prepare("SELECT * FROM media_assets WHERE id=? LIMIT 1").bind(id).first<Record<string, unknown>>();
}

export async function listSiteSettings() {
  const response = await db().prepare("SELECT setting_key,value_json,updated_at FROM site_settings ORDER BY setting_key").all<Record<string, unknown>>();
  return response.results ?? [];
}

export async function saveSiteSetting(key: string, value: unknown, actor: string) {
  const database = db();
  await database.batch([
    database.prepare("INSERT INTO site_settings (setting_key,value_json,updated_at) VALUES (?,?,CURRENT_TIMESTAMP) ON CONFLICT(setting_key) DO UPDATE SET value_json=excluded.value_json,updated_at=CURRENT_TIMESTAMP")
      .bind(key,JSON.stringify(value)),
    database.prepare("INSERT INTO audit_log (actor,action,entity_type,entity_id,details_json) VALUES (?,'setting.update','setting',?,?)")
      .bind(actor,key,JSON.stringify({ value })),
  ]);
}


export async function listPublishedPublications(locale: "tr" | "en") {
  const response = await db().prepare(
    "SELECT c.id,c.slug,c.domain,c.metadata_json,c.published_at,l.title,l.summary,l.body " +
    "FROM content_items c JOIN content_localizations l ON l.content_id=c.id " +
    "WHERE c.type='publication' AND c.status='published' AND l.locale=? AND l.publication_status='published' " +
    "ORDER BY c.published_at DESC,c.updated_at DESC LIMIT 100"
  ).bind(locale).all<Record<string, unknown>>();
  return response.results ?? [];
}

export async function getSiteSetting(key: string) {
  const row = await db().prepare("SELECT value_json FROM site_settings WHERE setting_key=? LIMIT 1")
    .bind(key)
    .first<{ value_json: string }>();
  if (!row) return null;
  try { return JSON.parse(row.value_json) as Record<string, unknown>; } catch { return null; }
}
