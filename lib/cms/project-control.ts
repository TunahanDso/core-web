import { env } from "cloudflare:workers";

type ShowcaseStatus = "draft" | "published" | "archived";

export type ShowcaseProjectSyncInput = {
  slug: string;
  status: ShowcaseStatus;
  domain: string | null;
  progress: number;
  owner: string | null;
  integrations: string[];
  titleTr: string;
  titleEn: string;
  summaryTr: string;
  summaryEn: string;
  categoryTr: string;
  categoryEn: string;
  statusTr: string;
  statusEn: string;
};

function database() {
  if (!env.DB) throw new Error("DB bağlantısı kullanılamıyor.");
  return env.DB;
}

function normalizeSlug(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9ğüşöçı-]+/gi, "-")
    .replace(/^-+|-+$/g, "");
}

function clampProgress(value: number) {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(100, Math.round(value)));
}

export async function syncShowcaseProject(
  input: ShowcaseProjectSyncInput,
  actor: string
) {
  const db = database();
  const slug = normalizeSlug(input.slug);
  if (!slug) throw new Error("Vitrin proje slug değeri gerekli.");
  if (!input.titleTr.trim()) throw new Error("Vitrin Türkçe proje adı gerekli.");
  if (!["draft", "published", "archived"].includes(input.status)) {
    throw new Error("Geçersiz vitrin yayın durumu.");
  }

  const existing = await db
    .prepare("SELECT id,metadata_json FROM content_items WHERE type='project' AND slug=? LIMIT 1")
    .bind(slug)
    .first<{ id: string; metadata_json: string }>();

  let metadata: Record<string, unknown> = {};
  try {
    metadata = JSON.parse(existing?.metadata_json || "{}") as Record<string, unknown>;
  } catch {
    metadata = {};
  }

  metadata.progress = clampProgress(input.progress);
  metadata.owner = input.owner;
  metadata.integrations = input.integrations.slice(0, 24);
  metadata.category_tr = input.categoryTr.trim();
  metadata.category_en = input.categoryEn.trim();
  metadata.status_tr = input.statusTr.trim();
  metadata.status_en = input.statusEn.trim();
  metadata.source = "portal-control-plane";

  const id = existing?.id || `project-${slug}`;
  const nextOrder = existing
    ? 0
    : Number(
        (
          await db
            .prepare("SELECT COALESCE(MAX(sort_order),0)+10 AS next_order FROM content_items WHERE type='project'")
            .first<{ next_order: number }>()
        )?.next_order ?? 10
      );
  const publicationStatus = input.status === "published" ? "published" : "draft";

  await db.batch([
    db
      .prepare(
        "INSERT INTO content_items (id,type,slug,status,domain,metadata_json,sort_order,published_at) " +
          "VALUES (?,'project',?,?,?,?,?,?,CASE WHEN ?='published' THEN CURRENT_TIMESTAMP ELSE NULL END) " +
          "ON CONFLICT(id) DO UPDATE SET slug=excluded.slug,status=excluded.status,domain=excluded.domain," +
          "metadata_json=excluded.metadata_json,updated_at=CURRENT_TIMESTAMP," +
          "published_at=CASE WHEN excluded.status='published' THEN COALESCE(content_items.published_at,CURRENT_TIMESTAMP) ELSE content_items.published_at END"
      )
      .bind(
        id,
        slug,
        input.status,
        input.domain,
        JSON.stringify(metadata),
        nextOrder,
        input.status
      ),
    db
      .prepare(
        "INSERT INTO content_localizations " +
          "(content_id,locale,title,summary,body,seo_title,seo_description,publication_status) " +
          "VALUES (?,'tr',?,?,'',?,'',?) " +
          "ON CONFLICT(content_id,locale) DO UPDATE SET title=excluded.title,summary=excluded.summary," +
          "seo_title=excluded.seo_title,publication_status=excluded.publication_status"
      )
      .bind(id, input.titleTr.trim(), input.summaryTr.trim(), `${input.titleTr.trim()} | YTÜ CORE`, publicationStatus),
    db
      .prepare(
        "INSERT INTO content_localizations " +
          "(content_id,locale,title,summary,body,seo_title,seo_description,publication_status) " +
          "VALUES (?,'en',?,?,'',?,'',?) " +
          "ON CONFLICT(content_id,locale) DO UPDATE SET title=excluded.title,summary=excluded.summary," +
          "seo_title=excluded.seo_title,publication_status=excluded.publication_status"
      )
      .bind(
        id,
        input.titleEn.trim() || input.titleTr.trim(),
        input.summaryEn.trim(),
        `${input.titleEn.trim() || input.titleTr.trim()} | YTÜ CORE`,
        publicationStatus
      ),
    db
      .prepare(
        "INSERT INTO audit_log (actor,action,entity_type,entity_id,details_json) " +
          "VALUES (?,'project.showcase.sync','project',?,?)"
      )
      .bind(
        actor,
        id,
        JSON.stringify({
          slug,
          status: input.status,
          source: "portal-control-plane",
        })
      ),
  ]);

  return id;
}

export async function deleteShowcaseProjectBySlug(slugValue: string, actor: string) {
  const db = database();
  const slug = normalizeSlug(slugValue);
  const existing = await db
    .prepare("SELECT id FROM content_items WHERE type='project' AND slug=? LIMIT 1")
    .bind(slug)
    .first<{ id: string }>();
  if (!existing) return false;

  await db.batch([
    db.prepare("DELETE FROM content_localizations WHERE content_id=?").bind(existing.id),
    db.prepare("DELETE FROM content_items WHERE id=? AND type='project'").bind(existing.id),
    db
      .prepare(
        "INSERT INTO audit_log (actor,action,entity_type,entity_id,details_json) " +
          "VALUES (?,'project.showcase.delete','project',?,?)"
      )
      .bind(actor, existing.id, JSON.stringify({ slug, source: "portal-control-plane" })),
  ]);
  return true;
}

export async function resetShowcaseProjects(actor: string) {
  const db = database();
  const count = Number(
    (
      await db
        .prepare("SELECT COUNT(*) AS count FROM content_items WHERE type='project'")
        .first<{ count: number }>()
    )?.count ?? 0
  );

  await db.batch([
    db.prepare(
      "DELETE FROM content_localizations WHERE content_id IN (SELECT id FROM content_items WHERE type='project')"
    ),
    db.prepare("DELETE FROM content_items WHERE type='project'"),
    db
      .prepare(
        "INSERT INTO audit_log (actor,action,entity_type,entity_id,details_json) " +
          "VALUES (?,'project.showcase.reset','project','*',?)"
      )
      .bind(actor, JSON.stringify({ count, source: "portal-control-plane" })),
  ]);

  return count;
}
