"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdminIdentity } from "@/lib/cms/auth";
import { updateProject } from "@/lib/cms/db";
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
