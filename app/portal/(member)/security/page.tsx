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
        <article><span>MOBİL UYGULAMA</span><h3>CORE · v{mobileConfig.appVersion}</h3><p>Portal tarayıcıda kalır; uygulama kendiliğinden açılmaz. Yalnızca cihazında CORE kuruluysa aşağıdaki bağlantıyı kullan.</p><a className="portalPrimaryButton" href={mobileConfig.appScheme+"://portal/open?path=%2Fportal"}>Yüklü uygulamayı aç</a><small>Uygulama açılamazsa tarayıcıda kullanmaya devam edebilirsin.</small></article>
        <article><span>GÜVEN MODELİ</span><h3>Device registry + trust state</h3><p>APNs / FCM token registry aktif. Trusted işareti cihaz tercihidir; parola, oturum veya rol kontrolünü asla atlamaz.</p><b>PUSH + TRUST + REVOKE</b></article>
      </section>

      <section className="portalPanel portalDesktopDownloadPanel">
        <div className="portalPanelHead">
          <span>CORE DESKTOP / WINDOWS TRUST</span>
          <small>INTERNAL SIGNED CHANNEL</small>
        </div>
        <div className="portalDesktopDownloadGrid">
          <article>
            <div>
              <span className="portalDesktopPlatform">1 · CORE TRUST</span>
              <h3>YTÜ CORE Internal Root CA</h3>
              <p>
                Windows bu sertifikayı yalnız mevcut kullanıcı hesabında güvenilir kök olarak tanır.
                Private imza anahtarı bu dosyada veya portalda bulunmaz.
              </p>
            </div>
            <div className="portalDeviceActions">
              <a className="portalPrimaryButton" href="/desktop/trust/YTU-CORE-Internal-Root-CA.cer" download>
                ROOT CA İNDİR ↓
              </a>
              <a className="portalPrimaryButton" href="/desktop/trust/install-core-trust.ps1" download>
                OTOMATİK KURULUM PS1 ↓
              </a>
            </div>
            <small>ROOT SHA-256 · 72:26:F0:5A:90:67:F3:19:05:27:7A:93:21:5C:2B:CE:62:3E:2D:EF:B3:82:E9:8C:BE:65:A7:4E:69:A9:A2:95</small>
          </article>

          <article>
            <div>
              <span className="portalDesktopPlatform">2 · WINDOWS · X64</span>
              <h3>CORE Desktop Workbench</h3>
              <p>
                Internal CORE sertifikasıyla Authenticode imzalanmış son başarılı masaüstü build'i.
                Sertifika kurulmadan Windows bu yayıncıyı genel CA'lar gibi tanımaz.
              </p>
            </div>
            <a className="portalPrimaryButton portalDesktopDownloadButton" href="/api/portal/desktop/download/windows">
              WINDOWS UYGULAMASINI İNDİR ↓
            </a>
          </article>

          <aside>
            <span>KURULUM SIRASI</span>
            <b>ÖNCE TRUST · SONRA APP</b>
            <p>
              En kolay yol: PowerShell dosyasını indir, sağ tıkla PowerShell ile çalıştır;
              script CORE Root CA ve Desktop signer fingerprint'lerini doğrulayıp yalnız mevcut
              Windows kullanıcısının <code>Root</code> ve <code>TrustedPublisher</code> depolarına ekler.
              Ardından uygulamayı indir.
            </p>
            <small>
              Bu internal trust modeli yalnız CORE tarafından yönetilen ekip cihazları içindir;
              Microsoft SmartScreen public reputation yerine ekip içi güven zinciri sağlar.
            </small>
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
