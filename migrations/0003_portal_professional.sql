-- YTÜ CORE Portal V2 professional workspace additions

CREATE TABLE IF NOT EXISTS portal_invite_deliveries (
  id TEXT PRIMARY KEY,
  invite_id TEXT NOT NULL,
  recipient TEXT NOT NULL,
  provider TEXT NOT NULL DEFAULT 'none',
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','sent','failed','not_configured')),
  message_id TEXT,
  error TEXT,
  attempted_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (invite_id) REFERENCES portal_invites(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS portal_member_profiles (
  member_id TEXT PRIMARY KEY,
  headline TEXT NOT NULL DEFAULT '',
  bio TEXT NOT NULL DEFAULT '',
  skills_json TEXT NOT NULL DEFAULT '[]',
  github_url TEXT,
  linkedin_url TEXT,
  phone TEXT,
  availability TEXT NOT NULL DEFAULT '',
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (member_id) REFERENCES portal_members(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS portal_channel_reads (
  channel_id TEXT NOT NULL,
  member_id TEXT NOT NULL,
  last_read_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (channel_id, member_id),
  FOREIGN KEY (channel_id) REFERENCES portal_channels(id) ON DELETE CASCADE,
  FOREIGN KEY (member_id) REFERENCES portal_members(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_invite_delivery_invite
  ON portal_invite_deliveries(invite_id, attempted_at);
CREATE INDEX IF NOT EXISTS idx_invite_delivery_recipient
  ON portal_invite_deliveries(recipient, attempted_at);
CREATE INDEX IF NOT EXISTS idx_channel_reads_member
  ON portal_channel_reads(member_id, last_read_at);

INSERT INTO site_settings (setting_key,value_json,updated_at)
VALUES (
  'portal_workspace_schema',
  '{"version":"2026.09-v3","features":["invite-email","member-profiles","task-detail","inventory-movements","global-search","mail-replies"]}',
  CURRENT_TIMESTAMP
)
ON CONFLICT(setting_key) DO UPDATE SET
  value_json=excluded.value_json,
  updated_at=CURRENT_TIMESTAMP;
