"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requirePortalMember, requirePortalRole } from "@/lib/portal/auth";
import {
  createPortalVaultFile,
  createPortalVaultVersion,
  updatePortalVaultApproval,
  updatePortalVaultLifecycle,
} from "@/lib/portal/vault";

function textValue(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

function parseTags(value: string) {
  return Array.from(new Set(
    value.split(",").map((item) => item.trim().toLowerCase()).filter(Boolean)
  )).slice(0, 30);
}

export async function uploadPortalVaultAction(formData: FormData) {
  const member = await requirePortalMember();
  const file = formData.get("file");
  if (!(file instanceof File)) throw new Error("Dosya seçilmedi.");

  const visibilityRaw = textValue(formData, "visibility");
  const visibility = ["members","team","leads","admins"].includes(visibilityRaw)
    ? visibilityRaw as "members" | "team" | "leads" | "admins"
    : "members";

  const fileId = await createPortalVaultFile({
    file,
    title: textValue(formData, "title"),
    description: textValue(formData, "description"),
    kind: textValue(formData, "kind"),
    teamCode: textValue(formData, "teamCode") || null,
    projectSlug: textValue(formData, "projectSlug") || null,
    tags: parseTags(textValue(formData, "tags")),
    visibility,
    actorEmail: member.email,
  });

  revalidatePath("/portal/library");
  revalidatePath("/portal/documents");
  revalidatePath("/portal/mechanical");
  revalidatePath("/portal/electronics");
  redirect("/portal/library/" + encodeURIComponent(fileId) + "?uploaded=1");
}

export async function uploadPortalVaultVersionAction(formData: FormData) {
  const member = await requirePortalMember();
  const fileId = textValue(formData, "fileId");
  const file = formData.get("file");
  if (!fileId) throw new Error("Vault dosya kimliği eksik.");
  if (!(file instanceof File)) throw new Error("Yeni sürüm dosyası seçilmedi.");

  await createPortalVaultVersion({
    fileId,
    file,
    note: textValue(formData, "note"),
    actorEmail: member.email,
  });

  revalidatePath("/portal/library");
  revalidatePath("/portal/library/" + fileId);
  revalidatePath("/portal/mechanical");
  revalidatePath("/portal/electronics");
  redirect("/portal/library/" + encodeURIComponent(fileId) + "?versioned=1");
}

export async function setPortalVaultLifecycleAction(formData: FormData) {
  const member = await requirePortalMember();
  const fileId = textValue(formData, "fileId");
  const lifecycle = textValue(formData, "lifecycle");
  if (!fileId || !["active","archived","trashed"].includes(lifecycle)) {
    throw new Error("Geçersiz Vault yaşam döngüsü isteği.");
  }

  await updatePortalVaultLifecycle({
    fileId,
    lifecycle: lifecycle as "active" | "archived" | "trashed",
    actorEmail: member.email,
  });

  revalidatePath("/portal/library");
  revalidatePath("/portal/library/" + fileId);
  redirect("/portal/library?state=" + encodeURIComponent(lifecycle));
}

export async function setPortalVaultApprovalAction(formData: FormData) {
  const member = await requirePortalRole(["admin","lead"]);
  const fileId = textValue(formData, "fileId");
  const approval = textValue(formData, "approval");
  if (!fileId || !["draft","review","approved","rejected"].includes(approval)) {
    throw new Error("Geçersiz Vault onay durumu.");
  }

  await updatePortalVaultApproval({
    fileId,
    approval: approval as "draft" | "review" | "approved" | "rejected",
    actorEmail: member.email,
  });

  revalidatePath("/portal/library");
  revalidatePath("/portal/library/" + fileId);
  redirect("/portal/library/" + encodeURIComponent(fileId) + "?approval=" + encodeURIComponent(approval));
}
