"use server";

import { revalidatePath } from "next/cache";
import { requirePortalMember } from "@/lib/portal/auth";
import { setPortalMobileDeviceTrust } from "@/lib/portal/mobile";

export async function revokePortalMobileDeviceAction(formData: FormData) {
  const member = await requirePortalMember();
  const deviceId = String(formData.get("deviceId") || "").trim();
  if (!deviceId) throw new Error("Mobil cihaz kimliği eksik.");

  await setPortalMobileDeviceTrust({
    memberId: member.id,
    deviceId,
    trustedState: "revoked",
  });

  revalidatePath("/portal/security");
}
