import { createPublicationAction } from "@/app/admin/extended-actions";
import { listPublications } from "@/lib/cms/extensions";

export const dynamic = "force-dynamic";

export default async function AdminPublicationsPage() {
  const publications = await listPublications();
  return (
    <main className="admin adminLight">
      <div className="adminTopline"><div><a className="adminBreadcrumb" href="/admin">CORE CONTROL / ADMIN</a><p className="eyebrow">RESEARCH OUTPUTS</p></div><span className="cmsHealth online"><i />LIVE D1</span></div>
      <h1>Publications</h1>
      <p>Technical reports, papers, validation notes and public research outputs. Published records can be surfaced on the Research showcase.</p>

      <section className="adminEditor adminLightEditor">
        <form className="editorGrid" action={createPublicationAction}>
          <label><span>Title · TR</span><input name="titleTr" required /></label>
          <label><span>Title · EN</span><input name="titleEn" /></label>
          <label><span>Kind</span><select name="kind"><option value="technical-report">Technical report</option><option value="paper">Paper</option><option value="validation-note">Validation note</option><option value="patent-note">Patent note</option></select></label>
          <label><span>Domain</span><input name="domain" placeholder="CORE Research / Marine..." /></label>
          <label><span>Status</span><select name="status"><option value="draft">Draft</option><option value="published">Published</option><option value="archived">Archived</option></select></label>
          <label><span>External URL</span><input name="externalUrl" type="url" /></label>
          <label className="editorWide"><span>Summary · TR</span><textarea name="summaryTr" rows={3} /></label>
          <label className="editorWide"><span>Summary · EN</span><textarea name="summaryEn" rows={3} /></label>
          <label className="editorWide"><span>Body · TR</span><textarea name="bodyTr" rows={5} /></label>
          <label className="editorWide"><span>Body · EN</span><textarea name="bodyEn" rows={5} /></label>
          <div className="editorActions editorWide"><button className="adminPrimaryButton" type="submit">CREATE PUBLICATION →</button></div>
        </form>
      </section>

      <div className="adminPublicationList">
        {publications.map((item) => {
          let metadata: Record<string, unknown> = {};
          try { metadata = JSON.parse(String(item.metadata_json || "{}")); } catch { metadata = {}; }
          return (
            <article key={String(item.id)}>
              <span>{String(metadata.kind || "PUBLICATION").toUpperCase()}</span>
              <div><h3>{String(item.title_tr || item.title_en || item.slug)}</h3><p>{String(item.summary_tr || item.summary_en || "")}</p></div>
              <small>{String(item.domain || "CORE Research")}</small>
              <b>{String(item.status).toUpperCase()}</b>
            </article>
          );
        })}
      </div>
    </main>
  );
}
