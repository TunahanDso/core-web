"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdminIdentity } from "@/lib/cms/auth";
import { updateCompetition, updateProject } from "@/lib/cms/db";
import { applyShowcaseSeed } from "@/lib/cms/seed";

function actorFrom(identity: Awaited<ReturnType<typeof requireAdminIdentity>>) {
  if (identity.email) return identity.email;
  return typeof identity.payload.sub === "string"
    ? identity.payload.sub
    : "cloudflare-access";
}

export async function applyShowcaseSeedAction() {
  const identity = await requireAdminIdentity();
  await applyShowcaseSeed(actorFrom(identity));

  revalidatePath("/admin");
  revalidatePath("/admin/projects");
  revalidatePath("/admin/competitions");
  redirect("/admin?seed=applied");
}

export async function updateProjectAction(formData: FormData) {
  const identity = await requireAdminIdentity();

  const id = String(formData.get("id") ?? "").trim();
  const titleTr = String(formData.get("titleTr") ?? "").trim();
  const titleEn = String(formData.get("titleEn") ?? "").trim();
  const summaryTr = String(formData.get("summaryTr") ?? "").trim();
  const summaryEn = String(formData.get("summaryEn") ?? "").trim();
  const domain = String(formData.get("domain") ?? "").trim();
  const owner = String(formData.get("owner") ?? "").trim();
  const status = String(formData.get("status") ?? "draft").trim();
  const integrationsRaw = String(formData.get("integrations") ?? "");
  const progressRaw = Number(formData.get("progress"));

  if (!id) throw new Error("Project id is required.");
  if (!titleTr) throw new Error("Turkish project title is required.");
  if (!["draft", "published", "archived"].includes(status)) {
    throw new Error("Invalid publication status.");
  }
  if (!Number.isFinite(progressRaw) || progressRaw < 0 || progressRaw > 100) {
    throw new Error("Progress must be between 0 and 100.");
  }

  const integrations = integrationsRaw
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, 24);

  await updateProject(
    {
      id,
      status: status as "draft" | "published" | "archived",
      domain: domain || null,
      owner: owner || null,
      progress: Math.round(progressRaw),
      integrations,
      titleTr,
      titleEn,
      summaryTr,
      summaryEn,
    },
    actorFrom(identity)
  );

  revalidatePath("/admin");
  revalidatePath("/admin/projects");
  revalidatePath(`/admin/projects/${id}`);
  redirect(`/admin/projects/${encodeURIComponent(id)}?saved=1`);
}


export async function updateCompetitionAction(formData: FormData) {
  const identity = await requireAdminIdentity();

  const id = String(formData.get("id") ?? "").trim();
  const titleTr = String(formData.get("titleTr") ?? "").trim();
  const titleEn = String(formData.get("titleEn") ?? "").trim();
  const summaryTr = String(formData.get("summaryTr") ?? "").trim();
  const summaryEn = String(formData.get("summaryEn") ?? "").trim();
  const domain = String(formData.get("domain") ?? "").trim();
  const status = String(formData.get("status") ?? "draft").trim();
  const targetStatus = String(formData.get("targetStatus") ?? "evaluation").trim();
  const dateTr = String(formData.get("dateTr") ?? "").trim();
  const dateEn = String(formData.get("dateEn") ?? "").trim();
  const locationTr = String(formData.get("locationTr") ?? "").trim();
  const locationEn = String(formData.get("locationEn") ?? "").trim();

  if (!id) throw new Error("Competition id is required.");
  if (!titleTr) throw new Error("Turkish competition title is required.");
  if (!["draft", "published", "archived"].includes(status)) {
    throw new Error("Invalid publication status.");
  }
  if (!["confirmed", "target", "evaluation"].includes(targetStatus)) {
    throw new Error("Invalid target status.");
  }

  await updateCompetition(
    {
      id,
      status: status as "draft" | "published" | "archived",
      domain: domain || null,
      targetStatus: targetStatus as "confirmed" | "target" | "evaluation",
      dateTr,
      dateEn,
      locationTr,
      locationEn,
      titleTr,
      titleEn,
      summaryTr,
      summaryEn,
    },
    actorFrom(identity)
  );

  revalidatePath("/admin");
  revalidatePath("/admin/competitions");
  revalidatePath(`/admin/competitions/${id}`);
  redirect(`/admin/competitions/${encodeURIComponent(id)}?saved=1`);
}
