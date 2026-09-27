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
  titleTr: string;
  titleEn: string;
  summaryTr: string;
  summaryEn: string;
  updatedAt: string;
};

function database(): D1Database | null {
  return env.DB ?? null;
}

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
      WHERE c.type = 'project'
      GROUP BY c.id
      ORDER BY c.sort_order ASC, c.updated_at DESC
    `)
    .all<CmsProjectRow>();

  return (response.results ?? []).map((row) => {
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
      progress:
        typeof metadata.progress === "number" ? metadata.progress : null,
      owner: typeof metadata.owner === "string" ? metadata.owner : null,
      titleTr: row.title_tr ?? "",
      titleEn: row.title_en ?? "",
      summaryTr: row.summary_tr ?? "",
      summaryEn: row.summary_en ?? "",
      updatedAt: row.updated_at,
    };
  });
}
