import { env } from "cloudflare:workers";

export const dynamic = "force-dynamic";

export async function GET() {
  const teamId = String(env.PORTAL_IOS_TEAM_ID || "").trim();
  const bundleId = String(env.PORTAL_IOS_BUNDLE_ID || "com.ytucore.portal").trim();

  const details = teamId
    ? [{
        appIDs: [teamId + "." + bundleId],
        components: [
          { "/": "/portal/*", comment: "Open authenticated CORE portal routes in the native app." },
          { "/": "/portal", comment: "Open the CORE portal home in the native app." },
        ],
      }]
    : [];

  return Response.json({
    applinks: {
      apps: [],
      details,
    },
    webcredentials: {
      apps: teamId ? [teamId + "." + bundleId] : [],
    },
  }, {
    headers: {
      "Cache-Control": "public, max-age=300",
      "Content-Type": "application/json; charset=utf-8",
    },
  });
}
