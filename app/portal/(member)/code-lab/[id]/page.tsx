import { notFound } from "next/navigation";
import { CodeRunLiveRefresh } from "@/components/portal/CodeRunLiveRefresh";
import { PortalEmpty, PortalPageHeader } from "@/components/portal/PortalPage";
import { requirePortalMember } from "@/lib/portal/auth";
import { getPortalCodeRunDetail, probeCodeRunner } from "@/lib/portal/code-lab";
import { cancelCodeRunAction, retryCodeRunAction } from "@/app/portal/engineering-actions";

export const dynamic = "force-dynamic";

function formatDate(value: unknown) {
  const text = String(value || "");
  if (!text) return "—";
  const date = new Date(text);
  if (Number.isNaN(date.getTime())) return text;
  return new Intl.DateTimeFormat("tr-TR", {
    dateStyle:"medium",
    timeStyle:"medium",
  }).format(date);
}

function shortSha(value: unknown) {
  const text = String(value || "");
  return text ? text.slice(0,12) : "—";
}

function parseMetadata(value: unknown) {
  try {
    const parsed = JSON.parse(String(value || "{}"));
    return parsed && typeof parsed === "object" ? parsed as Record<string,unknown> : {};
  } catch {
    return {};
  }
}

export default async function PortalCodeRunDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id:string }>;
  searchParams?: Promise<{ submitted?:string;cancelled?:string;retried?:string }>;
}) {
  const [{ id },member] = await Promise.all([
    params,
    requirePortalMember(),
  ]);
  const query: { submitted?:string;cancelled?:string;retried?:string } =
    searchParams ? await searchParams : {};
  const [detail,runner] = await Promise.all([
    getPortalCodeRunDetail(member,decodeURIComponent(id)),
    probeCodeRunner(),
  ]);
  if (!detail) notFound();

  const run = detail.run;
  const active = run.status === "queued" || run.status === "running";
  const terminal = ["passed","failed","timed_out","cancelled"].includes(run.status);

  return (
    <>
      <CodeRunLiveRefresh active={active} runId={String(run.id)} status={String(run.status)} />
      <PortalPageHeader
        code="CL / JOB EXECUTION"
        title={String(run.command_label)}
        lead="Immutable repository snapshot üzerinde çalışan izole CORE Runner işi. Job aktifken ekran otomatik yenilenir."
        action={<a className="portalOutlineButton" href="/portal/code-lab">← CODE LAB</a>}
      />

      {query.submitted === "1" ? <div className="portalSuccess">Job runner kuyruğuna gönderildi.</div> : null}
      {query.cancelled === "1" ? <div className="portalSuccess">İptal isteği işlendi.</div> : null}
      {query.retried === "1" ? <div className="portalSuccess">Job yeniden oluşturuldu.</div> : null}

      <section className={"codeRunHero state-" + run.status}>
        <div>
          <span>JOB ID</span>
          <code>{run.id}</code>
          <h2>{String(run.repo_name || run.repository_ref || "CORE Repository")}</h2>
          <p>{String(run.snapshot_ref || "main")} · {String(run.language).toUpperCase()} · {String(run.runner_provider)}</p>
        </div>
        <dl>
          <div><dt>STATUS</dt><dd>{String(run.status).toUpperCase()}</dd></div>
          <div><dt>SNAPSHOT</dt><dd><code>{shortSha(run.snapshot_sha)}</code></dd></div>
          <div><dt>EXIT</dt><dd>{run.exit_code ?? "—"}</dd></div>
          <div><dt>ATTEMPT</dt><dd>{run.attempt || 1}</dd></div>
          <div><dt>CREATED</dt><dd>{formatDate(run.created_at)}</dd></div>
          <div><dt>FINISHED</dt><dd>{formatDate(run.finished_at)}</dd></div>
        </dl>
      </section>

      <section className="codeRunControlBar">
        <div>
          <span>RUNNER</span>
          <b>{runner.healthy ? "ONLINE" : "OFFLINE"}</b>
          <small>{runner.reason || "Cloudflare Workflow + Container"}</small>
        </div>
        <div className="codeRunActions">
          {active ? (
            <form action={cancelCodeRunAction}>
              <input type="hidden" name="runId" value={run.id} />
              <button type="submit" className="portalDangerButton">CANCEL JOB</button>
            </form>
          ) : null}
          {terminal ? (
            <form action={retryCodeRunAction}>
              <input type="hidden" name="runId" value={run.id} />
              <button type="submit" className="portalPrimaryButton" disabled={!runner.healthy}>RETRY →</button>
            </form>
          ) : null}
        </div>
      </section>

      <div className="codeRunGrid">
        <section className="portalPanel codeRunTimeline">
          <div className="portalPanelHead"><span>EXECUTION TIMELINE</span><small>{detail.events.length} EVENT</small></div>
          {detail.events.length ? (
            <div>
              {detail.events.map((event) => {
                const meta = parseMetadata(event.metadata_json);
                return (
                  <article key={String(event.id)}>
                    <i className={"level " + String(event.level)} />
                    <div>
                      <span>{String(event.phase).toUpperCase()}</span>
                      <b>{String(event.message)}</b>
                      {Object.keys(meta).length ? <code>{JSON.stringify(meta)}</code> : null}
                    </div>
                    <small>{formatDate(event.created_at)}</small>
                  </article>
                );
              })}
            </div>
          ) : <PortalEmpty title="Event henüz yok." text="Runner job ilerledikçe execution event'leri burada görünür." />}
        </section>

        <aside className="portalPanel codeRunArtifacts">
          <div className="portalPanelHead"><span>ARTIFACTS</span><small>{detail.artifacts.length}</small></div>
          {detail.artifacts.length ? (
            <div>
              {detail.artifacts.map((artifact) => (
                <a
                  key={String(artifact.id)}
                  href={"/api/portal/code-lab/" + encodeURIComponent(run.id) + "/artifacts/" + encodeURIComponent(String(artifact.id))}
                >
                  <div>
                    <span>{String(artifact.kind).toUpperCase()}</span>
                    <b>{String(artifact.name)}</b>
                    <small>{String(artifact.mime_type)} · {Number(artifact.size_bytes || 0)} B</small>
                  </div>
                  <strong>DOWNLOAD ↓</strong>
                </a>
              ))}
            </div>
          ) : <PortalEmpty title="Artifact yok." text="Build/test çıktıları artifact politikasıyla eşleşirse burada saklanır." />}
        </aside>
      </div>

      <section className="codeRunLogs">
        <article className="portalPanel">
          <div className="portalPanelHead"><span>STDOUT</span><small>{detail.stdout.length} CHAR</small></div>
          <pre><code>{detail.stdout || (active ? "Runner çıktısı bekleniyor…" : "stdout boş.")}</code></pre>
        </article>
        <article className="portalPanel">
          <div className="portalPanelHead"><span>STDERR</span><small>{detail.stderr.length} CHAR</small></div>
          <pre><code>{detail.stderr || (active ? "Runner stderr bekleniyor…" : "stderr boş.")}</code></pre>
        </article>
      </section>
    </>
  );
}
