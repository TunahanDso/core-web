import { updateProjectAction } from "@/app/admin/actions";
import { getProject } from "@/lib/cms/db";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function AdminProjectEditPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams?: Promise<{ saved?: string }>;
}) {
  const [{ id }, query] = await Promise.all([
    params,
    searchParams ?? Promise.resolve<{ saved?: string }>({}),
  ]);
  const project = await getProject(decodeURIComponent(id));
  if (!project) notFound();

  return (
    <main className="admin adminLight">
      <div className="adminTopline">
        <div>
          <a className="adminBreadcrumb" href="/admin/projects">
            CORE CONTROL / PROJELER
          </a>
          <p className="eyebrow">PROJE EDİTÖRÜ · DOĞRULANMIŞ YAZMA</p>
        </div>
        <span className="cmsHealth online"><i />CANLI D1</span>
      </div>

      <h1>{project.titleTr || project.titleEn || project.slug}</h1>
      <p>
        Düzenleniyor: <code>{project.id}</code>. Saving updates production D1 and
        appends an audit record with the verified Cloudflare Access identity.
      </p>

      {query.saved === "1" ? (
        <div className="cmsSuccess">
          <b>Proje kaydedildi.</b>
          <span>D1 kaydı ve denetim günlüğü başarıyla güncellendi.</span>
        </div>
      ) : null}

      <form className="adminEditor" action={updateProjectAction}>
        <input type="hidden" name="id" value={project.id} />

        <div className="editorGrid">
          <label>
            <span>Başlık · TR</span>
            <input name="titleTr" defaultValue={project.titleTr} required maxLength={120} />
          </label>
          <label>
            <span>Başlık · EN</span>
            <input name="titleEn" defaultValue={project.titleEn} maxLength={120} />
          </label>

          <label className="editorWide">
            <span>Özet · TR</span>
            <textarea name="summaryTr" defaultValue={project.summaryTr} rows={4} maxLength={700} />
          </label>
          <label className="editorWide">
            <span>Özet · EN</span>
            <textarea name="summaryEn" defaultValue={project.summaryEn} rows={4} maxLength={700} />
          </label>

          <label>
            <span>Alan</span>
            <input name="domain" defaultValue={project.domain ?? ""} maxLength={100} />
          </label>
          <label>
            <span>Sorumlu</span>
            <input name="owner" defaultValue={project.owner ?? ""} maxLength={100} />
          </label>

          <label>
            <span>İlerleme · %</span>
            <input
              name="progress"
              type="number"
              min="0"
              max="100"
              step="1"
              defaultValue={project.progress ?? 0}
              required
            />
          </label>
          <label>
            <span>Durum</span>
            <select name="status" defaultValue={project.status}>
              <option value="draft">Taslak</option>
              <option value="published">Yayında</option>
              <option value="archived">Arşiv</option>
            </select>
          </label>

          <label className="editorWide">
            <span>Entegrasyonlar · virgülle ayır</span>
            <input
              name="integrations"
              defaultValue={project.integrations.join(", ")}
              maxLength={1000}
            />
          </label>
        </div>

        <div className="editorActions">
          <a className="adminSecondaryButton" href="/admin/projects">İPTAL</a>
          <button className="adminPrimaryButton" type="submit">PROJEYİ KAYDET →</button>
        </div>
      </form>

      <div className="terminal">
        <span>DENETİM</span>
        <b>project.update</b>
        <small>KAYITTA AKTÖR + VARLIK + GÜNCELLENEN METADATA KAYDEDİLİR</small>
      </div>
    </main>
  );
}
