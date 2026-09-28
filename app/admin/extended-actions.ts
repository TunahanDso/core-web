"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdminIdentity } from "@/lib/cms/auth";
import {
  createPublication,
  saveSiteSetting,
  storeMediaAsset,
} from "@/lib/cms/extensions";

function actor(identity: Awaited<ReturnType<typeof requireAdminIdentity>>) {
  return identity.email || (typeof identity.payload.sub === "string" ? identity.payload.sub : "cloudflare-access");
}

function value(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

export async function createPublicationAction(formData: FormData) {
  const identity = await requireAdminIdentity();
  const titleTr = value(formData, "titleTr");
  if (!titleTr) throw new Error("Türkçe yayın başlığı gerekli.");
  const statusRaw = value(formData, "status") || "draft";
  const status = ["draft","published","archived"].includes(statusRaw)
    ? statusRaw as "draft" | "published" | "archived"
    : "draft";

  await createPublication({
    titleTr,
    titleEn: value(formData, "titleEn"),
    summaryTr: value(formData, "summaryTr"),
    summaryEn: value(formData, "summaryEn"),
    bodyTr: value(formData, "bodyTr"),
    bodyEn: value(formData, "bodyEn"),
    domain: value(formData, "domain") || null,
    kind: value(formData, "kind") || "technical-report",
    externalUrl: value(formData, "externalUrl") || null,
    status,
    actor: actor(identity),
  });

  revalidatePath("/admin/publications");
  revalidatePath("/tr/research");
  revalidatePath("/en/research");
  redirect("/admin/publications?created=1");
}

export async function uploadMediaAction(formData: FormData) {
  const identity = await requireAdminIdentity();
  const file = formData.get("file");
  if (!(file instanceof File)) throw new Error("Dosya gerekli.");

  await storeMediaAsset({
    file,
    altTr: value(formData, "altTr"),
    altEn: value(formData, "altEn"),
    actor: actor(identity),
  });

  revalidatePath("/admin/media");
  revalidatePath("/admin");
  redirect("/admin/media?uploaded=1");
}

export async function saveSiteSettingsAction(formData: FormData) {
  const identity = await requireAdminIdentity();
  const adminActor = actor(identity);

  const settings = [
    ["recruitment", { open: formData.get("recruitmentOpen") === "on", note_tr: value(formData, "recruitmentNoteTr"), note_en: value(formData, "recruitmentNoteEn") }],
    ["portal_banner", { enabled: formData.get("portalBannerEnabled") === "on", text: value(formData, "portalBannerText") }],
    ["public_ops", { enabled: formData.get("publicOpsEnabled") === "on" }],
    ["site_identity", { slogan_tr: value(formData, "sloganTr") || "İnsan İçin Teknoloji.", slogan_en: value(formData, "sloganEn") || "Technology for People." }],
  ] as const;

  for (const [key, payload] of settings) {
    await saveSiteSetting(key, payload, adminActor);
  }

  revalidatePath("/admin/settings");
  revalidatePath("/tr");
  revalidatePath("/en");
  redirect("/admin/settings?saved=1");
}
