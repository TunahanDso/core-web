import { PortalPageHeader } from "@/components/portal/PortalPage";
import { requirePortalMember } from "@/lib/portal/auth";
import { env } from "cloudflare:workers";

export const dynamic = "force-dynamic";

export default async function PortalSecurityPage() {
  const member = await requirePortalMember();
  const telemetryConfigured = typeof env.PORTAL_TELEMETRY_INGEST_KEY === "string" && Boolean(env.PORTAL_TELEMETRY_INGEST_KEY);

  return (
    <>
      <PortalPageHeader code="SEC / IDENTITY" title="Security & Devices" lead="Account sessions today; trusted devices, passkeys and a mobile approval companion can be layered on this identity model later." />
      <section className="portalSecurityGrid">
        <article><span>ACCOUNT</span><h3>{member.email}</h3><p>Role: {member.role.toUpperCase()}</p><b>ACTIVE SESSION</b></article>
        <article><span>SESSION MODEL</span><h3>Server-side revocable token</h3><p>Browser holds a secure HttpOnly cookie; D1 stores only the token hash.</p><b>7 DAY MAX</b></article>
        <article><span>INVITATION</span><h3>One-time activation</h3><p>Student accounts are created internally and activated with an expiring code.</p><b>72 HOUR CODE</b></article>
        <article><span>FUTURE MOBILE</span><h3>Trusted-device ready</h3><p>The schema already has a device trust registry for a later CORE security companion.</p><b>FOUNDATION READY</b></article>
      </section>
      <section className="portalOpsBoundary">
        <span>TELEMETRY INGEST</span>
        <b>{telemetryConfigured ? "SECRET CONFIGURED" : "ENV SECRET REQUIRED"}</b>
        <strong>OBSERVABILITY ONLY · NO COMMAND AUTHORITY</strong>
      </section>
    </>
  );
}
