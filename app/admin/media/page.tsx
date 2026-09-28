import { uploadMediaAction } from "@/app/admin/extended-actions";
import { listMediaAssets } from "@/lib/cms/extensions";

export const dynamic = "force-dynamic";

export default async function AdminMediaPage() {
  const assets = await listMediaAssets();
  return (
    <main className="admin adminLight">
      <div className="adminTopline"><div><a className="adminBreadcrumb" href="/admin">CORE CONTROL / ADMIN</a><p className="eyebrow">R2 MEDIA LIBRARY</p></div><span className="cmsHealth online"><i />MEDIA BOUND</span></div>
      <h1>Media</h1>
      <p>Upload public images, PDFs, text/CSV or ZIP assets into the CORE R2 bucket. Files are indexed in D1 and served through the site.</p>

      <section className="adminEditor adminLightEditor">
        <form className="editorGrid" action={uploadMediaAction}>
          <label className="editorWide"><span>File · max 25 MB</span><input name="file" type="file" required /></label>
          <label><span>Alt text · TR</span><input name="altTr" /></label>
          <label><span>Alt text · EN</span><input name="altEn" /></label>
          <div className="editorActions editorWide"><button className="adminPrimaryButton" type="submit">UPLOAD TO R2 →</button></div>
        </form>
      </section>

      <div className="adminMediaGrid">
        {assets.map((asset) => (
          <article key={String(asset.id)}>
            <span>{String(asset.mime_type)}</span>
            <h3>{String(asset.object_key).split("/").pop()}</h3>
            <p>{Math.round(Number(asset.size_bytes || 0) / 1024)} KB</p>
            <a href={"/api/media/" + encodeURIComponent(String(asset.id))} target="_blank">OPEN ↗</a>
          </article>
        ))}
      </div>
    </main>
  );
}
