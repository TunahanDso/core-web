-- YTÜ CORE internal student portal foundation
-- Safe to apply more than once. This schema intentionally keeps
-- public CMS and member portal data in separate table families.

CREATE TABLE IF NOT EXISTS portal_members (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  full_name TEXT NOT NULL DEFAULT '',
  role TEXT NOT NULL DEFAULT 'member'
    CHECK (role IN ('admin','lead','member','alumni','viewer')),
  status TEXT NOT NULL DEFAULT 'invited'
    CHECK (status IN ('invited','active','suspended','archived')),
  teams_json TEXT NOT NULL DEFAULT '[]',
  password_hash TEXT,
  failed_login_count INTEGER NOT NULL DEFAULT 0,
  locked_until TEXT,
  activated_at TEXT,
  last_login_at TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS portal_invites (
  id TEXT PRIMARY KEY,
  member_id TEXT NOT NULL,
  email TEXT NOT NULL,
  code_hash TEXT NOT NULL UNIQUE,
  expires_at TEXT NOT NULL,
  used_at TEXT,
  created_by TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (member_id) REFERENCES portal_members(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS portal_sessions (
  id TEXT PRIMARY KEY,
  member_id TEXT NOT NULL,
  session_hash TEXT NOT NULL UNIQUE,
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  last_seen_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (member_id) REFERENCES portal_members(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS portal_notifications (
  id TEXT PRIMARY KEY,
  member_id TEXT,
  kind TEXT NOT NULL DEFAULT 'info',
  title TEXT NOT NULL,
  body TEXT NOT NULL DEFAULT '',
  href TEXT,
  read_at TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (member_id) REFERENCES portal_members(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS portal_tasks (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  project_slug TEXT,
  team_code TEXT,
  assignee_id TEXT,
  status TEXT NOT NULL DEFAULT 'backlog'
    CHECK (status IN ('backlog','todo','doing','review','blocked','done')),
  priority TEXT NOT NULL DEFAULT 'medium'
    CHECK (priority IN ('low','medium','high','critical')),
  due_at TEXT,
  created_by TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (assignee_id) REFERENCES portal_members(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS portal_task_comments (
  id TEXT PRIMARY KEY,
  task_id TEXT NOT NULL,
  author_id TEXT NOT NULL,
  body TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (task_id) REFERENCES portal_tasks(id) ON DELETE CASCADE,
  FOREIGN KEY (author_id) REFERENCES portal_members(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS portal_resources (
  id TEXT PRIMARY KEY,
  kind TEXT NOT NULL
    CHECK (kind IN ('document','archive','library','drawing','pcb','bom','code','procedure','dataset','media')),
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  team_code TEXT,
  project_slug TEXT,
  object_key TEXT,
  external_url TEXT,
  tags_json TEXT NOT NULL DEFAULT '[]',
  visibility TEXT NOT NULL DEFAULT 'members'
    CHECK (visibility IN ('members','team','leads','admins')),
  created_by TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS portal_resource_versions (
  id TEXT PRIMARY KEY,
  resource_id TEXT NOT NULL,
  version_label TEXT NOT NULL,
  object_key TEXT,
  external_url TEXT,
  note TEXT NOT NULL DEFAULT '',
  created_by TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (resource_id) REFERENCES portal_resources(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS portal_repositories (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  provider TEXT NOT NULL DEFAULT 'github',
  repo_url TEXT NOT NULL,
  project_slug TEXT,
  team_code TEXT,
  visibility TEXT NOT NULL DEFAULT 'private',
  default_branch TEXT NOT NULL DEFAULT 'main',
  health TEXT NOT NULL DEFAULT 'unverified',
  last_sync_at TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS portal_inventory_items (
  id TEXT PRIMARY KEY,
  sku TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'general',
  location TEXT NOT NULL DEFAULT '',
  unit TEXT NOT NULL DEFAULT 'pcs',
  quantity REAL NOT NULL DEFAULT 0,
  minimum_quantity REAL NOT NULL DEFAULT 0,
  reserved_quantity REAL NOT NULL DEFAULT 0,
  metadata_json TEXT NOT NULL DEFAULT '{}',
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS portal_inventory_movements (
  id TEXT PRIMARY KEY,
  item_id TEXT NOT NULL,
  member_id TEXT,
  delta REAL NOT NULL,
  reason TEXT NOT NULL,
  project_slug TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (item_id) REFERENCES portal_inventory_items(id) ON DELETE CASCADE,
  FOREIGN KEY (member_id) REFERENCES portal_members(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS portal_channels (
  id TEXT PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  team_code TEXT,
  visibility TEXT NOT NULL DEFAULT 'members'
    CHECK (visibility IN ('members','team','leads','admins')),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS portal_messages (
  id TEXT PRIMARY KEY,
  channel_id TEXT NOT NULL,
  author_id TEXT NOT NULL,
  body TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  edited_at TEXT,
  FOREIGN KEY (channel_id) REFERENCES portal_channels(id) ON DELETE CASCADE,
  FOREIGN KEY (author_id) REFERENCES portal_members(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS portal_mail_threads (
  id TEXT PRIMARY KEY,
  subject TEXT NOT NULL,
  created_by TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (created_by) REFERENCES portal_members(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS portal_mail_participants (
  thread_id TEXT NOT NULL,
  member_id TEXT NOT NULL,
  PRIMARY KEY (thread_id, member_id),
  FOREIGN KEY (thread_id) REFERENCES portal_mail_threads(id) ON DELETE CASCADE,
  FOREIGN KEY (member_id) REFERENCES portal_members(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS portal_mail_messages (
  id TEXT PRIMARY KEY,
  thread_id TEXT NOT NULL,
  author_id TEXT NOT NULL,
  body TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (thread_id) REFERENCES portal_mail_threads(id) ON DELETE CASCADE,
  FOREIGN KEY (author_id) REFERENCES portal_members(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS portal_calendar_events (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  starts_at TEXT NOT NULL,
  ends_at TEXT,
  location TEXT NOT NULL DEFAULT '',
  team_code TEXT,
  project_slug TEXT,
  created_by TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS portal_vehicle_units (
  id TEXT PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  domain TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'offline'
    CHECK (status IN ('offline','idle','testing','mission','maintenance')),
  last_seen_at TEXT,
  metadata_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS portal_telemetry_snapshots (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  vehicle_id TEXT NOT NULL,
  latitude REAL,
  longitude REAL,
  heading REAL,
  speed REAL,
  battery REAL,
  mode TEXT,
  health_json TEXT NOT NULL DEFAULT '{}',
  recorded_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (vehicle_id) REFERENCES portal_vehicle_units(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS portal_activity_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  actor TEXT NOT NULL,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  details_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS portal_security_devices (
  id TEXT PRIMARY KEY,
  member_id TEXT NOT NULL,
  label TEXT NOT NULL,
  device_type TEXT NOT NULL DEFAULT 'future-mobile',
  public_key TEXT,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','trusted','revoked')),
  last_seen_at TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (member_id) REFERENCES portal_members(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_portal_members_status ON portal_members(status);
CREATE INDEX IF NOT EXISTS idx_portal_sessions_member ON portal_sessions(member_id);
CREATE INDEX IF NOT EXISTS idx_portal_sessions_expiry ON portal_sessions(expires_at);
CREATE INDEX IF NOT EXISTS idx_portal_tasks_status ON portal_tasks(status);
CREATE INDEX IF NOT EXISTS idx_portal_tasks_project ON portal_tasks(project_slug);
CREATE INDEX IF NOT EXISTS idx_portal_resources_kind ON portal_resources(kind);
CREATE INDEX IF NOT EXISTS idx_portal_inventory_category ON portal_inventory_items(category);
CREATE INDEX IF NOT EXISTS idx_portal_messages_channel ON portal_messages(channel_id, created_at);
CREATE INDEX IF NOT EXISTS idx_portal_activity_created ON portal_activity_log(created_at);
CREATE INDEX IF NOT EXISTS idx_portal_telemetry_vehicle ON portal_telemetry_snapshots(vehicle_id, recorded_at);

INSERT OR IGNORE INTO portal_channels (id,slug,name,description,visibility)
VALUES
('channel-general','general','Genel','Tüm CORE üyelerinin ortak sohbet alanı.','members'),
('channel-announcements','announcements','Duyurular','Takım geneli resmî duyurular.','members'),
('channel-field','field','Saha','Test, lojistik ve saha koordinasyonu.','members');

INSERT OR IGNORE INTO portal_vehicle_units (id,code,name,domain,status,metadata_json)
VALUES
('vehicle-hydronom','HYD-01','Hydronom','CORE Marine','offline','{"authority":"read-only-public-portal","command_plane":"isolated"}');

INSERT INTO site_settings (setting_key,value_json,updated_at)
VALUES ('portal_schema','{"version":"2026.09-v1","auth":"invite+password+server-session","command_authority":"isolated"}',CURRENT_TIMESTAMP)
ON CONFLICT(setting_key) DO UPDATE SET value_json=excluded.value_json,updated_at=CURRENT_TIMESTAMP;
