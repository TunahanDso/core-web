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
import {
  createOrUpdatePortalProject,
  createPortalMapEdge,
  createPortalVehicleControl,
  grantPortalMemberCapability,
  revokePortalMemberCapability,
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
  const projectSlug = await createOrUpdatePortalProject({
    slug: text(formData,"slug"),
    title: text(formData,"title"),
    summary: text(formData,"summary"),
    domain: text(formData,"domain"),
    teamCode: text(formData,"teamCode") || null,
    status: text(formData,"status") || "concept",
    visibility: text(formData,"visibility") || "team",
    ownerMemberId: text(formData,"ownerMemberId") || null,
    startAt: text(formData,"startAt") || null,
    targetAt: text(formData,"targetAt") || null,
    riskLevel: text(formData,"riskLevel") || "medium",
    readiness: Number(formData.get("readiness") ?? 0),
    actorEmail: member.email,
  });

  revalidatePath("/portal/projects");
  revalidatePath("/portal/project-map");
  revalidatePath("/portal/control");
  redirect("/portal/control?project=" + encodeURIComponent(projectSlug));
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
