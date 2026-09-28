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
          <span>YALNIZCA DAVETLE</span>
          <h1>CORE kimliğin<br />burada başlıyor.</h1>
          <p>
            Membership records are created internally. Enter the one-time code
            issued by a CORE administrator and set your portal password.
          </p>
        </div>
        <small>Öğrenci hesabı · iptal edilebilir oturum · güvenilir cihaz altyapısına hazır</small>
      </section>

      <section className="portalAuthPanel">
        <div className="portalAuthCard">
          <span className="portalAuthKicker">HESAP AKTİVASYONU</span>
          <h2>Davetini aktifleştir.</h2>
          <p>Davet kodları 72 saat sonra geçersiz olur ve yalnızca bir kez kullanılabilir.</p>
          <PortalAuthForm mode="activate" />
          <div className="portalAuthFoot">
            <span>Hesabını zaten aktifleştirdin mi?</span>
            <a href="/portal/login">Giriş yap →</a>
          </div>
        </div>
      </section>
    </main>
  );
}
