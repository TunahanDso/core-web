import { env, type D1Database } from "cloudflare:workers";

export type CmsStats = {
  connection: "online" | "unbound" | "error";
  contentCount: number;
  projectCount: number;
  competitionCount: number;
  mediaCount: number;
  auditCount: number;
  mediaBinding: boolean;
  error?: string;
};

export type CmsProjectRow = {
  id: string;
  slug: string;
  status: string;
  domain: string | null;
  metadata_json: string;
  updated_at: string;
  title_tr: string | null;
  title_en: string | null;
  summary_tr: string | null;
  summary_en: string | null;
};

export type CmsProject = {
  id: string;
  slug: string;
  status: string;
  domain: string | null;
  progress: number | null;
  owner: string | null;
  integrations: string[];
  titleTr: string;
  titleEn: string;
  summaryTr: string;
  summaryEn: string;
  updatedAt: string;
};

export type ProjectUpdateInput = {
  id: string;
  status: "draft" | "published" | "archived";
  domain: string | null;
  progress: number;
  owner: string | null;
  integrations: string[];
  titleTr: string;
  titleEn: string;
  summaryTr: string;
  summaryEn: string;
};

function database(): D1Database | null {
  return env.DB ?? null;
}

function mapProject(row: CmsProjectRow): CmsProject {
  let metadata: Record<string, unknown> = {};
  try {
    metadata = JSON.parse(row.metadata_json || "{}") as Record<string, unknown>;
  } catch {
    metadata = {};
  }

  return {
    id: row.id,
    slug: row.slug,
    status: row.status,
    domain: row.domain,
    progress: typeof metadata.progress === "number" ? metadata.progress : null,
    owner: typeof metadata.owner === "string" ? metadata.owner : null,
    integrations: Array.isArray(metadata.integrations)
      ? metadata.integrations.filter((item): item is string => typeof item === "string")
      : [],
    titleTr: row.title_tr ?? "",
    titleEn: row.title_en ?? "",
    summaryTr: row.summary_tr ?? "",
    summaryEn: row.summary_en ?? "",
    updatedAt: row.updated_at,
  };
}

const projectSelect = `
  SELECT
    c.id,
    c.slug,
    c.status,
    c.domain,
    c.metadata_json,
    c.updated_at,
    MAX(CASE WHEN l.locale = 'tr' THEN l.title END) AS title_tr,
    MAX(CASE WHEN l.locale = 'en' THEN l.title END) AS title_en,
    MAX(CASE WHEN l.locale = 'tr' THEN l.summary END) AS summary_tr,
    MAX(CASE WHEN l.locale = 'en' THEN l.summary END) AS summary_en
  FROM content_items c
  LEFT JOIN content_localizations l ON l.content_id = c.id
`;

export function hasMediaBinding() {
  return Boolean(env.MEDIA);
}

export async function getCmsStats(): Promise<CmsStats> {
  const db = database();

  if (!db) {
    return {
      connection: "unbound",
      contentCount: 0,
      projectCount: 0,
      competitionCount: 0,
      mediaCount: 0,
      auditCount: 0,
      mediaBinding: hasMediaBinding(),
      error: "DB binding is not available in this environment.",
    };
  }

  try {
    const row = await db
      .prepare(`
        SELECT
          (SELECT COUNT(*) FROM content_items) AS content_count,
          (SELECT COUNT(*) FROM content_items WHERE type = 'project') AS project_count,
          (SELECT COUNT(*) FROM content_items WHERE type = 'competition') AS competition_count,
          (SELECT COUNT(*) FROM media_assets) AS media_count,
          (SELECT COUNT(*) FROM audit_log) AS audit_count
      `)
      .first<{
        content_count: number;
        project_count: number;
        competition_count: number;
        media_count: number;
        audit_count: number;
      }>();

    return {
      connection: "online",
      contentCount: Number(row?.content_count ?? 0),
      projectCount: Number(row?.project_count ?? 0),
      competitionCount: Number(row?.competition_count ?? 0),
      mediaCount: Number(row?.media_count ?? 0),
      auditCount: Number(row?.audit_count ?? 0),
      mediaBinding: hasMediaBinding(),
    };
  } catch (error) {
    return {
      connection: "error",
      contentCount: 0,
      projectCount: 0,
      competitionCount: 0,
      mediaCount: 0,
      auditCount: 0,
      mediaBinding: hasMediaBinding(),
      error: error instanceof Error ? error.message : "Unknown D1 error",
    };
  }
}

export async function listProjects(): Promise<CmsProject[]> {
  const db = database();
  if (!db) return [];

  const response = await db
    .prepare(`
      ${projectSelect}
      WHERE c.type = 'project'
      GROUP BY c.id
      ORDER BY c.sort_order ASC, c.updated_at DESC
    `)
    .all<CmsProjectRow>();

  return (response.results ?? []).map(mapProject);
}

export async function getProject(id: string): Promise<CmsProject | null> {
  const db = database();
  if (!db) return null;

  const row = await db
    .prepare(`
      ${projectSelect}
      WHERE c.type = 'project' AND c.id = ?
      GROUP BY c.id
      LIMIT 1
    `)
    .bind(id)
    .first<CmsProjectRow>();

  return row ? mapProject(row) : null;
}

export async function updateProject(input: ProjectUpdateInput, actor: string) {
  const db = database();
  if (!db) throw new Error("DB binding is not available.");

  const existing = await db
    .prepare("SELECT metadata_json FROM content_items WHERE id = ? AND type = 'project' LIMIT 1")
    .bind(input.id)
    .first<{ metadata_json: string }>();

  if (!existing) throw new Error("Project not found.");

  let metadata: Record<string, unknown> = {};
  try {
    metadata = JSON.parse(existing.metadata_json || "{}") as Record<string, unknown>;
  } catch {
    metadata = {};
  }

  metadata.progress = input.progress;
  metadata.owner = input.owner;
  metadata.integrations = input.integrations;

  const details = {
    status: input.status,
    domain: input.domain,
    progress: input.progress,
    owner: input.owner,
    integrations: input.integrations,
  };

  return db.batch([
    db
      .prepare(`
        UPDATE content_items
        SET
          status = ?,
          domain = ?,
          metadata_json = ?,
          updated_at = CURRENT_TIMESTAMP,
          published_at = CASE
            WHEN ? = 'published' THEN COALESCE(published_at, CURRENT_TIMESTAMP)
            ELSE published_at
          END
        WHERE id = ? AND type = 'project'
      `)
      .bind(
        input.status,
        input.domain,
        JSON.stringify(metadata),
        input.status,
        input.id
      ),
    db
      .prepare(`
        INSERT INTO content_localizations
          (content_id, locale, title, summary, body, seo_title, seo_description, publication_status)
        VALUES (?, 'tr', ?, ?, '', '', '', ?)
        ON CONFLICT(content_id, locale) DO UPDATE SET
          title = excluded.title,
          summary = excluded.summary,
          publication_status = excluded.publication_status
      `)
      .bind(
        input.id,
        input.titleTr,
        input.summaryTr,
        input.status === "published" ? "published" : "draft"
      ),
    db
      .prepare(`
        INSERT INTO content_localizations
          (content_id, locale, title, summary, body, seo_title, seo_description, publication_status)
        VALUES (?, 'en', ?, ?, '', '', '', ?)
        ON CONFLICT(content_id, locale) DO UPDATE SET
          title = excluded.title,
          summary = excluded.summary,
          publication_status = excluded.publication_status
      `)
      .bind(
        input.id,
        input.titleEn,
        input.summaryEn,
        input.status === "published" ? "published" : "draft"
      ),
    db
      .prepare(`
        INSERT INTO audit_log (actor, action, entity_type, entity_id, details_json)
        VALUES (?, 'project.update', 'project', ?, ?)
      `)
      .bind(actor, input.id, JSON.stringify(details)),
  ]);
}


export type CmsCompetitionRow = CmsProjectRow;

export type CmsCompetition = {
  id: string;
  slug: string;
  status: string;
  domain: string | null;
  targetStatus: "confirmed" | "target" | "evaluation";
  dateTr: string;
  dateEn: string;
  locationTr: string;
  locationEn: string;
  titleTr: string;
  titleEn: string;
  summaryTr: string;
  summaryEn: string;
  updatedAt: string;
};

export type CompetitionUpdateInput = {
  id: string;
  status: "draft" | "published" | "archived";
  domain: string | null;
  targetStatus: "confirmed" | "target" | "evaluation";
  dateTr: string;
  dateEn: string;
  locationTr: string;
  locationEn: string;
  titleTr: string;
  titleEn: string;
  summaryTr: string;
  summaryEn: string;
};

function mapCompetition(row: CmsCompetitionRow): CmsCompetition {
  let metadata: Record<string, unknown> = {};
  try {
    metadata = JSON.parse(row.metadata_json || "{}") as Record<string, unknown>;
  } catch {
    metadata = {};
  }

  const targetStatus =
    metadata.target_status === "confirmed" ||
    metadata.target_status === "target" ||
    metadata.target_status === "evaluation"
      ? metadata.target_status
      : "evaluation";

  return {
    id: row.id,
    slug: row.slug,
    status: row.status,
    domain: row.domain,
    targetStatus,
    dateTr: typeof metadata.date_tr === "string" ? metadata.date_tr : "",
    dateEn: typeof metadata.date_en === "string" ? metadata.date_en : "",
    locationTr: typeof metadata.location_tr === "string" ? metadata.location_tr : "",
    locationEn: typeof metadata.location_en === "string" ? metadata.location_en : "",
    titleTr: row.title_tr ?? "",
    titleEn: row.title_en ?? "",
    summaryTr: row.summary_tr ?? "",
    summaryEn: row.summary_en ?? "",
    updatedAt: row.updated_at,
  };
}

const competitionSelect = `
  SELECT
    c.id,
    c.slug,
    c.status,
    c.domain,
    c.metadata_json,
    c.updated_at,
    MAX(CASE WHEN l.locale = 'tr' THEN l.title END) AS title_tr,
    MAX(CASE WHEN l.locale = 'en' THEN l.title END) AS title_en,
    MAX(CASE WHEN l.locale = 'tr' THEN l.summary END) AS summary_tr,
    MAX(CASE WHEN l.locale = 'en' THEN l.summary END) AS summary_en
  FROM content_items c
  LEFT JOIN content_localizations l ON l.content_id = c.id
`;

export async function listCompetitions(): Promise<CmsCompetition[]> {
  const db = database();
  if (!db) return [];

  const response = await db
    .prepare(`
      ${competitionSelect}
      WHERE c.type = 'competition'
      GROUP BY c.id
      ORDER BY c.sort_order ASC, c.updated_at DESC
    `)
    .all<CmsCompetitionRow>();

  return (response.results ?? []).map(mapCompetition);
}

export async function getCompetition(id: string): Promise<CmsCompetition | null> {
  const db = database();
  if (!db) return null;

  const row = await db
    .prepare(`
      ${competitionSelect}
      WHERE c.type = 'competition' AND c.id = ?
      GROUP BY c.id
      LIMIT 1
    `)
    .bind(id)
    .first<CmsCompetitionRow>();

  return row ? mapCompetition(row) : null;
}

export async function updateCompetition(
  input: CompetitionUpdateInput,
  actor: string
) {
  const db = database();
  if (!db) throw new Error("DB binding is not available.");

  const existing = await db
    .prepare("SELECT metadata_json FROM content_items WHERE id = ? AND type = 'competition' LIMIT 1")
    .bind(input.id)
    .first<{ metadata_json: string }>();

  if (!existing) throw new Error("Competition not found.");

  let metadata: Record<string, unknown> = {};
  try {
    metadata = JSON.parse(existing.metadata_json || "{}") as Record<string, unknown>;
  } catch {
    metadata = {};
  }

  metadata.target_status = input.targetStatus;
  metadata.date_tr = input.dateTr;
  metadata.date_en = input.dateEn;
  metadata.location_tr = input.locationTr;
  metadata.location_en = input.locationEn;

  const details = {
    status: input.status,
    domain: input.domain,
    targetStatus: input.targetStatus,
    dateTr: input.dateTr,
    dateEn: input.dateEn,
    locationTr: input.locationTr,
    locationEn: input.locationEn,
  };

  return db.batch([
    db
      .prepare(`
        UPDATE content_items
        SET
          status = ?,
          domain = ?,
          metadata_json = ?,
          updated_at = CURRENT_TIMESTAMP,
          published_at = CASE
            WHEN ? = 'published' THEN COALESCE(published_at, CURRENT_TIMESTAMP)
            ELSE published_at
          END
        WHERE id = ? AND type = 'competition'
      `)
      .bind(
        input.status,
        input.domain,
        JSON.stringify(metadata),
        input.status,
        input.id
      ),
    db
      .prepare(`
        INSERT INTO content_localizations
          (content_id, locale, title, summary, body, seo_title, seo_description, publication_status)
        VALUES (?, 'tr', ?, ?, '', '', '', ?)
        ON CONFLICT(content_id, locale) DO UPDATE SET
          title = excluded.title,
          summary = excluded.summary,
          publication_status = excluded.publication_status
      `)
      .bind(
        input.id,
        input.titleTr,
        input.summaryTr,
        input.status === "published" ? "published" : "draft"
      ),
    db
      .prepare(`
        INSERT INTO content_localizations
          (content_id, locale, title, summary, body, seo_title, seo_description, publication_status)
        VALUES (?, 'en', ?, ?, '', '', '', ?)
        ON CONFLICT(content_id, locale) DO UPDATE SET
          title = excluded.title,
          summary = excluded.summary,
          publication_status = excluded.publication_status
      `)
      .bind(
        input.id,
        input.titleEn,
        input.summaryEn,
        input.status === "published" ? "published" : "draft"
      ),
    db
      .prepare(`
        INSERT INTO audit_log (actor, action, entity_type, entity_id, details_json)
        VALUES (?, 'competition.update', 'competition', ?, ?)
      `)
      .bind(actor, input.id, JSON.stringify(details)),
  ]);
}
