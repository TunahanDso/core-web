import { saveSiteSettingsAction } from "@/app/admin/extended-actions";
import { listSiteSettings } from "@/lib/cms/extensions";

export const dynamic = "force-dynamic";

function settingMap(rows: Record<string, unknown>[]) {
  const map = new Map<string, Record<string, unknown>>();
  for (const row of rows) {
    try { map.set(String(row.setting_key), JSON.parse(String(row.value_json || "{}"))); } catch { map.set(String(row.setting_key), {}); }
  }
  return map;
}

export default async function AdminAyarlarPage() {
  const rows = await listSiteSettings();
  const settings = settingMap(rows);
  const recruitment = settings.get("recruitment") || {};
  const banner = settings.get("portal_banner") || {};
  const ops = settings.get("public_ops") || {};
  const identity = settings.get("site_identity") || {};

  return (
    <main className="admin adminLight">
      <div className="adminTopline"><div><a className="adminBreadcrumb" href="/admin">CORE CONTROL / ADMIN</a><p className="eyebrow">SİTE + PORTAL AYARLARI</p></div><span className="cmsHealth online"><i />CANLI D1</span></div>
      <h1>Ayarlar</h1>
      <p>Vitrin ve iç portal için küçük ama etkili kontroller. Güvenlik secret'ları bu ekrandan hiçbir zaman düzenlenmez.</p>

      <form className="adminSettingsForm" action={saveSiteSettingsAction}>
        <section>
          <div><span>KİMLİK</span><h2>Slogan</h2></div>
          <label><span>TR</span><input name="sloganTr" defaultValue={String(identity.slogan_tr || "İnsan İçin Teknoloji.")} /></label>
          <label><span>EN</span><input name="sloganEn" defaultValue={String(identity.slogan_en || "Technology for People.")} /></label>
        </section>
        <section>
          <div><span>KATILIM</span><h2>Öğrenci alımı</h2></div>
          <label className="adminToggle"><input name="recruitmentOpen" type="checkbox" defaultChecked={Boolean(recruitment.open)} /><span>Başvurular açık</span></label>
          <label><span>Not · TR</span><input name="recruitmentNoteTr" defaultValue={String(recruitment.note_tr || "")} /></label>
          <label><span>Not · EN</span><input name="recruitmentNoteEn" defaultValue={String(recruitment.note_en || "")} /></label>
        </section>
        <section>
          <div><span>PORTAL DUYURUSU</span><h2>İç duyuru</h2></div>
          <label className="adminToggle"><input name="portalBannerEnabled" type="checkbox" defaultChecked={Boolean(banner.enabled)} /><span>Duyuruyu göster</span></label>
          <label><span>Mesaj</span><input name="portalBannerText" defaultValue={String(banner.text || "")} /></label>
        </section>
        <section>
          <div><span>PUBLIC OPS</span><h2>Telemetri görünürlüğü</h2></div>
          <label className="adminToggle"><input name="publicOpsEnabled" type="checkbox" defaultChecked={Boolean(ops.enabled)} /><span>Onaylı salt okunur public ops bileşenlerine izin ver</span></label>
          <p>Araç komut otoritesi bu ayardan etkilenmez.</p>
        </section>
        <button className="adminModernPrimary" type="submit">AYARLARI KAYDET →</button>
      </form>
    </main>
  );
}
