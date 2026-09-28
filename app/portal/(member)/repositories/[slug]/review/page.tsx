import { notFound, redirect } from "next/navigation";
import { PortalEmpty, PortalPageHeader } from "@/components/portal/PortalPage";
import { requirePortalMember } from "@/lib/portal/auth";
import {
  canManageNativeRepository,
  getAccessibleNativeRepository,
  loadNativeRepositoryCompare,
  loadNativeRepositoryDiff,
  type RepoDiffLine,
} from "@/lib/portal/repositories";
import {
  findPortalRepoReview,
  listPortalRepoReviewSubmissions,
  listPortalRepoReviewThreads,
  type PortalRepoReviewThread,
} from "@/lib/portal/repository-reviews";
import {
  createRepoReviewThreadAction,
  replyRepoReviewThreadAction,
  setRepoReviewThreadResolvedAction,
  submitRepoReviewAction,
} from "@/app/portal/repository-review-actions";

export const dynamic = "force-dynamic";

type ReviewView = "split" | "unified";

function shortSha(value: string) {
  return value ? value.slice(0, 10) : "—";
}

function reviewQuery(input: {
  base: string;
  head: string;
  baseRef: string;
  headRef: string;
  view: ReviewView;
  file?: string;
}) {
  const params = new URLSearchParams({
    base: input.base,
    head: input.head,
    baseRef: input.baseRef,
    headRef: input.headRef,
    view: input.view,
  });
  if (input.file) params.set("file", input.file);
  return "?" + params.toString();
}

function threadKey(file: string, side: "base" | "head", line: number) {
  return file + "::" + side + "::" + line;
}

function ThreadCard({
  thread,
  repoSlug,
  base,
  head,
  view,
  file,
  memberId,
  canManage,
}: {
  thread: PortalRepoReviewThread;
  repoSlug: string;
  base: string;
  head: string;
  view: ReviewView;
  file: string;
  memberId: string;
  canManage: boolean;
}) {
  const canResolve = canManage || thread.created_by_member_id === memberId;
  return (
    <article className={"repoReviewThread " + (thread.resolved_at ? "resolved" : "open")} id={"thread-" + thread.id}>
      <header>
        <div>
          <span>{thread.resolved_at ? "RESOLVED" : "OPEN THREAD"}</span>
          <b>{thread.author_name}</b>
        </div>
        <small>{thread.side.toUpperCase()} · L{thread.line_number}</small>
      </header>

      <div className="repoReviewThreadMessages">
        {thread.comments.map((comment) => (
          <div key={comment.id}>
            <p>{comment.body}</p>
            <small>{comment.author_name} · {new Date(comment.created_at).toLocaleString("tr-TR")}</small>
          </div>
        ))}
      </div>

      {!thread.resolved_at ? (
        <form action={replyRepoReviewThreadAction} className="repoReviewReply">
          <input type="hidden" name="repoSlug" value={repoSlug} />
          <input type="hidden" name="base" value={base} />
          <input type="hidden" name="head" value={head} />
          <input type="hidden" name="view" value={view} />
          <input type="hidden" name="file" value={file} />
          <input type="hidden" name="threadId" value={thread.id} />
          <textarea name="body" rows={2} placeholder="Thread'e yanıt yaz…" required />
          <button type="submit" className="portalOutlineButton">YANITLA</button>
        </form>
      ) : null}

      {canResolve ? (
        <form action={setRepoReviewThreadResolvedAction} className="repoReviewResolve">
          <input type="hidden" name="repoSlug" value={repoSlug} />
          <input type="hidden" name="base" value={base} />
          <input type="hidden" name="head" value={head} />
          <input type="hidden" name="view" value={view} />
          <input type="hidden" name="file" value={file} />
          <input type="hidden" name="threadId" value={thread.id} />
          <input type="hidden" name="resolved" value={thread.resolved_at ? "0" : "1"} />
          <button type="submit">{thread.resolved_at ? "REOPEN THREAD" : "RESOLVE THREAD"}</button>
        </form>
      ) : null}
    </article>
  );
}

function LineCommentForm({
  repoSlug,
  base,
  head,
  view,
  file,
  side,
  line,
  lineSha,
}: {
  repoSlug: string;
  base: string;
  head: string;
  view: ReviewView;
  file: string;
  side: "base" | "head";
  line: number;
  lineSha?: string;
}) {
  return (
    <details className="repoLineComment">
      <summary>+</summary>
      <form action={createRepoReviewThreadAction}>
        <input type="hidden" name="repoSlug" value={repoSlug} />
        <input type="hidden" name="base" value={base} />
        <input type="hidden" name="head" value={head} />
        <input type="hidden" name="view" value={view} />
        <input type="hidden" name="filePath" value={file} />
        <input type="hidden" name="side" value={side} />
        <input type="hidden" name="lineNumber" value={line} />
        <input type="hidden" name="lineSha" value={lineSha || ""} />
        <span>{side.toUpperCase()} · LINE {line}</span>
        <textarea name="body" rows={3} placeholder="Bu satır hakkında review yorumu…" required />
        <button type="submit" className="portalPrimaryButton">THREAD AÇ</button>
      </form>
    </details>
  );
}

function buildSplitRows(lines: RepoDiffLine[]) {
  const rows: Array<{ left?: RepoDiffLine; right?: RepoDiffLine }> = [];
  let index = 0;

  while (index < lines.length) {
    const line = lines[index];
    if (line.kind === "context") {
      rows.push({ left: line, right: line });
      index += 1;
      continue;
    }

    const deletes: RepoDiffLine[] = [];
    const adds: RepoDiffLine[] = [];
    while (index < lines.length && lines[index].kind !== "context") {
      const current = lines[index];
      if (current.kind === "delete") deletes.push(current);
      if (current.kind === "add") adds.push(current);
      index += 1;
    }

    const count = Math.max(deletes.length, adds.length);
    for (let item = 0; item < count; item += 1) {
      rows.push({ left: deletes[item], right: adds[item] });
    }
  }

  return rows;
}

function ThreadsForAnchor({
  threads,
  file,
  side,
  line,
  repoSlug,
  base,
  head,
  view,
  memberId,
  canManage,
}: {
  threads: Map<string, PortalRepoReviewThread[]>;
  file: string;
  side: "base" | "head";
  line?: number;
  repoSlug: string;
  base: string;
  head: string;
  view: ReviewView;
  memberId: string;
  canManage: boolean;
}) {
  if (!line) return null;
  const items = threads.get(threadKey(file, side, line)) || [];
  if (!items.length) return null;
  return (
    <div className="repoLineThreads">
      {items.map((thread) => (
        <ThreadCard
          key={thread.id}
          thread={thread}
          repoSlug={repoSlug}
          base={base}
          head={head}
          view={view}
          file={file}
          memberId={memberId}
          canManage={canManage}
        />
      ))}
    </div>
  );
}

export default async function PortalRepositoryReviewPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams?: Promise<{
    base?: string;
    head?: string;
    baseRef?: string;
    headRef?: string;
    view?: string;
    file?: string;
  }>;
}) {
  const [{ slug }, member] = await Promise.all([
    params,
    requirePortalMember(),
  ]);
  const query = searchParams ? await searchParams : {};
  const repo = await getAccessibleNativeRepository(member, decodeURIComponent(slug));
  if (!repo) notFound();

  const base = String(query.base || repo.default_branch || "main");
  const head = String(query.head || repo.default_branch || "main");
  const baseRef = String(query.baseRef || base);
  const headRef = String(query.headRef || head);
  const view: ReviewView = query.view === "unified" ? "unified" : "split";
  const requestedFile = String(query.file || "");

  const compareLoaded = await loadNativeRepositoryCompare(repo, base, head);
  const compare = compareLoaded.compare;
  if (compare?.baseSha && compare.headSha && (base !== compare.baseSha || head !== compare.headSha)) {
    redirect(
      reviewQuery({
        base: compare.baseSha,
        head: compare.headSha,
        baseRef,
        headRef,
        view,
        file: requestedFile || undefined,
      })
    );
  }
  const compareFiles = compare?.files ?? [];
  const requestedExists = requestedFile
    ? compareFiles.some((item) => item.path === requestedFile || item.previousPath === requestedFile)
    : false;
  const selectedPath = requestedExists ? requestedFile : (compareFiles[0]?.path || "");
  const loaded = await loadNativeRepositoryDiff(repo, base, head, selectedPath || null);
  const diff = loaded.diff;
  const canManage = await canManageNativeRepository(member, repo);

  if (!diff) {
    return (
      <>
        <PortalPageHeader
          code="RP-02 / CODE REVIEW"
          title={repo.name}
          lead="Satır bazlı diff, review thread ve review sonucu immutable commit snapshot'larına bağlanır."
          action={<a className="portalOutlineButton" href={"/portal/repositories/" + encodeURIComponent(repo.slug)}>← WORKSPACE</a>}
        />
        <section className="repoServiceNotice offline">
          <b>DIFF SERVICE UNAVAILABLE</b>
          <p>{loaded.error || "CORE Repo Service diff endpoint'i yanıt vermedi."}</p>
          <small>Review metadata D1'de tutulur; diff içeriği Git object kaynağı olan CORE Repo Service'ten gelmeden yorum hedefi oluşturulmaz.</small>
        </section>
      </>
    );
  }

  const review = await findPortalRepoReview(repo.id, diff.baseSha, diff.headSha);
  const [threads, submissions] = review
    ? await Promise.all([
        listPortalRepoReviewThreads(review.id),
        listPortalRepoReviewSubmissions(review.id),
      ])
    : [[], []];

  const threadMap = new Map<string, PortalRepoReviewThread[]>();
  for (const thread of threads) {
    const key = threadKey(thread.file_path, thread.side, Number(thread.line_number));
    const bucket = threadMap.get(key) || [];
    bucket.push(thread);
    threadMap.set(key, bucket);
  }

  const changedFiles = compareFiles.length ? compareFiles : diff.files;
  const selectedFile = diff.files.find(
    (item) => item.path === selectedPath || item.previousPath === selectedPath
  ) || diff.files[0];
  const unresolvedCount = threads.filter((thread) => !thread.resolved_at).length;
  const approveCount = submissions.filter((item) => item.outcome === "approve").length;
  const changeCount = submissions.filter((item) => item.outcome === "request_changes").length;

  return (
    <>
      <PortalPageHeader
        code="RP-02 / CODE REVIEW"
        title={repo.name}
        lead="Gerçek diff hunks, satır bazlı konuşmalar ve review kararları. İnceleme branch adına değil immutable base/head SHA snapshot'ına sabitlenir."
        action={<a className="portalOutlineButton" href={"/portal/repositories/" + encodeURIComponent(repo.slug)}>← WORKSPACE</a>}
      />

      <section className="repoReviewSnapshot">
        <div>
          <span>BASE</span>
          <b>{baseRef}</b>
          <code>{shortSha(diff.baseSha)}</code>
        </div>
        <i>←</i>
        <div>
          <span>HEAD</span>
          <b>{headRef}</b>
          <code>{shortSha(diff.headSha)}</code>
        </div>
        <aside>
          <span>REVIEW STATE</span>
          <strong className={"state-" + String(review?.status || "not_started")}>
            {String(review?.status || "not_started").replaceAll("_", " ").toUpperCase()}
          </strong>
        </aside>
      </section>

      <section className="repoReviewToolbar">
        <div className="repoReviewViewToggle">
          <a
            className={view === "split" ? "active" : ""}
            href={reviewQuery({ base: diff.baseSha, head: diff.headSha, baseRef, headRef, view: "split", file: selectedFile?.path })}
          >SIDE BY SIDE</a>
          <a
            className={view === "unified" ? "active" : ""}
            href={reviewQuery({ base: diff.baseSha, head: diff.headSha, baseRef, headRef, view: "unified", file: selectedFile?.path })}
          >UNIFIED</a>
        </div>
        <div className="repoReviewStats">
          <span>{changedFiles.length} FILE</span>
          <span>{unresolvedCount} OPEN THREAD</span>
          <span>{approveCount} APPROVAL</span>
          <span>{changeCount} CHANGE REQUEST</span>
        </div>
      </section>

      <div className="repoReviewLayout">
        <aside className="portalPanel repoReviewFiles">
          <div className="portalPanelHead"><span>CHANGED FILES</span><small>{changedFiles.length}</small></div>
          <div>
            {changedFiles.map((file) => (
              <a
                key={file.path}
                className={selectedFile?.path === file.path ? "active" : ""}
                href={reviewQuery({ base: diff.baseSha, head: diff.headSha, baseRef, headRef, view, file: file.path })}
              >
                <span>{String(file.status || "modified").toUpperCase()}</span>
                <b>{file.path}</b>
                <small><em>+{file.additions || 0}</em><i>-{file.deletions || 0}</i></small>
              </a>
            ))}
          </div>
        </aside>

        <main className="repoReviewMain">
          {selectedFile ? (
            <section className="portalPanel repoDiffFile">
              <header className="repoDiffFileHeader">
                <div>
                  <span>{String(selectedFile.status || "modified").toUpperCase()}</span>
                  <h2>{selectedFile.path}</h2>
                  {selectedFile.previousPath && selectedFile.previousPath !== selectedFile.path
                    ? <small>from {selectedFile.previousPath}</small>
                    : null}
                </div>
                <strong><em>+{selectedFile.additions || 0}</em><i>-{selectedFile.deletions || 0}</i></strong>
              </header>

              {selectedFile.binary ? (
                <PortalEmpty title="Binary diff" text="Bu dosya için satır bazlı review üretilemiyor; artifact preview bağlantısı sonraki repository biriminde eklenebilir." />
              ) : selectedFile.hunks.length ? (
                <div className={"repoDiffBody " + view}>
                  {selectedFile.hunks.map((hunk, hunkIndex) => (
                    <section className="repoDiffHunk" key={hunk.header + hunkIndex}>
                      <div className="repoDiffHunkHeader">
                        <code>{hunk.header}</code>
                        <span>-{hunk.oldStart},{hunk.oldLines} / +{hunk.newStart},{hunk.newLines}</span>
                      </div>

                      {view === "unified" ? (
                        <div className="repoUnifiedDiff">
                          {hunk.lines.map((line, lineIndex) => {
                            const side: "base" | "head" = line.kind === "delete" ? "base" : "head";
                            const lineNumber = side === "base" ? line.oldLine : line.newLine;
                            return (
                              <div className="repoUnifiedUnit" key={lineIndex + ":" + (line.lineSha || line.content)}>
                                <div className={"repoDiffLine " + line.kind}>
                                  <span className="oldNo">{line.oldLine || ""}</span>
                                  <span className="newNo">{line.newLine || ""}</span>
                                  <span className="mark">{line.kind === "add" ? "+" : line.kind === "delete" ? "−" : " "}</span>
                                  <code>{line.content}</code>
                                  {lineNumber ? (
                                    <LineCommentForm
                                      repoSlug={repo.slug}
                                      base={diff.base}
                                      head={diff.head}
                                      view={view}
                                      file={selectedFile.path}
                                      side={side}
                                      line={lineNumber}
                                      lineSha={line.lineSha}
                                    />
                                  ) : null}
                                </div>
                                <ThreadsForAnchor
                                  threads={threadMap}
                                  file={selectedFile.path}
                                  side={side}
                                  line={lineNumber}
                                  repoSlug={repo.slug}
                                  base={diff.base}
                                  head={diff.head}
                                  view={view}
                                  memberId={member.id}
                                  canManage={canManage}
                                />
                                {line.kind === "context" ? (
                                  <ThreadsForAnchor
                                    threads={threadMap}
                                    file={selectedFile.path}
                                    side="base"
                                    line={line.oldLine}
                                    repoSlug={repo.slug}
                                    base={diff.base}
                                    head={diff.head}
                                    view={view}
                                    memberId={member.id}
                                    canManage={canManage}
                                  />
                                ) : null}
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <div className="repoSplitDiff">
                          {buildSplitRows(hunk.lines).map((row, rowIndex) => (
                            <div className="repoSplitUnit" key={rowIndex}>
                              <div className="repoSplitRow">
                                <div className={"repoSplitCell " + (row.left?.kind || "empty")}>
                                  <span>{row.left?.oldLine || ""}</span>
                                  <code>{row.left?.content || ""}</code>
                                  {row.left?.oldLine ? (
                                    <LineCommentForm
                                      repoSlug={repo.slug}
                                      base={diff.base}
                                      head={diff.head}
                                      view={view}
                                      file={selectedFile.path}
                                      side="base"
                                      line={row.left.oldLine}
                                      lineSha={row.left.lineSha}
                                    />
                                  ) : null}
                                </div>
                                <div className={"repoSplitCell " + (row.right?.kind || "empty")}>
                                  <span>{row.right?.newLine || ""}</span>
                                  <code>{row.right?.content || ""}</code>
                                  {row.right?.newLine ? (
                                    <LineCommentForm
                                      repoSlug={repo.slug}
                                      base={diff.base}
                                      head={diff.head}
                                      view={view}
                                      file={selectedFile.path}
                                      side="head"
                                      line={row.right.newLine}
                                      lineSha={row.right.lineSha}
                                    />
                                  ) : null}
                                </div>
                              </div>

                              <div className="repoSplitThreads">
                                <ThreadsForAnchor
                                  threads={threadMap}
                                  file={selectedFile.path}
                                  side="base"
                                  line={row.left?.oldLine}
                                  repoSlug={repo.slug}
                                  base={diff.base}
                                  head={diff.head}
                                  view={view}
                                  memberId={member.id}
                                  canManage={canManage}
                                />
                                <ThreadsForAnchor
                                  threads={threadMap}
                                  file={selectedFile.path}
                                  side="head"
                                  line={row.right?.newLine}
                                  repoSlug={repo.slug}
                                  base={diff.base}
                                  head={diff.head}
                                  view={view}
                                  memberId={member.id}
                                  canManage={canManage}
                                />
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </section>
                  ))}
                </div>
              ) : (
                <PortalEmpty title="Diff hunk yok." text="Repo Service bu dosya için değişiklik satırı döndürmedi." />
              )}
            </section>
          ) : (
            <PortalEmpty title="Değişen dosya yok." text="Base ve head snapshot'ları arasında review edilecek dosya bulunamadı." />
          )}

          <section className="portalPanel repoReviewSubmit" id="review-summary">
            <div className="portalPanelHead">
              <span>SUBMIT REVIEW</span>
              <small>{unresolvedCount ? unresolvedCount + " OPEN THREAD" : "THREAD GATE CLEAR"}</small>
            </div>
            <form action={submitRepoReviewAction}>
              <input type="hidden" name="repoSlug" value={repo.slug} />
              <input type="hidden" name="base" value={diff.base} />
              <input type="hidden" name="head" value={diff.head} />
              <input type="hidden" name="view" value={view} />
              <textarea name="body" rows={4} placeholder="Review özeti / gerekçe…" />
              <div>
                <button type="submit" name="outcome" value="comment" className="portalOutlineButton">COMMENT</button>
                <button type="submit" name="outcome" value="approve" className="repoApproveButton">APPROVE</button>
                <button type="submit" name="outcome" value="request_changes" className="repoChangesButton">REQUEST CHANGES</button>
              </div>
              {unresolvedCount ? <small>APPROVE kaydı alınabilir; fakat açık thread varken aggregate review state APPROVED olmaz.</small> : null}
            </form>
          </section>

          {submissions.length ? (
            <section className="portalPanel repoReviewHistory">
              <div className="portalPanelHead"><span>REVIEW HISTORY</span><small>{submissions.length} SUBMISSION</small></div>
              <div>
                {submissions.map((submission) => (
                  <article key={submission.id}>
                    <span className={"outcome-" + submission.outcome}>{submission.outcome.replace("_", " ").toUpperCase()}</span>
                    <div>
                      <b>{submission.reviewer_name}</b>
                      <p>{submission.body || "No summary."}</p>
                    </div>
                    <small>{new Date(submission.created_at).toLocaleString("tr-TR")}</small>
                  </article>
                ))}
              </div>
            </section>
          ) : null}
        </main>
      </div>
    </>
  );
}
