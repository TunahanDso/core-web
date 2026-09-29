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
        <article><span>GÜVEN MODELİ</span><h3>Device registry + trust state</h3><p>APNs / FCM token registry aktif. Trusted işareti cihaz tercihidir; parola, oturum veya rol kontrolünü asla atlamaz.</p><b>PUSH + TRUST + REVOKE</b></article>
      </section>

      <section className="portalPanel portalDesktopDownloadPanel">
        <div className="portalPanelHead">
          <span>CORE DESKTOP / WORKBENCH</span>
          <small>STABLE LATEST CHANNEL</small>
        </div>
        <div className="portalDesktopDownloadGrid">
          <article>
            <div>
              <span className="portalDesktopPlatform">WINDOWS · X64</span>
              <h3>CORE Desktop Workbench</h3>
              <p>Portalın tam masaüstü istemcisi. Vault, repo, mühendislik araçları ve ilerleyen native atölye özellikleri aynı CORE hesabıyla çalışır.</p>
            </div>
            <a className="portalPrimaryButton portalDesktopDownloadButton" href="/api/portal/desktop/download/windows">
              WINDOWS UYGULAMASINI İNDİR ↓
            </a>
          </article>
          <aside>
            <span>GÜNCELLEME MODELİ</span>
            <b>DAİMA SON BAŞARILI BUILD</b>
            <p>Bu portal bağlantısı sabittir. Her başarılı <code>main</code> masaüstü build'inde <code>desktop-latest</code> paketi aynı dosya adıyla yenilenir; başarısız build eski çalışan sürümün üzerine yazamaz.</p>
            <small>Şimdilik imzasız developer preview · Windows SmartScreen uyarısı gösterebilir.</small>
          </aside>
        </div>
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
                    v{String(device.app_version || "—")} · {device.push_provider ? "push " + String(device.push_provider).toUpperCase() : "push yok"} · son rota {String(device.last_path || "/portal")} · {String(device.last_seen_at || "")}
                  </small>
                </div>
                <em className={"state " + String(device.trusted_state || "pending")}>{String(device.trusted_state || "pending").toUpperCase()}</em>
                {String(device.trusted_state) !== "revoked" ? (
                  <div className="portalDeviceActions">
                    <form action={setPortalMobileDeviceTrustAction}>
                      <input type="hidden" name="deviceId" value={String(device.id)} />
                      <input type="hidden" name="state" value={String(device.trusted_state) === "trusted" ? "pending" : "trusted"} />
                      <button className={String(device.trusted_state) === "trusted" ? "" : "trust"} type="submit">{String(device.trusted_state) === "trusted" ? "PENDING" : "TRUST"}</button>
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
