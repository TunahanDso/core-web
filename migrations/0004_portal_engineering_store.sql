-- CORE Portal V3 self-hosted engineering data layer

CREATE TABLE IF NOT EXISTS portal_files (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  object_key TEXT NOT NULL UNIQUE,
  mime_type TEXT NOT NULL DEFAULT 'application/octet-stream',
  extension TEXT NOT NULL DEFAULT '',
  size_bytes INTEGER NOT NULL DEFAULT 0,
  kind TEXT NOT NULL DEFAULT 'file',
  preview_kind TEXT NOT NULL DEFAULT 'download',
  project_slug TEXT,
  team_code TEXT,
  uploaded_by TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (uploaded_by) REFERENCES portal_members(id) ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS portal_file_versions (
  id TEXT PRIMARY KEY,
  file_id TEXT NOT NULL,
  version_no INTEGER NOT NULL,
  object_key TEXT NOT NULL,
  size_bytes INTEGER NOT NULL DEFAULT 0,
  mime_type TEXT NOT NULL DEFAULT 'application/octet-stream',
  checksum TEXT,
  note TEXT NOT NULL DEFAULT '',
  created_by TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(file_id, version_no),
  FOREIGN KEY (file_id) REFERENCES portal_files(id) ON DELETE CASCADE,
  FOREIGN KEY (created_by) REFERENCES portal_members(id) ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS portal_repo_commits (
  id TEXT PRIMARY KEY,
  repository_id TEXT NOT NULL,
  parent_id TEXT,
  branch TEXT NOT NULL DEFAULT 'main',
  message TEXT NOT NULL,
  author_id TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (repository_id) REFERENCES portal_repositories(id) ON DELETE CASCADE,
  FOREIGN KEY (parent_id) REFERENCES portal_repo_commits(id) ON DELETE SET NULL,
  FOREIGN KEY (author_id) REFERENCES portal_members(id) ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS portal_repo_files (
  id TEXT PRIMARY KEY,
  repository_id TEXT NOT NULL,
  path TEXT NOT NULL,
  commit_id TEXT NOT NULL,
  file_id TEXT NOT NULL,
  language TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(repository_id, path, commit_id),
  FOREIGN KEY (repository_id) REFERENCES portal_repositories(id) ON DELETE CASCADE,
  FOREIGN KEY (commit_id) REFERENCES portal_repo_commits(id) ON DELETE CASCADE,
  FOREIGN KEY (file_id) REFERENCES portal_files(id) ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS portal_mail_state (
  thread_id TEXT NOT NULL,
  member_id TEXT NOT NULL,
  read_at TEXT,
  starred_at TEXT,
  archived_at TEXT,
  deleted_at TEXT,
  PRIMARY KEY (thread_id, member_id),
  FOREIGN KEY (thread_id) REFERENCES portal_mail_threads(id) ON DELETE CASCADE,
  FOREIGN KEY (member_id) REFERENCES portal_members(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS portal_mail_attachments (
  message_id TEXT NOT NULL,
  file_id TEXT NOT NULL,
  PRIMARY KEY (message_id, file_id),
  FOREIGN KEY (message_id) REFERENCES portal_mail_messages(id) ON DELETE CASCADE,
  FOREIGN KEY (file_id) REFERENCES portal_files(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS portal_design_derivatives (
  id TEXT PRIMARY KEY,
  source_file_id TEXT NOT NULL,
  derivative_kind TEXT NOT NULL,
  object_key TEXT,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','ready','failed','not_required')),
  metadata_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (source_file_id) REFERENCES portal_files(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS portal_code_runs (
  id TEXT PRIMARY KEY,
  member_id TEXT NOT NULL,
  repository_id TEXT,
  language TEXT NOT NULL,
  entrypoint TEXT,
  status TEXT NOT NULL DEFAULT 'queued'
    CHECK (status IN ('queued','running','success','failed','cancelled','unavailable')),
  stdout TEXT NOT NULL DEFAULT '',
  stderr TEXT NOT NULL DEFAULT '',
  exit_code INTEGER,
  duration_ms INTEGER,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  finished_at TEXT,
  FOREIGN KEY (member_id) REFERENCES portal_members(id) ON DELETE CASCADE,
  FOREIGN KEY (repository_id) REFERENCES portal_repositories(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_portal_files_project ON portal_files(project_slug, updated_at);
CREATE INDEX IF NOT EXISTS idx_portal_files_kind ON portal_files(kind, updated_at);
CREATE INDEX IF NOT EXISTS idx_portal_file_versions_file ON portal_file_versions(file_id, version_no);
CREATE INDEX IF NOT EXISTS idx_portal_repo_commits_repo ON portal_repo_commits(repository_id, created_at);
CREATE INDEX IF NOT EXISTS idx_portal_repo_files_repo ON portal_repo_files(repository_id, path);
CREATE INDEX IF NOT EXISTS idx_portal_mail_state_member ON portal_mail_state(member_id, archived_at, read_at);
CREATE INDEX IF NOT EXISTS idx_portal_code_runs_member ON portal_code_runs(member_id, created_at);

INSERT INTO site_settings (setting_key,value_json,updated_at)
VALUES (
  'portal_engineering_store',
  '{"version":"2026.09-v4","storage":"R2+D1","repo":"CORE native","preview":["pdf","image","text","code","csv","stl","kicad-pcb"],"runner":"sandbox-boundary"}',
  CURRENT_TIMESTAMP
)
ON CONFLICT(setting_key) DO UPDATE SET value_json=excluded.value_json,updated_at=CURRENT_TIMESTAMP;
