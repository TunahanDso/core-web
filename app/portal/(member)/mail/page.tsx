import { PortalEmpty, PortalPageHeader } from "@/components/portal/PortalPage";
import { createMailThreadAction, setMailThreadStateAction } from "@/app/portal/actions";
import { requirePortalMember } from "@/lib/portal/auth";
import { listPortalMailThreads, listPortalMembers } from "@/lib/portal/db";
import { listPortalFiles } from "@/lib/portal/files";

export const dynamic = "force-dynamic";

const views = [
  ["inbox","Gelen"],
  ["sent","Gönderilen"],
  ["starred","Yıldızlı"],
  ["archive","Arşiv"],
] as const;

export default async function PortalMailPage({
  searchParams,
}: {
  searchParams?: Promise<{ view?: string }>;
}) {
  const member = await requirePortalMember();
  const query = searchParams ? await searchParams : {};
  const view = views.some(([key]) => key === query.view)
    ? query.view as "inbox" | "sent" | "starred" | "archive"
    : "inbox";

  const [threads, members, files] = await Promise.all([
    listPortalMailThreads(member.id,view),
    listPortalMembers(),
    listPortalFiles({ limit: 18 }),
  ]);

  return (
    <>
      <PortalPageHeader
        code="ML / CORE MAIL"
        title="İç Yazışma"
        lead="Teknik karar, talep, onay ve devir teslimleri sohbetten ayıran kalıcı takım postası. Thread'ler, ekler, okunma durumu ve arşiv CORE içinde tutulur."
      />

      <section className="portalMailbox">
        <aside className="portalMailboxSidebar">
          <a className="compose" href="#compose">+ YENİ YAZIŞMA</a>
          <nav>
            {views.map(([key,label]) => (
              <a className={view === key ? "active" : ""} href={"/portal/mail?view="+key} key={key}>
                <span>{key === "inbox" ? "IN" : key === "sent" ? "OUT" : key === "starred" ? "★" : "AR"}</span>
                <b>{label}</b>
              </a>
            ))}
          </nav>
          <div className="portalMailboxIdentity">
            <span>HESAP</span>
            <b>{member.fullName || member.email}</b>
            <small>{member.email}</small>
          </div>
        </aside>

        <main className="portalMailboxMain">
          <header className="portalMailboxHead">
            <div><span>{views.find(([key]) => key === view)?.[1]}</span><b>{threads.length} thread</b></div>
            <small>CORE INTERNAL MAIL · D1</small>
          </header>

          <div className="portalMailRows">
            {threads.length ? threads.map((thread) => (
              <article className={!thread.read_at ? "unread" : ""} key={String(thread.id)}>
                <form action={setMailThreadStateAction}>
                  <input type="hidden" name="threadId" value={String(thread.id)} />
                  <input type="hidden" name="action" value={thread.starred_at ? "unstar" : "star"} />
                  <button className={thread.starred_at ? "star active" : "star"} type="submit">{thread.starred_at ? "★" : "☆"}</button>
                </form>
                <a href={"/portal/mail/" + encodeURIComponent(String(thread.id))}>
                  <div className="portalMailSender">
                    <b>{String(thread.last_author || thread.participants || "CORE")}</b>
                    <small>{String(thread.participants || "")}</small>
                  </div>
                  <div className="portalMailSubject">
                    <b>{String(thread.subject)}</b>
                    <p>{String(thread.preview || "")}</p>
                  </div>
                  <span>{String(thread.message_count || 1)}</span>
                  <time>{String(thread.updated_at)}</time>
                </a>
                <form action={setMailThreadStateAction}>
                  <input type="hidden" name="threadId" value={String(thread.id)} />
                  <input type="hidden" name="action" value={view === "archive" ? "restore" : "archive"} />
                  <button className="archive" type="submit">{view === "archive" ? "GERİ AL" : "ARŞİV"}</button>
                </form>
              </article>
            )) : <PortalEmpty title="Bu klasör boş." text="CORE yazışmaları burada kalıcı thread'ler halinde görünür." />}
          </div>
        </main>
      </section>

      <section className="portalPanel portalMailComposePanel" id="compose">
        <div className="portalPanelHead"><span>YENİ YAZIŞMA</span><small>CORE INTERNAL MAIL</small></div>
        <form className="portalMailCompose" action={createMailThreadAction}>
          <label><span>Konu</span><input name="subject" required placeholder="Hydronom güç dağıtımı · Rev.B onayı" /></label>
          <fieldset>
            <legend>Alıcılar</legend>
            <div className="portalRecipientGrid">
              {members
                .filter((item) => String(item.status) === "active" && String(item.id) !== member.id)
                .map((item) => (
                  <label key={String(item.id)}>
                    <input type="checkbox" name="participantId" value={String(item.id)} />
                    <span>{String(item.full_name || item.email)}</span>
                  </label>
                ))}
            </div>
          </fieldset>

          {files.length ? (
            <fieldset>
              <legend>CORE Vault ekleri</legend>
              <div className="portalAttachmentPicker">
                {files.map((file) => (
                  <label key={String(file.id)}>
                    <input type="checkbox" name="attachmentId" value={String(file.id)} />
                    <span><b>{String(file.name)}</b><small>{String(file.project_slug || file.team_code || "CORE")}</small></span>
                  </label>
                ))}
              </div>
            </fieldset>
          ) : null}

          <label><span>Mesaj</span><textarea name="body" rows={7} required placeholder="Karar, talep, test sonucu veya devir teslim notunu yaz..." /></label>
          <button className="portalPrimaryButton" type="submit">YAZIŞMAYI GÖNDER →</button>
        </form>
      </section>
    </>
  );
}
