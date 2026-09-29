import { PortalEmpty, PortalPageHeader } from "@/components/portal/PortalPage";
import { openChatChannelAction, sendChatMessageAction } from "@/app/portal/actions";
import { listPortalChannelsForMember, listPortalMessages } from "@/lib/portal/db";
import { requirePortalMember } from "@/lib/portal/auth";
import { portalRoleLabel } from "@/lib/portal/labels";

export const dynamic = "force-dynamic";

export default async function PortalChatPage({
  searchParams,
}: {
  searchParams?: Promise<{ channel?: string }>;
}) {
  const query = searchParams ? await searchParams : {};
  const member = await requirePortalMember();
  const channels = await listPortalChannelsForMember(member.id);
  const selectedId = query.channel || String(channels[0]?.id || "");
  const messages = selectedId ? await listPortalMessages(selectedId) : [];
  const selected = channels.find((channel) => String(channel.id) === selectedId);

  return (
    <>
      <PortalPageHeader
        code="CH / SOHBET"
        title="Takım Sohbeti"
        lead="Hızlı koordinasyon burada kalır; kalıcı kararları görev, doküman veya rapora taşı."
      />

      <section className="portalChatLayout portalWorkbenchSurface">
        <aside className="portalChatSidebar">
          <header>
            <div>
              <span>KANALLAR</span>
              <b>{channels.length}</b>
            </div>
            <small>CORE LIVE</small>
          </header>

          <div className="portalChannelList">
            {channels.map((channel) => {
              const active = String(channel.id) === selectedId;
              const unread = Number(channel.unread_count || 0);
              return (
                <form action={openChatChannelAction} key={String(channel.id)}>
                  <input type="hidden" name="channelId" value={String(channel.id)} />
                  <button className={active ? "active" : ""} type="submit">
                    <div className="portalChannelTitle">
                      <b># {String(channel.name)}</b>
                      {unread > 0 ? <em>{String(unread)}</em> : null}
                    </div>
                    <small>{String(channel.last_message || channel.description || "Henüz mesaj yok.")}</small>
                  </button>
                </form>
              );
            })}
          </div>
        </aside>

        <div className="portalChatRoom">
          <header className="portalChatRoomHeader">
            <div className="portalChatRoomIdentity">
              <span>#</span>
              <div>
                <b>{String(selected?.name || "Kanal")}</b>
                <small>{String(selected?.description || "CORE takım kanalı")}</small>
              </div>
            </div>
            <div className="portalChatRoomMeta">
              <span>{messages.length} MESAJ</span>
              <b>{selected ? "AKTİF KANAL" : "KANAL SEÇ"}</b>
            </div>
          </header>

          <div className="portalMessages">
            {messages.length ? messages.map((message) => {
              const author = String(message.full_name || message.email);
              const mine = String(message.email) === member.email;
              const initials = author.split(/\s+/).slice(0,2).map((part) => part[0]).join("").toUpperCase();
              return (
                <article className={mine ? "mine" : ""} key={String(message.id)}>
                  <span className="portalMessageAvatar">{initials || "CR"}</span>
                  <div className="portalMessageContent">
                    <header>
                      <div>
                        <b>{author}</b>
                        <span>{portalRoleLabel(String(message.role))}</span>
                      </div>
                      <small>{String(message.created_at)}</small>
                    </header>
                    <p>{String(message.body)}</p>
                  </div>
                </article>
              );
            }) : <PortalEmpty title="Kanal sessiz." text="İlk mesajı aşağıdan gönder." />}
          </div>

          {selectedId ? (
            <form className="portalChatComposer" action={sendChatMessageAction}>
              <input type="hidden" name="channelId" value={selectedId} />
              <div>
                <textarea name="body" rows={2} placeholder={"#" + String(selected?.name || "kanal") + " kanalına yaz..."} required />
                <small>Hızlı koordinasyon · Kalıcı kararları göreve veya dokümana taşı.</small>
              </div>
              <button type="submit">GÖNDER ↗</button>
            </form>
          ) : null}
        </div>
      </section>
    </>
  );
}
