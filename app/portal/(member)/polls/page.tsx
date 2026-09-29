import { PortalEmpty, PortalPageHeader } from "@/components/portal/PortalPage";
import { requirePortalMember } from "@/lib/portal/auth";
import { listAccessiblePortalTeams } from "@/lib/portal/control";
import { listPolls } from "@/lib/portal/collaboration";
import { closePollAction, createGeneralPollAction, votePollAction } from "@/app/portal/collaboration-actions";

export const dynamic="force-dynamic";

function href(input:Record<string,string|undefined>){
  const p=new URLSearchParams();
  Object.entries(input).forEach(([k,v])=>{if(v)p.set(k,v)});
  return "/portal/polls"+(p.toString()?"?"+p.toString():"");
}

export default async function PortalPollsPage({
  searchParams,
}:{
  searchParams?:Promise<{poll?:string;create?:string;filter?:string;created?:string}>;
}){
  const query=searchParams ? await searchParams : {};
  const member=await requirePortalMember();
  const [polls,teams]=await Promise.all([listPolls(member.id),listAccessiblePortalTeams(member)]);
  const canCreate=member.role==="admin" || member.role==="lead";
  const filter=String(query.filter||"open")==="all"?"all":"open";
  const visible=filter==="open"?polls.filter((p)=>String(p.status)==="open"):polls;
  const selectedId=String(query.poll||visible[0]?.id||"");
  const selected=polls.find((p)=>String(p.id)===selectedId);

  return (
    <>
      <PortalPageHeader
        code="OYLAMALAR"
        title="CORE Oylamaları"
        lead="Toplantı içi kararları ve genel/takım oylamalarını tek kayıt modelinde yürüt; genel oylamalar otomatik bildirim üretir."
        action={canCreate?<a className="portalPrimaryButton" href={href({create:"1"})}>+ OYLAMA AÇ</a>:undefined}
      />

      {query.created?<div className="portalSuccess">Oylama açıldı ve hedef kitleye bildirim gönderildi.</div>:null}

      <section className="portalRegistryToolbar">
        <nav className="portalSegmentedControl">
          <a className={filter==="open"?"active":""} href="/portal/polls">Açık</a>
          <a className={filter==="all"?"active":""} href="/portal/polls?filter=all">Tümü</a>
        </nav>
        <div className="portalRegistrySummary"><span>OYLAMA</span><b>{visible.length}</b><small>görünür kayıt</small></div>
      </section>

      {query.create==="1" && canCreate?(
        <section className="portalToolSurface">
          <div className="portalToolBody">
            <div className="portalInlineToolHead">
              <div><b>Genel / takım oylaması aç</b><small>Açıldığında ilgili kullanıcılara Portal bildirimi düşer.</small></div>
              <a href="/portal/polls">Kapat</a>
            </div>
            <form className="portalFormGrid" action={createGeneralPollAction}>
              <label className="portalFormWide"><span>Başlık</span><input name="title" required autoFocus /></label>
              <label>
                <span>Kapsam</span>
                <select name="scope" defaultValue="global">
                  <option value="global">Tüm CORE</option>
                  <option value="team">Takım</option>
                </select>
              </label>
              <label>
                <span>Takım</span>
                <select name="teamCode" defaultValue="">
                  <option value="">Takım seç</option>
                  {teams.map((t)=><option value={String(t.code)} key={String(t.code)}>{String(t.code)} · {String(t.name)}</option>)}
                </select>
              </label>
              <label><span>Kapanış</span><input name="closesAt" type="datetime-local"/></label>
              <label className="portalFormWide"><span>Açıklama</span><textarea name="description" rows={3}/></label>
              <label className="portalFormWide"><span>Seçenekler · her satır bir seçenek</span><textarea name="options" rows={5} required placeholder={"Evet\nHayır\nÇekimser"}/></label>
              <button className="portalPrimaryButton" type="submit">Oylamayı aç</button>
            </form>
          </div>
        </section>
      ):null}

      <div className="pollWorkspace">
        <section className="pollRegistryPane">
          {visible.length?(
            <div className="portalDataTableShell">
              <table className="portalDataTable portalPollDataTable">
                <thead><tr><th scope="col">Oylama</th><th scope="col">Kapsam</th><th scope="col">Oy</th><th scope="col">Durum</th><th scope="col">İşlem</th></tr></thead>
                <tbody>
                  {visible.map((poll)=>(
                    <tr className={String(poll.id)===selectedId?"selected":""} key={String(poll.id)}>
                      <td className="primaryCell"><a href={href({poll:String(poll.id),filter})}><b>{String(poll.title)}</b><small>{String(poll.description||poll.creator_name||"")}</small></a></td>
                      <td>{String(poll.scope)}{poll.team_code?" · "+String(poll.team_code):""}</td>
                      <td className="numeric">{String(poll.vote_count||0)}</td>
                      <td><span className={"portalStatusText "+String(poll.status)}>{String(poll.status)}</span></td>
                      <td className="rowActions"><a href={href({poll:String(poll.id),filter})}>Aç</a></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ):<PortalEmpty title="Görünür oylama yok." text="Yeni bir genel/takım oylaması açıldığında veya toplantıda oylama oluşturulduğunda burada görünür."/>}
        </section>

        <aside className="pollDetailPane">
          {selected?(()=>{
            const options=selected.options as Record<string,unknown>[];
            const total=Number(selected.vote_count||0);
            return (
              <>
                <header>
                  <span>{String(selected.scope).toUpperCase()}</span>
                  <h2>{String(selected.title)}</h2>
                  <p>{String(selected.description||"")}</p>
                  <small>{String(selected.creator_name||"")} · {String(selected.created_at)}</small>
                </header>
                <form className="pollVoteForm" action={votePollAction}>
                  <input type="hidden" name="pollId" value={String(selected.id)}/>
                  <input type="hidden" name="returnTo" value={href({poll:String(selected.id),filter})}/>
                  {options.map((option)=>{
                    const votes=Number(option.votes||0);
                    const pct=total?Math.round(votes/total*100):0;
                    return (
                      <label key={String(option.id)}>
                        <input type="radio" name="optionId" value={String(option.id)} required disabled={String(selected.status)!=="open"}/>
                        <span>
                          <b>{String(option.label)}</b>
                          <i><em style={{width:pct+"%"}}/></i>
                          <small>{votes} oy · %{pct}</small>
                        </span>
                      </label>
                    );
                  })}
                  {String(selected.status)==="open"?<button type="submit">Oy ver / değiştir</button>:null}
                </form>
                {String(selected.created_by)===member.id && String(selected.status)==="open"?(
                  <form action={closePollAction} className="pollCloseForm">
                    <input type="hidden" name="pollId" value={String(selected.id)}/>
                    <input type="hidden" name="returnTo" value={href({poll:String(selected.id),filter})}/>
                    <button type="submit">Oylamayı kapat</button>
                  </form>
                ):null}
              </>
            );
          })():<PortalEmpty title="Bir oylama seç." text="Sonuçlar ve oy verme alanı burada görünür."/>}
        </aside>
      </div>
    </>
  );
}
