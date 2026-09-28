import { promoteLegacyPortalSessionCookie } from "@/lib/portal/auth";

export const dynamic = "force-dynamic";

export async function POST() {
  const promoted = await promoteLegacyPortalSessionCookie().catch(() => false);
  return Response.json(
    { promoted },
    { headers: { "Cache-Control": "no-store, private" } }
  );
}
