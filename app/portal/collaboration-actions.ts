"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requirePortalMember, requirePortalRole } from "@/lib/portal/auth";
import {
  addMeetingNote,
  approveBudgetEntry,
  closePoll,
  createBudgetAccount,
  createBudgetAllocation,
  createBudgetEntry,
  createMeeting,
  createMeetingSpace,
  createPoll,
  generateMeetingReport,
  setMeetingStatus,
  votePoll,
} from "@/lib/portal/collaboration";

function textValue(formData: FormData,key: string) {
  return String(formData.get(key) ?? "").trim();
}

function participantIds(formData: FormData) {
  return Array.from(new Set(
    formData.getAll("participantId").map((value)=>String(value).trim()).filter(Boolean)
  )).slice(0,80);
}

function parseMinor(value: FormDataEntryValue | null) {
  const normalized=String(value ?? "").trim().replace(",",".");
  const amount=Number(normalized);
  if(!Number.isFinite(amount) || amount<0) throw new Error("Geçerli bir tutar gerekli.");
  return Math.round(amount*100);
}

export async function createMeetingSpaceAction(formData: FormData) {
  const member=await requirePortalMember();
  const name=textValue(formData,"name");
  if(!name) throw new Error("Toplantı alanı adı gerekli.");
  const visibilityRaw=textValue(formData,"visibility");
  const visibility=["private","team","members"].includes(visibilityRaw)
    ? visibilityRaw as "private"|"team"|"members"
    : "members";
  await createMeetingSpace({
    name,
    description:textValue(formData,"description"),
    teamCode:textValue(formData,"teamCode") || null,
    projectSlug:textValue(formData,"projectSlug") || null,
    visibility,
    createdBy:member.id,
  });
  revalidatePath("/portal/meetings");
  redirect("/portal/meetings?section=spaces&created=1");
}

export async function createMeetingAction(formData: FormData) {
  const member=await requirePortalMember();
  const title=textValue(formData,"title");
  const startsAt=textValue(formData,"startsAt");
  if(!title || !startsAt) throw new Error("Toplantı başlığı ve başlangıç zamanı gerekli.");
  const modeRaw=textValue(formData,"transportMode");
  const transportMode=["audio_video","audio","external","none"].includes(modeRaw)
    ? modeRaw as "audio_video"|"audio"|"external"|"none"
    : "audio_video";
  const id=await createMeeting({
    spaceId:textValue(formData,"spaceId") || null,
    title,
    agenda:textValue(formData,"agenda"),
    startsAt,
    endsAt:textValue(formData,"endsAt") || null,
    teamCode:textValue(formData,"teamCode") || null,
    projectSlug:textValue(formData,"projectSlug") || null,
    transportMode,
    participantIds:participantIds(formData),
    createdBy:member.id,
    actorEmail:member.email,
  });
  revalidatePath("/portal/meetings");
  revalidatePath("/portal/calendar");
  revalidatePath("/portal/notifications");
  redirect("/portal/meetings/"+encodeURIComponent(id)+"?created=1");
}

export async function setMeetingStatusAction(formData: FormData) {
  const member=await requirePortalMember();
  const meetingId=textValue(formData,"meetingId");
  const statusRaw=textValue(formData,"status");
  if(!meetingId || !["scheduled","live","completed","cancelled"].includes(statusRaw)) {
    throw new Error("Toplantı ve durum gerekli.");
  }
  await setMeetingStatus(meetingId,statusRaw as "scheduled"|"live"|"completed"|"cancelled",member.id,member.email);
  revalidatePath("/portal/meetings");
  revalidatePath("/portal/meetings/"+meetingId);
  redirect("/portal/meetings/"+encodeURIComponent(meetingId)+"?status="+encodeURIComponent(statusRaw));
}

export async function addMeetingNoteAction(formData: FormData) {
  const member=await requirePortalMember();
  const meetingId=textValue(formData,"meetingId");
  const body=textValue(formData,"body");
  const kindRaw=textValue(formData,"kind");
  const kind=["note","decision","action","transcript"].includes(kindRaw)
    ? kindRaw as "note"|"decision"|"action"|"transcript"
    : "note";
  if(!meetingId || !body) throw new Error("Toplantı ve içerik gerekli.");
  await addMeetingNote({meetingId,authorId:member.id,kind,body});
  revalidatePath("/portal/meetings/"+meetingId);
  redirect("/portal/meetings/"+encodeURIComponent(meetingId)+"?noted=1");
}

function pollOptions(formData: FormData) {
  const textarea=textValue(formData,"options");
  return textarea.split(/\r?\n/).map((x)=>x.trim()).filter(Boolean).slice(0,12);
}

export async function createMeetingPollAction(formData: FormData) {
  const member=await requirePortalMember();
  const meetingId=textValue(formData,"meetingId");
  const title=textValue(formData,"title");
  if(!meetingId || !title) throw new Error("Toplantı ve oylama başlığı gerekli.");
  await createPoll({
    meetingId,
    title,
    description:textValue(formData,"description"),
    scope:"meeting",
    teamCode:null,
    closesAt:textValue(formData,"closesAt") || null,
    options:pollOptions(formData),
    createdBy:member.id,
  });
  revalidatePath("/portal/meetings/"+meetingId);
  revalidatePath("/portal/notifications");
  redirect("/portal/meetings/"+encodeURIComponent(meetingId)+"?pollCreated=1");
}

export async function createGeneralPollAction(formData: FormData) {
  const member=await requirePortalRole(["admin","lead"]);
  const title=textValue(formData,"title");
  if(!title) throw new Error("Oylama başlığı gerekli.");
  const scopeRaw=textValue(formData,"scope");
  const scope=scopeRaw==="team" ? "team" : "global";
  await createPoll({
    meetingId:null,
    title,
    description:textValue(formData,"description"),
    scope,
    teamCode:scope==="team" ? textValue(formData,"teamCode") || null : null,
    closesAt:textValue(formData,"closesAt") || null,
    options:pollOptions(formData),
    createdBy:member.id,
  });
  revalidatePath("/portal/polls");
  revalidatePath("/portal/notifications");
  redirect("/portal/polls?created=1");
}

export async function votePollAction(formData: FormData) {
  const member=await requirePortalMember();
  const pollId=textValue(formData,"pollId");
  const optionId=textValue(formData,"optionId");
  const returnTo=textValue(formData,"returnTo") || "/portal/polls";
  if(!pollId || !optionId) throw new Error("Oylama seçeneği gerekli.");
  await votePoll(pollId,optionId,member.id);
  revalidatePath("/portal/polls");
  revalidatePath("/portal/meetings");
  redirect(returnTo);
}

export async function closePollAction(formData: FormData) {
  const member=await requirePortalMember();
  const pollId=textValue(formData,"pollId");
  const returnTo=textValue(formData,"returnTo") || "/portal/polls";
  if(!pollId) throw new Error("Oylama kimliği gerekli.");
  await closePoll(pollId,member.id);
  revalidatePath("/portal/polls");
  revalidatePath("/portal/meetings");
  redirect(returnTo);
}

export async function generateMeetingReportAction(formData: FormData) {
  const member=await requirePortalMember();
  const meetingId=textValue(formData,"meetingId");
  if(!meetingId) throw new Error("Toplantı kimliği gerekli.");
  await generateMeetingReport(meetingId,member.id,member.email);
  revalidatePath("/portal/meetings/"+meetingId);
  revalidatePath("/portal/archive");
  revalidatePath("/portal/search");
  redirect("/portal/meetings/"+encodeURIComponent(meetingId)+"?report=generated");
}

export async function createBudgetAccountAction(formData: FormData) {
  const member=await requirePortalRole(["admin","lead"]);
  const name=textValue(formData,"name");
  if(!name) throw new Error("Bütçe hesabı adı gerekli.");
  const id=await createBudgetAccount({
    name,
    teamCode:textValue(formData,"teamCode") || null,
    projectSlug:textValue(formData,"projectSlug") || null,
    currency:textValue(formData,"currency").toUpperCase() || "TRY",
    openingMinor:parseMinor(formData.get("openingBalance")),
    ownerMemberId:textValue(formData,"ownerMemberId") || null,
    createdBy:member.id,
  });
  revalidatePath("/portal/budget");
  redirect("/portal/budget?account="+encodeURIComponent(id)+"&created=1");
}

export async function createBudgetEntryAction(formData: FormData) {
  const member=await requirePortalRole(["admin","lead"]);
  const accountId=textValue(formData,"accountId");
  const typeRaw=textValue(formData,"entryType");
  const entryType=["income","expense","commitment"].includes(typeRaw)
    ? typeRaw as "income"|"expense"|"commitment"
    : "expense";
  const description=textValue(formData,"description");
  if(!accountId || !description) throw new Error("Hesap ve açıklama gerekli.");
  await createBudgetEntry({
    accountId,
    entryType,
    category:textValue(formData,"category") || "general",
    amountMinor:parseMinor(formData.get("amount")),
    description,
    occurredAt:textValue(formData,"occurredAt") || new Date().toISOString(),
    teamCode:textValue(formData,"teamCode") || null,
    projectSlug:textValue(formData,"projectSlug") || null,
    createdBy:member.id,
    autoApprove:member.role==="admin",
  });
  revalidatePath("/portal/budget");
  redirect("/portal/budget?account="+encodeURIComponent(accountId)+"&entry=1");
}

export async function approveBudgetEntryAction(formData: FormData) {
  const member=await requirePortalRole(["admin","lead"]);
  const entryId=textValue(formData,"entryId");
  const accountId=textValue(formData,"accountId");
  const status=textValue(formData,"status")==="rejected" ? "rejected" : "approved";
  if(!entryId) throw new Error("Bütçe hareketi kimliği gerekli.");
  await approveBudgetEntry(entryId,member.id,status);
  revalidatePath("/portal/budget");
  redirect("/portal/budget"+(accountId?"?account="+encodeURIComponent(accountId):""));
}

export async function createBudgetAllocationAction(formData: FormData) {
  const member=await requirePortalRole(["admin","lead"]);
  const accountId=textValue(formData,"accountId");
  if(!accountId) throw new Error("Bütçe hesabı gerekli.");
  await createBudgetAllocation({
    accountId,
    category:textValue(formData,"category") || "general",
    amountMinor:parseMinor(formData.get("amount")),
    periodStart:textValue(formData,"periodStart") || null,
    periodEnd:textValue(formData,"periodEnd") || null,
    notes:textValue(formData,"notes"),
    createdBy:member.id,
  });
  revalidatePath("/portal/budget");
  redirect("/portal/budget?account="+encodeURIComponent(accountId)+"&view=allocations");
}
