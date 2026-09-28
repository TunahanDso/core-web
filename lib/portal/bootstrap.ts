import { env } from "cloudflare:workers";

const PORTAL_SCHEMA_SQL = "-- YTÜ CORE internal student portal foundation\n-- Safe to apply more than once. This schema intentionally keeps\n-- public CMS and member portal data in separate table families.\n\nCREATE TABLE IF NOT EXISTS portal_members (\n  id TEXT PRIMARY KEY,\n  email TEXT NOT NULL UNIQUE,\n  full_name TEXT NOT NULL DEFAULT '',\n  role TEXT NOT NULL DEFAULT 'member'\n    CHECK (role IN ('admin','lead','member','alumni','viewer')),\n  status TEXT NOT NULL DEFAULT 'invited'\n    CHECK (status IN ('invited','active','suspended','archived')),\n  teams_json TEXT NOT NULL DEFAULT '[]',\n  password_hash TEXT,\n  failed_login_count INTEGER NOT NULL DEFAULT 0,\n  locked_until TEXT,\n  activated_at TEXT,\n  last_login_at TEXT,\n  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,\n  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP\n);\n\nCREATE TABLE IF NOT EXISTS portal_invites (\n  id TEXT PRIMARY KEY,\n  member_id TEXT NOT NULL,\n  email TEXT NOT NULL,\n  code_hash TEXT NOT NULL UNIQUE,\n  expires_at TEXT NOT NULL,\n  used_at TEXT,\n  created_by TEXT NOT NULL,\n  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,\n  FOREIGN KEY (member_id) REFERENCES portal_members(id) ON DELETE CASCADE\n);\n\nCREATE TABLE IF NOT EXISTS portal_sessions (\n  id TEXT PRIMARY KEY,\n  member_id TEXT NOT NULL,\n  session_hash TEXT NOT NULL UNIQUE,\n  expires_at TEXT NOT NULL,\n  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,\n  last_seen_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,\n  FOREIGN KEY (member_id) REFERENCES portal_members(id) ON DELETE CASCADE\n);\n\nCREATE TABLE IF NOT EXISTS portal_notifications (\n  id TEXT PRIMARY KEY,\n  member_id TEXT,\n  kind TEXT NOT NULL DEFAULT 'info',\n  title TEXT NOT NULL,\n  body TEXT NOT NULL DEFAULT '',\n  href TEXT,\n  read_at TEXT,\n  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,\n  FOREIGN KEY (member_id) REFERENCES portal_members(id) ON DELETE CASCADE\n);\n\nCREATE TABLE IF NOT EXISTS portal_tasks (\n  id TEXT PRIMARY KEY,\n  title TEXT NOT NULL,\n  description TEXT NOT NULL DEFAULT '',\n  project_slug TEXT,\n  team_code TEXT,\n  assignee_id TEXT,\n  status TEXT NOT NULL DEFAULT 'backlog'\n    CHECK (status IN ('backlog','todo','doing','review','blocked','done')),\n  priority TEXT NOT NULL DEFAULT 'medium'\n    CHECK (priority IN ('low','medium','high','critical')),\n  due_at TEXT,\n  created_by TEXT NOT NULL,\n  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,\n  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,\n  FOREIGN KEY (assignee_id) REFERENCES portal_members(id) ON DELETE SET NULL\n);\n\nCREATE TABLE IF NOT EXISTS portal_task_comments (\n  id TEXT PRIMARY KEY,\n  task_id TEXT NOT NULL,\n  author_id TEXT NOT NULL,\n  body TEXT NOT NULL,\n  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,\n  FOREIGN KEY (task_id) REFERENCES portal_tasks(id) ON DELETE CASCADE,\n  FOREIGN KEY (author_id) REFERENCES portal_members(id) ON DELETE CASCADE\n);\n\nCREATE TABLE IF NOT EXISTS portal_resources (\n  id TEXT PRIMARY KEY,\n  kind TEXT NOT NULL\n    CHECK (kind IN ('document','archive','library','drawing','pcb','bom','code','procedure','dataset','media')),\n  title TEXT NOT NULL,\n  description TEXT NOT NULL DEFAULT '',\n  team_code TEXT,\n  project_slug TEXT,\n  object_key TEXT,\n  external_url TEXT,\n  tags_json TEXT NOT NULL DEFAULT '[]',\n  visibility TEXT NOT NULL DEFAULT 'members'\n    CHECK (visibility IN ('members','team','leads','admins')),\n  created_by TEXT NOT NULL,\n  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,\n  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP\n);\n\nCREATE TABLE IF NOT EXISTS portal_resource_versions (\n  id TEXT PRIMARY KEY,\n  resource_id TEXT NOT NULL,\n  version_label TEXT NOT NULL,\n  object_key TEXT,\n  external_url TEXT,\n  note TEXT NOT NULL DEFAULT '',\n  created_by TEXT NOT NULL,\n  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,\n  FOREIGN KEY (resource_id) REFERENCES portal_resources(id) ON DELETE CASCADE\n);\n\nCREATE TABLE IF NOT EXISTS portal_repositories (\n  id TEXT PRIMARY KEY,\n  name TEXT NOT NULL,\n  provider TEXT NOT NULL DEFAULT 'github',\n  repo_url TEXT NOT NULL,\n  project_slug TEXT,\n  team_code TEXT,\n  visibility TEXT NOT NULL DEFAULT 'private',\n  default_branch TEXT NOT NULL DEFAULT 'main',\n  health TEXT NOT NULL DEFAULT 'unverified',\n  last_sync_at TEXT,\n  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP\n);\n\nCREATE TABLE IF NOT EXISTS portal_inventory_items (\n  id TEXT PRIMARY KEY,\n  sku TEXT NOT NULL UNIQUE,\n  name TEXT NOT NULL,\n  category TEXT NOT NULL DEFAULT 'general',\n  location TEXT NOT NULL DEFAULT '',\n  unit TEXT NOT NULL DEFAULT 'pcs',\n  quantity REAL NOT NULL DEFAULT 0,\n  minimum_quantity REAL NOT NULL DEFAULT 0,\n  reserved_quantity REAL NOT NULL DEFAULT 0,\n  metadata_json TEXT NOT NULL DEFAULT '{}',\n  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,\n  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP\n);\n\nCREATE TABLE IF NOT EXISTS portal_inventory_movements (\n  id TEXT PRIMARY KEY,\n  item_id TEXT NOT NULL,\n  member_id TEXT,\n  delta REAL NOT NULL,\n  reason TEXT NOT NULL,\n  project_slug TEXT,\n  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,\n  FOREIGN KEY (item_id) REFERENCES portal_inventory_items(id) ON DELETE CASCADE,\n  FOREIGN KEY (member_id) REFERENCES portal_members(id) ON DELETE SET NULL\n);\n\nCREATE TABLE IF NOT EXISTS portal_channels (\n  id TEXT PRIMARY KEY,\n  slug TEXT NOT NULL UNIQUE,\n  name TEXT NOT NULL,\n  description TEXT NOT NULL DEFAULT '',\n  team_code TEXT,\n  visibility TEXT NOT NULL DEFAULT 'members'\n    CHECK (visibility IN ('members','team','leads','admins')),\n  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP\n);\n\nCREATE TABLE IF NOT EXISTS portal_messages (\n  id TEXT PRIMARY KEY,\n  channel_id TEXT NOT NULL,\n  author_id TEXT NOT NULL,\n  body TEXT NOT NULL,\n  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,\n  edited_at TEXT,\n  FOREIGN KEY (channel_id) REFERENCES portal_channels(id) ON DELETE CASCADE,\n  FOREIGN KEY (author_id) REFERENCES portal_members(id) ON DELETE CASCADE\n);\n\nCREATE TABLE IF NOT EXISTS portal_mail_threads (\n  id TEXT PRIMARY KEY,\n  subject TEXT NOT NULL,\n  created_by TEXT NOT NULL,\n  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,\n  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,\n  FOREIGN KEY (created_by) REFERENCES portal_members(id) ON DELETE CASCADE\n);\n\nCREATE TABLE IF NOT EXISTS portal_mail_participants (\n  thread_id TEXT NOT NULL,\n  member_id TEXT NOT NULL,\n  PRIMARY KEY (thread_id, member_id),\n  FOREIGN KEY (thread_id) REFERENCES portal_mail_threads(id) ON DELETE CASCADE,\n  FOREIGN KEY (member_id) REFERENCES portal_members(id) ON DELETE CASCADE\n);\n\nCREATE TABLE IF NOT EXISTS portal_mail_messages (\n  id TEXT PRIMARY KEY,\n  thread_id TEXT NOT NULL,\n  author_id TEXT NOT NULL,\n  body TEXT NOT NULL,\n  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,\n  FOREIGN KEY (thread_id) REFERENCES portal_mail_threads(id) ON DELETE CASCADE,\n  FOREIGN KEY (author_id) REFERENCES portal_members(id) ON DELETE CASCADE\n);\n\nCREATE TABLE IF NOT EXISTS portal_calendar_events (\n  id TEXT PRIMARY KEY,\n  title TEXT NOT NULL,\n  description TEXT NOT NULL DEFAULT '',\n  starts_at TEXT NOT NULL,\n  ends_at TEXT,\n  location TEXT NOT NULL DEFAULT '',\n  team_code TEXT,\n  project_slug TEXT,\n  created_by TEXT NOT NULL,\n  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP\n);\n\nCREATE TABLE IF NOT EXISTS portal_vehicle_units (\n  id TEXT PRIMARY KEY,\n  code TEXT NOT NULL UNIQUE,\n  name TEXT NOT NULL,\n  domain TEXT NOT NULL,\n  status TEXT NOT NULL DEFAULT 'offline'\n    CHECK (status IN ('offline','idle','testing','mission','maintenance')),\n  last_seen_at TEXT,\n  metadata_json TEXT NOT NULL DEFAULT '{}',\n  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,\n  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP\n);\n\nCREATE TABLE IF NOT EXISTS portal_telemetry_snapshots (\n  id INTEGER PRIMARY KEY AUTOINCREMENT,\n  vehicle_id TEXT NOT NULL,\n  latitude REAL,\n  longitude REAL,\n  heading REAL,\n  speed REAL,\n  battery REAL,\n  mode TEXT,\n  health_json TEXT NOT NULL DEFAULT '{}',\n  recorded_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,\n  FOREIGN KEY (vehicle_id) REFERENCES portal_vehicle_units(id) ON DELETE CASCADE\n);\n\nCREATE TABLE IF NOT EXISTS portal_activity_log (\n  id INTEGER PRIMARY KEY AUTOINCREMENT,\n  actor TEXT NOT NULL,\n  action TEXT NOT NULL,\n  entity_type TEXT NOT NULL,\n  entity_id TEXT NOT NULL,\n  details_json TEXT NOT NULL DEFAULT '{}',\n  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP\n);\n\nCREATE TABLE IF NOT EXISTS portal_security_devices (\n  id TEXT PRIMARY KEY,\n  member_id TEXT NOT NULL,\n  label TEXT NOT NULL,\n  device_type TEXT NOT NULL DEFAULT 'future-mobile',\n  public_key TEXT,\n  status TEXT NOT NULL DEFAULT 'pending'\n    CHECK (status IN ('pending','trusted','revoked')),\n  last_seen_at TEXT,\n  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,\n  FOREIGN KEY (member_id) REFERENCES portal_members(id) ON DELETE CASCADE\n);\n\nCREATE INDEX IF NOT EXISTS idx_portal_members_status ON portal_members(status);\nCREATE INDEX IF NOT EXISTS idx_portal_sessions_member ON portal_sessions(member_id);\nCREATE INDEX IF NOT EXISTS idx_portal_sessions_expiry ON portal_sessions(expires_at);\nCREATE INDEX IF NOT EXISTS idx_portal_tasks_status ON portal_tasks(status);\nCREATE INDEX IF NOT EXISTS idx_portal_tasks_project ON portal_tasks(project_slug);\nCREATE INDEX IF NOT EXISTS idx_portal_resources_kind ON portal_resources(kind);\nCREATE INDEX IF NOT EXISTS idx_portal_inventory_category ON portal_inventory_items(category);\nCREATE INDEX IF NOT EXISTS idx_portal_messages_channel ON portal_messages(channel_id, created_at);\nCREATE INDEX IF NOT EXISTS idx_portal_activity_created ON portal_activity_log(created_at);\nCREATE INDEX IF NOT EXISTS idx_portal_telemetry_vehicle ON portal_telemetry_snapshots(vehicle_id, recorded_at);\n\nINSERT OR IGNORE INTO portal_channels (id,slug,name,description,visibility)\nVALUES\n('channel-general','general','Genel','Tüm CORE üyelerinin ortak sohbet alanı.','members'),\n('channel-announcements','announcements','Duyurular','Takım geneli resmî duyurular.','members'),\n('channel-field','field','Saha','Test, lojistik ve saha koordinasyonu.','members');\n\nINSERT OR IGNORE INTO portal_vehicle_units (id,code,name,domain,status,metadata_json)\nVALUES\n('vehicle-hydronom','HYD-01','Hydronom','CORE Marine','offline','{\"authority\":\"read-only-public-portal\",\"command_plane\":\"isolated\"}');\n\nINSERT INTO site_settings (setting_key,value_json,updated_at)\nVALUES ('portal_schema','{\"version\":\"2026.09-v2\",\"auth\":\"invite+password+server-session\",\"command_authority\":\"isolated\"}',CURRENT_TIMESTAMP)\nON CONFLICT(setting_key) DO UPDATE SET value_json=excluded.value_json,updated_at=CURRENT_TIMESTAMP;\n";


const PORTAL_V2_SQL = "-- YTÜ CORE Portal V2 professional workspace additions\n\nCREATE TABLE IF NOT EXISTS portal_invite_deliveries (\n  id TEXT PRIMARY KEY,\n  invite_id TEXT NOT NULL,\n  recipient TEXT NOT NULL,\n  provider TEXT NOT NULL DEFAULT 'none',\n  status TEXT NOT NULL DEFAULT 'pending'\n    CHECK (status IN ('pending','sent','failed','not_configured')),\n  message_id TEXT,\n  error TEXT,\n  attempted_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,\n  FOREIGN KEY (invite_id) REFERENCES portal_invites(id) ON DELETE CASCADE\n);\n\nCREATE TABLE IF NOT EXISTS portal_member_profiles (\n  member_id TEXT PRIMARY KEY,\n  headline TEXT NOT NULL DEFAULT '',\n  bio TEXT NOT NULL DEFAULT '',\n  skills_json TEXT NOT NULL DEFAULT '[]',\n  github_url TEXT,\n  linkedin_url TEXT,\n  phone TEXT,\n  availability TEXT NOT NULL DEFAULT '',\n  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,\n  FOREIGN KEY (member_id) REFERENCES portal_members(id) ON DELETE CASCADE\n);\n\nCREATE TABLE IF NOT EXISTS portal_channel_reads (\n  channel_id TEXT NOT NULL,\n  member_id TEXT NOT NULL,\n  last_read_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,\n  PRIMARY KEY (channel_id, member_id),\n  FOREIGN KEY (channel_id) REFERENCES portal_channels(id) ON DELETE CASCADE,\n  FOREIGN KEY (member_id) REFERENCES portal_members(id) ON DELETE CASCADE\n);\n\nCREATE INDEX IF NOT EXISTS idx_invite_delivery_invite\n  ON portal_invite_deliveries(invite_id, attempted_at);\nCREATE INDEX IF NOT EXISTS idx_invite_delivery_recipient\n  ON portal_invite_deliveries(recipient, attempted_at);\nCREATE INDEX IF NOT EXISTS idx_channel_reads_member\n  ON portal_channel_reads(member_id, last_read_at);\n\nINSERT INTO site_settings (setting_key,value_json,updated_at)\nVALUES (\n  'portal_workspace_schema',\n  '{\"version\":\"2026.09-v3\",\"features\":[\"invite-email\",\"member-profiles\",\"task-detail\",\"inventory-movements\",\"global-search\",\"mail-replies\"]}',\n  CURRENT_TIMESTAMP\n)\nON CONFLICT(setting_key) DO UPDATE SET\n  value_json=excluded.value_json,\n  updated_at=CURRENT_TIMESTAMP;\n";


const PORTAL_V3_SQL = "-- CORE Portal V3 self-hosted engineering data layer\n\nCREATE TABLE IF NOT EXISTS portal_files (\n  id TEXT PRIMARY KEY,\n  name TEXT NOT NULL,\n  object_key TEXT NOT NULL UNIQUE,\n  mime_type TEXT NOT NULL DEFAULT 'application/octet-stream',\n  extension TEXT NOT NULL DEFAULT '',\n  size_bytes INTEGER NOT NULL DEFAULT 0,\n  kind TEXT NOT NULL DEFAULT 'file',\n  preview_kind TEXT NOT NULL DEFAULT 'download',\n  project_slug TEXT,\n  team_code TEXT,\n  uploaded_by TEXT NOT NULL,\n  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,\n  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,\n  FOREIGN KEY (uploaded_by) REFERENCES portal_members(id) ON DELETE RESTRICT\n);\n\nCREATE TABLE IF NOT EXISTS portal_file_versions (\n  id TEXT PRIMARY KEY,\n  file_id TEXT NOT NULL,\n  version_no INTEGER NOT NULL,\n  object_key TEXT NOT NULL,\n  size_bytes INTEGER NOT NULL DEFAULT 0,\n  mime_type TEXT NOT NULL DEFAULT 'application/octet-stream',\n  checksum TEXT,\n  note TEXT NOT NULL DEFAULT '',\n  created_by TEXT NOT NULL,\n  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,\n  UNIQUE(file_id, version_no),\n  FOREIGN KEY (file_id) REFERENCES portal_files(id) ON DELETE CASCADE,\n  FOREIGN KEY (created_by) REFERENCES portal_members(id) ON DELETE RESTRICT\n);\n\nCREATE TABLE IF NOT EXISTS portal_repo_commits (\n  id TEXT PRIMARY KEY,\n  repository_id TEXT NOT NULL,\n  parent_id TEXT,\n  branch TEXT NOT NULL DEFAULT 'main',\n  message TEXT NOT NULL,\n  author_id TEXT NOT NULL,\n  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,\n  FOREIGN KEY (repository_id) REFERENCES portal_repositories(id) ON DELETE CASCADE,\n  FOREIGN KEY (parent_id) REFERENCES portal_repo_commits(id) ON DELETE SET NULL,\n  FOREIGN KEY (author_id) REFERENCES portal_members(id) ON DELETE RESTRICT\n);\n\nCREATE TABLE IF NOT EXISTS portal_repo_files (\n  id TEXT PRIMARY KEY,\n  repository_id TEXT NOT NULL,\n  path TEXT NOT NULL,\n  commit_id TEXT NOT NULL,\n  file_id TEXT NOT NULL,\n  language TEXT,\n  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,\n  UNIQUE(repository_id, path, commit_id),\n  FOREIGN KEY (repository_id) REFERENCES portal_repositories(id) ON DELETE CASCADE,\n  FOREIGN KEY (commit_id) REFERENCES portal_repo_commits(id) ON DELETE CASCADE,\n  FOREIGN KEY (file_id) REFERENCES portal_files(id) ON DELETE RESTRICT\n);\n\nCREATE TABLE IF NOT EXISTS portal_mail_state (\n  thread_id TEXT NOT NULL,\n  member_id TEXT NOT NULL,\n  read_at TEXT,\n  starred_at TEXT,\n  archived_at TEXT,\n  deleted_at TEXT,\n  PRIMARY KEY (thread_id, member_id),\n  FOREIGN KEY (thread_id) REFERENCES portal_mail_threads(id) ON DELETE CASCADE,\n  FOREIGN KEY (member_id) REFERENCES portal_members(id) ON DELETE CASCADE\n);\n\nCREATE TABLE IF NOT EXISTS portal_mail_attachments (\n  message_id TEXT NOT NULL,\n  file_id TEXT NOT NULL,\n  PRIMARY KEY (message_id, file_id),\n  FOREIGN KEY (message_id) REFERENCES portal_mail_messages(id) ON DELETE CASCADE,\n  FOREIGN KEY (file_id) REFERENCES portal_files(id) ON DELETE CASCADE\n);\n\nCREATE TABLE IF NOT EXISTS portal_design_derivatives (\n  id TEXT PRIMARY KEY,\n  source_file_id TEXT NOT NULL,\n  derivative_kind TEXT NOT NULL,\n  object_key TEXT,\n  status TEXT NOT NULL DEFAULT 'pending'\n    CHECK (status IN ('pending','ready','failed','not_required')),\n  metadata_json TEXT NOT NULL DEFAULT '{}',\n  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,\n  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,\n  FOREIGN KEY (source_file_id) REFERENCES portal_files(id) ON DELETE CASCADE\n);\n\nCREATE TABLE IF NOT EXISTS portal_code_runs (\n  id TEXT PRIMARY KEY,\n  member_id TEXT NOT NULL,\n  repository_id TEXT,\n  language TEXT NOT NULL,\n  entrypoint TEXT,\n  status TEXT NOT NULL DEFAULT 'queued'\n    CHECK (status IN ('queued','running','success','failed','cancelled','unavailable')),\n  stdout TEXT NOT NULL DEFAULT '',\n  stderr TEXT NOT NULL DEFAULT '',\n  exit_code INTEGER,\n  duration_ms INTEGER,\n  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,\n  finished_at TEXT,\n  FOREIGN KEY (member_id) REFERENCES portal_members(id) ON DELETE CASCADE,\n  FOREIGN KEY (repository_id) REFERENCES portal_repositories(id) ON DELETE SET NULL\n);\n\nCREATE INDEX IF NOT EXISTS idx_portal_files_project ON portal_files(project_slug, updated_at);\nCREATE INDEX IF NOT EXISTS idx_portal_files_kind ON portal_files(kind, updated_at);\nCREATE INDEX IF NOT EXISTS idx_portal_file_versions_file ON portal_file_versions(file_id, version_no);\nCREATE INDEX IF NOT EXISTS idx_portal_repo_commits_repo ON portal_repo_commits(repository_id, created_at);\nCREATE INDEX IF NOT EXISTS idx_portal_repo_files_repo ON portal_repo_files(repository_id, path);\nCREATE INDEX IF NOT EXISTS idx_portal_mail_state_member ON portal_mail_state(member_id, archived_at, read_at);\nCREATE INDEX IF NOT EXISTS idx_portal_code_runs_member ON portal_code_runs(member_id, created_at);\n\nINSERT INTO site_settings (setting_key,value_json,updated_at)\nVALUES (\n  'portal_engineering_store',\n  '{\"version\":\"2026.09-v4\",\"storage\":\"R2+D1\",\"repo\":\"CORE native\",\"preview\":[\"pdf\",\"image\",\"text\",\"code\",\"csv\",\"stl\",\"kicad-pcb\"],\"runner\":\"sandbox-boundary\"}',\n  CURRENT_TIMESTAMP\n)\nON CONFLICT(setting_key) DO UPDATE SET value_json=excluded.value_json,updated_at=CURRENT_TIMESTAMP;\n";


function splitPortalSql(sql: string) {
  const source = sql
    .split("\n")
    .filter((line) => !line.trimStart().startsWith("--"))
    .join("\n");

  const statements: string[] = [];
  let current = "";
  let inSingleQuote = false;
  let inDoubleQuote = false;

  for (let index = 0; index < source.length; index += 1) {
    const char = source[index];

    if (char === "'" && !inDoubleQuote) {
      current += char;
      if (inSingleQuote && source[index + 1] === "'") {
        current += source[index + 1];
        index += 1;
        continue;
      }
      inSingleQuote = !inSingleQuote;
      continue;
    }

    if (char === '"' && !inSingleQuote) {
      current += char;
      if (inDoubleQuote && source[index + 1] === '"') {
        current += source[index + 1];
        index += 1;
        continue;
      }
      inDoubleQuote = !inDoubleQuote;
      continue;
    }

    if (char === ";" && !inSingleQuote && !inDoubleQuote) {
      const statement = current.trim();
      if (statement) statements.push(statement);
      current = "";
      continue;
    }

    current += char;
  }

  const trailing = current.trim();
  if (trailing) statements.push(trailing);

  if (inSingleQuote || inDoubleQuote) {
    throw new Error("Portal migration contains an unterminated SQL string.");
  }

  return statements;
}

const REQUIRED_PORTAL_TABLES = [
  "portal_members",
  "portal_invites",
  "portal_sessions",
  "portal_notifications",
  "portal_tasks",
  "portal_task_comments",
  "portal_resources",
  "portal_resource_versions",
  "portal_repositories",
  "portal_inventory_items",
  "portal_inventory_movements",
  "portal_channels",
  "portal_messages",
  "portal_mail_threads",
  "portal_mail_participants",
  "portal_mail_messages",
  "portal_calendar_events",
  "portal_vehicle_units",
  "portal_telemetry_snapshots",
  "portal_activity_log",
  "portal_security_devices",
  "portal_invite_deliveries",
  "portal_member_profiles",
  "portal_channel_reads",
  "portal_files",
  "portal_file_versions",
  "portal_repo_commits",
  "portal_repo_files",
  "portal_mail_state",
  "portal_mail_attachments",
  "portal_design_derivatives",
  "portal_code_runs",
] as const;

export async function portalBootstrapStatus() {
  const db = env.DB;
  if (!db) {
    return {
      ready: false,
      tableCount: 0,
      requiredTableCount: REQUIRED_PORTAL_TABLES.length,
      memberCount: 0,
      taskCount: 0,
      resourceCount: 0,
    };
  }

  try {
    const placeholders = REQUIRED_PORTAL_TABLES.map(() => "?").join(",");
    const tableRow = await db
      .prepare(
        "SELECT COUNT(*) AS table_count FROM sqlite_master " +
        "WHERE type = 'table' AND name IN (" + placeholders + ")"
      )
      .bind(...REQUIRED_PORTAL_TABLES)
      .first<{ table_count: number }>();

    const tableCount = Number(tableRow?.table_count ?? 0);
    const ready = tableCount === REQUIRED_PORTAL_TABLES.length;

    let row: { member_count: number; task_count: number; resource_count: number } | null = null;
    try {
      row = await db.prepare(`
        SELECT
          (SELECT COUNT(*) FROM portal_members) AS member_count,
          (SELECT COUNT(*) FROM portal_tasks) AS task_count,
          (SELECT COUNT(*) FROM portal_resources) AS resource_count
      `).first<{ member_count: number; task_count: number; resource_count: number }>();
    } catch {
      row = null;
    }

    if (!ready) {
      return {
        ready: false,
        tableCount,
        requiredTableCount: REQUIRED_PORTAL_TABLES.length,
        memberCount: Number(row?.member_count ?? 0),
        taskCount: Number(row?.task_count ?? 0),
        resourceCount: Number(row?.resource_count ?? 0),
      };
    }

    return {
      ready: true,
      tableCount,
      requiredTableCount: REQUIRED_PORTAL_TABLES.length,
      memberCount: Number(row?.member_count ?? 0),
      taskCount: Number(row?.task_count ?? 0),
      resourceCount: Number(row?.resource_count ?? 0),
    };
  } catch {
    return {
      ready: false,
      tableCount: 0,
      requiredTableCount: REQUIRED_PORTAL_TABLES.length,
      memberCount: 0,
      taskCount: 0,
      resourceCount: 0,
    };
  }
}

export async function applyPortalFoundation(actor: string) {
  const db = env.DB;
  if (!db) throw new Error("DB binding is not available.");

  const statements = splitPortalSql(PORTAL_SCHEMA_SQL + "\n" + PORTAL_V2_SQL + "\n" + PORTAL_V3_SQL);
  if (!statements.length) throw new Error("Portal migration is empty.");

  await db.batch(statements.map((statement) => db.prepare(statement)));

  await db.prepare(`
    INSERT INTO audit_log (actor, action, entity_type, entity_id, details_json)
    VALUES (?, 'portal.bootstrap', 'portal', 'foundation', ?)
  `).bind(
    actor,
    JSON.stringify({
      version: "2026.09-v4",
      statementCount: statements.length,
      modules: [
        "members","auth","tasks","resources","repositories","inventory",
        "chat","mail","calendar","notifications","vehicles","telemetry","devices"
      ],
    })
  ).run();

  return portalBootstrapStatus();
}
