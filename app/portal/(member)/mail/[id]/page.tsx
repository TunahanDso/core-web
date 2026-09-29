import { PortalPageHeader } from "@/components/portal/PortalPage";
import { requirePortalMember } from "@/lib/portal/auth";
import { getPortalMailThread } from "@/lib/portal/db";
import { listPortalMailAttachments, listPortalMailParticipants } from "@/lib/portal/mailbox";
import { formatVaultBytes, listPortalVaultFiles } from "@/lib/portal/vault";
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
  const [data, participants, attachments, vaultFiles] = await Promise.all([
    getPortalMailThread(threadId, member.id),
    listPortalMailParticipants(threadId),
    listPortalMailAttachments(threadId),
    listPortalVaultFiles({ lifecycle: "active", limit: 40, viewer: member }),
  ]);
  const query: { replied?: string; sent?: string } = searchParams ? await searchParams : {};
  if (!data) notFound();

  return (
    <>
      <PortalPageHeader
        code="ML / THREAD"
        title={String(data.thread.subject)}
        lead="Katılımcılar, ekler, kararlar ve yanıtlar tek kalıcı yazışma zincirinde."
        action={<a className="portalOutlineButton" href="/portal/mail">← GELEN KUTUSU</a>}
      />

      {query.sent ? <div className="portalSuccess">Mail gönderildi.</div> : null}
      {query.replied ? <div className="portalSuccess">Yanıt thread'e eklendi.</div> : null}

      <section className="mailThreadToolbar">
        <div className="mailThreadParticipants">
          <span>KATILIMCILAR · {participants.length}</span>
          <div>
            {participants.map((person) => (
              <b key={String(person.id)} title={String(person.email)}>{String(person.full_name || person.email)}</b>
            ))}
          </div>
        </div>
        <div className="mailThreadActions">
          <a href={"/portal/mail?forward=" + encodeURIComponent(threadId) + "#compose"}>İLET ↗</a>
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

      <section className="mailThreadWorkbench portalWorkbenchSurface">
        <div className="portalThread mailboxConversation">
          {data.messages.map((message, index) => {
            const author = String(message.full_name || message.email);
            const initials = author.split(/\s+/).slice(0,2).map((part) => part[0]).join("").toUpperCase();
            return (
              <article
                className={String(message.email) === member.email ? "mine" : ""}
                key={String(message.id)}
              >
                <header>
                  <div>
                    <span>{initials || "CR"}</span>
                    <div><b>{author}</b><small>{String(message.email)}</small></div>
                  </div>
                  <small>{String(message.created_at)}</small>
                </header>

                <p>{String(message.body)}</p>

                {attachments.some((item) => String(item.message_id) === String(message.id)) ? (
                  <div className="mailMessageAttachments">
                    {attachments.filter((item) => String(item.message_id) === String(message.id)).map((item) => (
                      <a href={"/api/portal/vault/" + encodeURIComponent(String(item.vault_file_id)) + "?revision=" + encodeURIComponent(String(item.revision)) + "&download=1"} key={String(item.id)}>
                        <span>{String(item.extension || "FILE").toUpperCase()}</span>
                        <div><b>{String(item.title)}</b><small>R{String(item.revision)} · {formatVaultBytes(item.size_bytes)}</small></div>
                      </a>
                    ))}
                  </div>
                ) : null}

                <footer><small>MESAJ {String(index + 1).padStart(2,"0")} / {String(data.messages.length).padStart(2,"0")}</small></footer>
              </article>
            );
          })}
        </div>

        <aside className="portalMailReply">
          <div className="mailboxComposeHeader">
            <div>
              <span>TÜMÜNÜ YANITLA</span>
              <b>Thread devamı</b>
            </div>
            <small>{participants.length} KİŞİ</small>
          </div>

          <form action={replyMailboxThreadAction}>
            <input type="hidden" name="threadId" value={threadId} />
            <textarea name="body" rows={9} placeholder="Karar, durum güncellemesi veya devir teslim notu..." required />

            {vaultFiles.length ? (
              <details className="mailReplyAttachments">
                <summary>VAULT'TAN TEKNİK DOSYA EKLE</summary>
                <div className="mailboxAttachmentPicker">
                  {vaultFiles.slice(0,24).map((file) => (
                    <label key={String(file.id)}>
                      <input type="checkbox" name="vaultFileId" value={String(file.id)} />
                      <span><b>{String(file.title)}</b><small>R{String(file.revision)} · {String(file.extension || "FILE").toUpperCase()}</small></span>
                    </label>
                  ))}
                </div>
              </details>
            ) : null}

            <button className="portalPrimaryButton" type="submit">YANITI GÖNDER ↗</button>
          </form>
        </aside>
      </section>
    </>
  );
}
