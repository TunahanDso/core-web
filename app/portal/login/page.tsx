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
          <span>İÇ AĞ</span>
          <h1>Birlikte üret.<br />Hiçbir bilgiyi kaybetme.</h1>
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
          <span className="portalAuthKicker">ÜYE GİRİŞİ</span>
          <h2>Tekrar hoş geldin.</h2>
          <p>CORE davetinle aktifleştirdiğin Yıldız öğrenci hesabını kullan.</p>
          <PortalAuthForm mode="login" />
          <div className="portalAuthFoot">
            <span>İlk kez mi geliyorsun?</span>
            <a href="/portal/activate">Daveti aktifleştir →</a>
          </div>
        </div>
      </section>
    </main>
  );
}
