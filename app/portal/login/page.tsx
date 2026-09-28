import PortalAuthForm from "@/components/portal/PortalAuthForm";
import { getPortalMember } from "@/lib/portal/auth";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function PortalLoginPage() {
  const member = await getPortalMember();
  if (member) redirect("/portal");

  return (
    <main className="portalAuthPage">
      <section className="portalAuthBrand">
        <a href="/tr">YTÜ CORE</a>
        <div>
          <span>INTERNAL NETWORK</span>
          <h1>Build together.<br />Remember everything.</h1>
          <p>
            CORE Portal is the private workspace for student engineering:
            projects, knowledge, hardware, inventory, communication and field
            operations in one place.
          </p>
        </div>
        <small>İnsan İçin Teknoloji.</small>
      </section>

      <section className="portalAuthPanel">
        <div className="portalAuthCard">
          <span className="portalAuthKicker">MEMBER SIGN IN</span>
          <h2>Welcome back.</h2>
          <p>Use the Yıldız student account activated by your CORE invitation.</p>
          <PortalAuthForm mode="login" />
          <div className="portalAuthFoot">
            <span>First time here?</span>
            <a href="/portal/activate">Activate invitation →</a>
          </div>
        </div>
      </section>
    </main>
  );
}
