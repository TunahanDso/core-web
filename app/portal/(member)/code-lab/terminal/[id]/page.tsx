import { notFound } from "next/navigation";
import LiveCodeTerminal from "@/components/portal/LiveCodeTerminal";
import { PortalPageHeader } from "@/components/portal/PortalPage";
import { closeCodeTerminalAction } from "@/app/portal/engineering-actions";
import { requirePortalMember } from "@/lib/portal/auth";
import { getPortalCodeTerminal, probeCodeRunner } from "@/lib/portal/code-lab";

export const dynamic = "force-dynamic";

function localDate(value: unknown) {
  const text = String(value || "");
  if (!text) return "—";
  try {
    return new Intl.DateTimeFormat("tr-TR", {
      dateStyle:"medium",
      timeStyle:"medium",
      timeZone:"Europe/Istanbul",
    }).format(new Date(text));
  } catch {
    return text;
  }
}

export default async function PortalCodeTerminalPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams?: Promise<{ created?: string; closed?: string }>;
}) {
  const member = await requirePortalMember();
  const { id } = await params;
  const terminalId = decodeURIComponent(id);
  const [detail,runner] = await Promise.all([
    getPortalCodeTerminal(member,terminalId),
    probeCodeRunner(),
  ]);
  const query: { created?: string; closed?: string } = searchParams ? await searchParams : {};
  if (!detail) notFound();

  const terminal = detail.terminal;
  const connectable = Boolean(detail.socketUrl) && ["ready","connected"].includes(String(terminal.status));

  return (
    <>
      <PortalPageHeader
        code="CL / LIVE TERMINAL"
        title={String(terminal.repo_name || terminal.repository_slug)}
        lead="Immutable repository snapshot üzerinde açılan, stdin/stdout akışı WebSocket ile taşınan izole CORE Runner terminali."
        action={<a className="portalOutlineButton" href="/portal/code-lab">← CODE LAB</a>}
      />

      {query.created === "1" ? <div className="portalSuccess">Live terminal workspace hazırlandı. Shell bağlantısı açılıyor.</div> : null}
      {query.closed === "1" ? <div className="portalSuccess">Terminal oturumu kapatıldı ve container durduruldu.</div> : null}

      <section className="codeTerminalHero">
        <div>
          <span>SESSION</span>
          <code>{terminal.id}</code>
        </div>
        <div>
          <span>REPOSITORY</span>
          <b>{String(terminal.repo_name || terminal.repository_slug)}</b>
          <small>{terminal.repository_slug}</small>
        </div>
        <div>
          <span>SNAPSHOT</span>
          <b>{terminal.snapshot_ref}</b>
          <small>{terminal.snapshot_sha ? terminal.snapshot_sha.slice(0,12) : "hazırlanıyor"}</small>
        </div>
        <div>
          <span>STATUS</span>
          <b className={"terminalStatus " + terminal.status}>{String(terminal.status).toUpperCase()}</b>
          <small>{runner.healthy ? "Runner online" : "Runner health doğrulanamadı"}</small>
        </div>
        <div>
          <span>EXPIRES</span>
          <b>{localDate(terminal.expires_at)}</b>
          <small>maks. 30 dakika</small>
        </div>
      </section>

      {connectable ? (
        <LiveCodeTerminal
          socketUrl={detail.socketUrl}
          socketToken={detail.socketToken}
          repository={String(terminal.repo_name || terminal.repository_slug)}
          snapshotRef={terminal.snapshot_ref}
          snapshotSha={terminal.snapshot_sha}
        />
      ) : (
        <section className="liveTerminalUnavailable">
          <span>TERMINAL OTURUMU BAĞLANTIYA KAPALI</span>
          <h2>{String(terminal.status).toUpperCase()}</h2>
          <p>Bu oturum sona ermiş, süresi dolmuş veya hazırlık sırasında hata almış olabilir. Code Lab üzerinden yeni bir terminal açabilirsin.</p>
          <a className="portalPrimaryButton" href="/portal/code-lab">YENİ TERMINAL AÇ →</a>
        </section>
      )}

      <section className="codeTerminalSecurity">
        <article><span>ISOLATION</span><b>Cloudflare Container</b><p>Shell CMS Worker içinde değil, ayrı ephemeral container instance üzerinde çalışır.</p></article>
        <article><span>NETWORK</span><b>DENY</b><p>Terminal runtime dış internete çıkamaz; repository snapshot başlangıçta R2 üzerinden hazırlanır.</p></article>
        <article><span>AUTH</span><b>SESSION CAPABILITY</b><p>WebSocket yalnız bu terminal oturumuna ait kısa ömürlü token ile açılır.</p></article>
        <article><span>FILESYSTEM</span><b>EPHEMERAL</b><p>Terminalde yaptığın değişiklikler otomatik commit değildir. Kalıcı değişiklikler repo workspace üzerinden commit edilir.</p></article>
      </section>

      {!["closed","failed","expired"].includes(String(terminal.status)) ? (
        <form className="codeTerminalClose" action={closeCodeTerminalAction}>
          <input type="hidden" name="terminalId" value={terminal.id} />
          <div>
            <b>OTURUMU SONLANDIR</b>
            <span>Shell process kapanır ve bu terminale ayrılmış container durdurulur.</span>
          </div>
          <button className="portalDangerButton" type="submit">TERMINALİ KAPAT</button>
        </form>
      ) : null}
    </>
  );
}
