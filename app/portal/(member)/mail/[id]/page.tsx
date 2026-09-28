import { PortalPageHeader } from "@/components/portal/PortalPage";
import { replyMailThreadAction, setMailThreadStateAction } from "@/app/portal/actions";
import { requirePortalMember } from "@/lib/portal/auth";
import { getPortalMailThread } from "@/lib/portal/db";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function PortalMailThreadPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const member = await requirePortalMember();
  const { id } = await params;
  const data = await getPortalMailThread(decodeURIComponent(id), member.id);
  if (!data) notFound();

  return (
    <>
      <PortalPageHeader
        code="ML / THREAD"
        title={String(data.thread.subject)}
        lead={"Katılımcılar · " + String(data.thread.participants || "CORE")}
        action={
          <div className="portalMailThreadActions">
            <form action={setMailThreadStateAction}>
              <input type="hidden" name="threadId" value={String(data.thread.id)} />
              <input type="hidden" name="action" value="star" />
              <button type="submit">☆ YILDIZLA</button>
            </form>
            <form action={setMailThreadStateAction}>
              <input type="hidden" name="threadId" value={String(data.thread.id)} />
              <input type="hidden" name="action" value="archive" />
              <button type="submit">ARŞİVLE</button>
            </form>
          </div>
        }
      />
      <div className="portalThread">
        {data.messages.map((message) => (
          <article key={String(message.id)}>
            <header><b>{String(message.full_name || message.email)}</b><small>{String(message.created_at)}</small></header>
            <p>{String(message.body)}</p>
            {data.attachments.filter((item) => String(item.message_id) === String(message.id)).length ? (
              <div className="portalMailAttachments">
                {data.attachments
                  .filter((item) => String(item.message_id) === String(message.id))
                  .map((item) => (
                    <a href={"/portal/files/" + encodeURIComponent(String(item.file_id))} key={String(item.file_id)}>
                      <span>{String(item.preview_kind || "FILE").toUpperCase()}</span>
                      <b>{String(item.name)}</b>
                    </a>
                  ))}
              </div>
            ) : null}
          </article>
        ))}
      </div>
      <section className="portalPanel portalMailReply">
        <div className="portalPanelHead"><span>YANIT YAZ</span><small>THREAD DEVAMI</small></div>
        <form action={replyMailThreadAction}>
          <input type="hidden" name="threadId" value={String(data.thread.id)} />
          <textarea name="body" rows={5} placeholder="Karar, durum güncellemesi veya devir teslim notu..." required />
          <button className="portalPrimaryButton" type="submit">YANITI GÖNDER →</button>
        </form>
      </section>
      <a className="portalBackLink" href="/portal/mail">← İç yazışmalara dön</a>
    </>
  );
}
