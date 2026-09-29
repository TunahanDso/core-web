import Link from "next/link";
import { PortalEmpty } from "@/components/portal/PortalPage";
import { openChatChannelAction, sendChatMessageAction } from "@/app/portal/actions";
import { listPortalChannelsForMember, listPortalMessages } from "@/lib/portal/db";
import { requirePortalMember } from "@/lib/portal/auth";
import { portalRoleLabel } from "@/lib/portal/labels";

export const dynamic="force-dynamic";

export default async function PortalChatPage({
  searchParams,
}:{
  searchParams?:Promise<{channel?:string;q?:string;browse?:string}>;
}){
  const query=searchParams ? await searchParams : {};
  const member=await requirePortalMember();
  const channels=await listPortalChannelsForMember(member.id);
  const q=String(query.q||"").trim().toLocaleLowerCase("tr-TR");
  const filtered=channels.filter((channel)=>!q || [channel.name,channel.description,channel.last_message]
    .some((value)=>String(value||"").toLocaleLowerCase("tr-TR").includes(q)));
  const browse=String(query.browse||"")==="1";
  const selectedId=browse ? "" : String(query.channel||filtered[0]?.id||channels[0]?.id||"");
  const messages=selectedId ? await listPortalMessages(selectedId) : [];
  const selected=channels.find((channel)=>String(channel.id)===selectedId);

  return (
    <section className="chatAppShell">
      <header className="chatAppTopbar">
        <div className="chatAppIdentity">
          <span>CH</span>
          <div><b>CORE Chat</b><small>Hızlı koordinasyon · kalıcı kararlar rapor/görev olur</small></div>
        </div>
        <form action="/portal/chat" method="get" className="chatAppSearch">
          <input name="q" defaultValue={String(query.q||"")} placeholder="Kanal veya mesaj özeti ara..." />
          <button type="submit">Ara</button>
        </form>
        <div className="chatAppTopActions">
          <Link prefetch={false} href="/portal/meetings">Toplantılar</Link>
          <Link prefetch={false} href="/portal/mail">Mail</Link>
        </div>
      </header>

      <div className="chatAppBody">
        <aside className="chatChannelPane">
          <header><b>Kanallar</b><span>{filtered.length}</span></header>
          <div className="portalChannelList">
            {filtered.map((channel)=>{
              const active=String(channel.id)===selectedId;
              const unread=Number(channel.unread_count||0);
              return (
                <form action={openChatChannelAction} key={String(channel.id)}>
                  <input type="hidden" name="channelId" value={String(channel.id)}/>
                  <button className={active?"active":""} type="submit">
                    <div className="portalChannelTitle"><b># {String(channel.name)}</b>{unread>0?<em>{unread}</em>:null}</div>
                    <small>{String(channel.last_message||channel.description||"Henüz mesaj yok.")}</small>
                  </button>
                </form>
              );
            })}
          </div>
        </aside>

        <main className="chatConversationPane">
          {selected?(
            <>
              <header className="chatConversationHeader">
                <div><Link prefetch={false} className="chatMobileBack" href="/portal/chat?browse=1">←</Link><span>#</span><div><b>{String(selected.name)}</b><small>{String(selected.description||"CORE takım kanalı")}</small></div></div>
                <small>{messages.length} mesaj</small>
              </header>

              <div className="portalMessages chatMessageViewport">
                {messages.length?messages.map((message)=>{
                  const author=String(message.full_name||message.email);
                  const mine=String(message.email)===member.email;
                  const initials=author.split(/s+/).slice(0,2).map((x)=>x[0]).join("").toUpperCase();
                  return (
                    <article className={mine?"mine":""} key={String(message.id)}>
                      <span className="portalMessageAvatar">{initials||"CR"}</span>
                      <div className="portalMessageContent">
                        <header><div><b>{author}</b><span>{portalRoleLabel(String(message.role))}</span></div><small>{String(message.created_at)}</small></header>
                        <p>{String(message.body)}</p>
                      </div>
                    </article>
                  );
                }):<PortalEmpty title="Kanal sessiz." text="İlk mesajı aşağıdan gönder."/>}
              </div>

              <form className="portalChatComposer chatFixedComposer" action={sendChatMessageAction}>
                <input type="hidden" name="channelId" value={selectedId}/>
                <div><textarea name="body" rows={2} placeholder={"#"+String(selected.name)+" kanalına yaz..."} required/><small>Karar çıktıysa Toplantı/Task/Document kaydına taşı.</small></div>
                <button type="submit">Gönder</button>
              </form>
            </>
          ):<PortalEmpty title="Kanal seç." text="Sol listeden bir kanal aç."/>}
        </main>
      </div>
    </section>
  );
}
