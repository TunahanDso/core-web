"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireAdminIdentity } from "@/lib/cms/auth";
import { applyPortalFoundation } from "@/lib/portal/bootstrap";
import {
  createPortalInvite,
  recordPortalInviteDelivery,
  reissuePortalInvite,
  setPortalMemberStatus,
} from "@/lib/portal/db";
import type { PortalRole } from "@/lib/portal/auth";
import { sendPortalInvitationEmail, sendPortalTestEmail } from "@/lib/portal/mail";

function actorFrom(identity: Awaited<ReturnType<typeof requireAdminIdentity>>) {
  if (identity.email) return identity.email;
  return typeof identity.payload.sub === "string" ? identity.payload.sub : "cloudflare-access";
}

export type MailTestAdminState = {
  error?: string;
  status?: "sent" | "failed" | "not_configured";
  provider?: string;
  messageId?: string;
  recipient?: string;
};

export type InviteAdminState = {
  error?: string;
  email?: string;
  expiresAt?: string;
  deliveryStatus?: "sent" | "failed" | "not_configured";
  deliveryProvider?: string;
  deliveryError?: string;
};


export async function sendPortalMailTestAdminAction(
  _state: MailTestAdminState,
  formData: FormData
): Promise<MailTestAdminState> {
  try {
    const identity = await requireAdminIdentity();
    const recipient = String(formData.get("recipient") ?? "").trim().toLowerCase();
    if (!recipient || !recipient.includes("@") || recipient.length > 254) {
      return { error: "Geçerli bir test e-posta adresi gir." };
    }

    const delivery = await sendPortalTestEmail({
      to: recipient,
      requestedBy: actorFrom(identity),
    });

    return {
      status: delivery.status,
      provider: delivery.provider,
      messageId: delivery.messageId,
      recipient,
      error: delivery.status === "sent" ? undefined : delivery.error,
    };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Test e-postası gönderilemedi.",
    };
  }
}

export async function initializePortalAction() {
  const identity = await requireAdminIdentity();
  try {
    await applyPortalFoundation(actorFrom(identity));
  } catch (error) {
    const message = error instanceof Error ? error.message : "Portal kurulumu başarısız.";
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

    if (!email || !fullName) return { error: "Öğrenci adı ve e-posta gerekli." };

    const result = await createPortalInvite({
      email,
      fullName,
      role,
      teams,
      createdBy: actorFrom(identity),
    });

    const delivery = await sendPortalInvitationEmail({
      to: result.email,
      fullName: result.fullName,
      code: result.code,
      expiresAt: result.expiresAt,
    });

    await recordPortalInviteDelivery({
      inviteId: result.inviteId,
      recipient: result.email,
      provider: delivery.provider,
      status: delivery.status,
      messageId: delivery.messageId,
      error: delivery.error,
    });

    revalidatePath("/admin/members");
    return {
      email: result.email,
      expiresAt: result.expiresAt,
      deliveryStatus: delivery.status,
      deliveryProvider: delivery.provider,
      deliveryError: delivery.error,
    };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Davet oluşturulamadı." };
  }
}

export async function setPortalMemberStatusAdminAction(formData: FormData) {
  const identity = await requireAdminIdentity();
  const memberId = String(formData.get("memberId") ?? "").trim();
  const status = String(formData.get("status") ?? "").trim();
  if (!memberId || !["active","suspended","archived"].includes(status)) {
    throw new Error("Geçersiz üye durumu isteği.");
  }

  await setPortalMemberStatus(
    memberId,
    status as "active" | "suspended" | "archived",
    actorFrom(identity)
  );

  revalidatePath("/admin/members");
  revalidatePath("/portal/members");
}


export async function reissuePortalInviteAdminAction(
  _state: InviteAdminState,
  formData: FormData
): Promise<InviteAdminState> {
  try {
    const identity = await requireAdminIdentity();
    const memberId = String(formData.get("memberId") ?? "").trim();
    if (!memberId) return { error: "Üye kimliği gerekli." };

    const result = await reissuePortalInvite(memberId, actorFrom(identity));
    const delivery = await sendPortalInvitationEmail({
      to: result.email,
      fullName: result.fullName,
      code: result.code,
      expiresAt: result.expiresAt,
    });

    await recordPortalInviteDelivery({
      inviteId: result.inviteId,
      recipient: result.email,
      provider: delivery.provider,
      status: delivery.status,
      messageId: delivery.messageId,
      error: delivery.error,
    });

    revalidatePath("/admin/members");
    return {
      email: result.email,
      expiresAt: result.expiresAt,
      deliveryStatus: delivery.status,
      deliveryProvider: delivery.provider,
      deliveryError: delivery.error,
    };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Davet yeniden oluşturulamadı." };
  }
}
