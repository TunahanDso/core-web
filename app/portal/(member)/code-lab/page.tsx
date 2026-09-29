import Link from "next/link";
import { PortalEmpty, PortalPageHeader } from "@/components/portal/PortalPage";
import { requirePortalMember } from "@/lib/portal/auth";
import {
  listPortalCodeRuns,
  listPortalCodeTerminalSessions,
  probeCodeRunner,
  RUNNER_LIMITS,
  RUNNER_TASKS,
} from "@/lib/portal/code-lab";
import { listAccessibleNativeRepositories } from "@/lib/portal/repositories";
import { createCodeTerminalAction, submitCodeRunAction } from "@/app/portal/engineering-actions";

export const dynamic = "force-dynamic";

function shortSha(value: unknown) {
  const text = String(value || "");
  return text ? text.slice(0,9) : "—";
}

function formatDate(value: unknown) {
  const text = String(value || "");
  if (!text) return "—";
  const date = new Date(text);
  if (Number.isNaN(date.getTime())) return text;
  return new Intl.DateTimeFormat("tr-TR", {
    dateStyle:"medium",
    timeStyle:"short",
  }).format(date);
}

export default async function PortalCodeLabPage() {
  const member = await requirePortalMember();
  const [runner, repositories, runs, terminals] = await Promise.all([
    probeCodeRunner(),
    listAccessibleNativeRepositories(member),
    listPortalCodeRuns(member.id,80),
    listPortalCodeTerminalSessions(member.id,12),
  ]);

  const tasks = Object.entries(RUNNER_TASKS).flatMap(([language, values]) =>
    values.map(([id,label,command]) => ({ language,id,label,command }))
  );
  const active = runs.filter((run) => ["queued","running"].includes(run.status)).length;
  const passed = runs.filter((run) => run.status === "passed").length;
  const failed = runs.filter((run) => ["failed","timed_out"].includes(run.status)).length;

  return (
    <>
      <PortalPageHeader
        code="CL / CODE LAB"
        title="İzole Kod Laboratuvarı"
        lead="Native repository snapshot'larında canlı terminal aç veya sabit build/test görevleri çalıştır. Shell ve job süreçleri CMS Worker'dan ayrılmış, internetsiz CORE Runner container'larında yürür."
      />

      <section className="runnerBoundary">
        <div>
          <span>PORTAL / CONTROL PLANE</span>
          <b>D1 job metadata · auth · audit</b>
        </div>
        <i>→</i>
        <div className={runner.healthy ? "ready" : "offline"}>
          <span>CORE RUNNER</span>
          <b>{runner.healthy ? "ONLINE · CONTAINER MODE" : runner.configured ? "UNREACHABLE" : "NOT CONFIGURED"}</b>
          <small>{runner.reason || "Workflow orchestration aktif"}</small>
        </div>
        <i>→</i>
        <div>
          <span>SANDBOX / CONTAINER</span>
          <b>{RUNNER_LIMITS.cpu} CPU · {RUNNER_LIMITS.memoryMb} MB · {RUNNER_LIMITS.timeoutSeconds}s · NETWORK {String(RUNNER_LIMITS.network).toUpperCase()}</b>
        </div>
      </section>

      <section className="runnerKpis">
        <article><span>RUNNER</span><b>{runner.healthy ? "READY" : "OFFLINE"}</b><small>{runner.mode}</small></article>
        <article><span>ACTIVE</span><b>{active}</b><small>queued / running</small></article>
        <article><span>PASSED</span><b>{passed}</b><small>son {runs.length} job</small></article>
        <article><span>FAILED</span><b>{failed}</b><small>failed / timeout</small></article>
      </section>

      <section className="codeTerminalLaunch">
        <div className="codeTerminalLaunchCopy">
          <span>LIVE TERMINAL / CL-02</span>
          <h2>Snapshot içinde gerçek, interaktif shell.</h2>
          <p>
            Python input(), CLI menüleri, derleyiciler, git-benzeri dosya inceleme akışları ve uzun komutlar
            canlı stdin/stdout üzerinden çalışır. Oturum ephemeral, internet kapalı ve 30 dakika ile sınırlıdır.
          </p>
          <div>
            <small>WEBSOCKET STREAM</small>
            <small>XTERM</small>
            <small>PTY</small>
            <small>NETWORK DENY</small>
          </div>
        </div>
        <form className="codeTerminalLaunchForm" action={createCodeTerminalAction}>
          <label>
            <span>Native repository</span>
            <select name="repositoryRef" required defaultValue="">
              <option value="" disabled>Repository seç</option>
              {repositories.map((repo) => (
                <option value={repo.slug} key={repo.id}>
                  {repo.name} · {repo.team_code || "CORE"} · {repo.default_branch}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span>Snapshot / branch / commit SHA</span>
            <input name="snapshotRef" defaultValue="main" maxLength={180} required />
          </label>
          <button className="portalPrimaryButton" type="submit" disabled={!runner.healthy || !repositories.length}>
            {runner.healthy ? "LIVE TERMINAL AÇ →" : "RUNNER OFFLINE"}
          </button>
          <small>Terminaldeki dosya değişiklikleri otomatik commit edilmez.</small>
        </form>
      </section>

      {terminals.length ? (
        <section className="portalPanel codeTerminalHistory">
          <div className="portalPanelHead"><span>SON TERMINAL OTURUMLARI</span><small>{terminals.length} KAYIT</small></div>
          <div className="codeTerminalSessionList">
            {terminals.map((terminal) => (
              <Link prefetch={false} href={"/portal/code-lab/terminal/" + encodeURIComponent(terminal.id)} key={terminal.id}>
                <span className={"terminalStatus " + terminal.status}>{String(terminal.status).toUpperCase()}</span>
                <div><b>{String(terminal.repo_name || terminal.repository_slug)}</b><small>{terminal.snapshot_ref}{terminal.snapshot_sha ? " · " + shortSha(terminal.snapshot_sha) : ""}</small></div>
                <small>{formatDate(terminal.created_at)}</small>
                <strong>OPEN →</strong>
              </Link>
            ))}
          </div>
        </section>
      ) : null}

      <section className="portalPanel">
        <div className="portalPanelHead">
          <span>YENİ ÇALIŞTIRMA</span>
          <small>IMMUTABLE SNAPSHOT · FIXED TASK · NO CMS EXEC</small>
        </div>
        <form className="portalFormGrid runnerLaunchForm" action={submitCodeRunAction}>
          <label>
            <span>Native repository</span>
            <select name="repositoryRef" required defaultValue="">
              <option value="" disabled>Repository seç</option>
              {repositories.map((repo) => (
                <option value={repo.slug} key={repo.id}>
                  {repo.name} · {repo.team_code || "CORE"} · {repo.default_branch}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span>Snapshot / branch / commit SHA</span>
            <input name="snapshotRef" defaultValue="main" maxLength={180} required />
          </label>
          <label>
            <span>Dil</span>
            <select name="language" defaultValue="python">
              {Object.keys(RUNNER_TASKS).map((language) => (
                <option value={language} key={language}>{language.toUpperCase()}</option>
              ))}
            </select>
          </label>
          <label>
            <span>Görev</span>
            <select name="task" defaultValue="python-test">
              {Object.entries(RUNNER_TASKS).map(([language, values]) => (
                <optgroup label={language.toUpperCase()} key={language}>
                  {values.map(([id,label]) => (
                    <option value={id} key={id}>{label}</option>
                  ))}
                </optgroup>
              ))}
            </select>
          </label>
          <button
            className="portalPrimaryButton"
            type="submit"
            disabled={!runner.healthy || !repositories.length}
          >
            {runner.healthy ? "RUN JOB →" : "RUNNER OFFLINE"}
          </button>
        </form>
        <p className="runnerSafetyNote">
          Serbest komut çalıştırılmaz. Portal yalnız task ID gönderir; gerçek argv Runner allowlist'inden çözülür.
          Snapshot toplamı {Math.round(RUNNER_LIMITS.maxSnapshotBytes / 1024 / 1024)} MB ve {RUNNER_LIMITS.maxFiles} dosya ile sınırlıdır.
        </p>
      </section>

      <section className="runnerTaskMatrix">
        {tasks.map((task) => (
          <article key={task.id}>
            <span>{task.language.toUpperCase()}</span>
            <b>{task.label}</b>
            <code>{task.command}</code>
          </article>
        ))}
      </section>

      <section className="portalPanel">
        <div className="portalPanelHead">
          <span>JOB HISTORY</span>
          <small>{runs.length} KAYIT</small>
        </div>
        {runs.length ? (
          <div className="runnerJobList runnerJobLinks">
            {runs.map((run) => (
              <Link prefetch={false} href={"/portal/code-lab/" + encodeURIComponent(run.id)} key={run.id}>
                <span>{String(run.language).toUpperCase()}</span>
                <div>
                  <b>{String(run.command_label)}</b>
                  <small>
                    {String(run.repo_name || run.repository_ref || "repo")}
                    {" · "}
                    {String(run.snapshot_ref || "snapshot")}
                    {run.snapshot_sha ? " · " + shortSha(run.snapshot_sha) : ""}
                  </small>
                </div>
                <em className={"state " + String(run.status)}>{String(run.status).toUpperCase()}</em>
                <small>{formatDate(run.created_at)}</small>
                <strong>OPEN →</strong>
              </Link>
            ))}
          </div>
        ) : (
          <PortalEmpty
            title="Henüz Code Lab işi yok."
            text={runner.healthy
              ? "Repository, snapshot ve sabit görevi seçerek ilk izole job'ı çalıştır."
              : "CORE Runner deploy edildiğinde job geçmişi burada oluşacak."}
          />
        )}
      </section>
    </>
  );
}
