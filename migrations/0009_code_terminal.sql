-- YTÜ CORE Portal CL-02 Live Terminal sessions
-- Ephemeral interactive shells execute only inside CORE Runner containers.

CREATE TABLE IF NOT EXISTS portal_code_terminal_sessions (
  id TEXT PRIMARY KEY,
  member_id TEXT NOT NULL,
  native_repository_id TEXT NOT NULL,
  service_repository_id TEXT NOT NULL,
  repository_slug TEXT NOT NULL,
  snapshot_ref TEXT NOT NULL,
  snapshot_sha TEXT,
  connect_token TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'preparing'
    CHECK (status IN ('preparing','ready','connected','closed','expired','failed')),
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  connected_at TEXT,
  ended_at TEXT,
  last_activity_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (member_id) REFERENCES portal_members(id) ON DELETE CASCADE,
  FOREIGN KEY (native_repository_id) REFERENCES portal_native_repositories(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_code_terminal_member
  ON portal_code_terminal_sessions(member_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_code_terminal_expiry
  ON portal_code_terminal_sessions(status, expires_at);

INSERT INTO site_settings (setting_key,value_json,updated_at)
VALUES (
  'portal_code_terminal_schema',
  '{"version":"2026.09-cl02","features":["live-terminal","websocket-stdin","streaming-stdout","ephemeral-workspace","terminal-signal","terminal-expiry"]}',
  CURRENT_TIMESTAMP
)
ON CONFLICT(setting_key) DO UPDATE SET
  value_json=excluded.value_json,
  updated_at=CURRENT_TIMESTAMP;
