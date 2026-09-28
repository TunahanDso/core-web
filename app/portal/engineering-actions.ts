"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requirePortalMember, requirePortalRole } from "@/lib/portal/auth";
import {
  createNativeRepository,
  RUNNER_TASKS,
  submitPortalCodeRun,
} from "@/lib/portal/engineering-services";

function textValue(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

function repoSlug(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9._-]+/g,"-").replace(/^-+|-+$/g,"").slice(0,80);
}

export async function createNativeRepositoryAction(formData: FormData) {
  const member = await requirePortalRole(["admin","lead"]);
  const name = textValue(formData,"name");
  const slug = repoSlug(textValue(formData,"slug") || name);
  const visibilityRaw = textValue(formData,"visibility");
  const visibility = ["private","internal","public"].includes(visibilityRaw)
    ? visibilityRaw as "private" | "internal" | "public"
    : "private";
  if (!name || !slug) throw new Error("Repository adı ve slug gerekli.");

  await createNativeRepository({
    name,
    slug,
    projectSlug: textValue(formData,"projectSlug") || null,
    teamCode: textValue(formData,"teamCode") || null,
    visibility,
    actorEmail: member.email,
  });

  revalidatePath("/portal/repositories");
  redirect("/portal/repositories?created=native");
}

export async function submitCodeRunAction(formData: FormData) {
  const member = await requirePortalMember();
  const language = textValue(formData,"language");
  const task = textValue(formData,"task");
  if (!(language in RUNNER_TASKS)) throw new Error("Geçersiz runner dili.");

  await submitPortalCodeRun({
    memberId: member.id,
    repositoryRef: textValue(formData,"repositoryRef"),
    snapshotRef: textValue(formData,"snapshotRef") || "main",
    language: language as keyof typeof RUNNER_TASKS,
    task,
  });

  revalidatePath("/portal/code-lab");
  redirect("/portal/code-lab?submitted=1");
}
