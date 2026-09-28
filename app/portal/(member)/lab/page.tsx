import { PortalPageHeader } from "@/components/portal/PortalPage";
import CodeLab from "@/components/portal/CodeLab";
import { requirePortalMember } from "@/lib/portal/auth";
import { listPortalRepositories } from "@/lib/portal/db";
import { listPortalCodeRuns, portalRunnerStatus } from "@/lib/portal/runner";

export const dynamic = "force-dynamic";

export default async function PortalLabPage() {
  const member = await requirePortalMember();
  const [repositories,runs] = await Promise.all([
    listPortalRepositories(),
    listPortalCodeRuns(member.id,15),
  ]);
  const status = portalRunnerStatus();

  return (
    <>
      <PortalPageHeader
        code="LAB / SANDBOX"
        title="Kod Laboratuvarı"
        lead="Python, JavaScript, TypeScript, C ve C++ kodunu portalın kendi izole Cloudflare Sandbox container'ında çalıştır. Kod doğrudan ana Worker sürecinde çalıştırılmaz."
      />

      <section className="portalRunnerHealth">
        <article className={status.configured ? "ready" : "pending"}>
          <span>RUNNER</span><b>{status.configured ? "BAĞLI" : "PROVISIONING"}</b><small>{status.provider}</small>
        </article>
        <article><span>İZOLASYON</span><b>CONTAINER</b><small>ana CMS / portal Worker'ından ayrı</small></article>
        <article><span>TIMEOUT</span><b>15s</b><small>tek çalıştırma sınırı</small></article>
        <article><span>DİLLER</span><b>5</b><small>Python · JS · TS · C · C++</small></article>
      </section>

      <CodeLab repositories={repositories} />

      <section className="portalPanel portalRunHistory">
        <div className="portalPanelHead"><span>SON ÇALIŞTIRMALAR</span><small>{runs.length} kayıt</small></div>
        <div className="portalRunList">
          {runs.length ? runs.map((run) => (
            <article key={String(run.id)}>
              <span>{String(run.language).toUpperCase()}</span>
              <b>{String(run.status).toUpperCase()}</b>
              <small>{run.duration_ms != null ? String(run.duration_ms) + " ms" : "—"}</small>
              <code>{String(run.id).slice(0,8)}</code>
              <time>{String(run.created_at)}</time>
            </article>
          )) : <p className="portalMuted">Henüz kod çalıştırma kaydı yok.</p>}
        </div>
      </section>

      {!status.configured ? (
        <section className="portalPreviewNotice engineering">
          <span>DEPLOY GEREKLİ</span>
          <b>Runner kodu repo içinde hazır; Cloudflare Containers provisioning ve iki bridge ayarı gerekiyor.</b>
          <p><code>runner/</code> klasörü bağımsız deploy edilir. Ardından ana portalda <code>CORE_RUNNER_URL</code> ve secret olarak <code>CORE_RUNNER_TOKEN</code> tanımlanır. Bu ayrım keyfî kodun CMS sürecinde çalışmasını engeller.</p>
        </section>
      ) : null}
    </>
  );
}
