import { getPortalMember } from "@/lib/portal/auth";

export const dynamic = "force-dynamic";

const WINDOWS_INTERNAL =
  "https://github.com/TunahanDso/core-web/releases/download/desktop-internal/YTU-CORE-Desktop-Windows-x64.exe";

export async function GET() {
  const member = await getPortalMember();
  if (!member) {
    return new Response("Unauthorized", { status: 401 });
  }

  return new Response(null, {
    status: 307,
    headers: {
      Location: WINDOWS_INTERNAL,
      "Cache-Control": "private, no-store, max-age=0",
      "X-CORE-Desktop-Channel": "internal-signed",
    },
  });
}
