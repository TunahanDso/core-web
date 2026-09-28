import { getAdminIdentity } from "@/lib/cms/auth";
import { listPages } from "@/lib/cms/db";

export const dynamic = "force-dynamic";

const routeLabel: Record<string, string> = {
  home: "/",
  teams: "/teams",
  projects: "/projects",
  research: "/research",
  competitions: "/competitions",
  about: "/about",
  join: "/join",
};

export default async function AdminİçerikPage() {
  const [pages, identity] = await Promise.all([
    listPages(),
    getAdminIdentity(),
  ]);

  return (
    <main className="admin adminLight">
      <div className="adminTopline">
        <div>
          <a className="adminBreadcrumb" href="/admin">CORE CONTROL / ADMIN</a>
          <p className="eyebrow">VİTRİN İÇERİĞİ · CANLI D1</p>
        </div>
        <span className="cmsHealth online">
          <i />
          {identity.authenticated ? "YAZMA AÇIK" : "SALT OKUNUR"}
        </span>
      </div>

      <h1>İçerik</h1>
      <p>
        Localized public-page copy is stored in production D1. Published records
        override the built-in site copy; the static copy remains a safe fallback.
      </p>

      {pages.length === 0 ? (
        <section className="emptyState">
          <span>VERİTABANI ÇEVRİMİÇİ</span>
          <h2>Henüz vitrin sayfası kaydı yok.</h2>
          <p>Admin ana ekranına dön ve temel vitrin sayfalarını eşitle.</p>
        </section>
      ) : (
        <div className="adminİçerikList">
          {pages.map((page) => (
            <article className="adminİçerikRow" key={page.id}>
              <div className="adminİçerikIdentity">
                <span>{page.code || "SAYFA"}</span>
                <h2>{page.titleTr || page.titleEn || page.slug}</h2>
                <small>{routeLabel[page.slug] ?? "/" + page.slug}</small>
              </div>

              <div className="adminİçerikLocale">
                <b>TR</b>
                <span>{page.eyebrowTr || "Üst etiket yok"}</span>
                <small>{page.summaryTr ? "METİN HAZIR" : "ÖZET BOŞ"}</small>
              </div>

              <div className="adminİçerikLocale">
                <b>EN</b>
                <span>{page.eyebrowEn || "Üst etiket yok"}</span>
                <small>{page.summaryEn ? "METİN HAZIR" : "ÖZET BOŞ"}</small>
              </div>

              <div className="adminİçerikMeta">
                <span>{page.status.toUpperCase()}</span>
                <a className="adminEditLink" href={"/admin/content/" + encodeURIComponent(page.id)}>
                  DÜZENLE →
                </a>
              </div>
            </article>
          ))}
        </div>
      )}

      <div className="terminal">
        <span>PUBLIC FALLBACK</span>
        <b>D1 yayın içeriği → statik yerleşik içerik</b>
        <small>CMS HATASI VİTRİN SİTESİNİ ÇÖKERTMEMELİ</small>
      </div>
    </main>
  );
}
