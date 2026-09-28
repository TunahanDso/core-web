import PortalAuthForm from "@/components/portal/PortalAuthForm";
import { getPortalMember } from "@/lib/portal/auth";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function PortalActivatePage() {
  const member = await getPortalMember();
  if (member) redirect("/portal");

  return (
    <main className="portalAuthPage">
      <section className="portalAuthBrand portalAuthBrandActivation">
        <a href="/tr">YTÜ CORE</a>
        <div>
          <span>INVITATION ONLY</span>
          <h1>Your CORE identity<br />starts here.</h1>
          <p>
            Membership records are created internally. Enter the one-time code
            issued by a CORE administrator and set your portal password.
          </p>
        </div>
        <small>Student account · revocable sessions · future trusted-device ready</small>
      </section>

      <section className="portalAuthPanel">
        <div className="portalAuthCard">
          <span className="portalAuthKicker">ACCOUNT ACTIVATION</span>
          <h2>Claim your invitation.</h2>
          <p>Invitation codes expire after 72 hours and can only be used once.</p>
          <PortalAuthForm mode="activate" />
          <div className="portalAuthFoot">
            <span>Already activated?</span>
            <a href="/portal/login">Sign in →</a>
          </div>
        </div>
      </section>
    </main>
  );
}
