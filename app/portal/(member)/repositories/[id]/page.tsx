import { PortalPageHeader } from "@/components/portal/PortalPage";
import {
  commitRepoFileAction,
  commitRepoTextAction,
  deleteRepoPathAction,
} from "@/app/portal/actions";
import {
  getPortalRepositoryFile,
  getPortalRepositoryWorkspace,
} from "@/lib/portal/repositories";
import { readPortalTextFile } from "@/lib/portal/files";
import { requirePortalMember } from "@/lib/portal/auth";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

function formatBytes(value: unknown) {
  const bytes = Number(value || 0);
  if (!Number.isFinite(bytes) || bytes <= 0) return "0 B";
  const units = ["B","KB","MB","GB"];
  const index = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  const amount = bytes / Math.pow(1024,index);
  return amount.toFixed(index === 0 ? 0 : amount >= 10 ? 1 : 2) + " " + units[index];
}

export default async function PortalRepositoryPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams?: Promise<{ path?: string; committed?: string; deleted?: string }>;
}) {
  const member = await requirePortalMember();
  const [{ id }, query] = await Promise.all([
    params,
    searchParams ?? Promise.resolve<{ path?: string; committed?: string; deleted?: string }>({}),
  ]);
  const repositoryId = decodeURIComponent(id);
  const workspace = await getPortalRepositoryWorkspace(repositoryId);
  if (!workspace) notFound();

  const selectedPath = query.path || String(workspace.files.find((file) => String(file.path).toLowerCase() === "readme.md")?.path || workspace.files[0]?.path || "");
  const selected = selectedPath
    ? await getPortalRepositoryFile(repositoryId,selectedPath)
    : null;
  const selectedText = selected && ["text","csv","kicad-pcb"].includes(String(selected.preview_kind))
    ? await readPortalTextFile(String(selected.file_id),2 * 1024 * 1024)
    : null;
  const canDelete = member.role === "admin" || member.role === "lead";
  const provider = String(workspace.repository.provider || "github");
  const externalUrl = String(workspace.repository.repo_url || "");

  return (
    <>
      <PortalPageHeader
        code={"RP / " + (provider === "core" ? "CORE NATIVE" : provider.toUpperCase())}
        title={String(workspace.repository.name)}
        lead={[
          String(workspace.repository.project_slug || workspace.repository.team_code || "CORE"),
          String(workspace.repository.visibility || "private"),
          workspace.commit ? String(workspace.commit.branch || "main") + " · " + String(workspace.commit.id).slice(0,8) : "henüz commit yok",
        ].join(" · ")}
        action={provider !== "core" && externalUrl.startsWith("http")
          ? <a className="portalOutlineButton" href={externalUrl} target="_blank" rel="noreferrer">MIRROR AÇ ↗</a>
          : <a className="portalOutlineButton" href="/portal/repositories">← REPOLAR</a>}
      />

      {query.committed === "1" ? <div className="portalSuccess">Commit CORE repo geçmişine kaydedildi.</div> : null}
      {query.deleted === "1" ? <div className="portalSuccess">Dosya yeni snapshot üzerinden kaldırıldı.</div> : null}

      <section className="portalRepoWorkbench">
        <aside className="portalRepoTree">
          <header>
            <div><span>BRANCH</span><b>main</b></div>
            <small>{workspace.files.length} dosya</small>
          </header>

          <div className="portalRepoTreeList">
            {workspace.files.length ? workspace.files.map((file) => (
              <a
                className={String(file.path) === selectedPath ? "active" : ""}
                href={"/portal/repositories/" + encodeURIComponent(repositoryId) + "?path=" + encodeURIComponent(String(file.path))}
                key={String(file.id)}
              >
                <span>{String(file.path).includes("/") ? "└" : "·"}</span>
                <div><b>{String(file.path)}</b><small>{String(file.language || file.extension || "FILE")} · {formatBytes(file.size_bytes)}</small></div>
              </a>
            )) : <p>Henüz dosya yok.</p>}
          </div>

          <section className="portalRepoCommitBox">
            <span>DOSYA COMMIT ET</span>
            <form action={commitRepoFileAction}>
              <input type="hidden" name="repositoryId" value={repositoryId} />
              <label><small>Repo yolu</small><input name="path" placeholder="src/navigation/controller.cpp" /></label>
              <label><small>Dosya</small><input name="file" type="file" required /></label>
              <label><small>Commit mesajı</small><input name="message" placeholder="Navigation controller v2" /></label>
              <button type="submit">COMMIT →</button>
            </form>
          </section>
        </aside>

        <main className="portalRepoEditor">
          <header>
            <div>
              <span>{selectedPath || "NEW FILE"}</span>
              {selected ? <small>{String(selected.language || selected.mime_type || "")}</small> : null}
            </div>
            {selected ? <a href={"/portal/files/" + encodeURIComponent(String(selected.file_id))}>DOSYA DETAYI ↗</a> : null}
          </header>

          {selected && selectedText !== null ? (
            <form className="portalCodeEditor" action={commitRepoTextAction}>
              <input type="hidden" name="repositoryId" value={repositoryId} />
              <input type="hidden" name="path" value={selectedPath} />
              <textarea name="content" defaultValue={selectedText} spellCheck={false} />
              <footer>
                <input name="message" placeholder={"Update " + selectedPath} required />
                <button type="submit">COMMIT CHANGES →</button>
              </footer>
            </form>
          ) : selected ? (
            <div className="portalRepoBinary">
              <span>{String(selected.preview_kind || "FILE").toUpperCase()}</span>
              <b>{selectedPath}</b>
              <p>Binary / mühendislik dosyası repo snapshot’ında tutuluyor. Teknik görüntüleyiciyi dosya detayından açabilirsin.</p>
              <a href={"/portal/files/" + encodeURIComponent(String(selected.file_id))}>TEKNİK ÖNİZLEME →</a>
            </div>
          ) : (
            <form className="portalCodeEditor portalNewFileEditor" action={commitRepoTextAction}>
              <input type="hidden" name="repositoryId" value={repositoryId} />
              <div className="portalNewFilePath"><span>YENİ DOSYA</span><input name="path" placeholder="README.md" required /></div>
              <textarea name="content" defaultValue={"# " + String(workspace.repository.name) + "\n"} spellCheck={false} />
              <footer>
                <input name="message" defaultValue="Initial commit" required />
                <button type="submit">İLK COMMIT →</button>
              </footer>
            </form>
          )}

          {selected && canDelete ? (
            <form className="portalRepoDelete" action={deleteRepoPathAction}>
              <input type="hidden" name="repositoryId" value={repositoryId} />
              <input type="hidden" name="path" value={selectedPath} />
              <input type="hidden" name="message" value={"Delete " + selectedPath} />
              <button type="submit">DOSYAYI SNAPSHOT'TAN KALDIR</button>
            </form>
          ) : null}
        </main>

        <aside className="portalRepoHistory">
          <header><span>COMMIT GEÇMİŞİ</span><b>{workspace.history.length}</b></header>
          <div>
            {workspace.history.length ? workspace.history.map((commit) => (
              <article key={String(commit.id)}>
                <code>{String(commit.id).slice(0,8)}</code>
                <b>{String(commit.message)}</b>
                <small>{String(commit.author_name || commit.author_email || "CORE")}</small>
                <time>{String(commit.created_at)}</time>
              </article>
            )) : <p>İlk commit bekleniyor.</p>}
          </div>
        </aside>
      </section>
    </>
  );
}
