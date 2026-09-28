"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requirePortalMember } from "@/lib/portal/auth";
import { createPortalMailThread, sendPortalMailReply } from "@/lib/portal/db";
import {
  deletePortalMailDraft,
  initializePortalMailState,
  markPortalMailOpened,
  markPortalMailReplyState,
  mutatePortalMailState,
  savePortalMailDraft,
} from "@/lib/portal/mailbox";

function textValue(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

function recipients(formData: FormData) {
  return Array.from(new Set(
    formData.getAll("participantId").map((value) => String(value).trim()).filter(Boolean)
  )).slice(0, 50);
}

export async function createMailboxThreadAction(formData: FormData) {
  const member = await requirePortalMember();
  const subject = textValue(formData, "subject");
  const body = textValue(formData, "body");
  const participantIds = recipients(formData);
  if (!subject || !body || !participantIds.length) {
    throw new Error("Konu, mesaj ve en az bir alıcı gerekli.");
  }

  const threadId = await createPortalMailThread({
    subject,
    body,
    senderId: member.id,
    participantIds,
  });
  await initializePortalMailState(threadId, member.id, participantIds);

  const draftId = textValue(formData, "draftId");
  if (draftId) await deletePortalMailDraft(draftId, member.id).catch(() => undefined);

  revalidatePath("/portal/mail");
  redirect("/portal/mail/" + encodeURIComponent(threadId) + "?sent=1");
}

export async function saveMailboxDraftAction(formData: FormData) {
  const member = await requirePortalMember();
  await savePortalMailDraft({
    draftId: textValue(formData, "draftId") || null,
    ownerId: member.id,
    subject: textValue(formData, "subject"),
    body: textValue(formData, "body"),
    recipientIds: recipients(formData),
    replyToThreadId: textValue(formData, "replyToThreadId") || null,
  });
  revalidatePath("/portal/mail");
  redirect("/portal/mail?folder=drafts&saved=1");
}

export async function deleteMailboxDraftAction(formData: FormData) {
  const member = await requirePortalMember();
  const draftId = textValue(formData, "draftId");
  if (draftId) await deletePortalMailDraft(draftId, member.id);
  revalidatePath("/portal/mail");
  redirect("/portal/mail?folder=drafts");
}

export async function openMailboxThreadAction(formData: FormData) {
  const member = await requirePortalMember();
  const threadId = textValue(formData, "threadId");
  if (!threadId) throw new Error("Yazışma kimliği eksik.");
  await markPortalMailOpened(threadId, member.id);
  revalidatePath("/portal/mail");
  redirect("/portal/mail/" + encodeURIComponent(threadId));
}

export async function mutateMailboxThreadAction(formData: FormData) {
  const member = await requirePortalMember();
  const threadId = textValue(formData, "threadId");
  const operation = textValue(formData, "operation");
  const allowed = ["archive","trash","restore","star","unstar","read","unread"];
  if (!threadId || !allowed.includes(operation)) throw new Error("Geçersiz mailbox işlemi.");

  await mutatePortalMailState({
    threadId,
    memberId: member.id,
    operation: operation as "archive" | "trash" | "restore" | "star" | "unstar" | "read" | "unread",
  });

  revalidatePath("/portal/mail");
  revalidatePath("/portal/mail/" + threadId);
  const returnTo = textValue(formData, "returnTo");
  redirect(returnTo.startsWith("/portal/mail") ? returnTo : "/portal/mail");
}

export async function replyMailboxThreadAction(formData: FormData) {
  const member = await requirePortalMember();
  const threadId = textValue(formData, "threadId");
  const body = textValue(formData, "body");
  if (!threadId || !body) throw new Error("Yanıt boş olamaz.");

  await sendPortalMailReply({
    threadId,
    authorId: member.id,
    body,
  });
  await markPortalMailReplyState(threadId, member.id);

  revalidatePath("/portal/mail");
  revalidatePath("/portal/mail/" + threadId);
  redirect("/portal/mail/" + encodeURIComponent(threadId) + "?replied=1");
}
