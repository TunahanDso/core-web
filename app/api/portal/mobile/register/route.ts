import { getPortalMember } from "@/lib/portal/auth";
import {
  registerPortalMobileDevice,
  type MobilePlatform,
} from "@/lib/portal/mobile";

export const dynamic = "force-dynamic";

const PLATFORMS = new Set<MobilePlatform>(["android","ios","pwa","web","unknown"]);

export async function POST(request: Request) {
  const member = await getPortalMember();
  if (!member) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }
  const payload = await request.json().catch(() => ({})) as Record<string, unknown>;

  const installId = String(payload.installId || "").trim();
  if (!installId || installId.length > 160) {
    return Response.json({ error: "invalid_install_id" }, { status: 400 });
  }

  const platformRaw = String(payload.platform || "unknown").toLowerCase() as MobilePlatform;
  const platform = PLATFORMS.has(platformRaw) ? platformRaw : "unknown";

  try {
    const device = await registerPortalMobileDevice({
      memberId: member.id,
      installId,
      platform,
      appVersion: String(payload.appVersion || ""),
      deviceLabel: String(payload.deviceLabel || ""),
      lastPath: String(payload.lastPath || "/portal"),
      pushProvider: payload.pushProvider ? String(payload.pushProvider) : null,
      pushToken: payload.pushToken ? String(payload.pushToken) : null,
    });
    return Response.json({ registered: true, device }, {
      headers: { "Cache-Control": "no-store, private" },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "mobile_registry_unavailable";
    const schemaMissing = /no such table/i.test(message);
    return Response.json(
      { registered: false, schema: schemaMissing ? "upgrade_required" : "error" },
      { status: schemaMissing ? 503 : 500, headers: { "Cache-Control": "no-store, private" } }
    );
  }
}
