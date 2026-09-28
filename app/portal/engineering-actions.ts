"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requirePortalMember, requirePortalRole } from "@/lib/portal/auth";
import {
  commitNativeRepositoryTextFile,
  createNativeRepository,
  createNativeRepositoryBranch,
  createNativeRepositoryRelease,
  RUNNER_TASKS,
  submitPortalCodeRun,
} from "@/lib/portal/engineering-services";
import {
  canManageNativeRepository,
  getAccessibleNativeRepository,
} from "@/lib/portal/repositories";

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
    actorName: member.fullName,
  });

  revalidatePath("/portal/repositories");
  redirect("/portal/repositories?created=native");
}

async function managedRepositoryFromForm(formData: FormData) {
  const member = await requirePortalMember();
  const slug = repoSlug(textValue(formData,"repoSlug"));
  if (!slug) throw new Error("Repository slug gerekli.");
  const repo = await getAccessibleNativeRepository(member,slug);
  if (!repo || !repo.service_repository_id) throw new Error("Repository bulunamadı veya servis kimliği yok.");
  if (!(await canManageNativeRepository(member,repo))) {
    throw new Error("Bu repository üzerinde write yetkin yok.");
  }
  return { member,repo };
}

export async function createNativeRepositoryBranchAction(formData: FormData) {
  const { member,repo } = await managedRepositoryFromForm(formData);
  const name = textValue(formData,"branchName");
  const fromRef = textValue(formData,"fromRef") || repo.default_branch;
  if (!name) throw new Error("Branch adı gerekli.");

  await createNativeRepositoryBranch({
    serviceRepositoryId:repo.service_repository_id!,
    nativeRepositoryId:repo.id,
    name,
    fromRef,
    actorEmail:member.email,
  });

  revalidatePath("/portal/repositories");
  revalidatePath("/portal/repositories/" + repo.slug);
  redirect(
    "/portal/repositories/" + encodeURIComponent(repo.slug)
    + "?ref=" + encodeURIComponent(name)
    + "&branchCreated=1"
  );
}

export async function commitNativeRepositoryFileAction(formData: FormData) {
  const { member,repo } = await managedRepositoryFromForm(formData);
  const branch = textValue(formData,"branch") || repo.default_branch;
  const path = textValue(formData,"filePath").replace(/\\/g,"/");
  const message = textValue(formData,"message");
  const expectedHead = textValue(formData,"expectedHead") || null;
  const deleting = textValue(formData,"operation") === "delete";
  const fileContent = deleting ? null : String(formData.get("content") ?? "");
  if (!path) throw new Error("Dosya yolu gerekli.");
  if (!deleting && fileContent.length > 520_000) throw new Error("Dosya portal editörü için çok büyük.");

  await commitNativeRepositoryTextFile({
    serviceRepositoryId:repo.service_repository_id!,
    nativeRepositoryId:repo.id,
    branch,
    expectedHead,
    path,
    content:fileContent,
    message:message || (deleting ? "chore: delete " + path : "chore: update " + path),
    actorName:member.fullName,
    actorEmail:member.email,
  });

  revalidatePath("/portal/repositories");
  revalidatePath("/portal/repositories/" + repo.slug);
  revalidatePath("/portal/repositories/" + repo.slug + "/review");
  redirect(
    "/portal/repositories/" + encodeURIComponent(repo.slug)
    + "?ref=" + encodeURIComponent(branch)
    + "&file=" + encodeURIComponent(path)
    + "&committed=1"
  );
}

export async function createNativeRepositoryReleaseAction(formData: FormData) {
  const { member,repo } = await managedRepositoryFromForm(formData);
  const ref = textValue(formData,"ref") || repo.default_branch;
  const tag = textValue(formData,"tag");
  const name = textValue(formData,"releaseName") || tag;
  const notes = textValue(formData,"notes");
  if (!tag) throw new Error("Release tag gerekli.");

  await createNativeRepositoryRelease({
    serviceRepositoryId:repo.service_repository_id!,
    nativeRepositoryId:repo.id,
    ref,
    tag,
    name,
    notes,
    actorEmail:member.email,
  });

  revalidatePath("/portal/repositories/" + repo.slug);
  redirect(
    "/portal/repositories/" + encodeURIComponent(repo.slug)
    + "?ref=" + encodeURIComponent(ref)
    + "&released=1"
  );
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
