import { PortalEmpty, PortalPageHeader } from "@/components/portal/PortalPage";
import { sendChatMessageAction } from "@/app/portal/actions";
import { listPortalChannels, listPortalMessages } from "@/lib/portal/db";
import { portalRoleLabel } from "@/lib/portal/labels";

export const dynamic = "force-dynamic";

export default async function PortalChatPage({
  searchParams,
}: {
  searchParams?: Promise<{ channel?: string }>;
}) {
  const query = searchParams ? await searchParams : {};
  const channels = await listPortalChannels();
  const selectedId = query.channel || String(channels[0]?.id || "");
  const messages = selectedId ? await listPortalMessages(selectedId) : [];
  const selected = channels.find((channel) => String(channel.id) === selectedId);

  return (
    <>
      <PortalPageHeader code="CH / SOHBET" title="Takım Sohbeti" lead="Mühendislik ve saha işleri için hızlı koordinasyon. Sohbetten daha uzun yaşaması gereken kararlar daha sonra göreve, dokümana veya rapora dönüştürülmeli." />
      <section className="portalChatLayout">
        <aside>
          <span>KANALLAR</span>
          {channels.map((channel) => (
            <a className={String(channel.id) === selectedId ? "active" : ""} href={"/portal/chat?channel=" + encodeURIComponent(String(channel.id))} key={String(channel.id)}>
              <b># {String(channel.name)}</b>
              <small>{String(channel.description || "")}</small>
            </a>
          ))}
        </aside>
        <div className="portalChatRoom">
          <header><span>#</span><div><b>{String(selected?.name || "Kanal")}</b><small>{String(selected?.description || "")}</small></div></header>
          <div className="portalMessages">
            {messages.length ? messages.map((message) => (
              <article key={String(message.id)}>
                <div><b>{String(message.full_name || message.email)}</b><span>{portalRoleLabel(String(message.role))}</span><small>{String(message.created_at)}</small></div>
                <p>{String(message.body)}</p>
              </article>
            )) : <PortalEmpty title="Kanal sessiz." text="İlk mesajı aşağıdan gönder." />}
          </div>
          {selectedId ? (
            <form className="portalChatComposer" action={sendChatMessageAction}>
              <input type="hidden" name="channelId" value={selectedId} />
              <textarea name="body" rows={3} placeholder="Takıma yaz..." required />
              <button type="submit">GÖNDER →</button>
            </form>
          ) : null}
        </div>
      </section>
    </>
  );
}
