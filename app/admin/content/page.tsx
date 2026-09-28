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

export default async function AdminContentPage() {
  const [pages, identity] = await Promise.all([
    listPages(),
    getAdminIdentity(),
  ]);

  return (
    <main className="admin">
      <div className="adminTopline">
        <div>
          <a className="adminBreadcrumb" href="/admin">CORE CONTROL / ADMIN</a>
          <p className="eyebrow">PUBLIC CONTENT · LIVE D1</p>
        </div>
        <span className="cmsHealth online">
          <i />
          {identity.authenticated ? "WRITE ENABLED" : "READ ONLY"}
        </span>
      </div>

      <h1>Content</h1>
      <p>
        Localized public-page copy is stored in production D1. Published records
        override the built-in site copy; the static copy remains a safe fallback.
      </p>

      {pages.length === 0 ? (
        <section className="emptyState">
          <span>DATABASE ONLINE</span>
          <h2>No public page records yet.</h2>
          <p>Return to the admin dashboard and sync the base public pages.</p>
        </section>
      ) : (
        <div className="adminContentList">
          {pages.map((page) => (
            <article className="adminContentRow" key={page.id}>
              <div className="adminContentIdentity">
                <span>{page.code || "PAGE"}</span>
                <h2>{page.titleTr || page.titleEn || page.slug}</h2>
                <small>{routeLabel[page.slug] ?? "/" + page.slug}</small>
              </div>

              <div className="adminContentLocale">
                <b>TR</b>
                <span>{page.eyebrowTr || "No eyebrow"}</span>
                <small>{page.summaryTr ? "COPY READY" : "SUMMARY EMPTY"}</small>
              </div>

              <div className="adminContentLocale">
                <b>EN</b>
                <span>{page.eyebrowEn || "No eyebrow"}</span>
                <small>{page.summaryEn ? "COPY READY" : "SUMMARY EMPTY"}</small>
              </div>

              <div className="adminContentMeta">
                <span>{page.status.toUpperCase()}</span>
                <a className="adminEditLink" href={"/admin/content/" + encodeURIComponent(page.id)}>
                  EDIT →
                </a>
              </div>
            </article>
          ))}
        </div>
      )}

      <div className="terminal">
        <span>PUBLIC FALLBACK</span>
        <b>D1 published copy → static built-in copy</b>
        <small>CMS FAILURE MUST NOT TAKE THE PUBLIC SHOWCASE DOWN</small>
      </div>
    </main>
  );
}
