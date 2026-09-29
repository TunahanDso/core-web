-- YTÜ CORE Portal V12 Vault raw upload sessions
-- Files are uploaded as raw request bodies to R2, then finalized into Vault metadata.

CREATE TABLE IF NOT EXISTS portal_vault_upload_sessions (
  id TEXT PRIMARY KEY,
  member_id TEXT NOT NULL,
  actor_email TEXT NOT NULL,
  mode TEXT NOT NULL DEFAULT 'new'
    CHECK (mode IN ('new','revision')),
  target_file_id TEXT,
  file_id TEXT NOT NULL,
  revision INTEGER NOT NULL,
  original_name TEXT NOT NULL,
  mime_type TEXT NOT NULL DEFAULT 'application/octet-stream',
  expected_size INTEGER NOT NULL,
  actual_size INTEGER,
  checksum_sha256 TEXT,
  object_key TEXT NOT NULL UNIQUE,
  capability_token TEXT NOT NULL,
  metadata_json TEXT NOT NULL DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'initiated'
    CHECK (status IN ('initiated','uploaded','completed','failed','expired')),
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  completed_at TEXT,
  FOREIGN KEY (member_id) REFERENCES portal_members(id) ON DELETE CASCADE,
  FOREIGN KEY (target_file_id) REFERENCES portal_vault_files(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_vault_upload_member
  ON portal_vault_upload_sessions(member_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_vault_upload_status
  ON portal_vault_upload_sessions(status, expires_at);

INSERT INTO site_settings (setting_key,value_json,updated_at)
VALUES (
  'portal_vault_upload_schema',
  '{"version":"2026.09-va02","features":["upload-session","raw-put","r2-direct-binding","finalize-metadata","revision-session","upload-progress"]}',
  CURRENT_TIMESTAMP
)
ON CONFLICT(setting_key) DO UPDATE SET
  value_json=excluded.value_json,
  updated_at=CURRENT_TIMESTAMP;
