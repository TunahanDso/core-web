-- CORE Portal V14 Meeting Realtime
-- Maps portal meetings to managed Cloudflare RealtimeKit meeting IDs.

CREATE TABLE IF NOT EXISTS portal_meeting_transports (
  meeting_id TEXT PRIMARY KEY,
  provider TEXT NOT NULL,
  provider_meeting_id TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (meeting_id) REFERENCES portal_meetings(id) ON DELETE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_meeting_transport_provider
  ON portal_meeting_transports(provider,provider_meeting_id);

INSERT INTO site_settings (setting_key,value_json,updated_at)
VALUES (
  'portal_meeting_realtime_schema',
  '{"version":"2026.09-v14-meeting-realtime","provider":"cloudflare-realtimekit","features":["audio-video","audio","screen-share","participant-auth","managed-sfu"]}',
  CURRENT_TIMESTAMP
)
ON CONFLICT(setting_key) DO UPDATE SET
  value_json=excluded.value_json,
  updated_at=CURRENT_TIMESTAMP;
