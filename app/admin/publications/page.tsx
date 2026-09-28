import { createPublicationAction } from "@/app/admin/extended-actions";
import { listPublications } from "@/lib/cms/extensions";
import { cmsStatusLabel } from "@/lib/portal/labels";

export const dynamic = "force-dynamic";

export default async function AdminYayınlarPage() {
  const publications = await listPublications();
  return (
    <main className="admin adminLight">
      <div className="adminTopline"><div><a className="adminBreadcrumb" href="/admin">CORE CONTROL / ADMIN</a><p className="eyebrow">ARAŞTIRMA ÇIKTILARI</p></div><span className="cmsHealth online"><i />CANLI D1</span></div>
      <h1>Yayınlar</h1>
      <p>Teknik raporları, makaleleri, doğrulama notlarını ve public araştırma çıktılarını yönet. Yayınlanan kayıtlar Araştırma vitrininin içinde gösterilir.</p>

      <section className="adminEditor adminLightEditor">
        <form className="editorGrid" action={createPublicationAction}>
          <label><span>Başlık · TR</span><input name="titleTr" required /></label>
          <label><span>Başlık · EN</span><input name="titleEn" /></label>
          <label><span>Tür</span><select name="kind"><option value="technical-report">Teknik rapor</option><option value="paper">Makale</option><option value="validation-note">Doğrulama notu</option><option value="patent-note">Patent notu</option></select></label>
          <label><span>Alan</span><input name="domain" placeholder="CORE Research / Marine..." /></label>
          <label><span>Durum</span><select name="status"><option value="draft">Taslak</option><option value="published">Yayında</option><option value="archived">Arşiv</option></select></label>
          <label><span>Harici URL</span><input name="externalUrl" type="url" /></label>
          <label className="editorWide"><span>Özet · TR</span><textarea name="summaryTr" rows={3} /></label>
          <label className="editorWide"><span>Özet · EN</span><textarea name="summaryEn" rows={3} /></label>
          <label className="editorWide"><span>Metin · TR</span><textarea name="bodyTr" rows={5} /></label>
          <label className="editorWide"><span>Metin · EN</span><textarea name="bodyEn" rows={5} /></label>
          <div className="editorActions editorWide"><button className="adminPrimaryButton" type="submit">YAYIN OLUŞTUR →</button></div>
        </form>
      </section>

      <div className="adminPublicationList">
        {publications.map((item) => {
          let metadata: Record<string, unknown> = {};
          try { metadata = JSON.parse(String(item.metadata_json || "{}")); } catch { metadata = {}; }
          return (
            <article key={String(item.id)}>
              <span>{String(metadata.kind || "YAYIN").toUpperCase()}</span>
              <div><h3>{String(item.title_tr || item.title_en || item.slug)}</h3><p>{String(item.summary_tr || item.summary_en || "")}</p></div>
              <small>{String(item.domain || "CORE Research")}</small>
              <b>{cmsStatusLabel(String(item.status))}</b>
            </article>
          );
        })}
      </div>
    </main>
  );
}
