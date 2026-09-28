import { env } from "cloudflare:workers";
import type { PortalMember } from "@/lib/portal/auth";
import type { NativeRepositoryRecord, RepoDiff } from "@/lib/portal/repositories";

function database() {
  if (!env.DB) throw new Error("Portal database binding is not available.");
  return env.DB;
}

function cleanBody(value: string) {
  return value.trim().slice(0, 8000);
}

export type PortalRepoReview = {
  id: string;
  repository_id: string;
  base_ref: string;
  head_ref: string;
  base_sha: string;
  head_sha: string;
  title: string;
  status: "open" | "approved" | "changes_requested" | "closed";
  created_by_member_id: string;
  created_by_email: string;
  created_at: string;
  updated_at: string;
};

export type PortalRepoReviewComment = {
  id: string;
  thread_id: string;
  author_member_id: string;
  body: string;
  created_at: string;
  edited_at: string | null;
  author_name: string;
  author_email: string;
};

export type PortalRepoReviewThread = {
  id: string;
  review_id: string;
  file_path: string;
  side: "base" | "head";
  line_number: number;
  line_sha: string | null;
  created_by_member_id: string;
  resolved_at: string | null;
  resolved_by_member_id: string | null;
  created_at: string;
  updated_at: string;
  author_name: string;
  author_email: string;
  resolved_by_name: string | null;
  comments: PortalRepoReviewComment[];
};

export type PortalRepoReviewSubmission = {
  id: string;
  review_id: string;
  reviewer_member_id: string;
  outcome: "comment" | "approve" | "request_changes";
  body: string;
  created_at: string;
  reviewer_name: string;
  reviewer_email: string;
};

export async function findPortalRepoReview(
  repositoryId: string,
  baseSha: string,
  headSha: string
) {
  try {
    return await database().prepare(
      "SELECT * FROM portal_repo_reviews WHERE repository_id=? AND base_sha=? AND head_sha=? LIMIT 1"
    ).bind(repositoryId, baseSha, headSha).first<PortalRepoReview>();
  } catch {
    return null;
  }
}

export async function ensurePortalRepoReview(input: {
  repo: NativeRepositoryRecord;
  diff: RepoDiff;
  member: PortalMember;
}) {
  const existing = await findPortalRepoReview(input.repo.id, input.diff.baseSha, input.diff.headSha);
  if (existing) return existing;

  const id = crypto.randomUUID();
  const title = `${input.diff.head} → ${input.diff.base}`.slice(0, 220);
  const db = database();
  try {
    await db.batch([
      db.prepare(
        "INSERT INTO portal_repo_reviews " +
        "(id,repository_id,base_ref,head_ref,base_sha,head_sha,title,created_by_member_id,created_by_email) " +
        "VALUES (?,?,?,?,?,?,?,?,?)"
      ).bind(
        id,
        input.repo.id,
        input.diff.base,
        input.diff.head,
        input.diff.baseSha,
        input.diff.headSha,
        title,
        input.member.id,
        input.member.email
      ),
      db.prepare(
        "INSERT INTO portal_activity_log (actor,action,entity_type,entity_id,details_json) " +
        "VALUES (?,'repository.review.open','repo_review',?,?)"
      ).bind(
        input.member.email,
        id,
        JSON.stringify({
          repositoryId: input.repo.id,
          repositorySlug: input.repo.slug,
          baseRef: input.diff.base,
          headRef: input.diff.head,
          baseSha: input.diff.baseSha,
          headSha: input.diff.headSha,
        })
      ),
    ]);
  } catch {
    const concurrent = await findPortalRepoReview(input.repo.id, input.diff.baseSha, input.diff.headSha);
    if (concurrent) return concurrent;
    throw new Error("Review kaydı oluşturulamadı.");
  }

  const created = await findPortalRepoReview(input.repo.id, input.diff.baseSha, input.diff.headSha);
  if (!created) throw new Error("Review kaydı oluşturuldu ancak tekrar okunamadı.");
  return created;
}

export async function listPortalRepoReviewThreads(reviewId: string) {
  let threads: Omit<PortalRepoReviewThread, "comments">[] = [];
  try {
    const response = await database().prepare(
      "SELECT t.*,a.full_name AS author_name,a.email AS author_email," +
      "r.full_name AS resolved_by_name " +
      "FROM portal_repo_review_threads t " +
      "JOIN portal_members a ON a.id=t.created_by_member_id " +
      "LEFT JOIN portal_members r ON r.id=t.resolved_by_member_id " +
      "WHERE t.review_id=? ORDER BY t.file_path,t.line_number,t.created_at"
    ).bind(reviewId).all<Omit<PortalRepoReviewThread, "comments">>();
    threads = response.results ?? [];
  } catch {
    return [];
  }

  if (!threads.length) return [];

  const commentsResponse = await database().prepare(
    "SELECT c.*,m.full_name AS author_name,m.email AS author_email " +
    "FROM portal_repo_review_comments c JOIN portal_members m ON m.id=c.author_member_id " +
    "WHERE c.thread_id IN (SELECT id FROM portal_repo_review_threads WHERE review_id=?) " +
    "ORDER BY c.created_at"
  ).bind(reviewId).all<PortalRepoReviewComment>();
  const comments = commentsResponse.results ?? [];
  const byThread = new Map<string, PortalRepoReviewComment[]>();
  for (const comment of comments) {
    const bucket = byThread.get(comment.thread_id) ?? [];
    bucket.push(comment);
    byThread.set(comment.thread_id, bucket);
  }

  return threads.map((thread) => ({
    ...thread,
    comments: byThread.get(thread.id) ?? [],
  }));
}

export async function listPortalRepoReviewSubmissions(reviewId: string) {
  try {
    const response = await database().prepare(
      "SELECT s.*,m.full_name AS reviewer_name,m.email AS reviewer_email " +
      "FROM portal_repo_review_submissions s JOIN portal_members m ON m.id=s.reviewer_member_id " +
      "WHERE s.review_id=? ORDER BY s.created_at DESC LIMIT 100"
    ).bind(reviewId).all<PortalRepoReviewSubmission>();
    return response.results ?? [];
  } catch {
    return [];
  }
}

async function recomputePortalRepoReviewStatus(reviewId: string) {
  const db = database();
  const [threads, submissions] = await Promise.all([
    db.prepare(
      "SELECT COUNT(*) AS count FROM portal_repo_review_threads WHERE review_id=? AND resolved_at IS NULL"
    ).bind(reviewId).first<{ count: number }>(),
    db.prepare(
      "SELECT reviewer_member_id,outcome,created_at FROM portal_repo_review_submissions " +
      "WHERE review_id=? ORDER BY created_at DESC"
    ).bind(reviewId).all<{ reviewer_member_id: string; outcome: string; created_at: string }>(),
  ]);

  const latestByReviewer = new Map<string, string>();
  for (const item of submissions.results ?? []) {
    if (item.outcome === "comment") continue;
    if (!latestByReviewer.has(item.reviewer_member_id)) {
      latestByReviewer.set(item.reviewer_member_id, item.outcome);
    }
  }

  const outcomes = Array.from(latestByReviewer.values());
  const unresolved = Number(threads?.count ?? 0);
  let status: PortalRepoReview["status"] = "open";
  if (outcomes.includes("request_changes")) status = "changes_requested";
  else if (unresolved === 0 && outcomes.includes("approve")) status = "approved";

  await db.prepare(
    "UPDATE portal_repo_reviews SET status=?,updated_at=CURRENT_TIMESTAMP WHERE id=? AND status!='closed'"
  ).bind(status, reviewId).run();
  return status;
}

export async function createPortalRepoReviewThread(input: {
  review: PortalRepoReview;
  member: PortalMember;
  filePath: string;
  side: "base" | "head";
  lineNumber: number;
  lineSha: string | null;
  body: string;
}) {
  const body = cleanBody(input.body);
  if (!body) throw new Error("Review yorumu boş olamaz.");
  if (!input.filePath || input.filePath.includes("..")) throw new Error("Geçersiz dosya yolu.");
  if (!Number.isInteger(input.lineNumber) || input.lineNumber < 1) throw new Error("Geçersiz satır numarası.");

  const threadId = crypto.randomUUID();
  const commentId = crypto.randomUUID();
  const db = database();
  await db.batch([
    db.prepare(
      "INSERT INTO portal_repo_review_threads " +
      "(id,review_id,file_path,side,line_number,line_sha,created_by_member_id) VALUES (?,?,?,?,?,?,?)"
    ).bind(
      threadId,
      input.review.id,
      input.filePath,
      input.side,
      input.lineNumber,
      input.lineSha,
      input.member.id
    ),
    db.prepare(
      "INSERT INTO portal_repo_review_comments (id,thread_id,author_member_id,body) VALUES (?,?,?,?)"
    ).bind(commentId, threadId, input.member.id, body),
    db.prepare(
      "INSERT INTO portal_activity_log (actor,action,entity_type,entity_id,details_json) " +
      "VALUES (?,'repository.review.thread','repo_review',?,?)"
    ).bind(
      input.member.email,
      input.review.id,
      JSON.stringify({
        threadId,
        filePath: input.filePath,
        side: input.side,
        lineNumber: input.lineNumber,
      })
    ),
  ]);
  await recomputePortalRepoReviewStatus(input.review.id);
  return threadId;
}

export async function replyPortalRepoReviewThread(input: {
  reviewId: string;
  threadId: string;
  member: PortalMember;
  body: string;
}) {
  const body = cleanBody(input.body);
  if (!body) throw new Error("Yanıt boş olamaz.");

  const thread = await database().prepare(
    "SELECT id FROM portal_repo_review_threads WHERE id=? AND review_id=? LIMIT 1"
  ).bind(input.threadId, input.reviewId).first<{ id: string }>();
  if (!thread) throw new Error("Review thread bulunamadı.");

  const id = crypto.randomUUID();
  await database().batch([
    database().prepare(
      "INSERT INTO portal_repo_review_comments (id,thread_id,author_member_id,body) VALUES (?,?,?,?)"
    ).bind(id, input.threadId, input.member.id, body),
    database().prepare(
      "UPDATE portal_repo_review_threads SET updated_at=CURRENT_TIMESTAMP WHERE id=?"
    ).bind(input.threadId),
    database().prepare(
      "INSERT INTO portal_activity_log (actor,action,entity_type,entity_id,details_json) " +
      "VALUES (?,'repository.review.reply','repo_review',?,?)"
    ).bind(input.member.email, input.reviewId, JSON.stringify({ threadId: input.threadId })),
  ]);
  return id;
}

export async function setPortalRepoReviewThreadResolved(input: {
  reviewId: string;
  threadId: string;
  member: PortalMember;
  canModerate: boolean;
  resolved: boolean;
}) {
  const thread = await database().prepare(
    "SELECT id,created_by_member_id FROM portal_repo_review_threads WHERE id=? AND review_id=? LIMIT 1"
  ).bind(input.threadId, input.reviewId).first<{ id: string; created_by_member_id: string }>();
  if (!thread) throw new Error("Review thread bulunamadı.");
  if (!input.canModerate && thread.created_by_member_id !== input.member.id) {
    throw new Error("Bu thread'i çözme yetkin yok.");
  }

  if (input.resolved) {
    await database().prepare(
      "UPDATE portal_repo_review_threads " +
      "SET resolved_at=CURRENT_TIMESTAMP,resolved_by_member_id=?,updated_at=CURRENT_TIMESTAMP WHERE id=?"
    ).bind(input.member.id, input.threadId).run();
  } else {
    await database().prepare(
      "UPDATE portal_repo_review_threads " +
      "SET resolved_at=NULL,resolved_by_member_id=NULL,updated_at=CURRENT_TIMESTAMP WHERE id=?"
    ).bind(input.threadId).run();
  }

  await database().prepare(
    "INSERT INTO portal_activity_log (actor,action,entity_type,entity_id,details_json) VALUES (?,?,?,?,?)"
  ).bind(
    input.member.email,
    input.resolved ? "repository.review.resolve" : "repository.review.reopen",
    "repo_review",
    input.reviewId,
    JSON.stringify({ threadId: input.threadId })
  ).run();

  await recomputePortalRepoReviewStatus(input.reviewId);
}

export async function submitPortalRepoReview(input: {
  review: PortalRepoReview;
  member: PortalMember;
  outcome: "comment" | "approve" | "request_changes";
  body: string;
}) {
  const body = cleanBody(input.body);
  if (input.outcome !== "approve" && !body) {
    throw new Error("COMMENT ve REQUEST CHANGES için açıklama gerekli.");
  }

  const id = crypto.randomUUID();
  const db = database();
  await db.batch([
    db.prepare(
      "INSERT INTO portal_repo_review_submissions (id,review_id,reviewer_member_id,outcome,body) VALUES (?,?,?,?,?)"
    ).bind(id, input.review.id, input.member.id, input.outcome, body),
    db.prepare(
      "INSERT INTO portal_activity_log (actor,action,entity_type,entity_id,details_json) " +
      "VALUES (?,'repository.review.submit','repo_review',?,?)"
    ).bind(
      input.member.email,
      input.review.id,
      JSON.stringify({ outcome: input.outcome })
    ),
  ]);

  await recomputePortalRepoReviewStatus(input.review.id);
  return id;
}
