"use server";

import { createPortalFileResource, uploadPortalFile } from "@/lib/portal/files";
import { commitPortalRepositoryFile, commitPortalRepositoryText, deletePortalRepositoryPath } from "@/lib/portal/repositories";
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
  addPortalTaskComment,
  createPortalCalendarEvent,
  createPortalInventoryMovement,
  createPortalMailThread,
  createPortalNotification,
  createPortalRepository,
  createPortalResource,
  createPortalTask,
  markPortalChannelRead,
  markPortalNotificationRead,
  savePortalMemberProfile,
  sendPortalMailReply,
  sendPortalMessage,
  updatePortalTaskDetails,
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
    assigneeId: textValue(formData, "assigneeId") || null,
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
  if (!name) throw new Error("Repo adı gerekli.");

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


export async function addTaskCommentAction(formData: FormData) {
  const member = await requirePortalMember();
  const taskId = textValue(formData, "taskId");
  const body = textValue(formData, "body");
  if (!taskId || !body) throw new Error("Görev ve yorum metni gerekli.");
  if (body.length > 4000) throw new Error("Yorum çok uzun.");

  await addPortalTaskComment({
    taskId,
    authorId: member.id,
    actorEmail: member.email,
    body,
  });

  revalidatePath("/portal/tasks");
  revalidatePath("/portal/tasks/" + taskId);
  redirect("/portal/tasks/" + encodeURIComponent(taskId) + "?commented=1");
}

export async function updateTaskDetailsAction(formData: FormData) {
  const member = await requirePortalMember();
  const taskId = textValue(formData, "taskId");
  if (!taskId) throw new Error("Görev kimliği gerekli.");

  await updatePortalTaskDetails({
    taskId,
    status: textValue(formData, "status") || "todo",
    priority: textValue(formData, "priority") || "medium",
    assigneeId: textValue(formData, "assigneeId") || null,
    dueAt: textValue(formData, "dueAt") || null,
    actorEmail: member.email,
  });

  revalidatePath("/portal");
  revalidatePath("/portal/tasks");
  revalidatePath("/portal/tasks/" + taskId);
  redirect("/portal/tasks/" + encodeURIComponent(taskId) + "?saved=1");
}

export async function createInventoryMovementAction(formData: FormData) {
  const member = await requirePortalMember();
  const itemId = textValue(formData, "itemId");
  const direction = textValue(formData, "direction");
  const amount = Number(formData.get("amount") ?? 0);
  const reason = textValue(formData, "reason");
  if (!itemId || !Number.isFinite(amount) || amount <= 0 || !reason) {
    throw new Error("Ürün, miktar ve hareket nedeni gerekli.");
  }

  await createPortalInventoryMovement({
    itemId,
    delta: direction === "out" ? -amount : amount,
    reason,
    projectSlug: textValue(formData, "projectSlug") || null,
    memberId: member.id,
    actorEmail: member.email,
  });

  revalidatePath("/portal");
  revalidatePath("/portal/inventory");
  redirect("/portal/inventory?movement=1");
}

export async function saveProfileAction(formData: FormData) {
  const member = await requirePortalMember();
  const skills = textValue(formData, "skills")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, 30);

  await savePortalMemberProfile({
    memberId: member.id,
    headline: textValue(formData, "headline"),
    bio: textValue(formData, "bio"),
    skills,
    githubUrl: textValue(formData, "githubUrl") || null,
    linkedinUrl: textValue(formData, "linkedinUrl") || null,
    phone: textValue(formData, "phone") || null,
    availability: textValue(formData, "availability"),
    actorEmail: member.email,
  });

  revalidatePath("/portal/profile");
  revalidatePath("/portal/members");
  redirect("/portal/profile?saved=1");
}

export async function replyMailThreadAction(formData: FormData) {
  const member = await requirePortalMember();
  const threadId = textValue(formData, "threadId");
  const body = textValue(formData, "body");
  if (!threadId || !body) throw new Error("Yazışma ve mesaj gerekli.");

  await sendPortalMailReply({
    threadId,
    authorId: member.id,
    body,
  });

  revalidatePath("/portal/mail");
  revalidatePath("/portal/mail/" + threadId);
  redirect("/portal/mail/" + encodeURIComponent(threadId) + "?replied=1");
}


export async function openChatChannelAction(formData: FormData) {
  const member = await requirePortalMember();
  const channelId = textValue(formData, "channelId");
  if (!channelId) throw new Error("Kanal kimliği gerekli.");
  await markPortalChannelRead(channelId, member.id);
  revalidatePath("/portal/chat");
  redirect("/portal/chat?channel=" + encodeURIComponent(channelId));
}


export async function uploadLibraryFileAction(formData: FormData) {
  const member = await requirePortalMember();
  const file = formData.get("file");
  if (!(file instanceof File) || file.size <= 0) {
    throw new Error("Yüklenecek dosya gerekli.");
  }

  const kind = textValue(formData, "kind") || "document";
  const allowed = ["document","archive","library","drawing","pcb","bom","code","procedure","dataset","media"];
  if (!allowed.includes(kind)) throw new Error("Geçersiz kaynak türü.");

  const projectSlug = textValue(formData, "projectSlug") || null;
  const teamCode = textValue(formData, "teamCode") || null;
  const title = textValue(formData, "title") || file.name;
  const description = textValue(formData, "description");
  const tags = textValue(formData, "tags")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, 30);

  const stored = await uploadPortalFile({
    file,
    memberId: member.id,
    kind,
    projectSlug,
    teamCode,
    note: textValue(formData, "versionNote") || "İlk yükleme",
  });

  await createPortalFileResource({
    fileId: stored.id,
    title,
    description,
    kind,
    teamCode,
    projectSlug,
    tags,
    actorId: member.id,
    actorEmail: member.email,
  });

  revalidatePath("/portal");
  revalidatePath("/portal/library");
  revalidatePath("/portal/documents");
  revalidatePath("/portal/archive");
  revalidatePath("/portal/electronics");
  redirect("/portal/files/" + encodeURIComponent(stored.id) + "?uploaded=1");
}

export async function uploadFileVersionAction(formData: FormData) {
  const member = await requirePortalMember();
  const fileId = textValue(formData, "fileId");
  const file = formData.get("file");
  if (!fileId || !(file instanceof File) || file.size <= 0) {
    throw new Error("Dosya ve dosya kimliği gerekli.");
  }

  await uploadPortalFile({
    file,
    memberId: member.id,
    existingFileId: fileId,
    projectSlug: textValue(formData, "projectSlug") || null,
    teamCode: textValue(formData, "teamCode") || null,
    note: textValue(formData, "versionNote") || "Yeni sürüm",
  });

  revalidatePath("/portal/files/" + fileId);
  revalidatePath("/portal/library");
  redirect("/portal/files/" + encodeURIComponent(fileId) + "?versioned=1");
}


export async function commitRepoFileAction(formData: FormData) {
  const member = await requirePortalMember();
  const repositoryId = textValue(formData, "repositoryId");
  const path = textValue(formData, "path");
  const message = textValue(formData, "message");
  const file = formData.get("file");
  if (!repositoryId || !(file instanceof File) || file.size <= 0) {
    throw new Error("Repo ve dosya gerekli.");
  }

  await commitPortalRepositoryFile({
    repositoryId,
    path: path || file.name,
    file,
    message: message || "Add " + (path || file.name),
    memberId: member.id,
    actorEmail: member.email,
  });

  revalidatePath("/portal/repositories");
  revalidatePath("/portal/repositories/" + repositoryId);
  redirect("/portal/repositories/" + encodeURIComponent(repositoryId) + "?committed=1");
}

export async function commitRepoTextAction(formData: FormData) {
  const member = await requirePortalMember();
  const repositoryId = textValue(formData, "repositoryId");
  const path = textValue(formData, "path");
  const content = String(formData.get("content") ?? "");
  const message = textValue(formData, "message");
  if (!repositoryId || !path) throw new Error("Repo ve dosya yolu gerekli.");

  await commitPortalRepositoryText({
    repositoryId,
    path,
    content,
    message: message || "Update " + path,
    memberId: member.id,
    actorEmail: member.email,
  });

  revalidatePath("/portal/repositories/" + repositoryId);
  redirect("/portal/repositories/" + encodeURIComponent(repositoryId) + "?path=" + encodeURIComponent(path) + "&committed=1");
}

export async function deleteRepoPathAction(formData: FormData) {
  const member = await requirePortalRole(["admin","lead"]);
  const repositoryId = textValue(formData, "repositoryId");
  const path = textValue(formData, "path");
  if (!repositoryId || !path) throw new Error("Repo ve dosya yolu gerekli.");

  await deletePortalRepositoryPath({
    repositoryId,
    path,
    message: textValue(formData, "message") || "Delete " + path,
    memberId: member.id,
    actorEmail: member.email,
  });

  revalidatePath("/portal/repositories/" + repositoryId);
  redirect("/portal/repositories/" + encodeURIComponent(repositoryId) + "?deleted=1");
}
