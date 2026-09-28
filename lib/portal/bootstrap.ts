import { env } from "cloudflare:workers";

const PORTAL_SCHEMA_SQL = "-- YTÜ CORE internal student portal foundation\n-- Safe to apply more than once. This schema intentionally keeps\n-- public CMS and member portal data in separate table families.\n\nCREATE TABLE IF NOT EXISTS portal_members (\n  id TEXT PRIMARY KEY,\n  email TEXT NOT NULL UNIQUE,\n  full_name TEXT NOT NULL DEFAULT '',\n  role TEXT NOT NULL DEFAULT 'member'\n    CHECK (role IN ('admin','lead','member','alumni','viewer')),\n  status TEXT NOT NULL DEFAULT 'invited'\n    CHECK (status IN ('invited','active','suspended','archived')),\n  teams_json TEXT NOT NULL DEFAULT '[]',\n  password_hash TEXT,\n  failed_login_count INTEGER NOT NULL DEFAULT 0,\n  locked_until TEXT,\n  activated_at TEXT,\n  last_login_at TEXT,\n  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,\n  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP\n);\n\nCREATE TABLE IF NOT EXISTS portal_invites (\n  id TEXT PRIMARY KEY,\n  member_id TEXT NOT NULL,\n  email TEXT NOT NULL,\n  code_hash TEXT NOT NULL UNIQUE,\n  expires_at TEXT NOT NULL,\n  used_at TEXT,\n  created_by TEXT NOT NULL,\n  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,\n  FOREIGN KEY (member_id) REFERENCES portal_members(id) ON DELETE CASCADE\n);\n\nCREATE TABLE IF NOT EXISTS portal_sessions (\n  id TEXT PRIMARY KEY,\n  member_id TEXT NOT NULL,\n  session_hash TEXT NOT NULL UNIQUE,\n  expires_at TEXT NOT NULL,\n  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,\n  last_seen_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,\n  FOREIGN KEY (member_id) REFERENCES portal_members(id) ON DELETE CASCADE\n);\n\nCREATE TABLE IF NOT EXISTS portal_notifications (\n  id TEXT PRIMARY KEY,\n  member_id TEXT,\n  kind TEXT NOT NULL DEFAULT 'info',\n  title TEXT NOT NULL,\n  body TEXT NOT NULL DEFAULT '',\n  href TEXT,\n  read_at TEXT,\n  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,\n  FOREIGN KEY (member_id) REFERENCES portal_members(id) ON DELETE CASCADE\n);\n\nCREATE TABLE IF NOT EXISTS portal_tasks (\n  id TEXT PRIMARY KEY,\n  title TEXT NOT NULL,\n  description TEXT NOT NULL DEFAULT '',\n  project_slug TEXT,\n  team_code TEXT,\n  assignee_id TEXT,\n  status TEXT NOT NULL DEFAULT 'backlog'\n    CHECK (status IN ('backlog','todo','doing','review','blocked','done')),\n  priority TEXT NOT NULL DEFAULT 'medium'\n    CHECK (priority IN ('low','medium','high','critical')),\n  due_at TEXT,\n  created_by TEXT NOT NULL,\n  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,\n  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,\n  FOREIGN KEY (assignee_id) REFERENCES portal_members(id) ON DELETE SET NULL\n);\n\nCREATE TABLE IF NOT EXISTS portal_task_comments (\n  id TEXT PRIMARY KEY,\n  task_id TEXT NOT NULL,\n  author_id TEXT NOT NULL,\n  body TEXT NOT NULL,\n  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,\n  FOREIGN KEY (task_id) REFERENCES portal_tasks(id) ON DELETE CASCADE,\n  FOREIGN KEY (author_id) REFERENCES portal_members(id) ON DELETE CASCADE\n);\n\nCREATE TABLE IF NOT EXISTS portal_resources (\n  id TEXT PRIMARY KEY,\n  kind TEXT NOT NULL\n    CHECK (kind IN ('document','archive','library','drawing','pcb','bom','code','procedure','dataset','media')),\n  title TEXT NOT NULL,\n  description TEXT NOT NULL DEFAULT '',\n  team_code TEXT,\n  project_slug TEXT,\n  object_key TEXT,\n  external_url TEXT,\n  tags_json TEXT NOT NULL DEFAULT '[]',\n  visibility TEXT NOT NULL DEFAULT 'members'\n    CHECK (visibility IN ('members','team','leads','admins')),\n  created_by TEXT NOT NULL,\n  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,\n  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP\n);\n\nCREATE TABLE IF NOT EXISTS portal_resource_versions (\n  id TEXT PRIMARY KEY,\n  resource_id TEXT NOT NULL,\n  version_label TEXT NOT NULL,\n  object_key TEXT,\n  external_url TEXT,\n  note TEXT NOT NULL DEFAULT '',\n  created_by TEXT NOT NULL,\n  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,\n  FOREIGN KEY (resource_id) REFERENCES portal_resources(id) ON DELETE CASCADE\n);\n\nCREATE TABLE IF NOT EXISTS portal_repositories (\n  id TEXT PRIMARY KEY,\n  name TEXT NOT NULL,\n  provider TEXT NOT NULL DEFAULT 'github',\n  repo_url TEXT NOT NULL,\n  project_slug TEXT,\n  team_code TEXT,\n  visibility TEXT NOT NULL DEFAULT 'private',\n  default_branch TEXT NOT NULL DEFAULT 'main',\n  health TEXT NOT NULL DEFAULT 'unverified',\n  last_sync_at TEXT,\n  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP\n);\n\nCREATE TABLE IF NOT EXISTS portal_inventory_items (\n  id TEXT PRIMARY KEY,\n  sku TEXT NOT NULL UNIQUE,\n  name TEXT NOT NULL,\n  category TEXT NOT NULL DEFAULT 'general',\n  location TEXT NOT NULL DEFAULT '',\n  unit TEXT NOT NULL DEFAULT 'pcs',\n  quantity REAL NOT NULL DEFAULT 0,\n  minimum_quantity REAL NOT NULL DEFAULT 0,\n  reserved_quantity REAL NOT NULL DEFAULT 0,\n  metadata_json TEXT NOT NULL DEFAULT '{}',\n  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,\n  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP\n);\n\nCREATE TABLE IF NOT EXISTS portal_inventory_movements (\n  id TEXT PRIMARY KEY,\n  item_id TEXT NOT NULL,\n  member_id TEXT,\n  delta REAL NOT NULL,\n  reason TEXT NOT NULL,\n  project_slug TEXT,\n  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,\n  FOREIGN KEY (item_id) REFERENCES portal_inventory_items(id) ON DELETE CASCADE,\n  FOREIGN KEY (member_id) REFERENCES portal_members(id) ON DELETE SET NULL\n);\n\nCREATE TABLE IF NOT EXISTS portal_channels (\n  id TEXT PRIMARY KEY,\n  slug TEXT NOT NULL UNIQUE,\n  name TEXT NOT NULL,\n  description TEXT NOT NULL DEFAULT '',\n  team_code TEXT,\n  visibility TEXT NOT NULL DEFAULT 'members'\n    CHECK (visibility IN ('members','team','leads','admins')),\n  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP\n);\n\nCREATE TABLE IF NOT EXISTS portal_messages (\n  id TEXT PRIMARY KEY,\n  channel_id TEXT NOT NULL,\n  author_id TEXT NOT NULL,\n  body TEXT NOT NULL,\n  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,\n  edited_at TEXT,\n  FOREIGN KEY (channel_id) REFERENCES portal_channels(id) ON DELETE CASCADE,\n  FOREIGN KEY (author_id) REFERENCES portal_members(id) ON DELETE CASCADE\n);\n\nCREATE TABLE IF NOT EXISTS portal_mail_threads (\n  id TEXT PRIMARY KEY,\n  subject TEXT NOT NULL,\n  created_by TEXT NOT NULL,\n  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,\n  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,\n  FOREIGN KEY (created_by) REFERENCES portal_members(id) ON DELETE CASCADE\n);\n\nCREATE TABLE IF NOT EXISTS portal_mail_participants (\n  thread_id TEXT NOT NULL,\n  member_id TEXT NOT NULL,\n  PRIMARY KEY (thread_id, member_id),\n  FOREIGN KEY (thread_id) REFERENCES portal_mail_threads(id) ON DELETE CASCADE,\n  FOREIGN KEY (member_id) REFERENCES portal_members(id) ON DELETE CASCADE\n);\n\nCREATE TABLE IF NOT EXISTS portal_mail_messages (\n  id TEXT PRIMARY KEY,\n  thread_id TEXT NOT NULL,\n  author_id TEXT NOT NULL,\n  body TEXT NOT NULL,\n  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,\n  FOREIGN KEY (thread_id) REFERENCES portal_mail_threads(id) ON DELETE CASCADE,\n  FOREIGN KEY (author_id) REFERENCES portal_members(id) ON DELETE CASCADE\n);\n\nCREATE TABLE IF NOT EXISTS portal_calendar_events (\n  id TEXT PRIMARY KEY,\n  title TEXT NOT NULL,\n  description TEXT NOT NULL DEFAULT '',\n  starts_at TEXT NOT NULL,\n  ends_at TEXT,\n  location TEXT NOT NULL DEFAULT '',\n  team_code TEXT,\n  project_slug TEXT,\n  created_by TEXT NOT NULL,\n  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP\n);\n\nCREATE TABLE IF NOT EXISTS portal_vehicle_units (\n  id TEXT PRIMARY KEY,\n  code TEXT NOT NULL UNIQUE,\n  name TEXT NOT NULL,\n  domain TEXT NOT NULL,\n  status TEXT NOT NULL DEFAULT 'offline'\n    CHECK (status IN ('offline','idle','testing','mission','maintenance')),\n  last_seen_at TEXT,\n  metadata_json TEXT NOT NULL DEFAULT '{}',\n  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,\n  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP\n);\n\nCREATE TABLE IF NOT EXISTS portal_telemetry_snapshots (\n  id INTEGER PRIMARY KEY AUTOINCREMENT,\n  vehicle_id TEXT NOT NULL,\n  latitude REAL,\n  longitude REAL,\n  heading REAL,\n  speed REAL,\n  battery REAL,\n  mode TEXT,\n  health_json TEXT NOT NULL DEFAULT '{}',\n  recorded_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,\n  FOREIGN KEY (vehicle_id) REFERENCES portal_vehicle_units(id) ON DELETE CASCADE\n);\n\nCREATE TABLE IF NOT EXISTS portal_activity_log (\n  id INTEGER PRIMARY KEY AUTOINCREMENT,\n  actor TEXT NOT NULL,\n  action TEXT NOT NULL,\n  entity_type TEXT NOT NULL,\n  entity_id TEXT NOT NULL,\n  details_json TEXT NOT NULL DEFAULT '{}',\n  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP\n);\n\nCREATE TABLE IF NOT EXISTS portal_security_devices (\n  id TEXT PRIMARY KEY,\n  member_id TEXT NOT NULL,\n  label TEXT NOT NULL,\n  device_type TEXT NOT NULL DEFAULT 'future-mobile',\n  public_key TEXT,\n  status TEXT NOT NULL DEFAULT 'pending'\n    CHECK (status IN ('pending','trusted','revoked')),\n  last_seen_at TEXT,\n  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,\n  FOREIGN KEY (member_id) REFERENCES portal_members(id) ON DELETE CASCADE\n);\n\nCREATE INDEX IF NOT EXISTS idx_portal_members_status ON portal_members(status);\nCREATE INDEX IF NOT EXISTS idx_portal_sessions_member ON portal_sessions(member_id);\nCREATE INDEX IF NOT EXISTS idx_portal_sessions_expiry ON portal_sessions(expires_at);\nCREATE INDEX IF NOT EXISTS idx_portal_tasks_status ON portal_tasks(status);\nCREATE INDEX IF NOT EXISTS idx_portal_tasks_project ON portal_tasks(project_slug);\nCREATE INDEX IF NOT EXISTS idx_portal_resources_kind ON portal_resources(kind);\nCREATE INDEX IF NOT EXISTS idx_portal_inventory_category ON portal_inventory_items(category);\nCREATE INDEX IF NOT EXISTS idx_portal_messages_channel ON portal_messages(channel_id, created_at);\nCREATE INDEX IF NOT EXISTS idx_portal_activity_created ON portal_activity_log(created_at);\nCREATE INDEX IF NOT EXISTS idx_portal_telemetry_vehicle ON portal_telemetry_snapshots(vehicle_id, recorded_at);\n\nINSERT OR IGNORE INTO portal_channels (id,slug,name,description,visibility)\nVALUES\n('channel-general','general','Genel','Tüm CORE üyelerinin ortak sohbet alanı.','members'),\n('channel-announcements','announcements','Duyurular','Takım geneli resmî duyurular.','members'),\n('channel-field','field','Saha','Test, lojistik ve saha koordinasyonu.','members');\n\nINSERT OR IGNORE INTO portal_vehicle_units (id,code,name,domain,status,metadata_json)\nVALUES\n('vehicle-hydronom','HYD-01','Hydronom','CORE Marine','offline','{\"authority\":\"read-only-public-portal\",\"command_plane\":\"isolated\"}');\n\nINSERT INTO site_settings (setting_key,value_json,updated_at)\nVALUES ('portal_schema','{\"version\":\"2026.09-v2\",\"auth\":\"invite+password+server-session\",\"command_authority\":\"isolated\"}',CURRENT_TIMESTAMP)\nON CONFLICT(setting_key) DO UPDATE SET value_json=excluded.value_json,updated_at=CURRENT_TIMESTAMP;\n";


const PORTAL_V2_SQL = "-- YTÜ CORE Portal V2 professional workspace additions\n\nCREATE TABLE IF NOT EXISTS portal_invite_deliveries (\n  id TEXT PRIMARY KEY,\n  invite_id TEXT NOT NULL,\n  recipient TEXT NOT NULL,\n  provider TEXT NOT NULL DEFAULT 'none',\n  status TEXT NOT NULL DEFAULT 'pending'\n    CHECK (status IN ('pending','sent','failed','not_configured')),\n  message_id TEXT,\n  error TEXT,\n  attempted_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,\n  FOREIGN KEY (invite_id) REFERENCES portal_invites(id) ON DELETE CASCADE\n);\n\nCREATE TABLE IF NOT EXISTS portal_member_profiles (\n  member_id TEXT PRIMARY KEY,\n  headline TEXT NOT NULL DEFAULT '',\n  bio TEXT NOT NULL DEFAULT '',\n  skills_json TEXT NOT NULL DEFAULT '[]',\n  github_url TEXT,\n  linkedin_url TEXT,\n  phone TEXT,\n  availability TEXT NOT NULL DEFAULT '',\n  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,\n  FOREIGN KEY (member_id) REFERENCES portal_members(id) ON DELETE CASCADE\n);\n\nCREATE TABLE IF NOT EXISTS portal_channel_reads (\n  channel_id TEXT NOT NULL,\n  member_id TEXT NOT NULL,\n  last_read_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,\n  PRIMARY KEY (channel_id, member_id),\n  FOREIGN KEY (channel_id) REFERENCES portal_channels(id) ON DELETE CASCADE,\n  FOREIGN KEY (member_id) REFERENCES portal_members(id) ON DELETE CASCADE\n);\n\nCREATE INDEX IF NOT EXISTS idx_invite_delivery_invite\n  ON portal_invite_deliveries(invite_id, attempted_at);\nCREATE INDEX IF NOT EXISTS idx_invite_delivery_recipient\n  ON portal_invite_deliveries(recipient, attempted_at);\nCREATE INDEX IF NOT EXISTS idx_channel_reads_member\n  ON portal_channel_reads(member_id, last_read_at);\n\nINSERT INTO site_settings (setting_key,value_json,updated_at)\nVALUES (\n  'portal_workspace_schema',\n  '{\"version\":\"2026.09-v3\",\"features\":[\"invite-email\",\"member-profiles\",\"task-detail\",\"inventory-movements\",\"global-search\",\"mail-replies\"]}',\n  CURRENT_TIMESTAMP\n)\nON CONFLICT(setting_key) DO UPDATE SET\n  value_json=excluded.value_json,\n  updated_at=CURRENT_TIMESTAMP;\n";

const PORTAL_V4_SQL = "-- YTÜ CORE Portal V4 engineering OS additions\n-- Idempotent and additive: existing V1/V2 data remains untouched.\n\nCREATE TABLE IF NOT EXISTS portal_vault_files (\n  id TEXT PRIMARY KEY,\n  title TEXT NOT NULL,\n  description TEXT NOT NULL DEFAULT '',\n  kind TEXT NOT NULL DEFAULT 'document'\n    CHECK (kind IN ('document','archive','library','drawing','mechanical','cad','pcb','electronics','bom','code','procedure','dataset','media','firmware','simulation')),\n  original_name TEXT NOT NULL,\n  extension TEXT NOT NULL DEFAULT '',\n  mime_type TEXT NOT NULL DEFAULT 'application/octet-stream',\n  size_bytes INTEGER NOT NULL DEFAULT 0,\n  checksum_sha256 TEXT NOT NULL,\n  object_key TEXT NOT NULL UNIQUE,\n  preview_kind TEXT NOT NULL DEFAULT 'download',\n  team_code TEXT,\n  project_slug TEXT,\n  tags_json TEXT NOT NULL DEFAULT '[]',\n  visibility TEXT NOT NULL DEFAULT 'members'\n    CHECK (visibility IN ('members','team','leads','admins')),\n  revision INTEGER NOT NULL DEFAULT 1,\n  approval_state TEXT NOT NULL DEFAULT 'draft'\n    CHECK (approval_state IN ('draft','review','approved','rejected')),\n  lifecycle_state TEXT NOT NULL DEFAULT 'active'\n    CHECK (lifecycle_state IN ('active','archived','trashed')),\n  created_by TEXT NOT NULL,\n  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,\n  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP\n);\n\nCREATE TABLE IF NOT EXISTS portal_vault_versions (\n  id TEXT PRIMARY KEY,\n  file_id TEXT NOT NULL,\n  revision INTEGER NOT NULL,\n  original_name TEXT NOT NULL,\n  mime_type TEXT NOT NULL,\n  size_bytes INTEGER NOT NULL DEFAULT 0,\n  checksum_sha256 TEXT NOT NULL,\n  object_key TEXT NOT NULL UNIQUE,\n  note TEXT NOT NULL DEFAULT '',\n  created_by TEXT NOT NULL,\n  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,\n  UNIQUE(file_id, revision),\n  FOREIGN KEY (file_id) REFERENCES portal_vault_files(id) ON DELETE CASCADE\n);\n\nCREATE TABLE IF NOT EXISTS portal_design_derivatives (\n  id TEXT PRIMARY KEY,\n  file_id TEXT NOT NULL,\n  source_revision INTEGER NOT NULL,\n  derivative_type TEXT NOT NULL\n    CHECK (derivative_type IN ('gltf','glb','preview-svg','preview-png','pcb-3d','thumbnail','pdf')),\n  status TEXT NOT NULL DEFAULT 'queued'\n    CHECK (status IN ('queued','processing','ready','failed')),\n  object_key TEXT,\n  engine TEXT,\n  error TEXT,\n  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,\n  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,\n  FOREIGN KEY (file_id) REFERENCES portal_vault_files(id) ON DELETE CASCADE\n);\n\nCREATE TABLE IF NOT EXISTS portal_mail_state (\n  thread_id TEXT NOT NULL,\n  member_id TEXT NOT NULL,\n  folder TEXT NOT NULL DEFAULT 'inbox'\n    CHECK (folder IN ('inbox','archive','trash')),\n  starred INTEGER NOT NULL DEFAULT 0,\n  unread INTEGER NOT NULL DEFAULT 1,\n  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,\n  PRIMARY KEY (thread_id, member_id),\n  FOREIGN KEY (thread_id) REFERENCES portal_mail_threads(id) ON DELETE CASCADE,\n  FOREIGN KEY (member_id) REFERENCES portal_members(id) ON DELETE CASCADE\n);\n\nCREATE TABLE IF NOT EXISTS portal_mail_drafts (\n  id TEXT PRIMARY KEY,\n  owner_id TEXT NOT NULL,\n  subject TEXT NOT NULL DEFAULT '',\n  body TEXT NOT NULL DEFAULT '',\n  recipients_json TEXT NOT NULL DEFAULT '[]',\n  reply_to_thread_id TEXT,\n  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,\n  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,\n  FOREIGN KEY (owner_id) REFERENCES portal_members(id) ON DELETE CASCADE,\n  FOREIGN KEY (reply_to_thread_id) REFERENCES portal_mail_threads(id) ON DELETE SET NULL\n);\n\nCREATE TABLE IF NOT EXISTS portal_mail_attachments (\n  id TEXT PRIMARY KEY,\n  message_id TEXT NOT NULL,\n  vault_file_id TEXT NOT NULL,\n  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,\n  FOREIGN KEY (message_id) REFERENCES portal_mail_messages(id) ON DELETE CASCADE,\n  FOREIGN KEY (vault_file_id) REFERENCES portal_vault_files(id) ON DELETE CASCADE\n);\n\nCREATE TABLE IF NOT EXISTS portal_native_repositories (\n  id TEXT PRIMARY KEY,\n  name TEXT NOT NULL,\n  slug TEXT NOT NULL UNIQUE,\n  service_repository_id TEXT,\n  project_slug TEXT,\n  team_code TEXT,\n  visibility TEXT NOT NULL DEFAULT 'private'\n    CHECK (visibility IN ('private','internal','public')),\n  default_branch TEXT NOT NULL DEFAULT 'main',\n  status TEXT NOT NULL DEFAULT 'provisioning'\n    CHECK (status IN ('provisioning','ready','degraded','archived')),\n  mirror_url TEXT,\n  created_by TEXT NOT NULL,\n  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,\n  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP\n);\n\nCREATE TABLE IF NOT EXISTS portal_repo_gateways (\n  id TEXT PRIMARY KEY,\n  name TEXT NOT NULL,\n  service_url TEXT NOT NULL,\n  status TEXT NOT NULL DEFAULT 'disabled'\n    CHECK (status IN ('disabled','healthy','degraded','offline')),\n  capabilities_json TEXT NOT NULL DEFAULT '[]',\n  last_health_at TEXT,\n  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,\n  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP\n);\n\nCREATE TABLE IF NOT EXISTS portal_code_runs (\n  id TEXT PRIMARY KEY,\n  member_id TEXT NOT NULL,\n  repository_ref TEXT,\n  snapshot_ref TEXT,\n  language TEXT NOT NULL,\n  command_label TEXT NOT NULL,\n  status TEXT NOT NULL DEFAULT 'queued'\n    CHECK (status IN ('queued','running','passed','failed','timed_out','cancelled')),\n  runner_provider TEXT NOT NULL DEFAULT 'core-runner',\n  limits_json TEXT NOT NULL DEFAULT '{}',\n  exit_code INTEGER,\n  stdout_object_key TEXT,\n  stderr_object_key TEXT,\n  artifact_prefix TEXT,\n  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,\n  started_at TEXT,\n  finished_at TEXT,\n  FOREIGN KEY (member_id) REFERENCES portal_members(id) ON DELETE CASCADE\n);\n\nCREATE INDEX IF NOT EXISTS idx_vault_files_kind ON portal_vault_files(kind, updated_at);\nCREATE INDEX IF NOT EXISTS idx_vault_files_project ON portal_vault_files(project_slug, updated_at);\nCREATE INDEX IF NOT EXISTS idx_vault_files_lifecycle ON portal_vault_files(lifecycle_state, updated_at);\nCREATE INDEX IF NOT EXISTS idx_vault_versions_file ON portal_vault_versions(file_id, revision);\nCREATE INDEX IF NOT EXISTS idx_design_derivatives_file ON portal_design_derivatives(file_id, source_revision);\nCREATE INDEX IF NOT EXISTS idx_mail_state_member ON portal_mail_state(member_id, folder, unread, updated_at);\nCREATE INDEX IF NOT EXISTS idx_mail_drafts_owner ON portal_mail_drafts(owner_id, updated_at);\nCREATE INDEX IF NOT EXISTS idx_code_runs_member ON portal_code_runs(member_id, created_at);\nCREATE INDEX IF NOT EXISTS idx_native_repositories_project ON portal_native_repositories(project_slug, updated_at);\n\nINSERT INTO site_settings (setting_key,value_json,updated_at)\nVALUES (\n  'portal_engineering_os_schema',\n  '{\"version\":\"2026.09-v4\",\"features\":[\"vault-r2\",\"file-versioning\",\"browser-preview\",\"mechanical-workspace\",\"pcb-workspace\",\"mailbox-state\",\"pwa-shell\",\"native-repo-catalog\",\"repo-gateway-boundary\",\"runner-job-boundary\"]}',\n  CURRENT_TIMESTAMP\n)\nON CONFLICT(setting_key) DO UPDATE SET\n  value_json=excluded.value_json,\n  updated_at=CURRENT_TIMESTAMP;\n";

const PORTAL_V5_SQL = "-- YTÜ CORE Portal V5 native mobile acceleration\n-- Additive only: preserves existing portal/auth/session data.\n\nCREATE TABLE IF NOT EXISTS portal_mobile_devices (\n  id TEXT PRIMARY KEY,\n  member_id TEXT NOT NULL,\n  install_id TEXT NOT NULL UNIQUE,\n  platform TEXT NOT NULL\n    CHECK (platform IN ('android','ios','pwa','web','unknown')),\n  app_version TEXT NOT NULL DEFAULT '',\n  device_label TEXT NOT NULL DEFAULT '',\n  push_provider TEXT,\n  push_token TEXT,\n  trusted_state TEXT NOT NULL DEFAULT 'pending'\n    CHECK (trusted_state IN ('pending','trusted','revoked')),\n  biometric_enabled INTEGER NOT NULL DEFAULT 0,\n  last_path TEXT NOT NULL DEFAULT '/portal',\n  last_seen_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,\n  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,\n  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,\n  FOREIGN KEY (member_id) REFERENCES portal_members(id) ON DELETE CASCADE\n);\n\nCREATE INDEX IF NOT EXISTS idx_mobile_devices_member\n  ON portal_mobile_devices(member_id, last_seen_at);\n\nCREATE INDEX IF NOT EXISTS idx_mobile_devices_push\n  ON portal_mobile_devices(push_provider, push_token);\n\nINSERT INTO site_settings (setting_key,value_json,updated_at)\nVALUES (\n  'portal_mobile_schema',\n  '{\"version\":\"2026.09-v5\",\"features\":[\"capacitor-shell\",\"mobile-handoff\",\"device-registry\",\"deep-links\",\"app-links-ready\",\"push-token-ready\",\"biometric-ready\"]}',\n  CURRENT_TIMESTAMP\n)\nON CONFLICT(setting_key) DO UPDATE SET\n  value_json=excluded.value_json,\n  updated_at=CURRENT_TIMESTAMP;\n";

const PORTAL_V6_SQL = `-- YTÜ CORE Portal V6 governance / control-plane additions
-- Additive only. Existing V1-V5 data and role values remain valid.

CREATE TABLE IF NOT EXISTS portal_teams (
  code TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  domain TEXT NOT NULL DEFAULT '',
  description TEXT NOT NULL DEFAULT '',
  visibility TEXT NOT NULL DEFAULT 'restricted'
    CHECK (visibility IN ('restricted','members')),
  status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active','archived')),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS portal_team_memberships (
  team_code TEXT NOT NULL,
  member_id TEXT NOT NULL,
  team_role TEXT NOT NULL DEFAULT 'engineer'
    CHECK (team_role IN ('owner','captain','lead','engineer','contributor','observer')),
  status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active','inactive')),
  capabilities_json TEXT NOT NULL DEFAULT '[]',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (team_code, member_id),
  FOREIGN KEY (team_code) REFERENCES portal_teams(code) ON DELETE CASCADE,
  FOREIGN KEY (member_id) REFERENCES portal_members(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS portal_role_profiles (
  role_key TEXT PRIMARY KEY,
  label TEXT NOT NULL,
  scope TEXT NOT NULL DEFAULT 'global',
  description TEXT NOT NULL DEFAULT '',
  capabilities_json TEXT NOT NULL DEFAULT '[]',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS portal_member_capabilities (
  member_id TEXT NOT NULL,
  capability TEXT NOT NULL,
  granted_by TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (member_id, capability),
  FOREIGN KEY (member_id) REFERENCES portal_members(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS portal_project_registry (
  slug TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  summary TEXT NOT NULL DEFAULT '',
  domain TEXT NOT NULL DEFAULT '',
  team_code TEXT,
  status TEXT NOT NULL DEFAULT 'concept'
    CHECK (status IN ('concept','design','prototype','testing','operational','paused','archived')),
  visibility TEXT NOT NULL DEFAULT 'team'
    CHECK (visibility IN ('team','members','leads','admins')),
  owner_member_id TEXT,
  start_at TEXT,
  target_at TEXT,
  risk_level TEXT NOT NULL DEFAULT 'medium'
    CHECK (risk_level IN ('low','medium','high','critical')),
  readiness INTEGER NOT NULL DEFAULT 0
    CHECK (readiness BETWEEN 0 AND 100),
  metadata_json TEXT NOT NULL DEFAULT '{}',
  created_by TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (team_code) REFERENCES portal_teams(code) ON DELETE SET NULL,
  FOREIGN KEY (owner_member_id) REFERENCES portal_members(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS portal_project_map_edges (
  id TEXT PRIMARY KEY,
  source_type TEXT NOT NULL
    CHECK (source_type IN ('project','team','vehicle','repo','vault','task')),
  source_ref TEXT NOT NULL,
  target_type TEXT NOT NULL
    CHECK (target_type IN ('project','team','vehicle','repo','vault','task')),
  target_ref TEXT NOT NULL,
  relation TEXT NOT NULL DEFAULT 'depends_on',
  label TEXT NOT NULL DEFAULT '',
  created_by TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(source_type, source_ref, target_type, target_ref, relation)
);

CREATE TABLE IF NOT EXISTS portal_vehicle_profiles (
  vehicle_id TEXT PRIMARY KEY,
  team_code TEXT,
  project_slug TEXT,
  platform_type TEXT NOT NULL DEFAULT 'vehicle',
  lifecycle TEXT NOT NULL DEFAULT 'prototype'
    CHECK (lifecycle IN ('concept','prototype','testing','operational','maintenance','retired')),
  serial_number TEXT NOT NULL DEFAULT '',
  criticality TEXT NOT NULL DEFAULT 'medium'
    CHECK (criticality IN ('low','medium','high','critical')),
  description TEXT NOT NULL DEFAULT '',
  owner_member_id TEXT,
  metadata_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (vehicle_id) REFERENCES portal_vehicle_units(id) ON DELETE CASCADE,
  FOREIGN KEY (team_code) REFERENCES portal_teams(code) ON DELETE SET NULL,
  FOREIGN KEY (project_slug) REFERENCES portal_project_registry(slug) ON DELETE SET NULL,
  FOREIGN KEY (owner_member_id) REFERENCES portal_members(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_team_memberships_member
  ON portal_team_memberships(member_id, status);
CREATE INDEX IF NOT EXISTS idx_team_memberships_team
  ON portal_team_memberships(team_code, status);
CREATE INDEX IF NOT EXISTS idx_member_capabilities_member
  ON portal_member_capabilities(member_id);
CREATE INDEX IF NOT EXISTS idx_project_registry_team
  ON portal_project_registry(team_code, status, updated_at);
CREATE INDEX IF NOT EXISTS idx_project_map_source
  ON portal_project_map_edges(source_type, source_ref);
CREATE INDEX IF NOT EXISTS idx_project_map_target
  ON portal_project_map_edges(target_type, target_ref);
CREATE INDEX IF NOT EXISTS idx_vehicle_profiles_team
  ON portal_vehicle_profiles(team_code, lifecycle);

INSERT OR IGNORE INTO portal_teams (code,name,domain,description,visibility) VALUES
('MAR','CORE Marine','USV / surface autonomy','İnsansız suüstü araçları, seyrüsefer ve deniz saha operasyonları.','restricted'),
('SUB','CORE Subsea','AUV / ROV','Sualtı araçları, underwater perception ve test operasyonları.','restricted'),
('LAND','CORE Land','UGV / rover','Kara robotları, rover ve otonom mobil platformlar.','restricted'),
('AIR','CORE Air','UAV','İnsansız hava araçları, avionics ve uçuş sistemleri.','restricted'),
('IND','CORE Industrial','AMR / work machine','Endüstriyel mobil robotlar, tarım ve maden uygulamaları.','restricted'),
('SPACE','CORE Space','CubeSat / payload','Uydu, yer istasyonu, faydalı yük ve uzay sistemleri.','restricted'),
('ROCKET','CORE Rocket','high altitude / propulsion','Roket, itki, yüksek irtifa ve uçuş sistemleri.','restricted'),
('SYS','CORE Systems','runtime / autonomy','Ortak runtime, otonomi, karar ve sistem mimarisi.','restricted'),
('EMB','CORE Embedded','PCB / MCU / power','Gömülü yazılım, PCB, MCU, güç ve elektronik platformlar.','restricted'),
('OPS','CORE Ops','ground / telemetry / field','Yer istasyonu, telemetri, saha ve operasyon koordinasyonu.','restricted'),
('RES','CORE Research','research / patents','Araştırma, rapor, yayın, patent ve ön tasarım.','restricted');

INSERT OR IGNORE INTO portal_role_profiles (role_key,label,scope,description,capabilities_json) VALUES
('admin','Portal Yöneticisi','global','Tüm portal, erişim ve kontrol-plane yetkileri.','["portal.admin","teams.read_all","teams.manage","roles.manage","control.projects","control.vehicles","project.map.edit","vault.approve","ops.read_all"]'),
('lead','Takım / Program Lideri','global','Proje, araç ve teknik yönetim yetkileri; takım görünürlüğü üyelikle sınırlıdır.','["control.projects","control.vehicles","project.map.edit","vault.approve"]'),
('member','Mühendis / Üye','global','Günlük mühendislik çalışma alanı ve takım üyeliği kapsamındaki erişim.','[]'),
('alumni','Mezun','global','Kısıtlı kurumsal hafıza ve davet edilen takım alanı erişimi.','[]'),
('viewer','Görüntüleyici','global','Salt okunur, açıkça izin verilen alanlar.','[]'),
('team_owner','Takım Sahibi','team','Takım sayfası, üyelik, proje ve araç yönetimi.','["team.manage","team.project.manage","team.vehicle.manage"]'),
('team_captain','Kaptan','team','Takım operasyonu ve proje/araç koordinasyonu.','["team.project.manage","team.vehicle.manage"]'),
('team_lead','Takım Lideri','team','Teknik liderlik ve takım iş yönetimi.','["team.project.manage"]'),
('engineer','Mühendis','team','Takım çalışma alanı ve teknik veri erişimi.','[]'),
('contributor','Katkıcı','team','Sınırlı takım çalışma alanı erişimi.','[]'),
('observer','Gözlemci','team','Salt okunur takım görünürlüğü.','[]');

INSERT INTO site_settings (setting_key,value_json,updated_at)
VALUES (
  'portal_control_plane_schema',
  '{"version":"2026.09-v6","features":["team-workspaces","team-memberships","role-profiles","member-capabilities","internal-project-registry","project-mapping","vehicle-profiles","control-plane"]}',
  CURRENT_TIMESTAMP
)
ON CONFLICT(setting_key) DO UPDATE SET
  value_json=excluded.value_json,
  updated_at=CURRENT_TIMESTAMP;
`;

const PORTAL_V7_SQL = "-- YTÜ CORE Portal RP-02 repository code review\n-- Additive only. Review state is portal governance metadata; Git objects remain in CORE Repo Service.\n\nCREATE TABLE IF NOT EXISTS portal_repo_reviews (\n  id TEXT PRIMARY KEY,\n  repository_id TEXT NOT NULL,\n  base_ref TEXT NOT NULL,\n  head_ref TEXT NOT NULL,\n  base_sha TEXT NOT NULL,\n  head_sha TEXT NOT NULL,\n  title TEXT NOT NULL DEFAULT '',\n  status TEXT NOT NULL DEFAULT 'open'\n    CHECK (status IN ('open','approved','changes_requested','closed')),\n  created_by_member_id TEXT NOT NULL,\n  created_by_email TEXT NOT NULL,\n  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,\n  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,\n  UNIQUE(repository_id, base_sha, head_sha),\n  FOREIGN KEY (repository_id) REFERENCES portal_native_repositories(id) ON DELETE CASCADE,\n  FOREIGN KEY (created_by_member_id) REFERENCES portal_members(id) ON DELETE CASCADE\n);\n\nCREATE TABLE IF NOT EXISTS portal_repo_review_threads (\n  id TEXT PRIMARY KEY,\n  review_id TEXT NOT NULL,\n  file_path TEXT NOT NULL,\n  side TEXT NOT NULL DEFAULT 'head'\n    CHECK (side IN ('base','head')),\n  line_number INTEGER NOT NULL CHECK (line_number > 0),\n  line_sha TEXT,\n  created_by_member_id TEXT NOT NULL,\n  resolved_at TEXT,\n  resolved_by_member_id TEXT,\n  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,\n  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,\n  FOREIGN KEY (review_id) REFERENCES portal_repo_reviews(id) ON DELETE CASCADE,\n  FOREIGN KEY (created_by_member_id) REFERENCES portal_members(id) ON DELETE CASCADE,\n  FOREIGN KEY (resolved_by_member_id) REFERENCES portal_members(id) ON DELETE SET NULL\n);\n\nCREATE TABLE IF NOT EXISTS portal_repo_review_comments (\n  id TEXT PRIMARY KEY,\n  thread_id TEXT NOT NULL,\n  author_member_id TEXT NOT NULL,\n  body TEXT NOT NULL,\n  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,\n  edited_at TEXT,\n  FOREIGN KEY (thread_id) REFERENCES portal_repo_review_threads(id) ON DELETE CASCADE,\n  FOREIGN KEY (author_member_id) REFERENCES portal_members(id) ON DELETE CASCADE\n);\n\nCREATE TABLE IF NOT EXISTS portal_repo_review_submissions (\n  id TEXT PRIMARY KEY,\n  review_id TEXT NOT NULL,\n  reviewer_member_id TEXT NOT NULL,\n  outcome TEXT NOT NULL\n    CHECK (outcome IN ('comment','approve','request_changes')),\n  body TEXT NOT NULL DEFAULT '',\n  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,\n  FOREIGN KEY (review_id) REFERENCES portal_repo_reviews(id) ON DELETE CASCADE,\n  FOREIGN KEY (reviewer_member_id) REFERENCES portal_members(id) ON DELETE CASCADE\n);\n\nCREATE INDEX IF NOT EXISTS idx_repo_reviews_repository\n  ON portal_repo_reviews(repository_id, updated_at DESC);\nCREATE INDEX IF NOT EXISTS idx_repo_reviews_snapshot\n  ON portal_repo_reviews(repository_id, base_sha, head_sha);\nCREATE INDEX IF NOT EXISTS idx_repo_review_threads_review\n  ON portal_repo_review_threads(review_id, file_path, line_number);\nCREATE INDEX IF NOT EXISTS idx_repo_review_comments_thread\n  ON portal_repo_review_comments(thread_id, created_at);\nCREATE INDEX IF NOT EXISTS idx_repo_review_submissions_review\n  ON portal_repo_review_submissions(review_id, created_at DESC);\n\nINSERT INTO site_settings (setting_key,value_json,updated_at)\nVALUES (\n  'portal_repo_review_schema',\n  '{\"version\":\"2026.09-rp02\",\"features\":[\"immutable-review-snapshots\",\"diff-hunks\",\"line-threads\",\"resolve-reopen\",\"review-submissions\",\"approve-request-changes\"]}',\n  CURRENT_TIMESTAMP\n)\nON CONFLICT(setting_key) DO UPDATE SET\n  value_json=excluded.value_json,\n  updated_at=CURRENT_TIMESTAMP;\n";

const PORTAL_V8_SQL = "-- YTÜ CORE Portal CL-01 Code Lab execution metadata\n-- Additive only. User code executes in CORE Runner sandbox containers, never in the CMS Worker.\n\nCREATE TABLE IF NOT EXISTS portal_code_run_execution (\n  run_id TEXT PRIMARY KEY,\n  native_repository_id TEXT NOT NULL,\n  service_repository_id TEXT NOT NULL,\n  snapshot_ref TEXT NOT NULL,\n  snapshot_sha TEXT,\n  workflow_instance_id TEXT,\n  dispatch_token TEXT NOT NULL,\n  attempt INTEGER NOT NULL DEFAULT 1,\n  retry_of_run_id TEXT,\n  cancel_requested_at TEXT,\n  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,\n  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,\n  FOREIGN KEY (run_id) REFERENCES portal_code_runs(id) ON DELETE CASCADE,\n  FOREIGN KEY (native_repository_id) REFERENCES portal_native_repositories(id) ON DELETE CASCADE,\n  FOREIGN KEY (retry_of_run_id) REFERENCES portal_code_runs(id) ON DELETE SET NULL\n);\n\nCREATE TABLE IF NOT EXISTS portal_code_run_events (\n  id INTEGER PRIMARY KEY AUTOINCREMENT,\n  run_id TEXT NOT NULL,\n  phase TEXT NOT NULL,\n  level TEXT NOT NULL DEFAULT 'info'\n    CHECK (level IN ('info','success','warning','error')),\n  message TEXT NOT NULL DEFAULT '',\n  metadata_json TEXT NOT NULL DEFAULT '{}',\n  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,\n  FOREIGN KEY (run_id) REFERENCES portal_code_runs(id) ON DELETE CASCADE\n);\n\nCREATE TABLE IF NOT EXISTS portal_code_run_artifacts (\n  id TEXT PRIMARY KEY,\n  run_id TEXT NOT NULL,\n  name TEXT NOT NULL,\n  kind TEXT NOT NULL DEFAULT 'artifact',\n  mime_type TEXT NOT NULL DEFAULT 'application/octet-stream',\n  object_key TEXT NOT NULL UNIQUE,\n  size_bytes INTEGER NOT NULL DEFAULT 0,\n  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,\n  FOREIGN KEY (run_id) REFERENCES portal_code_runs(id) ON DELETE CASCADE\n);\n\nCREATE INDEX IF NOT EXISTS idx_code_run_execution_repo\n  ON portal_code_run_execution(native_repository_id, created_at DESC);\nCREATE INDEX IF NOT EXISTS idx_code_run_events_run\n  ON portal_code_run_events(run_id, created_at);\nCREATE INDEX IF NOT EXISTS idx_code_run_artifacts_run\n  ON portal_code_run_artifacts(run_id, created_at);\n\nINSERT INTO site_settings (setting_key,value_json,updated_at)\nVALUES (\n  'portal_code_lab_schema',\n  '{\"version\":\"2026.09-cl01\",\"features\":[\"runner-workflow\",\"sandbox-container\",\"immutable-snapshot\",\"events\",\"logs\",\"artifacts\",\"cancel\",\"retry\"]}',\n  CURRENT_TIMESTAMP\n)\nON CONFLICT(setting_key) DO UPDATE SET\n  value_json=excluded.value_json,\n  updated_at=CURRENT_TIMESTAMP;\n";

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
  "portal_vault_files",
  "portal_vault_versions",
  "portal_design_derivatives",
  "portal_mail_state",
  "portal_mail_drafts",
  "portal_mail_attachments",
  "portal_native_repositories",
  "portal_repo_gateways",
  "portal_code_runs",
  "portal_mobile_devices",
  "portal_teams",
  "portal_team_memberships",
  "portal_role_profiles",
  "portal_member_capabilities",
  "portal_project_registry",
  "portal_project_map_edges",
  "portal_vehicle_profiles",
  "portal_repo_reviews",
  "portal_repo_review_threads",
  "portal_repo_review_comments",
  "portal_repo_review_submissions",
  "portal_code_run_execution",
  "portal_code_run_events",
  "portal_code_run_artifacts",
] as const;

let repoReviewSchemaPromise: Promise<void> | null = null;

export async function ensurePortalRepoReviewSchema() {
  if (repoReviewSchemaPromise) return repoReviewSchemaPromise;
  repoReviewSchemaPromise = (async () => {
    const db = env.DB;
    if (!db) throw new Error("DB binding is not available.");
    const statements = splitPortalSql(PORTAL_V7_SQL);
    if (!statements.length) throw new Error("Repository review migration is empty.");
    await db.batch(statements.map((statement) => db.prepare(statement)));
  })().catch((error) => {
    repoReviewSchemaPromise = null;
    throw error;
  });
  return repoReviewSchemaPromise;
}

let codeLabSchemaPromise: Promise<void> | null = null;

export async function ensurePortalCodeLabSchema() {
  if (codeLabSchemaPromise) return codeLabSchemaPromise;
  codeLabSchemaPromise = (async () => {
    const db = env.DB;
    if (!db) throw new Error("DB binding is not available.");
    const statements = splitPortalSql(PORTAL_V8_SQL);
    if (!statements.length) throw new Error("Code Lab migration is empty.");
    await db.batch(statements.map((statement) => db.prepare(statement)));
  })().catch((error) => {
    codeLabSchemaPromise = null;
    throw error;
  });
  return codeLabSchemaPromise;
}

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

  const statements = splitPortalSql(PORTAL_SCHEMA_SQL + "\n" + PORTAL_V2_SQL + "\n" + PORTAL_V4_SQL + "\n" + PORTAL_V5_SQL + "\n" + PORTAL_V6_SQL + "\n" + PORTAL_V7_SQL + "\n" + PORTAL_V8_SQL);
  if (!statements.length) throw new Error("Portal migration is empty.");

  await db.batch(statements.map((statement) => db.prepare(statement)));

  await db.prepare(`
    INSERT INTO audit_log (actor, action, entity_type, entity_id, details_json)
    VALUES (?, 'portal.bootstrap', 'portal', 'foundation', ?)
  `).bind(
    actor,
    JSON.stringify({
      version: "2026.09-cl01",
      statementCount: statements.length,
      modules: [
        "members","auth","tasks","resources","repositories","inventory",
        "chat","mail","calendar","notifications","vault","cad","pcb","repo-gateway","runner-jobs","mobile-shell","mobile-devices","deep-links","vehicles","telemetry","devices","teams","governance","role-profiles","project-registry","project-map","vehicle-profiles","control-plane","repo-review","repo-native-r2","code-lab-runner","code-lab-events","code-lab-artifacts"
      ],
    })
  ).run();

  return portalBootstrapStatus();
}
