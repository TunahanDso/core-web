import { applyShowcaseSeedAction } from "@/app/admin/actions";
import { initializePortalAction } from "@/app/admin/portal-actions";
import { getAdminIdentity } from "@/lib/cms/auth";
import { getCmsStats } from "@/lib/cms/db";
import { portalBootstrapStatus } from "@/lib/portal/bootstrap";

export const dynamic = "force-dynamic";

const publicModules = [
  ["Projeler", "Portföy, entegrasyonlar, sahiplik ve ilerleme.", "/admin/projects", true, "PJ"],
  ["Yarışmalar", "Saha hedefleri, tarihler, konumlar ve plan durumu.", "/admin/competitions", true, "CP"],
  ["İçerik", "TR/EN vitrin sayfaları, ana metinler ve SEO.", "/admin/content", true, "CT"],
  ["Yayınlar", "Araştırma raporları, makaleler ve teknik yayınlar.", "/admin/publications", true, "PB"],
  ["Medya", "R2 üzerindeki görseller, proje medyası ve public dosyalar.", "/admin/media", true, "MD"],
  ["Takım Vitrini", "Alan takımları, servisler ve public profiller.", "/admin/team", false, "TM"],
  ["Ayarlar", "Navigasyon, ana sayfa, metadata ve site kontrolleri.", "/admin/settings", true, "ST"],
] as const;

const portalModules = [
  ["Üyeler & Erişim", "Davet kodları, roller ve üye yaşam döngüsü.", "/admin/members", true, "ID"],
  ["Portalı Aç", "Öğrenci mühendislik çalışma alanına geç.", "/portal", true, "↗"],
  ["Görevler", "Portal içindeki proje ve iş kuyruğu.", "/portal/tasks", true, "PM"],
  ["Bilgi Merkezi", "Kütüphane, dokümanlar ve arşiv.", "/portal/library", true, "KB"],
  ["Stok & Envanter", "Bileşenler, araçlar ve düşük stok durumu.", "/portal/inventory", true, "IV"],
  ["Canlı Araç", "Salt okunur telemetri ve operasyon farkındalığı.", "/portal/ops", true, "OP"],
  ["Project Map", "Takım, proje, araç ve repo topology görünümü.", "/portal/project-map", true, "MAP"],
  ["Ağır Kontrol", "Internal proje, araç, takım üyeliği ve capability yönetimi.", "/portal/control", true, "CTL"],
] as const;

export default async function Admin({
  searchParams,
}: {
  searchParams?: Promise<{
    seed?: "applied" | "failed";
    seedError?: string;
    portal?: "ready" | "failed";
    portalError?: string;
  }>;
}) {
  const [stats, identity, portal, query] = await Promise.all([
    getCmsStats(),
    getAdminIdentity(),
    portalBootstrapStatus(),
    searchParams ?? Promise.resolve<{
      seed?: "applied" | "failed";
      seedError?: string;
      portal?: "ready" | "failed";
      portalError?: string;
    }>({}),
  ]);

  const databaseOnline = stats.connection === "online";
  const writeEnabled = databaseOnline && identity.authenticated;

  return (
    <main className="admin adminLight adminControlCenter">
      <div className="adminTopline">
        <div>
          <p className="eyebrow">YTÜ CORE · KONTROL MERKEZİ</p>
          <span className="adminSubtle">Vitrin sitesi + iç öğrenci operasyonları</span>
        </div>
        <div className="adminQuickActions">
          <a href="/tr">VİTRİN ↗</a>
          <a href="/portal">PORTALI AÇ →</a>
          <span className={"cmsHealth " + (databaseOnline ? "online" : "offline")}><i />D1 {databaseOnline ? "ÇEVRİMİÇİ" : stats.connection.toUpperCase()}</span>
        </div>
      </div>

      <section className="adminWelcome">
        <div>
          <span>KONTROL / 01</span>
          <h1>CORE'un yürüttüğü her şey,<br />tek ve berrak bir yerde.</h1>
          <p>
            Vitrin sitesini ve özel öğrenci mühendislik çalışma alanını, araç komut
            otoritesiyle birbirine karıştırmadan yönet.
          </p>
        </div>
        <div className="adminIdentityCard">
          <span>DOĞRULANMIŞ YÖNETİCİ</span>
          <b>{identity.authenticated ? identity.email || "Cloudflare Access" : "Access doğrulanmadı"}</b>
          <small>{writeEnabled ? "YAZMA YETKİSİ AÇIK" : "SALT OKUNUR"}</small>
        </div>
      </section>

      <section className="adminModernStats">
        <article><span>VİTRİN İÇERİĞİ</span><b>{stats.contentCount}</b><small>{stats.pageCount} sayfa</small></article>
        <article><span>PROJELER</span><b>{stats.projectCount}</b><small>vitrin kayıtları</small></article>
        <article><span>YARIŞMALAR</span><b>{stats.competitionCount}</b><small>saha hedefleri</small></article>
        <article><span>ÜYELER</span><b>{portal.memberCount}</b><small>{portal.ready ? "portal kayıtları" : "portal kurulmadı"}</small></article>
        <article><span>AÇIK GÖREVLER</span><b>{portal.taskCount}</b><small>iç iş kalemleri</small></article>
        <article><span>BİLGİ</span><b>{portal.resourceCount}</b><small>iç kaynaklar</small></article>
        <article><span>MEDYA</span><b>{stats.mediaCount}</b><small>R2 kayıtları</small></article>
        <article><span>DENETİM</span><b>{stats.auditCount}</b><small>public CMS olayları</small></article>
      </section>

      <section className="adminHealthBar">
        <span><b>DB</b> core-web-cms · {databaseOnline ? "bağlı" : "kullanılamıyor"}</span>
        <span><b>MEDYA</b> {stats.mediaBinding ? "core-web-media · bağlı" : "kullanılamıyor"}</span>
        <span><b>ACCESS</b> {identity.authenticated ? "JWT DOĞRULANDI" : "DOĞRULANMADI"}</span>
        <span><b>PORTAL</b> {portal.ready ? "CONTROL PLANE V6 HAZIR" : (portal.tableCount ?? 0) > 0 ? "V6 CONTROL PLANE YÜKSELTME GEREKLİ" : "KURULUM GEREKLİ"}</span>
        <span><b>KOMUT KATMANI</b> İZOLE</span>
      </section>

      {query.seed === "applied" ? <div className="cmsSuccess"><b>Vitrin içeriği eşitlendi.</b><span>D1 ve denetim kaydı güncellendi.</span></div> : null}
      {query.seed === "failed" ? <div className="cmsWarning"><b>Vitrin içerik eşitlemesi başarısız.</b><span>{query.seedError || "D1 işlemi geri alındı."}</span></div> : null}
      {query.portal === "ready" ? <div className="cmsSuccess"><b>CORE Portal altyapısı kuruldu.</b><span>Üye erişimi ve işbirliği tabloları hazır.</span></div> : null}
      {query.portal === "failed" ? <div className="cmsWarning"><b>Portal kurulumu başarısız.</b><span>{query.portalError || "D1 çalışma günlüklerini kontrol et."}</span></div> : null}

      {writeEnabled && !portal.ready ? (
        <section className="adminSetupPanel">
          <div>
            <span>{(portal.tableCount ?? 0) > 0 ? "V6 CONTROL PLANE YÜKSELTMESİ" : "TEK SEFERLİK ALTYAPI"}</span>
            <h2>{(portal.tableCount ?? 0) > 0 ? "CORE Portalı governance + project map + ağır kontrol katmanına yükselt" : "İç CORE Portalını Kur"}</h2>
            <p>
              {(portal.tableCount ?? 0) > 0
                ? "Mevcut üyeleri, oturumları, Vault verisini ve mobil cihaz kayıtlarını silmeden takım üyelikleri, role/capability profilleri, internal proje registry, project map ve araç profillerini ekler."
                : "Davet tabanlı üye erişimi, oturumlar, görevler, bilgi merkezi, repo kayıtları, envanter, sohbet, iç yazışma, takvim, bildirimler, araç telemetrisi ve güvenlik cihazı altyapısını oluşturur."}
            </p>
          </div>
          <form action={initializePortalAction}>
            <button className="adminModernPrimary" type="submit">{(portal.tableCount ?? 0) > 0 ? "V6'YA YÜKSELT →" : "PORTALI KUR →"}</button>
          </form>
        </section>
      ) : null}

      {writeEnabled && (stats.contentCount === 0 || stats.pageCount < 7) ? (
        <section className="adminSetupPanel secondary">
          <div>
            <span>VİTRİN İÇERİĞİ</span>
            <h2>{stats.contentCount === 0 ? "Vitrin içeriğini yükle" : "Vitrin sayfalarını eşitle"}</h2>
            <p>Proje, yarışma ve çok dilli sayfa kayıtlarını güvenli biçimde eşitler.</p>
          </div>
          <form action={applyShowcaseSeedAction}>
            <button className="adminModernSecondary" type="submit">{stats.contentCount === 0 ? "VİTRİNİ YÜKLE →" : "SAYFALARI EŞİTLE →"}</button>
          </form>
        </section>
      ) : null}

      <section className="adminModuleSection">
        <div className="adminSectionTitle"><span>VİTRİN SİTESİ</span><h2>Dışarıdan görünen yüz.</h2><p>ytucore.com için içerik ve vitrin yönetimi.</p></div>
        <div className="adminModernGrid">
          {publicModules.map(([name, description, href, enabled, code]) => (
            <a className={"adminModernCard " + (enabled ? "" : "future")} href={enabled ? href : "#"} key={name}>
              <span>{code}</span><h3>{name}</h3><p>{description}</p><small>{enabled ? "AÇ →" : "ALTYAPI SONRA"}</small>
            </a>
          ))}
        </div>
      </section>

      <section className="adminModuleSection portalAdminSection">
        <div className="adminSectionTitle"><span>İÇ PORTAL</span><h2>Takımın çalıştığı yer.</h2><p>Kimlik, mühendislik hafızası, işbirliği, stok ve saha görünürlüğü.</p></div>
        <div className="adminModernGrid">
          {portalModules.map(([name, description, href, enabled, code]) => (
            <a className={"adminModernCard " + (!portal.ready && name !== "Portalı Aç" ? "future" : "")} href={portal.ready || name === "Portalı Aç" ? href : "#"} key={name}>
              <span>{code}</span><h3>{name}</h3><p>{description}</p><small>{portal.ready || name === "Portalı Aç" ? "AÇ →" : "ÖNCE KURULUM"}</small>
            </a>
          ))}
        </div>
      </section>

      <section className="adminBoundary">
        <span>GÜVENLİK MİMARİSİ</span>
        <div><b>PUBLIC CMS</b><i>≠</i><b>ÜYE PORTALI</b><i>≠</i><b>ARAÇ KOMUT OTORİTESİ</b></div>
        <p>Telemetri gözlem için portala akabilir. Komut ve görev otoritesi ayrı bir güvenlik sınırında kalır.</p>
      </section>
    </main>
  );
}
