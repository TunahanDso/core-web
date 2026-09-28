"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requirePortalMember } from "@/lib/portal/auth";
import {
  canManageNativeRepository,
  findRepoDiffLine,
  getAccessibleNativeRepository,
  loadNativeRepositoryDiff,
} from "@/lib/portal/repositories";
import {
  createPortalRepoReviewThread,
  ensurePortalRepoReview,
  findPortalRepoReview,
  replyPortalRepoReviewThread,
  setPortalRepoReviewThreadResolved,
  submitPortalRepoReview,
} from "@/lib/portal/repository-reviews";

function textValue(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

function reviewHref(input: {
  slug: string;
  base: string;
  head: string;
  view?: string;
  file?: string;
  anchor?: string;
}) {
  const params = new URLSearchParams({
    base: input.base,
    head: input.head,
  });
  if (input.view) params.set("view", input.view);
  if (input.file) params.set("file", input.file);
  const anchor = input.anchor ? "#" + encodeURIComponent(input.anchor) : "";
  return "/portal/repositories/" + encodeURIComponent(input.slug) + "/review?" + params.toString() + anchor;
}

async function reviewContext(formData: FormData) {
  const member = await requirePortalMember();
  const slug = textValue(formData, "repoSlug").toLowerCase();
  const base = textValue(formData, "base");
  const head = textValue(formData, "head");
  if (!slug || !base || !head) throw new Error("Repository, base ve head gerekli.");

  const repo = await getAccessibleNativeRepository(member, slug);
  if (!repo) throw new Error("Repository erişimi yok.");

  const loaded = await loadNativeRepositoryDiff(repo, base, head);
  if (!loaded.diff) throw new Error(loaded.error || "Diff yüklenemedi.");

  return { member, repo, diff: loaded.diff };
}

export async function createRepoReviewThreadAction(formData: FormData) {
  const { member, repo, diff } = await reviewContext(formData);
  const filePath = textValue(formData, "filePath");
  const side = textValue(formData, "side") === "base" ? "base" : "head";
  const lineNumber = Number.parseInt(textValue(formData, "lineNumber"), 10);
  const body = textValue(formData, "body");
  const view = textValue(formData, "view") || "split";

  const anchor = findRepoDiffLine(diff, filePath, side, lineNumber);
  if (!anchor) throw new Error("Yorum hedefi mevcut diff snapshot'ında bulunamadı.");

  const review = await ensurePortalRepoReview({ repo, diff, member });
  const threadId = await createPortalRepoReviewThread({
    review,
    member,
    filePath: anchor.file.path,
    side,
    lineNumber,
    lineSha: anchor.line.lineSha || null,
    body,
  });

  const path = "/portal/repositories/" + repo.slug + "/review";
  revalidatePath(path);
  redirect(reviewHref({
    slug: repo.slug,
    base: diff.base,
    head: diff.head,
    view,
    file: anchor.file.path,
    anchor: "thread-" + threadId,
  }));
}

export async function replyRepoReviewThreadAction(formData: FormData) {
  const { member, repo, diff } = await reviewContext(formData);
  const review = await findPortalRepoReview(repo.id, diff.baseSha, diff.headSha);
  if (!review) throw new Error("Review kaydı bulunamadı.");

  const threadId = textValue(formData, "threadId");
  await replyPortalRepoReviewThread({
    reviewId: review.id,
    threadId,
    member,
    body: textValue(formData, "body"),
  });

  const file = textValue(formData, "file");
  const view = textValue(formData, "view") || "split";
  revalidatePath("/portal/repositories/" + repo.slug + "/review");
  redirect(reviewHref({
    slug: repo.slug,
    base: diff.base,
    head: diff.head,
    view,
    file,
    anchor: "thread-" + threadId,
  }));
}

export async function setRepoReviewThreadResolvedAction(formData: FormData) {
  const { member, repo, diff } = await reviewContext(formData);
  const review = await findPortalRepoReview(repo.id, diff.baseSha, diff.headSha);
  if (!review) throw new Error("Review kaydı bulunamadı.");

  const threadId = textValue(formData, "threadId");
  const canModerate = await canManageNativeRepository(member, repo);
  await setPortalRepoReviewThreadResolved({
    reviewId: review.id,
    threadId,
    member,
    canModerate,
    resolved: textValue(formData, "resolved") === "1",
  });

  const file = textValue(formData, "file");
  const view = textValue(formData, "view") || "split";
  revalidatePath("/portal/repositories/" + repo.slug + "/review");
  redirect(reviewHref({
    slug: repo.slug,
    base: diff.base,
    head: diff.head,
    view,
    file,
    anchor: "thread-" + threadId,
  }));
}

export async function submitRepoReviewAction(formData: FormData) {
  const { member, repo, diff } = await reviewContext(formData);
  const review = await ensurePortalRepoReview({ repo, diff, member });
  const raw = textValue(formData, "outcome");
  const outcome = raw === "approve"
    ? "approve"
    : raw === "request_changes"
      ? "request_changes"
      : "comment";

  await submitPortalRepoReview({
    review,
    member,
    outcome,
    body: textValue(formData, "body"),
  });

  const view = textValue(formData, "view") || "split";
  revalidatePath("/portal/repositories/" + repo.slug + "/review");
  redirect(reviewHref({
    slug: repo.slug,
    base: diff.base,
    head: diff.head,
    view,
    anchor: "review-summary",
  }));
}
