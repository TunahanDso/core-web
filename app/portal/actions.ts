"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import {
  activatePortalMember,
  clearPortalSession,
  loginPortalMember,
  requirePortalMember,
  requirePortalRole,
} from "@/lib/portal/auth";
import {
  createPortalCalendarEvent,
  createPortalMailThread,
  createPortalNotification,
  createPortalRepository,
  createPortalResource,
  createPortalTask,
  markPortalNotificationRead,
  sendPortalMessage,
  updatePortalTaskStatus,
  upsertPortalInventoryItem,
} from "@/lib/portal/db";

export type PortalAuthState = {
  error?: string;
};

function textValue(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

export async function loginPortalAction(
  _state: PortalAuthState,
  formData: FormData
): Promise<PortalAuthState> {
  try {
    const email = textValue(formData, "email");
    const password = textValue(formData, "password");
    if (!email || !password) return { error: "E-posta ve parola gerekli." };
    await loginPortalMember(email, password);
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Giriş başarısız." };
  }
  redirect("/portal");
}

export async function activatePortalAction(
  _state: PortalAuthState,
  formData: FormData
): Promise<PortalAuthState> {
  try {
    const email = textValue(formData, "email");
    const code = textValue(formData, "code");
    const password = textValue(formData, "password");
    const confirm = textValue(formData, "confirm");
    if (!email || !code || !password) return { error: "E-posta, davet kodu ve parola gerekli." };
    if (password !== confirm) return { error: "Parolalar eşleşmiyor." };
    await activatePortalMember(email, code, password);
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Aktivasyon başarısız." };
  }
  redirect("/portal");
}

export async function logoutPortalAction() {
  await clearPortalSession();
  redirect("/portal/login");
}

export async function createTaskAction(formData: FormData) {
  const member = await requirePortalMember();
  const title = textValue(formData, "title");
  if (!title) throw new Error("Görev başlığı gerekli.");

  const priorityRaw = textValue(formData, "priority") || "medium";
  const priority = ["low","medium","high","critical"].includes(priorityRaw)
    ? priorityRaw as "low" | "medium" | "high" | "critical"
    : "medium";

  await createPortalTask({
    title,
    description: textValue(formData, "description"),
    projectSlug: textValue(formData, "projectSlug") || null,
    teamCode: textValue(formData, "teamCode") || null,
    priority,
    dueAt: textValue(formData, "dueAt") || null,
    actorId: member.id,
    actorEmail: member.email,
  });

  revalidatePath("/portal");
  revalidatePath("/portal/tasks");
  redirect("/portal/tasks?created=1");
}

export async function updateTaskStatusAction(formData: FormData) {
  const member = await requirePortalMember();
  const id = textValue(formData, "id");
  const status = textValue(formData, "status");
  if (!id) throw new Error("Görev kimliği gerekli.");
  await updatePortalTaskStatus(id, status, member.email);
  revalidatePath("/portal");
  revalidatePath("/portal/tasks");
}

export async function createResourceAction(formData: FormData) {
  const member = await requirePortalMember();
  const title = textValue(formData, "title");
  const kind = textValue(formData, "kind");
  if (!title || !kind) throw new Error("Kaynak başlığı ve türü gerekli.");

  const tags = textValue(formData, "tags")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, 20);

  await createPortalResource({
    kind,
    title,
    description: textValue(formData, "description"),
    teamCode: textValue(formData, "teamCode") || null,
    projectSlug: textValue(formData, "projectSlug") || null,
    externalUrl: textValue(formData, "externalUrl") || null,
    tags,
    actorId: member.id,
    actorEmail: member.email,
  });

  revalidatePath("/portal/library");
  revalidatePath("/portal/archive");
  revalidatePath("/portal/documents");
  revalidatePath("/portal/electronics");
  redirect("/portal/library?created=1");
}

export async function createRepositoryAction(formData: FormData) {
  const member = await requirePortalRole(["admin","lead"]);
  const name = textValue(formData, "name");
  const repoUrl = textValue(formData, "repoUrl");
  if (!name || !repoUrl) throw new Error("Repo adı ve URL gerekli.");

  await createPortalRepository({
    name,
    repoUrl,
    projectSlug: textValue(formData, "projectSlug") || null,
    teamCode: textValue(formData, "teamCode") || null,
    visibility: textValue(formData, "visibility") || "private",
    actorEmail: member.email,
  });

  revalidatePath("/portal/repositories");
  redirect("/portal/repositories?created=1");
}

export async function upsertInventoryAction(formData: FormData) {
  const member = await requirePortalRole(["admin","lead"]);
  const sku = textValue(formData, "sku").toUpperCase();
  const name = textValue(formData, "name");
  if (!sku || !name) throw new Error("SKU ve ürün adı gerekli.");

  const quantity = Number(formData.get("quantity") ?? 0);
  const minimumQuantity = Number(formData.get("minimumQuantity") ?? 0);
  if (!Number.isFinite(quantity) || !Number.isFinite(minimumQuantity)) {
    throw new Error("Envanter miktarları sayısal olmalı.");
  }

  await upsertPortalInventoryItem({
    sku,
    name,
    category: textValue(formData, "category") || "general",
    location: textValue(formData, "location"),
    unit: textValue(formData, "unit") || "pcs",
    quantity,
    minimumQuantity,
    actorEmail: member.email,
  });

  revalidatePath("/portal/inventory");
  redirect("/portal/inventory?saved=1");
}

export async function sendChatMessageAction(formData: FormData) {
  const member = await requirePortalMember();
  const channelId = textValue(formData, "channelId");
  const body = textValue(formData, "body");
  if (!channelId || !body) throw new Error("Kanal ve mesaj gerekli.");
  if (body.length > 4000) throw new Error("Mesaj çok uzun.");

  await sendPortalMessage(channelId, member.id, body);
  revalidatePath("/portal/chat");
  redirect("/portal/chat?channel=" + encodeURIComponent(channelId));
}


export async function createMailThreadAction(formData: FormData) {
  const member = await requirePortalMember();
  const subject = textValue(formData, "subject");
  const body = textValue(formData, "body");
  const participants = formData.getAll("participantId").map((item) => String(item)).filter(Boolean);
  if (!subject || !body) throw new Error("Konu ve mesaj gerekli.");

  await createPortalMailThread({
    subject,
    body,
    senderId: member.id,
    participantIds: participants,
  });

  revalidatePath("/portal/mail");
  redirect("/portal/mail?created=1");
}

export async function createCalendarEventAction(formData: FormData) {
  const member = await requirePortalMember();
  const title = textValue(formData, "title");
  const startsAt = textValue(formData, "startsAt");
  if (!title || !startsAt) throw new Error("Etkinlik başlığı ve başlangıç zamanı gerekli.");

  await createPortalCalendarEvent({
    title,
    description: textValue(formData, "description"),
    startsAt,
    endsAt: textValue(formData, "endsAt") || null,
    location: textValue(formData, "location"),
    teamCode: textValue(formData, "teamCode") || null,
    projectSlug: textValue(formData, "projectSlug") || null,
    actorId: member.id,
    actorEmail: member.email,
  });

  revalidatePath("/portal/calendar");
  redirect("/portal/calendar?created=1");
}

export async function createNotificationAction(formData: FormData) {
  const member = await requirePortalRole(["admin","lead"]);
  const title = textValue(formData, "title");
  if (!title) throw new Error("Bildirim başlığı gerekli.");

  await createPortalNotification({
    memberId: textValue(formData, "memberId") || null,
    kind: textValue(formData, "kind") || "info",
    title,
    body: textValue(formData, "body"),
    href: textValue(formData, "href") || null,
    actorEmail: member.email,
  });

  revalidatePath("/portal/notifications");
  redirect("/portal/notifications?created=1");
}

export async function markNotificationReadAction(formData: FormData) {
  const member = await requirePortalMember();
  const id = textValue(formData, "id");
  if (!id) throw new Error("Bildirim kimliği gerekli.");
  await markPortalNotificationRead(id, member.id);
  revalidatePath("/portal/notifications");
}
