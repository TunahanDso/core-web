-- CORE Portal V12 Collaboration & Finance
-- Meetings, polls, reports and team budget ledger.

CREATE TABLE IF NOT EXISTS portal_meeting_spaces (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  team_code TEXT,
  project_slug TEXT,
  visibility TEXT NOT NULL DEFAULT 'members'
    CHECK (visibility IN ('private','team','members')),
  created_by TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (created_by) REFERENCES portal_members(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS portal_meetings (
  id TEXT PRIMARY KEY,
  space_id TEXT,
  calendar_event_id TEXT,
  title TEXT NOT NULL,
  agenda TEXT NOT NULL DEFAULT '',
  starts_at TEXT NOT NULL,
  ends_at TEXT,
  team_code TEXT,
  project_slug TEXT,
  status TEXT NOT NULL DEFAULT 'scheduled'
    CHECK (status IN ('scheduled','live','completed','cancelled')),
  transport_mode TEXT NOT NULL DEFAULT 'audio_video'
    CHECK (transport_mode IN ('audio_video','audio','external','none')),
  transport_room TEXT NOT NULL,
  created_by TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (space_id) REFERENCES portal_meeting_spaces(id) ON DELETE SET NULL,
  FOREIGN KEY (calendar_event_id) REFERENCES portal_calendar_events(id) ON DELETE SET NULL,
  FOREIGN KEY (created_by) REFERENCES portal_members(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS portal_meeting_participants (
  meeting_id TEXT NOT NULL,
  member_id TEXT NOT NULL,
  participant_role TEXT NOT NULL DEFAULT 'participant'
    CHECK (participant_role IN ('host','moderator','participant')),
  invite_state TEXT NOT NULL DEFAULT 'invited'
    CHECK (invite_state IN ('invited','accepted','declined','attended')),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (meeting_id,member_id),
  FOREIGN KEY (meeting_id) REFERENCES portal_meetings(id) ON DELETE CASCADE,
  FOREIGN KEY (member_id) REFERENCES portal_members(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS portal_meeting_notes (
  id TEXT PRIMARY KEY,
  meeting_id TEXT NOT NULL,
  author_id TEXT NOT NULL,
  kind TEXT NOT NULL DEFAULT 'note'
    CHECK (kind IN ('note','decision','action','transcript')),
  body TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (meeting_id) REFERENCES portal_meetings(id) ON DELETE CASCADE,
  FOREIGN KEY (author_id) REFERENCES portal_members(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS portal_meeting_reports (
  meeting_id TEXT PRIMARY KEY,
  summary TEXT NOT NULL,
  resource_id TEXT,
  generated_by TEXT NOT NULL,
  generated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (meeting_id) REFERENCES portal_meetings(id) ON DELETE CASCADE,
  FOREIGN KEY (resource_id) REFERENCES portal_resources(id) ON DELETE SET NULL,
  FOREIGN KEY (generated_by) REFERENCES portal_members(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS portal_polls (
  id TEXT PRIMARY KEY,
  meeting_id TEXT,
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  scope TEXT NOT NULL DEFAULT 'global'
    CHECK (scope IN ('global','team','meeting')),
  team_code TEXT,
  status TEXT NOT NULL DEFAULT 'open'
    CHECK (status IN ('open','closed')),
  closes_at TEXT,
  created_by TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (meeting_id) REFERENCES portal_meetings(id) ON DELETE CASCADE,
  FOREIGN KEY (created_by) REFERENCES portal_members(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS portal_poll_options (
  id TEXT PRIMARY KEY,
  poll_id TEXT NOT NULL,
  label TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  FOREIGN KEY (poll_id) REFERENCES portal_polls(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS portal_poll_votes (
  poll_id TEXT NOT NULL,
  option_id TEXT NOT NULL,
  member_id TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (poll_id,member_id),
  FOREIGN KEY (poll_id) REFERENCES portal_polls(id) ON DELETE CASCADE,
  FOREIGN KEY (option_id) REFERENCES portal_poll_options(id) ON DELETE CASCADE,
  FOREIGN KEY (member_id) REFERENCES portal_members(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS portal_budget_accounts (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  team_code TEXT,
  project_slug TEXT,
  currency TEXT NOT NULL DEFAULT 'TRY',
  opening_balance_minor INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active','closed')),
  owner_member_id TEXT,
  created_by TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (owner_member_id) REFERENCES portal_members(id) ON DELETE SET NULL,
  FOREIGN KEY (created_by) REFERENCES portal_members(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS portal_budget_allocations (
  id TEXT PRIMARY KEY,
  account_id TEXT NOT NULL,
  category TEXT NOT NULL,
  amount_minor INTEGER NOT NULL,
  period_start TEXT,
  period_end TEXT,
  notes TEXT NOT NULL DEFAULT '',
  created_by TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (account_id) REFERENCES portal_budget_accounts(id) ON DELETE CASCADE,
  FOREIGN KEY (created_by) REFERENCES portal_members(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS portal_budget_entries (
  id TEXT PRIMARY KEY,
  account_id TEXT NOT NULL,
  entry_type TEXT NOT NULL
    CHECK (entry_type IN ('income','expense','commitment')),
  category TEXT NOT NULL DEFAULT 'general',
  amount_minor INTEGER NOT NULL CHECK (amount_minor >= 0),
  description TEXT NOT NULL,
  occurred_at TEXT NOT NULL,
  team_code TEXT,
  project_slug TEXT,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','approved','rejected')),
  created_by TEXT NOT NULL,
  approved_by TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (account_id) REFERENCES portal_budget_accounts(id) ON DELETE CASCADE,
  FOREIGN KEY (created_by) REFERENCES portal_members(id) ON DELETE CASCADE,
  FOREIGN KEY (approved_by) REFERENCES portal_members(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_meetings_start ON portal_meetings(starts_at,status);
CREATE INDEX IF NOT EXISTS idx_meeting_participant ON portal_meeting_participants(member_id,meeting_id);
CREATE INDEX IF NOT EXISTS idx_meeting_notes ON portal_meeting_notes(meeting_id,created_at);
CREATE INDEX IF NOT EXISTS idx_polls_status ON portal_polls(status,created_at);
CREATE INDEX IF NOT EXISTS idx_poll_votes ON portal_poll_votes(poll_id,option_id);
CREATE INDEX IF NOT EXISTS idx_budget_entries_account ON portal_budget_entries(account_id,occurred_at);
CREATE INDEX IF NOT EXISTS idx_budget_entries_status ON portal_budget_entries(status,created_at);

INSERT INTO site_settings (setting_key,value_json,updated_at)
VALUES (
  'portal_collaboration_finance_schema',
  '{"version":"2026.09-v12-collab-finance","features":["meeting-spaces","meeting-calendar","meeting-decisions","meeting-reports","polls","poll-notifications","budget-ledger","budget-allocations","budget-approvals"]}',
  CURRENT_TIMESTAMP
)
ON CONFLICT(setting_key) DO UPDATE SET
  value_json=excluded.value_json,
  updated_at=CURRENT_TIMESTAMP;
