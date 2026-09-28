import { uploadMedyaAction } from "@/app/admin/extended-actions";
import { listMedyaAssets } from "@/lib/cms/extensions";

export const dynamic = "force-dynamic";

export default async function AdminMedyaPage() {
  const assets = await listMedyaAssets();
  return (
    <main className="admin adminLight">
      <div className="adminTopline"><div><a className="adminBreadcrumb" href="/admin">CORE CONTROL / ADMIN</a><p className="eyebrow">R2 MEDYA KÜTÜPHANESİ</p></div><span className="cmsHealth online"><i />MEDYA BAĞLI</span></div>
      <h1>Medya</h1>
      <p>Public görselleri, PDF, metin/CSV veya ZIP dosyalarını CORE R2 bucket'ına yükle. Dosyalar D1'de indekslenir ve site üzerinden servis edilir.</p>

      <section className="adminEditor adminLightEditor">
        <form className="editorGrid" action={uploadMedyaAction}>
          <label className="editorWide"><span>Dosya · en fazla 25 MB</span><input name="file" type="file" required /></label>
          <label><span>Alternatif metin · TR</span><input name="altTr" /></label>
          <label><span>Alternatif metin · EN</span><input name="altEn" /></label>
          <div className="editorActions editorWide"><button className="adminPrimaryButton" type="submit">R2'YE YÜKLE →</button></div>
        </form>
      </section>

      <div className="adminMedyaGrid">
        {assets.map((asset) => (
          <article key={String(asset.id)}>
            <span>{String(asset.mime_type)}</span>
            <h3>{String(asset.object_key).split("/").pop()}</h3>
            <p>{Math.round(Number(asset.size_bytes || 0) / 1024)} KB</p>
            <a href={"/api/media/" + encodeURIComponent(String(asset.id))} target="_blank">AÇ ↗</a>
          </article>
        ))}
      </div>
    </main>
  );
}
