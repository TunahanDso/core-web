import { PortalPageHeader } from "@/components/portal/PortalPage";
import { requirePortalMember } from "@/lib/portal/auth";
import { env } from "cloudflare:workers";
import { portalRoleLabel } from "@/lib/portal/labels";
import { listPortalMobileDevices, portalMobilePublicConfig } from "@/lib/portal/mobile";
import { revokePortalMobileDeviceAction, setPortalMobileDeviceTrustAction } from "@/app/portal/mobile-actions";

export const dynamic = "force-dynamic";

export default async function PortalSecurityPage() {
  const member = await requirePortalMember();
  const [devices, mobileConfig] = await Promise.all([
    listPortalMobileDevices(member.id),
    Promise.resolve(portalMobilePublicConfig()),
  ]);
  const telemetryConfigured = typeof env.PORTAL_TELEMETRY_INGEST_KEY === "string" && Boolean(env.PORTAL_TELEMETRY_INGEST_KEY);

  return (
    <>
      <PortalPageHeader
        code="SEC / KİMLİK"
        title="Güvenlik & Cihazlar"
        lead="Portal oturumları, native Android/iOS kurulumları ve ileride biyometrik güven zinciri aynı hesap sınırında izlenir."
      />

      <section className="portalSecurityGrid">
        <article><span>HESAP</span><h3>{member.email}</h3><p>Rol: {portalRoleLabel(member.role)}</p><b>AKTİF OTURUM</b></article>
        <article><span>OTURUM MODELİ</span><h3>Sunucu taraflı iptal edilebilir token</h3><p>HttpOnly cookie + D1 token hash; portal API'leri aynı oturum sınırını kullanır.</p><b>EN FAZLA 7 GÜN</b></article>
        <article><span>MOBİL APP</span><h3>Capacitor shell · v{mobileConfig.appVersion}</h3><p>{mobileConfig.androidPackage} / {mobileConfig.iosBundleId}</p><b>{mobileConfig.handoffEnabled ? "HANDOFF AÇIK" : "HANDOFF KONTROLLÜ"}</b></article>
        <article><span>GÜVEN MODELİ</span><h3>Device registry aktif</h3><p>Güvenilen cihaz etiketi parola veya oturum kontrolünü atlamaz; push, hızlı erişim ve gelecekteki biyometrik politika için cihaz tercihi taşır.</p><b>TRUST + REVOKE</b></article>
      </section>

      <section className="portalPanel portalMobileDevicePanel">
        <div className="portalPanelHead">
          <span>MOBİL KURULUMLAR</span>
          <small>{devices.length} DEVICE RECORD</small>
        </div>
        {devices.length ? (
          <div className="portalMobileDeviceList">
            {devices.map((device) => (
              <article key={String(device.id)}>
                <span className="portalMobileDevicePlatform">{String(device.platform || "unknown").toUpperCase()}</span>
                <div>
                  <b>{String(device.device_label || "CORE mobile")}</b>
                  <small>
                    v{String(device.app_version || "—")} · son rota {String(device.last_path || "/portal")} · {String(device.last_seen_at || "")}
                  </small>
                </div>
                <em className={"state " + String(device.trusted_state || "pending")}>{String(device.trusted_state || "pending").toUpperCase()}</em>
                {String(device.trusted_state) !== "revoked" ? (
                  <div className="portalMobileDeviceActions">
                    <form action={setPortalMobileDeviceTrustAction}>
                      <input type="hidden" name="deviceId" value={String(device.id)} />
                      <input type="hidden" name="state" value={String(device.trusted_state) === "trusted" ? "pending" : "trusted"} />
                      <button type="submit" className="trust">
                        {String(device.trusted_state) === "trusted" ? "GÜVENİ KALDIR" : "GÜVEN"}
                      </button>
                    </form>
                    <form action={revokePortalMobileDeviceAction}>
                      <input type="hidden" name="deviceId" value={String(device.id)} />
                      <button type="submit">REVOKE</button>
                    </form>
                  </div>
                ) : <small>İPTAL EDİLDİ</small>}
              </article>
            ))}
          </div>
        ) : (
          <div className="portalEmpty">
            <span>NATIVE DEVICE YOK</span>
            <h3>Henüz kayıtlı mobil kurulum yok.</h3>
            <p>CORE uygulaması veya standalone PWA bu hesapla açıldığında cihaz kaydı burada oluşur.</p>
          </div>
        )}
      </section>

      <section className="portalOpsBoundary">
        <span>TELEMETRİ GİRİŞİ</span>
        <b>{telemetryConfigured ? "SECRET TANIMLI" : "ENV SECRET GEREKLİ"}</b>
        <strong>YALNIZCA GÖZLEMLEME · KOMUT OTORİTESİ YOK</strong>
      </section>
    </>
  );
}
