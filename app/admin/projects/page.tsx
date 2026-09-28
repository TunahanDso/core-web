import { getAdminIdentity } from "@/lib/cms/auth";
import { listProjects } from "@/lib/cms/db";
import { cmsStatusLabel } from "@/lib/portal/labels";

export const dynamic = "force-dynamic";

export default async function AdminProjelerPage() {
  const [projects, identity] = await Promise.all([
    listProjects(),
    getAdminIdentity(),
  ]);

  return (
    <main className="admin adminLight">
      <div className="adminTopline">
        <div>
          <a className="adminBreadcrumb" href="/admin">CORE CONTROL / ADMIN</a>
          <p className="eyebrow">PROJE PORTFÖYÜ · CANLI D1</p>
        </div>
        <span className="cmsHealth online">
          <i />
          {identity.authenticated ? "YAZMA AÇIK" : "SALT OKUNUR"}
        </span>
      </div>

      <h1>Projeler</h1>
      <p>
        Project records are read directly from production D1. Every mutation
        requires a verified Cloudflare Access JWT and writes an audit event.
      </p>

      {projects.length === 0 ? (
        <section className="emptyState">
          <span>VERİTABANI ÇEVRİMİÇİ</span>
          <h2>Henüz proje kaydı yok.</h2>
          <p>
            Admin ana ekranına dön ve hazırlanmış vitrin seed'ini yükle.
          </p>
        </section>
      ) : (
        <div className="adminProjectList">
          {projects.map((project) => (
            <article className="adminProjectRow" key={project.id}>
              <div className="adminProjectIdentity">
                <span>{project.domain ?? "ATANMAMIŞ"}</span>
                <h2>{project.titleTr || project.titleEn || project.slug}</h2>
                <small>{project.slug}</small>
              </div>

              <div className="adminProjectProgress">
                <strong>{project.progress === null ? "—" : `${project.progress}%`}</strong>
                <span>İLERLEME</span>
              </div>

              <div className="adminProjectMeta">
                <span>{project.owner ?? "Sahip bilgisi yok"}</span>
                <span>{cmsStatusLabel(project.status)}</span>
                <a className="adminEditLink" href={`/admin/projects/${encodeURIComponent(project.id)}`}>
                  DÜZENLE →
                </a>
              </div>
            </article>
          ))}
        </div>
      )}

      <div className="terminal">
        <span>YAZMA YETKİSİ</span>
        <b>{identity.authenticated ? "Cloudflare Access JWT doğrulandı" : "Devre dışı"}</b>
        <small>HER PROJE GÜNCELLEMESİ AUDIT_LOG'A KAYDEDİLİR</small>
      </div>
    </main>
  );
}
