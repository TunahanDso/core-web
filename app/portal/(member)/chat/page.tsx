import { PortalEmpty, PortalPageHeader } from "@/components/portal/PortalPage";
import { sendChatMessageAction } from "@/app/portal/actions";
import { listPortalChannels, listPortalMessages } from "@/lib/portal/db";

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
      <PortalPageHeader code="CH / CHAT" title="Team Chat" lead="Fast coordination for engineering and field work. Decisions that must survive chat should later be promoted into tasks, documents or reports." />
      <section className="portalChatLayout">
        <aside>
          <span>CHANNELS</span>
          {channels.map((channel) => (
            <a className={String(channel.id) === selectedId ? "active" : ""} href={"/portal/chat?channel=" + encodeURIComponent(String(channel.id))} key={String(channel.id)}>
              <b># {String(channel.name)}</b>
              <small>{String(channel.description || "")}</small>
            </a>
          ))}
        </aside>
        <div className="portalChatRoom">
          <header><span>#</span><div><b>{String(selected?.name || "Channel")}</b><small>{String(selected?.description || "")}</small></div></header>
          <div className="portalMessages">
            {messages.length ? messages.map((message) => (
              <article key={String(message.id)}>
                <div><b>{String(message.full_name || message.email)}</b><span>{String(message.role).toUpperCase()}</span><small>{String(message.created_at)}</small></div>
                <p>{String(message.body)}</p>
              </article>
            )) : <PortalEmpty title="Channel is quiet." text="Send the first message below." />}
          </div>
          {selectedId ? (
            <form className="portalChatComposer" action={sendChatMessageAction}>
              <input type="hidden" name="channelId" value={selectedId} />
              <textarea name="body" rows={3} placeholder="Write to the team..." required />
              <button type="submit">SEND →</button>
            </form>
          ) : null}
        </div>
      </section>
    </>
  );
}
