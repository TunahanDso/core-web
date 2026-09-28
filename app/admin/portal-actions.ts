"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireAdminIdentity } from "@/lib/cms/auth";
import { applyPortalFoundation } from "@/lib/portal/bootstrap";
import {
  createPortalInvite,
  setPortalMemberStatus,
} from "@/lib/portal/db";
import type { PortalRole } from "@/lib/portal/auth";

function actorFrom(identity: Awaited<ReturnType<typeof requireAdminIdentity>>) {
  if (identity.email) return identity.email;
  return typeof identity.payload.sub === "string" ? identity.payload.sub : "cloudflare-access";
}

export type InviteAdminState = {
  error?: string;
  code?: string;
  email?: string;
  expiresAt?: string;
};

export async function initializePortalAction() {
  const identity = await requireAdminIdentity();
  try {
    await applyPortalFoundation(actorFrom(identity));
  } catch (error) {
    const message = error instanceof Error ? error.message : "Portal bootstrap failed.";
    redirect("/admin?portal=failed&portalError=" + encodeURIComponent(message.slice(0, 240)));
  }
  revalidatePath("/admin");
  revalidatePath("/admin/members");
  redirect("/admin?portal=ready");
}

export async function createPortalInviteAdminAction(
  _state: InviteAdminState,
  formData: FormData
): Promise<InviteAdminState> {
  try {
    const identity = await requireAdminIdentity();
    const email = String(formData.get("email") ?? "").trim();
    const fullName = String(formData.get("fullName") ?? "").trim();
    const roleRaw = String(formData.get("role") ?? "member").trim();
    const role: PortalRole = ["admin","lead","member","alumni","viewer"].includes(roleRaw)
      ? roleRaw as PortalRole
      : "member";
    const teams = String(formData.get("teams") ?? "")
      .split(",")
      .map((item) => item.trim().toUpperCase())
      .filter(Boolean)
      .slice(0, 12);

    if (!email || !fullName) return { error: "Student name and email are required." };

    const result = await createPortalInvite({
      email,
      fullName,
      role,
      teams,
      createdBy: actorFrom(identity),
    });

    revalidatePath("/admin/members");
    return result;
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Invitation could not be created." };
  }
}

export async function setPortalMemberStatusAdminAction(formData: FormData) {
  const identity = await requireAdminIdentity();
  const memberId = String(formData.get("memberId") ?? "").trim();
  const status = String(formData.get("status") ?? "").trim();
  if (!memberId || !["active","suspended","archived"].includes(status)) {
    throw new Error("Invalid member status request.");
  }

  await setPortalMemberStatus(
    memberId,
    status as "active" | "suspended" | "archived",
    actorFrom(identity)
  );

  revalidatePath("/admin/members");
  revalidatePath("/portal/members");
}
