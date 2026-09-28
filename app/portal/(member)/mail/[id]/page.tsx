import { PortalPageHeader } from "@/components/portal/PortalPage";
import { requirePortalMember } from "@/lib/portal/auth";
import { getPortalMailThread } from "@/lib/portal/db";
import { listPortalMailParticipants } from "@/lib/portal/mailbox";
import {
  mutateMailboxThreadAction,
  replyMailboxThreadAction,
} from "@/app/portal/mailbox-actions";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function PortalMailThreadPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams?: Promise<{ replied?: string; sent?: string }>;
}) {
  const member = await requirePortalMember();
  const { id } = await params;
  const threadId = decodeURIComponent(id);
  const [data, participants, query] = await Promise.all([
    getPortalMailThread(threadId, member.id),
    listPortalMailParticipants(threadId),
    searchParams ?? Promise.resolve({}),
  ]);
  if (!data) notFound();

  return (
    <>
      <PortalPageHeader
        code="ML / THREAD"
        title={String(data.thread.subject)}
        lead="Katılımcıları, karar geçmişini ve yanıtları tek kalıcı yazışma zincirinde tut."
        action={<a className="portalOutlineButton" href="/portal/mail">← GELEN KUTUSU</a>}
      />

      {query.sent ? <div className="portalSuccess">Mail gönderildi.</div> : null}
      {query.replied ? <div className="portalSuccess">Yanıt thread'e eklendi.</div> : null}

      <section className="mailThreadToolbar">
        <div className="mailThreadParticipants">
          <span>KATILIMCILAR</span>
          <div>
            {participants.map((person) => (
              <b key={String(person.id)} title={String(person.email)}>{String(person.full_name || person.email)}</b>
            ))}
          </div>
        </div>
        <div className="mailThreadActions">
          <a href={"/portal/mail?forward=" + encodeURIComponent(threadId) + "#compose"}>İLET →</a>
          <form action={mutateMailboxThreadAction}>
            <input type="hidden" name="threadId" value={threadId} />
            <input type="hidden" name="returnTo" value="/portal/mail?folder=archive" />
            <button name="operation" value="archive" type="submit">ARŞİVLE</button>
          </form>
          <form action={mutateMailboxThreadAction}>
            <input type="hidden" name="threadId" value={threadId} />
            <input type="hidden" name="returnTo" value="/portal/mail?folder=trash" />
            <button name="operation" value="trash" type="submit">ÇÖPE TAŞI</button>
          </form>
          <form action={mutateMailboxThreadAction}>
            <input type="hidden" name="threadId" value={threadId} />
            <input type="hidden" name="returnTo" value={"/portal/mail/" + encodeURIComponent(threadId)} />
            <button name="operation" value="star" type="submit">☆ YILDIZ</button>
          </form>
        </div>
      </section>

      <div className="portalThread mailboxConversation">
        {data.messages.map((message, index) => (
          <article
            className={String(message.email) === member.email ? "mine" : ""}
            key={String(message.id)}
          >
            <header>
              <div>
                <span>{String(message.full_name || message.email).slice(0,2).toUpperCase()}</span>
                <div><b>{String(message.full_name || message.email)}</b><small>{String(message.email)}</small></div>
              </div>
              <small>{String(message.created_at)}</small>
            </header>
            <p>{String(message.body)}</p>
            <footer><small>MSG {String(index + 1).padStart(2,"0")} / {String(data.messages.length).padStart(2,"0")}</small></footer>
          </article>
        ))}
      </div>

      <section className="portalPanel portalMailReply">
        <div className="portalPanelHead"><span>TÜMÜNÜ YANITLA</span><small>{participants.length} KATILIMCI · THREAD DEVAMI</small></div>
        <form action={replyMailboxThreadAction}>
          <input type="hidden" name="threadId" value={threadId} />
          <textarea name="body" rows={6} placeholder="Karar, durum güncellemesi veya devir teslim notu..." required />
          <button className="portalPrimaryButton" type="submit">YANITI GÖNDER →</button>
        </form>
      </section>
    </>
  );
}
