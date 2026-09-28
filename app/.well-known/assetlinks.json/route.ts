import { env } from "cloudflare:workers";

export const dynamic = "force-dynamic";

export async function GET() {
  const packageName = String(env.PORTAL_ANDROID_PACKAGE || "com.ytucore.portal");
  const fingerprints = String(env.PORTAL_ANDROID_SHA256_CERT_FINGERPRINTS || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);

  const body = fingerprints.length
    ? [{
        relation: ["delegate_permission/common.handle_all_urls"],
        target: {
          namespace: "android_app",
          package_name: packageName,
          sha256_cert_fingerprints: fingerprints,
        },
      }]
    : [];

  return Response.json(body, {
    headers: {
      "Cache-Control": "public, max-age=300",
      "Content-Type": "application/json; charset=utf-8",
    },
  });
}
