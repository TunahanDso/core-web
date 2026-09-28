-- YTÜ CORE Portal CL-01 Code Lab execution metadata
-- Additive only. User code executes in CORE Runner sandbox containers, never in the CMS Worker.

CREATE TABLE IF NOT EXISTS portal_code_run_execution (
  run_id TEXT PRIMARY KEY,
  native_repository_id TEXT NOT NULL,
  service_repository_id TEXT NOT NULL,
  snapshot_ref TEXT NOT NULL,
  snapshot_sha TEXT,
  workflow_instance_id TEXT,
  attempt INTEGER NOT NULL DEFAULT 1,
  retry_of_run_id TEXT,
  cancel_requested_at TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (run_id) REFERENCES portal_code_runs(id) ON DELETE CASCADE,
  FOREIGN KEY (native_repository_id) REFERENCES portal_native_repositories(id) ON DELETE CASCADE,
  FOREIGN KEY (retry_of_run_id) REFERENCES portal_code_runs(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS portal_code_run_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  run_id TEXT NOT NULL,
  phase TEXT NOT NULL,
  level TEXT NOT NULL DEFAULT 'info'
    CHECK (level IN ('info','success','warning','error')),
  message TEXT NOT NULL DEFAULT '',
  metadata_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (run_id) REFERENCES portal_code_runs(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS portal_code_run_artifacts (
  id TEXT PRIMARY KEY,
  run_id TEXT NOT NULL,
  name TEXT NOT NULL,
  kind TEXT NOT NULL DEFAULT 'artifact',
  mime_type TEXT NOT NULL DEFAULT 'application/octet-stream',
  object_key TEXT NOT NULL UNIQUE,
  size_bytes INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (run_id) REFERENCES portal_code_runs(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_code_run_execution_repo
  ON portal_code_run_execution(native_repository_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_code_run_events_run
  ON portal_code_run_events(run_id, created_at);
CREATE INDEX IF NOT EXISTS idx_code_run_artifacts_run
  ON portal_code_run_artifacts(run_id, created_at);

INSERT INTO site_settings (setting_key,value_json,updated_at)
VALUES (
  'portal_code_lab_schema',
  '{"version":"2026.09-cl01","features":["runner-workflow","sandbox-container","immutable-snapshot","events","logs","artifacts","cancel","retry"]}',
  CURRENT_TIMESTAMP
)
ON CONFLICT(setting_key) DO UPDATE SET
  value_json=excluded.value_json,
  updated_at=CURRENT_TIMESTAMP;
