import { PortalPageHeader } from "@/components/portal/PortalPage";
import { requirePortalMember } from "@/lib/portal/auth";
import { env } from "cloudflare:workers";
import { portalRoleLabel } from "@/lib/portal/labels";

export const dynamic = "force-dynamic";

export default async function PortalSecurityPage() {
  const member = await requirePortalMember();
  const telemetryConfigured = typeof env.PORTAL_TELEMETRY_INGEST_KEY === "string" && Boolean(env.PORTAL_TELEMETRY_INGEST_KEY);

  return (
    <>
      <PortalPageHeader code="SEC / KİMLİK" title="Güvenlik & Cihazlar" lead="Bugün hesap oturumları; ileride güvenilir cihazlar, passkey ve mobil onay uygulaması bu kimlik modeline eklenebilir." />
      <section className="portalSecurityGrid">
        <article><span>HESAP</span><h3>{member.email}</h3><p>Rol: {portalRoleLabel(member.role)}</p><b>AKTİF OTURUM</b></article>
        <article><span>OTURUM MODELİ</span><h3>Sunucu taraflı iptal edilebilir token</h3><p>Tarayıcı güvenli HttpOnly cookie tutar; D1 yalnızca token hash'ini saklar.</p><b>EN FAZLA 7 GÜN</b></article>
        <article><span>DAVET</span><h3>Tek kullanımlık aktivasyon</h3><p>Öğrenci hesapları içeriden oluşturulur ve süreli kodla aktifleştirilir.</p><b>72 SAATLİK KOD</b></article>
        <article><span>GELECEK MOBİL</span><h3>Güvenilir cihaz altyapısı hazır</h3><p>Şema ilerideki CORE güvenlik uygulaması için cihaz güven kaydını şimdiden içeriyor.</p><b>ALTYAPI HAZIR</b></article>
      </section>
      <section className="portalOpsBoundary">
        <span>TELEMETRİ GİRİŞİ</span>
        <b>{telemetryConfigured ? "SECRET TANIMLI" : "ENV SECRET GEREKLİ"}</b>
        <strong>YALNIZCA GÖZLEMLEME · KOMUT OTORİTESİ YOK</strong>
      </section>
    </>
  );
}
