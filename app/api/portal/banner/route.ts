import { getPortalMember } from "@/lib/portal/auth";
import { getSiteSetting } from "@/lib/cms/extensions";

export const dynamic = "force-dynamic";

export async function GET() {
  const member = await getPortalMember();
  if (!member) return new Response("Unauthorized", { status: 401 });

  const banner = await getSiteSetting("portal_banner");
  return Response.json(
    banner && typeof banner === "object" ? banner : {},
    { headers: { "Cache-Control": "private, no-store, max-age=0" } }
  );
}
