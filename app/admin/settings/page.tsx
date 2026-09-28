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

export default async function AdminSettingsPage() {
  const rows = await listSiteSettings();
  const settings = settingMap(rows);
  const recruitment = settings.get("recruitment") || {};
  const banner = settings.get("portal_banner") || {};
  const ops = settings.get("public_ops") || {};
  const identity = settings.get("site_identity") || {};

  return (
    <main className="admin adminLight">
      <div className="adminTopline"><div><a className="adminBreadcrumb" href="/admin">CORE CONTROL / ADMIN</a><p className="eyebrow">SITE + PORTAL SETTINGS</p></div><span className="cmsHealth online"><i />LIVE D1</span></div>
      <h1>Settings</h1>
      <p>Small high-impact controls for the public site and internal portal. Security secrets are never edited from this screen.</p>

      <form className="adminSettingsForm" action={saveSiteSettingsAction}>
        <section>
          <div><span>IDENTITY</span><h2>Slogan</h2></div>
          <label><span>TR</span><input name="sloganTr" defaultValue={String(identity.slogan_tr || "İnsan İçin Teknoloji.")} /></label>
          <label><span>EN</span><input name="sloganEn" defaultValue={String(identity.slogan_en || "Technology for People.")} /></label>
        </section>
        <section>
          <div><span>RECRUITMENT</span><h2>Student intake</h2></div>
          <label className="adminToggle"><input name="recruitmentOpen" type="checkbox" defaultChecked={Boolean(recruitment.open)} /><span>Recruitment open</span></label>
          <label><span>Note · TR</span><input name="recruitmentNoteTr" defaultValue={String(recruitment.note_tr || "")} /></label>
          <label><span>Note · EN</span><input name="recruitmentNoteEn" defaultValue={String(recruitment.note_en || "")} /></label>
        </section>
        <section>
          <div><span>PORTAL BANNER</span><h2>Internal notice</h2></div>
          <label className="adminToggle"><input name="portalBannerEnabled" type="checkbox" defaultChecked={Boolean(banner.enabled)} /><span>Show banner</span></label>
          <label><span>Message</span><input name="portalBannerText" defaultValue={String(banner.text || "")} /></label>
        </section>
        <section>
          <div><span>PUBLIC OPS</span><h2>Telemetry exposure</h2></div>
          <label className="adminToggle"><input name="publicOpsEnabled" type="checkbox" defaultChecked={Boolean(ops.enabled)} /><span>Allow approved public read-only ops widgets</span></label>
          <p>Vehicle command authority is not affected by this setting.</p>
        </section>
        <button className="adminModernPrimary" type="submit">SAVE SETTINGS →</button>
      </form>
    </main>
  );
}
