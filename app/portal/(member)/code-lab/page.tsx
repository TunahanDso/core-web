import { PortalEmpty, PortalPageHeader } from "@/components/portal/PortalPage";
import { requirePortalMember } from "@/lib/portal/auth";
import {
  getEngineeringServiceStatus,
  listNativeRepositories,
  listPortalCodeRuns,
  RUNNER_TASKS,
} from "@/lib/portal/engineering-services";
import { submitCodeRunAction } from "@/app/portal/engineering-actions";

export const dynamic = "force-dynamic";

export default async function PortalCodeLabPage({
  searchParams,
}: {
  searchParams?: Promise<{ submitted?: string }>;
}) {
  const member = await requirePortalMember();
  const [services, repositories, runs, query] = await Promise.all([
    Promise.resolve(getEngineeringServiceStatus()),
    listNativeRepositories(),
    listPortalCodeRuns(member.id, 60),
    searchParams ?? Promise.resolve({}),
  ]);

  const tasks = Object.entries(RUNNER_TASKS).flatMap(([language, values]) =>
    values.map(([id,label,command]) => ({ language, id, label, command }))
  );

  return (
    <>
      <PortalPageHeader
        code="CL / CODE LAB"
        title="İzole Kod Laboratuvarı"
        lead="Repo snapshot'larını CORE Runner'a gönder; derleme, test ve statik analiz hiçbir zaman CMS Worker içinde çalışmaz."
      />

      {query.submitted ? <div className="portalSuccess">Runner işi kuyruğa gönderildi.</div> : null}

      <section className="runnerBoundary">
        <div>
          <span>PORTAL / CONTROL PLANE</span>
          <b>Job metadata · auth · audit</b>
        </div>
        <i>→</i>
        <div className={services.runner.configured ? "ready" : "offline"}>
          <span>CORE RUNNER</span>
          <b>{services.runner.configured ? "BAĞLI" : "HENÜZ BAĞLI DEĞİL"}</b>
        </div>
        <i>→</i>
        <div>
          <span>SANDBOX / CONTAINER</span>
          <b>CPU · RAM · timeout · network policy</b>
        </div>
      </section>

      <section className="portalPanel">
        <div className="portalPanelHead"><span>YENİ ÇALIŞTIRMA</span><small>FIXED TASK CONTRACT · NO CMS EXEC</small></div>
        <form className="portalFormGrid" action={submitCodeRunAction}>
          <label>
            <span>Native repository</span>
            <select name="repositoryRef" required defaultValue="">
              <option value="" disabled>Repository seç</option>
              {repositories.map((item) => (
                <option value={String(item.service_repository_id || item.id)} key={String(item.id)}>
                  {String(item.name)} · {String(item.default_branch || "main")}
                </option>
              ))}
            </select>
          </label>
          <label><span>Snapshot / branch</span><input name="snapshotRef" defaultValue="main" /></label>
          <label>
            <span>Dil</span>
            <select name="language" defaultValue="python">
              {Object.keys(RUNNER_TASKS).map((language) => <option value={language} key={language}>{language.toUpperCase()}</option>)}
            </select>
          </label>
          <label>
            <span>Görev</span>
            <select name="task" defaultValue="python-test">
              {tasks.map((task) => (
                <option value={task.id} key={task.id}>{task.language.toUpperCase()} · {task.label}</option>
              ))}
            </select>
          </label>
          <button className="portalPrimaryButton" type="submit" disabled={!services.runner.configured || !repositories.length}>
            {services.runner.configured ? "RUNNER'A GÖNDER →" : "RUNNER SERVİSİ BEKLENİYOR"}
          </button>
        </form>
        <p className="runnerSafetyNote">Komut alanı kullanıcıdan serbest metin almıyor. Portal görev kimliği gönderiyor; gerçek komut ve sandbox politikası ayrı Runner servisinde çözülüyor.</p>
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
        <div className="portalPanelHead"><span>SON JOB'LAR</span><small>{runs.length} KAYIT</small></div>
        {runs.length ? (
          <div className="runnerJobList">
            {runs.map((run) => (
              <article key={String(run.id)}>
                <span>{String(run.language).toUpperCase()}</span>
                <div><b>{String(run.command_label)}</b><small>{String(run.repository_ref || "repo")} · {String(run.snapshot_ref || "snapshot")}</small></div>
                <em className={"state " + String(run.status)}>{String(run.status).toUpperCase()}</em>
                <small>{String(run.created_at)}</small>
              </article>
            ))}
          </div>
        ) : <PortalEmpty title="Henüz Code Lab işi yok." text="CORE Runner bağlandığında ilk build/test job'ı buradan başlatılabilir." />}
      </section>
    </>
  );
}
