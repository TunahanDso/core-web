import { notFound } from "next/navigation";
import { PortalEmpty, PortalPageHeader } from "@/components/portal/PortalPage";
import { requirePortalMember } from "@/lib/portal/auth";
import {
  canManageNativeRepository,
  getAccessibleNativeRepository,
  loadNativeRepositoryWorkspace,
  type RepoPackageManifest,
} from "@/lib/portal/repositories";
import { listPortalRepoReviewsForRepository } from "@/lib/portal/repository-reviews";

export const dynamic = "force-dynamic";

function shortSha(value: string | undefined) {
  return value ? value.slice(0, 9) : "—";
}

function formatBytes(value: number | undefined) {
  const bytes = Number(value || 0);
  if (!bytes) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(value: string | undefined) {
  if (!value) return "—";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return new Intl.DateTimeFormat("tr-TR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(parsed);
}

function queryString(values: Record<string, string | undefined>) {
  const query = new URLSearchParams();
  Object.entries(values).forEach(([key, value]) => {
    if (value) query.set(key, value);
  });
  const serialized = query.toString();
  return serialized ? `?${serialized}` : "";
}

function parentPath(path: string) {
  const parts = path.split("/").filter(Boolean);
  parts.pop();
  return parts.join("/");
}

function dependencyCount(manifest: RepoPackageManifest) {
  return [
    manifest.dependencies,
    manifest.devDependencies,
    manifest.peerDependencies,
  ].reduce((sum, group) => sum + Object.keys(group || {}).length, 0);
}

function DependencyGroup({
  title,
  values,
}: {
  title: string;
  values?: Record<string, string>;
}) {
  const entries = Object.entries(values || {});
  if (!entries.length) return null;
  return (
    <div className="repoDependencyGroup">
      <span>{title}</span>
      <div>
        {entries.map(([name, version]) => (
          <code key={name}><b>{name}</b><em>{version}</em></code>
        ))}
      </div>
    </div>
  );
}

export default async function PortalRepositoryWorkspacePage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams?: Promise<{
    ref?: string;
    path?: string;
    file?: string;
    base?: string;
    head?: string;
  }>;
}) {
  const [{ slug }, member] = await Promise.all([
    params,
    requirePortalMember(),
  ]);
  const query: {
    ref?: string;
    path?: string;
    file?: string;
    base?: string;
    head?: string;
  } = searchParams ? await searchParams : {};

  const repo = await getAccessibleNativeRepository(member, decodeURIComponent(slug));
  if (!repo) notFound();

  const [workspace, canManage, recentReviews] = await Promise.all([
    loadNativeRepositoryWorkspace(repo, query),
    canManageNativeRepository(member, repo),
    listPortalRepoReviewsForRepository(repo.id, 10),
  ]);
  const branchNames = Array.from(new Set([
    workspace.ref,
    ...workspace.branches.map((branch) => String(branch.name)),
  ]));

  return (
    <>
      <PortalPageHeader
        code="RP / REPOSITORY WORKSPACE"
        title={repo.name}
        lead="Kod ağacı, sürüm geçmişi, paket manifestleri ve karşılaştırma yüzeyi. Git nesnelerinin kaynağı CORE Repo Service'tir; D1 yalnızca portal kimliği ve yönetişimi tutar."
        action={<a className="portalOutlineButton" href="/portal/repositories">← REPOSITORIES</a>}
      />

      <section className="repoWorkspaceHero">
        <div>
          <span>REPOSITORY</span>
          <h2>{repo.slug}</h2>
          <p>{repo.project_slug || "Proje bağı yok"} · {repo.team_code || "Takım bağı yok"}</p>
        </div>
        <dl>
          <div><dt>Durum</dt><dd>{repo.status.toUpperCase()}</dd></div>
          <div><dt>Görünürlük</dt><dd>{repo.visibility.toUpperCase()}</dd></div>
          <div><dt>Default branch</dt><dd><code>{repo.default_branch}</code></dd></div>
          <div><dt>Yetki</dt><dd>{canManage ? "MANAGE" : "READ"}</dd></div>
        </dl>
      </section>

      {!workspace.service.available ? (
        <section className="repoServiceNotice offline">
          <b>CORE REPO SERVICE OFFLINE</b>
          <p>{workspace.service.reason}</p>
          <small>Portal catalog ve erişim modeli hazır. Git refs / tree / commits / package verisi servis bağlandığında bu workspace'e akacak.</small>
        </section>
      ) : (
        <section className="repoServiceNotice ready">
          <b>CORE REPO SERVICE CONNECTED</b>
          <p>Workspace verisi native repository servisinden okunuyor.</p>
        </section>
      )}

      <section className="repoWorkspaceToolbar">
        <form method="get">
          <label>
            <span>REF / BRANCH</span>
            <select name="ref" defaultValue={workspace.ref}>
              {branchNames.map((branch) => <option key={branch} value={branch}>{branch}</option>)}
            </select>
          </label>
          <button className="portalOutlineButton" type="submit">REF AÇ</button>
        </form>
        <div>
          <span>HEAD</span>
          <code>{shortSha(workspace.branches.find((branch) => branch.name === workspace.ref)?.sha)}</code>
        </div>
      </section>

      <div className="repoWorkspaceGrid">
        <section className="portalPanel repoCodePanel">
          <div className="portalPanelHead">
            <span>CODE / FILE TREE</span>
            <small>{workspace.ref} · /{workspace.path}</small>
          </div>

          <nav className="repoBreadcrumb" aria-label="Repository path">
            <a href={queryString({ ref: workspace.ref })}>{repo.slug}</a>
            {workspace.path.split("/").filter(Boolean).map((segment, index, parts) => {
              const target = parts.slice(0, index + 1).join("/");
              return (
                <span key={target}>
                  <i>/</i>
                  <a href={queryString({ ref: workspace.ref, path: target })}>{segment}</a>
                </span>
              );
            })}
          </nav>

          {workspace.path ? (
            <a className="repoTreeRow repoTreeBack" href={queryString({ ref: workspace.ref, path: parentPath(workspace.path) })}>
              <span>↰</span><b>..</b><small>Üst klasör</small>
            </a>
          ) : null}

          {workspace.tree.length ? (
            <div className="repoTree">
              {workspace.tree.map((entry) => {
                const isDirectory = entry.type === "directory";
                const href = isDirectory
                  ? queryString({ ref: workspace.ref, path: entry.path })
                  : queryString({ ref: workspace.ref, path: workspace.path, file: entry.path });
                return (
                  <a className="repoTreeRow" href={href} key={entry.path}>
                    <span>{isDirectory ? "DIR" : "FILE"}</span>
                    <b>{entry.name}</b>
                    <small>{entry.language || (isDirectory ? "directory" : formatBytes(entry.size))}</small>
                    <code>{shortSha(entry.sha)}</code>
                  </a>
                );
              })}
            </div>
          ) : (
            <PortalEmpty
              title={workspace.service.available ? "Bu path boş veya okunamadı." : "Dosya ağacı bekleniyor."}
              text={workspace.service.available ? "Ref/path bilgisini kontrol et veya servis sözleşmesi yanıtını incele." : "Repo Service bağlandığında tree endpoint'i burada dosya ağacını oluşturacak."}
            />
          )}

          {workspace.blob ? (
            <article className="repoFilePreview">
              <header>
                <div>
                  <span>FILE PREVIEW</span>
                  <b>{workspace.blob.path}</b>
                </div>
                <small>{workspace.blob.language || workspace.blob.mimeType || "text"} · {formatBytes(workspace.blob.size)} · {shortSha(workspace.blob.sha)}</small>
              </header>
              {workspace.blob.encoding === "binary" ? (
                <div className="repoBinaryNotice">Binary dosya inline gösterilmiyor. İndirme / artifact akışı RP-02 kapsamında bağlanacak.</div>
              ) : (
                <pre><code>{String(workspace.blob.content || "").slice(0, 160000)}</code></pre>
              )}
            </article>
          ) : null}
        </section>

        <aside className="repoWorkspaceSide">
          <section className="portalPanel">
            <div className="portalPanelHead"><span>BRANCHES</span><small>{workspace.branches.length}</small></div>
            <div className="repoBranchList">
              {workspace.branches.slice(0, 18).map((branch) => (
                <a
                  href={queryString({ ref: branch.name })}
                  className={branch.name === workspace.ref ? "active" : ""}
                  key={branch.name}
                >
                  <div><b>{branch.name}</b><small>{shortSha(branch.sha)}</small></div>
                  <em>{branch.protected ? "PROTECTED" : "OPEN"}</em>
                </a>
              ))}
              {!workspace.branches.length ? <small>Branch verisi servis bekliyor.</small> : null}
            </div>
          </section>

          <section className="portalPanel">
            <div className="portalPanelHead"><span>RECENT COMMITS</span><small>{workspace.commits.length}</small></div>
            <div className="repoCommitList">
              {workspace.commits.slice(0, 12).map((commit) => (
                <article key={commit.sha}>
                  <code>{shortSha(commit.sha)}</code>
                  <b>{commit.message.split("\n")[0]}</b>
                  <small>{commit.authorName || commit.authorEmail || "unknown"} · {formatDate(commit.authoredAt || commit.committedAt)}</small>
                </article>
              ))}
              {!workspace.commits.length ? <small>Commit geçmişi servis bekliyor.</small> : null}
            </div>
          </section>
        </aside>
      </div>

      <section className="portalPanel repoPackagesPanel">
        <div className="portalPanelHead">
          <span>PACKAGE / MANIFEST INSPECTOR</span>
          <small>{workspace.manifests.length} MANIFEST</small>
        </div>

        {workspace.manifests.length ? (
          <div className="repoManifestGrid">
            {workspace.manifests.map((manifest) => (
              <article key={manifest.path}>
                <header>
                  <div>
                    <span>{manifest.ecosystem.toUpperCase()}</span>
                    <h3>{manifest.name || manifest.path}</h3>
                    <code>{manifest.path}</code>
                  </div>
                  <strong>{manifest.version || "UNVERSIONED"}</strong>
                </header>
                <div className="repoManifestMeta">
                  <span>{manifest.packageManager || "package manager unknown"}</span>
                  <span>{dependencyCount(manifest)} dependency</span>
                  <span>{Object.keys(manifest.scripts || {}).length} script</span>
                </div>
                <DependencyGroup title="DEPENDENCIES" values={manifest.dependencies} />
                <DependencyGroup title="DEV DEPENDENCIES" values={manifest.devDependencies} />
                <DependencyGroup title="PEER DEPENDENCIES" values={manifest.peerDependencies} />
                <DependencyGroup title="SCRIPTS" values={manifest.scripts} />
              </article>
            ))}
          </div>
        ) : (
          <PortalEmpty
            title="Manifest verisi henüz yok."
            text="package.json, pyproject.toml, requirements, Cargo.toml, go.mod, CMake/PlatformIO gibi manifestleri Repo Service normalize ederek burada gösterecek."
          />
        )}
      </section>

      <section className="portalPanel repoReviewPanel">
        <div className="portalPanelHead">
          <span>VERSION COMPARE / REVIEW PREVIEW</span>
          <small>BASE ↔ HEAD</small>
        </div>

        <form method="get" className="repoCompareForm">
          <input type="hidden" name="ref" value={workspace.ref} />
          <label><span>Base</span><input name="base" defaultValue={query.base || repo.default_branch} placeholder="main" /></label>
          <label><span>Head</span><input name="head" defaultValue={query.head || workspace.ref} placeholder="feature/..." /></label>
          <button className="portalPrimaryButton" type="submit">KARŞILAŞTIR →</button>
        </form>

        {workspace.compare ? (
          <>
            <div className="repoCompareSummary">
              <div><span>AHEAD</span><b>{workspace.compare.aheadBy ?? "—"}</b></div>
              <div><span>BEHIND</span><b>{workspace.compare.behindBy ?? "—"}</b></div>
              <div><span>COMMITS</span><b>{workspace.compare.totalCommits ?? "—"}</b></div>
              <div><span>FILES</span><b>{workspace.compare.files.length}</b></div>
              <div><span>MERGE BASE</span><code>{shortSha(workspace.compare.mergeBaseSha)}</code></div>
            </div>
            <div className="repoCompareFiles">
              {workspace.compare.files.map((file) => (
                <article key={file.path}>
                  <span>{String(file.status || "modified").toUpperCase()}</span>
                  <b>{file.path}</b>
                  <small>
                    <em>+{file.additions ?? 0}</em>
                    <i>-{file.deletions ?? 0}</i>
                    <strong>{file.changes ?? 0} changes</strong>
                  </small>
                </article>
              ))}
            </div>
            <div className="repoReviewLaunch">
              <div>
                <span>RP-02 / CODE REVIEW</span>
                <b>Satır bazlı diff, thread ve review sonucu</b>
                <small>Review immutable base/head commit snapshot'ına sabitlenir.</small>
              </div>
              <a
                className="portalPrimaryButton"
                href={"/portal/repositories/" + encodeURIComponent(repo.slug) + "/review?base=" + encodeURIComponent(workspace.compare.base) + "&head=" + encodeURIComponent(workspace.compare.head) + "&view=split"}
              >
                CODE REVIEW AÇ →
              </a>
            </div>
          </>
        ) : (
          <p className="repoReviewHint">İki ref seçildiğinde dosya değişiklik özeti burada açılır; ardından CODE REVIEW ekranından gerçek hunks ve satır thread'lerine geçilir.</p>
        )}
      </section>

      {recentReviews.length ? (
        <section className="portalPanel repoRecentReviews">
          <div className="portalPanelHead"><span>RECENT CODE REVIEWS</span><small>{recentReviews.length} SNAPSHOT</small></div>
          <div>
            {recentReviews.map((review) => (
              <a
                key={String(review.id)}
                href={
                  "/portal/repositories/" + encodeURIComponent(repo.slug) +
                  "/review?base=" + encodeURIComponent(String(review.base_ref)) +
                  "&head=" + encodeURIComponent(String(review.head_ref)) +
                  "&view=split"
                }
              >
                <span>{String(review.status).replaceAll("_"," ").toUpperCase()}</span>
                <div>
                  <b>{String(review.head_ref)} → {String(review.base_ref)}</b>
                  <code>{shortSha(String(review.head_sha))} / {shortSha(String(review.base_sha))}</code>
                </div>
                <small>{Number(review.open_threads || 0)} open thread · {Number(review.submission_count || 0)} review</small>
                <strong>OPEN →</strong>
              </a>
            ))}
          </div>
        </section>
      ) : null}

      {workspace.errors.length ? (
        <details className="repoDiagnostics">
          <summary>Repo Service diagnostics · {workspace.errors.length}</summary>
          {workspace.errors.map((error) => <code key={error}>{error}</code>)}
        </details>
      ) : null}
    </>
  );
}
