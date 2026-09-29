"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requirePortalMember } from "@/lib/portal/auth";
import { createPortalMailThread, sendPortalMailReply } from "@/lib/portal/db";
import {
  attachPortalVaultFilesToLatestMessage,
  deletePortalMailDraft,
  initializePortalMailState,
  markPortalMailOpened,
  markPortalMailReplyState,
  mutatePortalMailState,
  savePortalMailDraft,
  createPortalMailGroup,
  joinPortalMailGroup,
  deletePortalMailGroup,
  resolvePortalMailGroupRecipients,
  linkPortalMailThreadGroups,
} from "@/lib/portal/mailbox";
import { listPortalVaultFiles } from "@/lib/portal/vault";

function textValue(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

function recipients(formData: FormData) {
  return Array.from(new Set(
    formData.getAll("participantId").map((value) => String(value).trim()).filter(Boolean)
  )).slice(0, 100);
}

function mailGroupIds(formData: FormData) {
  return Array.from(new Set(
    formData.getAll("groupId").map((value) => String(value).trim()).filter(Boolean)
  )).slice(0, 20);
}

async function accessibleAttachmentIds(formData: FormData, member: Awaited<ReturnType<typeof requirePortalMember>>) {
  const requested = Array.from(new Set(
    formData.getAll("vaultFileId").map((value) => String(value).trim()).filter(Boolean)
  )).slice(0, 12);
  if (!requested.length) return [];
  const allowed = await listPortalVaultFiles({ lifecycle: "active", limit: 500, viewer: member });
  const allowedIds = new Set(allowed.map((item) => String(item.id)));
  return requested.filter((id) => allowedIds.has(id));
}

export async function createMailboxThreadAction(formData: FormData) {
  const member = await requirePortalMember();
  const subject = textValue(formData, "subject");
  const body = textValue(formData, "body");
  const selectedGroupIds = mailGroupIds(formData);
  const groupRecipients = await resolvePortalMailGroupRecipients(selectedGroupIds, member.id);
  const participantIds = Array.from(new Set([...recipients(formData),...groupRecipients]))
    .filter((id) => id !== member.id)
    .slice(0, 100);
  if (!subject || !body || !participantIds.length) {
    throw new Error("Konu, mesaj ve en az bir kişi veya grup gerekli.");
  }

  const threadId = await createPortalMailThread({
    subject,
    body,
    senderId: member.id,
    participantIds,
  });
  await linkPortalMailThreadGroups(threadId,selectedGroupIds,member.id);
  await initializePortalMailState(threadId, member.id, participantIds);
  const attachmentIds = await accessibleAttachmentIds(formData, member);
  if (attachmentIds.length) {
    await attachPortalVaultFilesToLatestMessage({
      threadId,
      authorId: member.id,
      vaultFileIds: attachmentIds,
    });
  }

  const draftId = textValue(formData, "draftId");
  if (draftId) await deletePortalMailDraft(draftId, member.id).catch(() => undefined);

  revalidatePath("/portal/mail");
  redirect("/portal/mail?thread=" + encodeURIComponent(threadId) + "&sent=1");
}

export async function saveMailboxDraftAction(formData: FormData) {
  const member = await requirePortalMember();
  const groupRecipients = await resolvePortalMailGroupRecipients(mailGroupIds(formData),member.id);
  await savePortalMailDraft({
    draftId: textValue(formData, "draftId") || null,
    ownerId: member.id,
    subject: textValue(formData, "subject"),
    body: textValue(formData, "body"),
    recipientIds: Array.from(new Set([...recipients(formData),...groupRecipients])).slice(0,100),
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
  const folder = textValue(formData,"folder");
  const targetFolder = ["inbox","sent","starred","archive","trash"].includes(folder) ? folder : "inbox";
  const query = new URLSearchParams({folder:targetFolder,thread:threadId});
  const q=textValue(formData,"q");
  if(q) query.set("q",q);
  if(textValue(formData,"filter")==="unread") query.set("filter","unread");
  redirect("/portal/mail?"+query.toString());
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
  const attachmentIds = await accessibleAttachmentIds(formData, member);
  if (attachmentIds.length) {
    await attachPortalVaultFilesToLatestMessage({
      threadId,
      authorId: member.id,
      vaultFileIds: attachmentIds,
    });
  }

  revalidatePath("/portal/mail");
  revalidatePath("/portal/mail/" + threadId);
  redirect("/portal/mail?thread=" + encodeURIComponent(threadId) + "&replied=1");
}


export async function createMailboxGroupAction(formData: FormData) {
  const member = await requirePortalMember();
  const accessMode = textValue(formData,"accessMode") === "locked" ? "locked" : "private";
  await createPortalMailGroup({
    ownerId: member.id,
    name: textValue(formData,"name"),
    description: textValue(formData,"description"),
    accessMode,
    accessCode: accessMode === "locked" ? textValue(formData,"accessCode") : null,
    memberIds: recipients(formData),
  });
  revalidatePath("/portal/mail");
  redirect("/portal/mail?section=groups&created=1");
}

export async function joinMailboxGroupAction(formData: FormData) {
  const member = await requirePortalMember();
  const groupId = textValue(formData,"groupId");
  const accessCode = textValue(formData,"accessCode");
  if (!groupId || !accessCode) throw new Error("Grup ve erişim kodu gerekli.");
  await joinPortalMailGroup({ groupId, memberId: member.id, accessCode });
  revalidatePath("/portal/mail");
  redirect("/portal/mail?section=groups&joined=1");
}

export async function deleteMailboxGroupAction(formData: FormData) {
  const member = await requirePortalMember();
  const groupId = textValue(formData,"groupId");
  if (!groupId) throw new Error("Grup kimliği eksik.");
  await deletePortalMailGroup(groupId,member.id);
  revalidatePath("/portal/mail");
  redirect("/portal/mail?section=groups&deleted=1");
}
