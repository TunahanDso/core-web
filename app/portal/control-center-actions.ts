"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requirePortalMember } from "@/lib/portal/auth";
import { deleteShowcaseProjectBySlug } from "@/lib/cms/project-control";
import { memberHasPortalCapability, type PortalCapability } from "@/lib/portal/governance";
import {
  deleteControlCenterEntity,
  updateControlCenterEntity,
  type ControlCenterEntityType,
} from "@/lib/portal/control-center";

function text(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

function entityType(formData: FormData): ControlCenterEntityType {
  const value = text(formData,"entityType");
  const allowed: ControlCenterEntityType[] = [
    "members","roles","teams","projects","tasks","vehicles","repositories","vault","inventory",
  ];
  if (!allowed.includes(value as ControlCenterEntityType)) {
    throw new Error("Geçersiz Control Center nesne tipi.");
  }
  return value as ControlCenterEntityType;
}

async function requireEntityPermission(type: ControlCenterEntityType) {
  const member = await requirePortalMember();
  const required =
    type === "members" || type === "roles"
      ? ["roles.manage","portal.admin"]
      : type === "teams"
        ? ["teams.manage","portal.admin"]
        : type === "vehicles"
          ? ["control.vehicles","portal.admin"]
          : type === "vault"
            ? ["vault.approve","control.projects","portal.admin"]
            : ["control.projects","portal.admin"];

  const checks = await Promise.all(required.map((capability) => memberHasPortalCapability(member,capability as PortalCapability)));
  if (!checks.some(Boolean)) {
    throw new Error("Bu Control Center nesnesini yönetme yetkin yok.");
  }
  return member;
}

function collectFields(formData: FormData) {
  const fields: Record<string,string> = {};
  for (const [key,value] of formData.entries()) {
    if (!key.startsWith("field.")) continue;
    fields[key.slice(6)] = String(value ?? "").trim();
  }
  return fields;
}

function revalidateControlSurfaces(type: ControlCenterEntityType, entityId: string) {
  revalidatePath("/portal/control-center");
  revalidatePath("/portal/control");
  if (type === "members" || type === "roles") {
    revalidatePath("/portal/members");
    revalidatePath("/portal/members/" + entityId);
  }
  if (type === "teams") {
    revalidatePath("/portal/teams");
    revalidatePath("/portal/teams/" + entityId);
  }
  if (type === "projects" || type === "tasks") {
    revalidatePath("/portal/projects");
    revalidatePath("/portal/tasks");
    revalidatePath("/portal/project-map");
  }
  if (type === "vehicles") revalidatePath("/portal/ops");
  if (type === "repositories") revalidatePath("/portal/repositories");
  if (type === "vault") {
    revalidatePath("/portal/library");
    revalidatePath("/portal/mechanical");
    revalidatePath("/portal/electronics");
  }
  if (type === "inventory") revalidatePath("/portal/inventory");
}

export async function updateControlCenterEntityAction(formData: FormData) {
  const type = entityType(formData);
  const member = await requireEntityPermission(type);
  const entityId = text(formData,"entityId");
  await updateControlCenterEntity({
    entityType:type,
    entityId,
    fields:collectFields(formData),
    actorMemberId:member.id,
    actorEmail:member.email,
  });
  revalidateControlSurfaces(type,entityId);
  redirect("/portal/control-center?type=" + encodeURIComponent(type) + "&saved=" + encodeURIComponent(entityId));
}

export async function deleteControlCenterEntityAction(formData: FormData) {
  const type = entityType(formData);
  const member = await requireEntityPermission(type);
  const entityId = text(formData,"entityId");
  const confirmation = text(formData,"confirmation");
  if (!entityId || confirmation !== entityId) {
    throw new Error("Silme / arşivleme için nesne kimliğini aynen yazmalısın.");
  }
  await deleteControlCenterEntity({
    entityType:type,
    entityId,
    actorMemberId:member.id,
    actorEmail:member.email,
  });
  if (type === "projects") {
    await deleteShowcaseProjectBySlug(entityId,member.email);
    revalidatePath("/tr");
    revalidatePath("/en");
    revalidatePath("/tr/projects");
    revalidatePath("/en/projects");
  }
  revalidateControlSurfaces(type,entityId);
  redirect("/portal/control-center?type=" + encodeURIComponent(type) + "&deleted=" + encodeURIComponent(entityId));
}
