-- YTÜ CORE Portal RP-02 repository code review
-- Additive only. Review state is portal governance metadata; Git objects remain in CORE Repo Service.

CREATE TABLE IF NOT EXISTS portal_repo_reviews (
  id TEXT PRIMARY KEY,
  repository_id TEXT NOT NULL,
  base_ref TEXT NOT NULL,
  head_ref TEXT NOT NULL,
  base_sha TEXT NOT NULL,
  head_sha TEXT NOT NULL,
  title TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'open'
    CHECK (status IN ('open','approved','changes_requested','closed')),
  created_by_member_id TEXT NOT NULL,
  created_by_email TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(repository_id, base_sha, head_sha),
  FOREIGN KEY (repository_id) REFERENCES portal_native_repositories(id) ON DELETE CASCADE,
  FOREIGN KEY (created_by_member_id) REFERENCES portal_members(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS portal_repo_review_threads (
  id TEXT PRIMARY KEY,
  review_id TEXT NOT NULL,
  file_path TEXT NOT NULL,
  side TEXT NOT NULL DEFAULT 'head'
    CHECK (side IN ('base','head')),
  line_number INTEGER NOT NULL CHECK (line_number > 0),
  line_sha TEXT,
  created_by_member_id TEXT NOT NULL,
  resolved_at TEXT,
  resolved_by_member_id TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (review_id) REFERENCES portal_repo_reviews(id) ON DELETE CASCADE,
  FOREIGN KEY (created_by_member_id) REFERENCES portal_members(id) ON DELETE CASCADE,
  FOREIGN KEY (resolved_by_member_id) REFERENCES portal_members(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS portal_repo_review_comments (
  id TEXT PRIMARY KEY,
  thread_id TEXT NOT NULL,
  author_member_id TEXT NOT NULL,
  body TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  edited_at TEXT,
  FOREIGN KEY (thread_id) REFERENCES portal_repo_review_threads(id) ON DELETE CASCADE,
  FOREIGN KEY (author_member_id) REFERENCES portal_members(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS portal_repo_review_submissions (
  id TEXT PRIMARY KEY,
  review_id TEXT NOT NULL,
  reviewer_member_id TEXT NOT NULL,
  outcome TEXT NOT NULL
    CHECK (outcome IN ('comment','approve','request_changes')),
  body TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (review_id) REFERENCES portal_repo_reviews(id) ON DELETE CASCADE,
  FOREIGN KEY (reviewer_member_id) REFERENCES portal_members(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_repo_reviews_repository
  ON portal_repo_reviews(repository_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_repo_reviews_snapshot
  ON portal_repo_reviews(repository_id, base_sha, head_sha);
CREATE INDEX IF NOT EXISTS idx_repo_review_threads_review
  ON portal_repo_review_threads(review_id, file_path, line_number);
CREATE INDEX IF NOT EXISTS idx_repo_review_comments_thread
  ON portal_repo_review_comments(thread_id, created_at);
CREATE INDEX IF NOT EXISTS idx_repo_review_submissions_review
  ON portal_repo_review_submissions(review_id, created_at DESC);

INSERT INTO site_settings (setting_key,value_json,updated_at)
VALUES (
  'portal_repo_review_schema',
  '{"version":"2026.09-rp02","features":["immutable-review-snapshots","diff-hunks","line-threads","resolve-reopen","review-submissions","approve-request-changes"]}',
  CURRENT_TIMESTAMP
)
ON CONFLICT(setting_key) DO UPDATE SET
  value_json=excluded.value_json,
  updated_at=CURRENT_TIMESTAMP;
