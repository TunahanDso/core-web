import Link from "next/link";
import { PortalEmpty, PortalPageHeader } from "@/components/portal/PortalPage";
import { requirePortalMember } from "@/lib/portal/auth";
import { listPortalMembers } from "@/lib/portal/db";
import { listAccessiblePortalTeams, listPortalProjectRegistry } from "@/lib/portal/control";
import {
  listBudgetAccounts,
  listBudgetAllocations,
  listBudgetEntries,
} from "@/lib/portal/collaboration";
import {
  approveBudgetEntryAction,
  createBudgetAccountAction,
  createBudgetAllocationAction,
  createBudgetEntryAction,
} from "@/app/portal/collaboration-actions";

export const dynamic="force-dynamic";

function money(minor:unknown,currency:unknown){
  const value=Number(minor||0)/100;
  return new Intl.NumberFormat("tr-TR",{style:"currency",currency:String(currency||"TRY")}).format(value);
}

function href(input:Record<string,string|undefined>){
  const p=new URLSearchParams();
  Object.entries(input).forEach(([k,v])=>{if(v)p.set(k,v)});
  return "/portal/budget"+(p.toString()?"?"+p.toString():"");
}

export default async function PortalBudgetPage({
  searchParams,
}:{
  searchParams?:Promise<{account?:string;view?:string;tool?:string;created?:string;entry?:string}>;
}){
  const query=searchParams ? await searchParams : {};
  const member=await requirePortalMember();
  const canWrite=member.role==="admin" || member.role==="lead";
  const [accounts,members,teams,projects]=await Promise.all([
    listBudgetAccounts(member.id,canWrite),listPortalMembers(),listAccessiblePortalTeams(member),listPortalProjectRegistry()
  ]);
  const accountId=String(query.account||accounts[0]?.id||"");
  const selected=accounts.find((a)=>String(a.id)===accountId);
  const [entries,allocations]=accountId
    ? await Promise.all([listBudgetEntries(accountId),listBudgetAllocations(accountId)])
    : [[],[]];
  const view=String(query.view||"ledger")==="allocations"?"allocations":"ledger";
  const pending=entries.filter((e)=>String(e.status)==="pending");
  const activeMembers=members.filter((m)=>String(m.status)==="active");

  return (
    <>
      <PortalPageHeader
        code="BÜTÇE"
        title="CORE Bütçe"
        lead="Takım ve proje bütçelerini hesap, tahsis, gelir-gider, taahhüt ve onay kayıtlarıyla izlenebilir bir ledger üzerinde yönet."
        action={canWrite?<a className="portalPrimaryButton" href={href({tool:"account"})}>+ BÜTÇE HESABI</a>:undefined}
      />

      {query.created?<div className="portalSuccess">Bütçe hesabı oluşturuldu.</div>:null}

      <section className="budgetSummaryStrip">
        <article><span>HESAP</span><b>{accounts.length}</b><small>aktif bütçe hesabı</small></article>
        <article><span>TRY BAKİYE</span><b>{money(accounts.filter(a=>String(a.currency)==="TRY").reduce((sum,a)=>sum+Number(a.balance_minor||0),0),"TRY")}</b><small>görülebilen TRY hesapları</small></article>
        <article><span>BEKLEYEN ONAY</span><b>{pending.length}</b><small>seçili hesap</small></article>
        <article><span>TAAHHÜT</span><b>{selected?money(selected.committed_minor,selected.currency):"—"}</b><small>seçili hesap</small></article>
      </section>

      {query.tool==="account" && canWrite?(
        <section className="portalToolSurface">
          <div className="portalToolBody">
            <div className="portalInlineToolHead"><div><b>Yeni bütçe hesabı</b><small>Takım veya proje bazlı finans çalışma alanı.</small></div><Link prefetch={false} href="/portal/budget">Kapat</Link></div>
            <form className="portalFormGrid" action={createBudgetAccountAction}>
              <label><span>Hesap adı</span><input name="name" required autoFocus/></label>
              <label><span>Para birimi</span><select name="currency" defaultValue="TRY"><option value="TRY">TRY</option><option value="USD">USD</option><option value="EUR">EUR</option></select></label>
              <label><span>Açılış bakiyesi</span><input name="openingBalance" type="number" min="0" step="0.01" defaultValue="0"/></label>
              <label><span>Takım</span><select name="teamCode" defaultValue=""><option value="">CORE</option>{teams.map(t=><option value={String(t.code)} key={String(t.code)}>{String(t.code)} · {String(t.name)}</option>)}</select></label>
              <label><span>Proje</span><select name="projectSlug" defaultValue=""><option value="">Proje yok</option>{projects.map(p=><option value={String(p.slug)} key={String(p.slug)}>{String(p.title)}</option>)}</select></label>
              <label><span>Sorumlu</span><select name="ownerMemberId" defaultValue=""><option value="">Atanmadı</option>{activeMembers.map(m=><option value={String(m.id)} key={String(m.id)}>{String(m.full_name||m.email)}</option>)}</select></label>
              <button className="portalPrimaryButton" type="submit">Hesabı oluştur</button>
            </form>
          </div>
        </section>
      ):null}

      {accounts.length?(
        <div className="portalDataTableShell">
          <table className="portalDataTable portalBudgetAccountTable">
            <thead><tr><th scope="col">Hesap</th><th scope="col">Kapsam</th><th scope="col">Bakiye</th><th scope="col">Tahsis</th><th scope="col">Taahhüt</th><th scope="col">Sorumlu</th><th scope="col">İşlem</th></tr></thead>
            <tbody>
              {accounts.map((account)=>(
                <tr className={String(account.id)===accountId?"selected":""} key={String(account.id)}>
                  <td className="primaryCell"><a href={href({account:String(account.id)})}><b>{String(account.name)}</b><small>{String(account.currency)}</small></a></td>
                  <td className="mono">{String(account.team_code||account.project_slug||"CORE")}</td>
                  <td className="numeric"><b>{money(account.balance_minor,account.currency)}</b></td>
                  <td className="numeric">{money(account.allocated_minor,account.currency)}</td>
                  <td className="numeric">{money(account.committed_minor,account.currency)}</td>
                  <td>{String(account.owner_name||"Atanmadı")}</td>
                  <td className="rowActions"><a href={href({account:String(account.id)})}>Ledger</a></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ):<PortalEmpty title="Bütçe hesabı yok." text="İlk takım/proje bütçe hesabını oluşturduğunda burada bakiye ve hareketleri izlenir."/>}

      {selected?(
        <section className="budgetAccountWorkspace">
          <header>
            <div><span>{String(selected.currency)}</span><h2>{String(selected.name)}</h2><p>{String(selected.team_code||selected.project_slug||"CORE")} · bakiye {money(selected.balance_minor,selected.currency)}</p></div>
            <nav className="portalSegmentedControl">
              <a className={view==="ledger"?"active":""} href={href({account:accountId})}>Ledger</a>
              <a className={view==="allocations"?"active":""} href={href({account:accountId,view:"allocations"})}>Tahsisler</a>
            </nav>
            {canWrite?<div className="budgetAccountActions"><a href={href({account:accountId,tool:"entry"})}>+ Hareket</a><a href={href({account:accountId,view:"allocations",tool:"allocation"})}>+ Tahsis</a></div>:null}
          </header>

          {query.tool==="entry" && canWrite?(
            <div className="portalToolBody budgetInlineTool">
              <form className="portalFormGrid" action={createBudgetEntryAction}>
                <input type="hidden" name="accountId" value={accountId}/>
                <label><span>Tür</span><select name="entryType" defaultValue="expense"><option value="expense">Gider</option><option value="income">Gelir</option><option value="commitment">Taahhüt</option></select></label>
                <label><span>Kategori</span><input name="category" placeholder="elektronik / seyahat / üretim"/></label>
                <label><span>Tutar</span><input name="amount" type="number" min="0" step="0.01" required/></label>
                <label><span>Tarih</span><input name="occurredAt" type="date" required/></label>
                <label><span>Takım</span><input name="teamCode" defaultValue={String(selected.team_code||"")}/></label>
                <label><span>Proje</span><input name="projectSlug" defaultValue={String(selected.project_slug||"")}/></label>
                <label className="portalFormWide"><span>Açıklama</span><input name="description" required/></label>
                <button className="portalPrimaryButton" type="submit">Hareketi kaydet</button>
              </form>
            </div>
          ):null}

          {query.tool==="allocation" && canWrite?(
            <div className="portalToolBody budgetInlineTool">
              <form className="portalFormGrid" action={createBudgetAllocationAction}>
                <input type="hidden" name="accountId" value={accountId}/>
                <label><span>Kategori</span><input name="category" required/></label>
                <label><span>Tahsis</span><input name="amount" type="number" min="0" step="0.01" required/></label>
                <label><span>Dönem başlangıcı</span><input name="periodStart" type="date"/></label>
                <label><span>Dönem bitişi</span><input name="periodEnd" type="date"/></label>
                <label className="portalFormWide"><span>Not</span><input name="notes"/></label>
                <button className="portalPrimaryButton" type="submit">Tahsis ekle</button>
              </form>
            </div>
          ):null}

          {view==="ledger"?(
            entries.length?(
              <div className="portalDataTableShell">
                <table className="portalDataTable portalBudgetLedgerTable">
                  <thead><tr><th scope="col">Tarih</th><th scope="col">Tür</th><th scope="col">Kategori / Açıklama</th><th scope="col">Tutar</th><th scope="col">Durum</th><th scope="col">Kayıt / Onay</th><th scope="col">İşlem</th></tr></thead>
                  <tbody>
                    {entries.map((e)=>(
                      <tr key={String(e.id)}>
                        <td className="mono">{String(e.occurred_at)}</td>
                        <td><span className={"portalStatusText "+String(e.entry_type)}>{String(e.entry_type)}</span></td>
                        <td className="primaryCell"><div><b>{String(e.category)}</b><small>{String(e.description)}</small></div></td>
                        <td className="numeric"><b>{money(e.amount_minor,e.currency)}</b></td>
                        <td><span className={"portalStatusText "+String(e.status)}>{String(e.status)}</span></td>
                        <td><div className="portalCellStack"><b>{String(e.creator_name||"")}</b><small>{e.approver_name?"onay: "+String(e.approver_name):"onay bekliyor"}</small></div></td>
                        <td className="rowActions">
                          {canWrite && String(e.status)==="pending"?(
                            <form action={approveBudgetEntryAction}>
                              <input type="hidden" name="entryId" value={String(e.id)}/>
                              <input type="hidden" name="accountId" value={accountId}/>
                              <button name="status" value="approved" type="submit">Onayla</button>
                              <button name="status" value="rejected" type="submit">Reddet</button>
                            </form>
                          ):null}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ):<PortalEmpty title="Ledger boş." text="İlk gelir, gider veya taahhüt kaydı burada görünür."/>
          ):(
            allocations.length?(
              <div className="portalDataTableShell">
                <table className="portalDataTable portalBudgetAllocationTable">
                  <thead><tr><th scope="col">Kategori</th><th scope="col">Tahsis</th><th scope="col">Dönem</th><th scope="col">Not</th></tr></thead>
                  <tbody>{allocations.map(a=>(
                    <tr key={String(a.id)}><td><b>{String(a.category)}</b></td><td className="numeric">{money(a.amount_minor,a.currency)}</td><td className="mono">{String(a.period_start||"—")} → {String(a.period_end||"—")}</td><td>{String(a.notes||"")}</td></tr>
                  ))}</tbody>
                </table>
              </div>
            ):<PortalEmpty title="Tahsis kaydı yok." text="Kategori bazlı bütçe limitlerini burada tanımlayabilirsin."/>
          )}
        </section>
      ):null}
    </>
  );
}
