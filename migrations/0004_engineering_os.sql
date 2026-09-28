-- YTÜ CORE Portal V4 engineering OS additions
-- Idempotent and additive: existing V1/V2 data remains untouched.

CREATE TABLE IF NOT EXISTS portal_vault_files (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  kind TEXT NOT NULL DEFAULT 'document'
    CHECK (kind IN ('document','archive','library','drawing','mechanical','cad','pcb','electronics','bom','code','procedure','dataset','media','firmware','simulation')),
  original_name TEXT NOT NULL,
  extension TEXT NOT NULL DEFAULT '',
  mime_type TEXT NOT NULL DEFAULT 'application/octet-stream',
  size_bytes INTEGER NOT NULL DEFAULT 0,
  checksum_sha256 TEXT NOT NULL,
  object_key TEXT NOT NULL UNIQUE,
  preview_kind TEXT NOT NULL DEFAULT 'download',
  team_code TEXT,
  project_slug TEXT,
  tags_json TEXT NOT NULL DEFAULT '[]',
  visibility TEXT NOT NULL DEFAULT 'members'
    CHECK (visibility IN ('members','team','leads','admins')),
  revision INTEGER NOT NULL DEFAULT 1,
  approval_state TEXT NOT NULL DEFAULT 'draft'
    CHECK (approval_state IN ('draft','review','approved','rejected')),
  lifecycle_state TEXT NOT NULL DEFAULT 'active'
    CHECK (lifecycle_state IN ('active','archived','trashed')),
  created_by TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS portal_vault_versions (
  id TEXT PRIMARY KEY,
  file_id TEXT NOT NULL,
  revision INTEGER NOT NULL,
  original_name TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  size_bytes INTEGER NOT NULL DEFAULT 0,
  checksum_sha256 TEXT NOT NULL,
  object_key TEXT NOT NULL UNIQUE,
  note TEXT NOT NULL DEFAULT '',
  created_by TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(file_id, revision),
  FOREIGN KEY (file_id) REFERENCES portal_vault_files(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS portal_design_derivatives (
  id TEXT PRIMARY KEY,
  file_id TEXT NOT NULL,
  source_revision INTEGER NOT NULL,
  derivative_type TEXT NOT NULL
    CHECK (derivative_type IN ('gltf','glb','preview-svg','preview-png','pcb-3d','thumbnail','pdf')),
  status TEXT NOT NULL DEFAULT 'queued'
    CHECK (status IN ('queued','processing','ready','failed')),
  object_key TEXT,
  engine TEXT,
  error TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (file_id) REFERENCES portal_vault_files(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS portal_mail_state (
  thread_id TEXT NOT NULL,
  member_id TEXT NOT NULL,
  folder TEXT NOT NULL DEFAULT 'inbox'
    CHECK (folder IN ('inbox','archive','trash')),
  starred INTEGER NOT NULL DEFAULT 0,
  unread INTEGER NOT NULL DEFAULT 1,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (thread_id, member_id),
  FOREIGN KEY (thread_id) REFERENCES portal_mail_threads(id) ON DELETE CASCADE,
  FOREIGN KEY (member_id) REFERENCES portal_members(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS portal_mail_drafts (
  id TEXT PRIMARY KEY,
  owner_id TEXT NOT NULL,
  subject TEXT NOT NULL DEFAULT '',
  body TEXT NOT NULL DEFAULT '',
  recipients_json TEXT NOT NULL DEFAULT '[]',
  reply_to_thread_id TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (owner_id) REFERENCES portal_members(id) ON DELETE CASCADE,
  FOREIGN KEY (reply_to_thread_id) REFERENCES portal_mail_threads(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS portal_mail_attachments (
  id TEXT PRIMARY KEY,
  message_id TEXT NOT NULL,
  vault_file_id TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (message_id) REFERENCES portal_mail_messages(id) ON DELETE CASCADE,
  FOREIGN KEY (vault_file_id) REFERENCES portal_vault_files(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS portal_native_repositories (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  service_repository_id TEXT,
  project_slug TEXT,
  team_code TEXT,
  visibility TEXT NOT NULL DEFAULT 'private'
    CHECK (visibility IN ('private','internal','public')),
  default_branch TEXT NOT NULL DEFAULT 'main',
  status TEXT NOT NULL DEFAULT 'provisioning'
    CHECK (status IN ('provisioning','ready','degraded','archived')),
  mirror_url TEXT,
  created_by TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS portal_repo_gateways (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  service_url TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'disabled'
    CHECK (status IN ('disabled','healthy','degraded','offline')),
  capabilities_json TEXT NOT NULL DEFAULT '[]',
  last_health_at TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS portal_code_runs (
  id TEXT PRIMARY KEY,
  member_id TEXT NOT NULL,
  repository_ref TEXT,
  snapshot_ref TEXT,
  language TEXT NOT NULL,
  command_label TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'queued'
    CHECK (status IN ('queued','running','passed','failed','timed_out','cancelled')),
  runner_provider TEXT NOT NULL DEFAULT 'core-runner',
  limits_json TEXT NOT NULL DEFAULT '{}',
  exit_code INTEGER,
  stdout_object_key TEXT,
  stderr_object_key TEXT,
  artifact_prefix TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  started_at TEXT,
  finished_at TEXT,
  FOREIGN KEY (member_id) REFERENCES portal_members(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_vault_files_kind ON portal_vault_files(kind, updated_at);
CREATE INDEX IF NOT EXISTS idx_vault_files_project ON portal_vault_files(project_slug, updated_at);
CREATE INDEX IF NOT EXISTS idx_vault_files_lifecycle ON portal_vault_files(lifecycle_state, updated_at);
CREATE INDEX IF NOT EXISTS idx_vault_versions_file ON portal_vault_versions(file_id, revision);
CREATE INDEX IF NOT EXISTS idx_design_derivatives_file ON portal_design_derivatives(file_id, source_revision);
CREATE INDEX IF NOT EXISTS idx_mail_state_member ON portal_mail_state(member_id, folder, unread, updated_at);
CREATE INDEX IF NOT EXISTS idx_mail_drafts_owner ON portal_mail_drafts(owner_id, updated_at);
CREATE INDEX IF NOT EXISTS idx_code_runs_member ON portal_code_runs(member_id, created_at);
CREATE INDEX IF NOT EXISTS idx_native_repositories_project ON portal_native_repositories(project_slug, updated_at);

INSERT INTO site_settings (setting_key,value_json,updated_at)
VALUES (
  'portal_engineering_os_schema',
  '{"version":"2026.09-v4","features":["vault-r2","file-versioning","browser-preview","mechanical-workspace","pcb-workspace","mailbox-state","pwa-shell","native-repo-catalog","repo-gateway-boundary","runner-job-boundary"]}',
  CURRENT_TIMESTAMP
)
ON CONFLICT(setting_key) DO UPDATE SET
  value_json=excluded.value_json,
  updated_at=CURRENT_TIMESTAMP;
