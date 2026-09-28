"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  canManagePortalTeam,
  canManageTeamProjects,
  canManageTeamVehicles,
  requirePortalCapability,
} from "@/lib/portal/governance";
import { requirePortalMember } from "@/lib/portal/auth";
import { deleteShowcaseProjectBySlug, resetShowcaseProjects, syncShowcaseProject } from "@/lib/cms/project-control";
import {
  createOrUpdatePortalProject,
  createOrUpdatePortalTeam,
  createPortalMapEdge,
  createPortalVehicleControl,
  deletePortalProject,
  deletePortalTeam,
  grantPortalMemberCapability,
  removePortalTeamMembership,
  resetPortalProjectCatalog,
  revokePortalMemberCapability,
  updatePortalMemberGlobalRole,
  updatePortalRoleProfile,
  upsertPortalTeamMembership,
} from "@/lib/portal/control";

function text(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}


export async function upsertPortalTeamMembershipScopedAction(formData: FormData) {
  const member = await requirePortalMember();
  const teamCode = text(formData,"teamCode");
  if (!teamCode || !(await canManagePortalTeam(member,teamCode))) {
    throw new Error("Bu takımın üyeliklerini yönetme yetkin yok.");
  }
  await upsertPortalTeamMembership({
    teamCode,
    memberId: text(formData,"memberId"),
    teamRole: text(formData,"teamRole") || "engineer",
    capabilities: [],
    actorEmail: member.email,
  });
  revalidatePath("/portal/teams/" + teamCode);
  revalidatePath("/portal/members");
  redirect("/portal/teams/" + encodeURIComponent(teamCode) + "?membership=1");
}

export async function createPortalTeamProjectAction(formData: FormData) {
  const member = await requirePortalMember();
  const teamCode = text(formData,"teamCode");
  if (!teamCode || !(await canManageTeamProjects(member,teamCode))) {
    throw new Error("Bu takımda proje oluşturma yetkin yok.");
  }
  const projectSlug = await createOrUpdatePortalProject({
    slug: text(formData,"slug"),
    title: text(formData,"title"),
    summary: text(formData,"summary"),
    domain: text(formData,"domain"),
    teamCode,
    status: text(formData,"status") || "concept",
    visibility: "team",
    ownerMemberId: text(formData,"ownerMemberId") || member.id,
    startAt: text(formData,"startAt") || null,
    targetAt: text(formData,"targetAt") || null,
    riskLevel: text(formData,"riskLevel") || "medium",
    readiness: Number(formData.get("readiness") ?? 0),
    actorEmail: member.email,
  });
  revalidatePath("/portal/projects");
  revalidatePath("/portal/project-map");
  revalidatePath("/portal/teams/" + teamCode);
  redirect("/portal/projects/" + encodeURIComponent(projectSlug));
}

export async function createPortalTeamVehicleAction(formData: FormData) {
  const member = await requirePortalMember();
  const teamCode = text(formData,"teamCode");
  if (!teamCode || !(await canManageTeamVehicles(member,teamCode))) {
    throw new Error("Bu takımda araç registry yönetme yetkin yok.");
  }
  await createPortalVehicleControl({
    code: text(formData,"code"),
    name: text(formData,"name"),
    domain: text(formData,"domain"),
    teamCode,
    projectSlug: text(formData,"projectSlug") || null,
    platformType: text(formData,"platformType") || "vehicle",
    lifecycle: text(formData,"lifecycle") || "prototype",
    serialNumber: text(formData,"serialNumber"),
    criticality: text(formData,"criticality") || "medium",
    description: text(formData,"description"),
    ownerMemberId: text(formData,"ownerMemberId") || member.id,
    actorEmail: member.email,
  });
  revalidatePath("/portal/ops");
  revalidatePath("/portal/project-map");
  revalidatePath("/portal/teams/" + teamCode);
  redirect("/portal/teams/" + encodeURIComponent(teamCode) + "?vehicle=1");
}

export async function upsertPortalProjectControlAction(formData: FormData) {
  const member = await requirePortalCapability("control.projects");
  const title = text(formData,"title");
  const summary = text(formData,"summary");
  const domain = text(formData,"domain");
  const teamCode = text(formData,"teamCode") || null;
  const readiness = Number(formData.get("readiness") ?? 0);
  const projectSlug = await createOrUpdatePortalProject({
    slug: text(formData,"slug"),
    title,
    summary,
    domain,
    teamCode,
    status: text(formData,"status") || "concept",
    visibility: text(formData,"visibility") || "team",
    ownerMemberId: text(formData,"ownerMemberId") || null,
    startAt: text(formData,"startAt") || null,
    targetAt: text(formData,"targetAt") || null,
    riskLevel: text(formData,"riskLevel") || "medium",
    readiness,
    actorEmail: member.email,
  });

  const showcaseStatus = text(formData,"showcaseStatus") || "draft";
  if (!["draft","published","archived"].includes(showcaseStatus)) {
    throw new Error("Geçersiz vitrin yayın durumu.");
  }
  const integrations = text(formData,"integrations")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);

  await syncShowcaseProject({
    slug: projectSlug,
    status: showcaseStatus as "draft" | "published" | "archived",
    domain: domain || null,
    progress: readiness,
    owner: text(formData,"showcaseOwner") || teamCode || null,
    integrations,
    titleTr: text(formData,"titleTr") || title,
    titleEn: text(formData,"titleEn") || text(formData,"titleTr") || title,
    summaryTr: text(formData,"summaryTr") || summary,
    summaryEn: text(formData,"summaryEn"),
    categoryTr: text(formData,"categoryTr") || domain,
    categoryEn: text(formData,"categoryEn") || domain,
    statusTr: text(formData,"statusTr"),
    statusEn: text(formData,"statusEn"),
  },member.email);

  revalidatePath("/portal");
  revalidatePath("/portal/projects");
  revalidatePath("/portal/project-map");
  revalidatePath("/portal/control");
  revalidatePath("/tr");
  revalidatePath("/en");
  revalidatePath("/tr/projects");
  revalidatePath("/en/projects");
  revalidatePath("/tr/projects/" + projectSlug);
  revalidatePath("/en/projects/" + projectSlug);
  redirect("/portal/control?edit=" + encodeURIComponent(projectSlug) + "&saved=1#project-control");
}

export async function deletePortalProjectControlAction(formData: FormData) {
  const member = await requirePortalCapability("control.projects");
  const projectSlug = text(formData,"slug");
  const confirmation = text(formData,"confirmation");
  if (!projectSlug || confirmation !== projectSlug) {
    throw new Error("Kalıcı silme için proje slug değerini aynen yazmalısın.");
  }

  await deletePortalProject({ slug: projectSlug, actorEmail: member.email });
  await deleteShowcaseProjectBySlug(projectSlug,member.email);

  revalidatePath("/portal");
  revalidatePath("/portal/projects");
  revalidatePath("/portal/project-map");
  revalidatePath("/portal/control");
  revalidatePath("/tr");
  revalidatePath("/en");
  revalidatePath("/tr/projects");
  revalidatePath("/en/projects");
  redirect("/portal/control?deleted=" + encodeURIComponent(projectSlug) + "#project-control");
}

export async function resetPortalProjectCatalogAction(formData: FormData) {
  const member = await requirePortalCapability("portal.admin");
  if (text(formData,"confirmation") !== "RESET PROJECTS") {
    throw new Error("Proje kataloğunu sıfırlamak için RESET PROJECTS yazmalısın.");
  }

  const internalCount = await resetPortalProjectCatalog({ actorEmail: member.email });
  const showcaseCount = await resetShowcaseProjects(member.email);

  revalidatePath("/portal");
  revalidatePath("/portal/projects");
  revalidatePath("/portal/project-map");
  revalidatePath("/portal/control");
  revalidatePath("/tr");
  revalidatePath("/en");
  revalidatePath("/tr/projects");
  revalidatePath("/en/projects");
  redirect("/portal/control?reset=" + internalCount + "-" + showcaseCount + "#project-control");
}

export async function upsertPortalVehicleControlAction(formData: FormData) {
  const member = await requirePortalCapability("control.vehicles");
  await createPortalVehicleControl({
    code: text(formData,"code"),
    name: text(formData,"name"),
    domain: text(formData,"domain"),
    teamCode: text(formData,"teamCode") || null,
    projectSlug: text(formData,"projectSlug") || null,
    platformType: text(formData,"platformType") || "vehicle",
    lifecycle: text(formData,"lifecycle") || "prototype",
    serialNumber: text(formData,"serialNumber"),
    criticality: text(formData,"criticality") || "medium",
    description: text(formData,"description"),
    ownerMemberId: text(formData,"ownerMemberId") || null,
    actorEmail: member.email,
  });

  revalidatePath("/portal/ops");
  revalidatePath("/portal/project-map");
  revalidatePath("/portal/control");
  redirect("/portal/control?vehicle=1");
}

export async function upsertPortalTeamMembershipAction(formData: FormData) {
  const member = await requirePortalCapability("teams.manage");
  const capabilities = text(formData,"capabilities")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
  await upsertPortalTeamMembership({
    teamCode: text(formData,"teamCode"),
    memberId: text(formData,"memberId"),
    teamRole: text(formData,"teamRole") || "engineer",
    capabilities,
    actorEmail: member.email,
  });

  revalidatePath("/portal/teams");
  revalidatePath("/portal/control");
  redirect("/portal/control?membership=1");
}

export async function grantPortalCapabilityAction(formData: FormData) {
  const member = await requirePortalCapability("roles.manage");
  await grantPortalMemberCapability({
    memberId: text(formData,"memberId"),
    capability: text(formData,"capability"),
    actorEmail: member.email,
  });
  revalidatePath("/portal/control");
  redirect("/portal/control?capability=granted");
}

export async function revokePortalCapabilityAction(formData: FormData) {
  const member = await requirePortalCapability("roles.manage");
  await revokePortalMemberCapability({
    memberId: text(formData,"memberId"),
    capability: text(formData,"capability"),
    actorEmail: member.email,
  });
  revalidatePath("/portal/control");
  redirect("/portal/control?capability=revoked");
}

export async function createPortalMapEdgeAction(formData: FormData) {
  const member = await requirePortalCapability("project.map.edit");
  await createPortalMapEdge({
    sourceType: text(formData,"sourceType"),
    sourceRef: text(formData,"sourceRef"),
    targetType: text(formData,"targetType"),
    targetRef: text(formData,"targetRef"),
    relation: text(formData,"relation") || "depends_on",
    label: text(formData,"label"),
    actorEmail: member.email,
  });

  revalidatePath("/portal/project-map");
  revalidatePath("/portal/control");
  redirect("/portal/project-map?edge=1");
}


export async function createPortalTeamAction(formData: FormData) {
  const member = await requirePortalCapability("teams.manage");
  const teamCode = await createOrUpdatePortalTeam({
    code:text(formData,"code"),
    name:text(formData,"name"),
    domain:text(formData,"domain"),
    description:text(formData,"description"),
    visibility:text(formData,"visibility") || "restricted",
    actorEmail:member.email,
  });
  revalidatePath("/portal/teams");
  revalidatePath("/portal/control");
  redirect("/portal/teams/" + encodeURIComponent(teamCode) + "?created=1");
}

export async function updatePortalTeamAction(formData: FormData) {
  const member = await requirePortalMember();
  const teamCode = text(formData,"code");
  if (!teamCode || !(await canManagePortalTeam(member,teamCode))) {
    throw new Error("Bu takımın ayarlarını düzenleme yetkin yok.");
  }
  await createOrUpdatePortalTeam({
    code:teamCode,
    name:text(formData,"name"),
    domain:text(formData,"domain"),
    description:text(formData,"description"),
    visibility:text(formData,"visibility") || "restricted",
    actorEmail:member.email,
  });
  revalidatePath("/portal/teams");
  revalidatePath("/portal/teams/" + teamCode);
  redirect("/portal/teams/" + encodeURIComponent(teamCode) + "?updated=1");
}

export async function deletePortalTeamAction(formData: FormData) {
  const member = await requirePortalCapability("teams.manage");
  const teamCode = text(formData,"teamCode").toUpperCase();
  if (!teamCode || text(formData,"confirmation").toUpperCase() !== teamCode) {
    throw new Error("Kalıcı silme için takım kodunu aynen yazmalısın.");
  }
  await deletePortalTeam({ teamCode,actorEmail:member.email });
  revalidatePath("/portal/teams");
  revalidatePath("/portal/members");
  revalidatePath("/portal/projects");
  revalidatePath("/portal/project-map");
  revalidatePath("/portal/repositories");
  revalidatePath("/portal/control");
  redirect("/portal/teams?deleted=" + encodeURIComponent(teamCode));
}

export async function removePortalTeamMembershipScopedAction(formData: FormData) {
  const member = await requirePortalMember();
  const teamCode = text(formData,"teamCode");
  if (!teamCode || !(await canManagePortalTeam(member,teamCode))) {
    throw new Error("Bu takımın üyeliklerini yönetme yetkin yok.");
  }
  const memberId = text(formData,"memberId");
  if (!memberId) throw new Error("Üye seçmelisin.");
  await removePortalTeamMembership({ teamCode,memberId,actorEmail:member.email });
  revalidatePath("/portal/teams/" + teamCode);
  revalidatePath("/portal/members");
  revalidatePath("/portal/members/" + memberId);
  redirect("/portal/teams/" + encodeURIComponent(teamCode) + "?membership=removed");
}

export async function updatePortalRoleProfileAction(formData: FormData) {
  const member = await requirePortalCapability("roles.manage");
  await updatePortalRoleProfile({
    roleKey:text(formData,"roleKey"),
    description:text(formData,"description"),
    capabilities:formData.getAll("capability").map((item) => String(item)),
    actorEmail:member.email,
  });
  revalidatePath("/portal/members");
  revalidatePath("/portal/control");
  redirect("/portal/members?roleProfile=updated");
}

export async function updatePortalMemberGlobalRoleAction(formData: FormData) {
  const member = await requirePortalCapability("roles.manage");
  const memberId = text(formData,"memberId");
  await updatePortalMemberGlobalRole({
    memberId,
    role:text(formData,"role"),
    actorMemberId:member.id,
    actorEmail:member.email,
  });
  revalidatePath("/portal/members");
  revalidatePath("/portal/members/" + memberId);
  revalidatePath("/portal/control");
  redirect("/portal/members/" + encodeURIComponent(memberId) + "?role=updated");
}
