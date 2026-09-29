-- CORE Mail Workspace V2
-- Private/internal distribution groups and access-code protected groups.

CREATE TABLE IF NOT EXISTS portal_mail_groups (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  owner_id TEXT NOT NULL,
  access_mode TEXT NOT NULL DEFAULT 'private'
    CHECK (access_mode IN ('private','locked')),
  access_code_salt TEXT,
  access_code_hash TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (owner_id) REFERENCES portal_members(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS portal_mail_group_members (
  group_id TEXT NOT NULL,
  member_id TEXT NOT NULL,
  member_role TEXT NOT NULL DEFAULT 'member'
    CHECK (member_role IN ('owner','member')),
  added_by TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (group_id, member_id),
  FOREIGN KEY (group_id) REFERENCES portal_mail_groups(id) ON DELETE CASCADE,
  FOREIGN KEY (member_id) REFERENCES portal_members(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS portal_mail_thread_groups (
  thread_id TEXT NOT NULL,
  group_id TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (thread_id, group_id),
  FOREIGN KEY (thread_id) REFERENCES portal_mail_threads(id) ON DELETE CASCADE,
  FOREIGN KEY (group_id) REFERENCES portal_mail_groups(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_portal_mail_group_member
  ON portal_mail_group_members(member_id, group_id);

CREATE INDEX IF NOT EXISTS idx_portal_mail_group_mode
  ON portal_mail_groups(access_mode, updated_at);

CREATE INDEX IF NOT EXISTS idx_portal_mail_thread_group
  ON portal_mail_thread_groups(group_id, thread_id);

INSERT INTO site_settings (setting_key,value_json,updated_at)
VALUES (
  'portal_mail_schema',
  '{"version":"2026.09-mail-v2","features":["distribution-groups","locked-groups","integrated-reader","viewport-mail"]}',
  CURRENT_TIMESTAMP
)
ON CONFLICT(setting_key) DO UPDATE SET
  value_json=excluded.value_json,
  updated_at=CURRENT_TIMESTAMP;
