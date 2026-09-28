-- YTÜ CORE Portal V5 native mobile acceleration
-- Additive only: preserves existing portal/auth/session data.

CREATE TABLE IF NOT EXISTS portal_mobile_devices (
  id TEXT PRIMARY KEY,
  member_id TEXT NOT NULL,
  install_id TEXT NOT NULL UNIQUE,
  platform TEXT NOT NULL
    CHECK (platform IN ('android','ios','pwa','web','unknown')),
  app_version TEXT NOT NULL DEFAULT '',
  device_label TEXT NOT NULL DEFAULT '',
  push_provider TEXT,
  push_token TEXT,
  trusted_state TEXT NOT NULL DEFAULT 'pending'
    CHECK (trusted_state IN ('pending','trusted','revoked')),
  biometric_enabled INTEGER NOT NULL DEFAULT 0,
  last_path TEXT NOT NULL DEFAULT '/portal',
  last_seen_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (member_id) REFERENCES portal_members(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_mobile_devices_member
  ON portal_mobile_devices(member_id, last_seen_at);

CREATE INDEX IF NOT EXISTS idx_mobile_devices_push
  ON portal_mobile_devices(push_provider, push_token);

INSERT INTO site_settings (setting_key,value_json,updated_at)
VALUES (
  'portal_mobile_schema',
  '{"version":"2026.09-v5","features":["capacitor-shell","mobile-handoff","device-registry","deep-links","app-links-ready","push-token-ready","biometric-ready"]}',
  CURRENT_TIMESTAMP
)
ON CONFLICT(setting_key) DO UPDATE SET
  value_json=excluded.value_json,
  updated_at=CURRENT_TIMESTAMP;
