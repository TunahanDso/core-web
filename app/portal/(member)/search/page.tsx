import { PortalEmpty, PortalPageHeader } from "@/components/portal/PortalPage";
import { searchPortal } from "@/lib/portal/db";
import { requirePortalMember } from "@/lib/portal/auth";
import { formatVaultBytes, listPortalVaultFiles } from "@/lib/portal/vault";
import { listNativeRepositories } from "@/lib/portal/engineering-services";
import { portalResourceKindLabel, portalTaskStatusLabel, portalRoleLabel } from "@/lib/portal/labels";
import { listAccessiblePortalTeams, listPortalProjectRegistry, listPortalVehicleProfiles } from "@/lib/portal/control";
import { canAccessPortalTeam } from "@/lib/portal/governance";
import { listBudgetAccounts, listMeetings, listPolls } from "@/lib/portal/collaboration";

export const dynamic="force-dynamic";

type SearchRow={id:string;type:string;title:string;subtitle:string;meta:string;href:string;external?:boolean};

export default async function PortalSearchPage({
  searchParams,
}:{
  searchParams?:Promise<{q?:string;type?:string}>;
}){
  const query=searchParams ? await searchParams : {};
  const q=String(query.q||"").trim();
  const typeFilter=String(query.type||"");
  const member=await requirePortalMember();

  const [results,vaultFiles,nativeRepositories,teams,internalProjects,vehicleProfiles,meetings,polls,budgets]=q
    ? await Promise.all([
        searchPortal(q),
        listPortalVaultFiles({query:q,lifecycle:"active",limit:40,viewer:member}),
        listNativeRepositories(),
        listAccessiblePortalTeams(member),
        listPortalProjectRegistry(),
        listPortalVehicleProfiles(),
        listMeetings(member.id,100),
        listPolls(member.id),
        listBudgetAccounts(member.id,member.role==="admin"||member.role==="lead"),
      ])
    : [{tasks:[],resources:[],repositories:[],inventory:[],members:[]},[],[],[],[],[],[],[],[]];

  const needle=q.toLocaleLowerCase("tr-TR");
  const teamMatches=teams.filter(item=>[item.code,item.name,item.domain,item.description].some(v=>String(v||"").toLocaleLowerCase("tr-TR").includes(needle)));
  const internalMatches=[];
  for(const item of internalProjects){
    const matches=[item.slug,item.title,item.summary,item.domain,item.team_code,item.status].some(v=>String(v||"").toLocaleLowerCase("tr-TR").includes(needle));
    if(!matches)continue;
    const visibility=String(item.visibility||"team");
    const teamCode=String(item.team_code||"");
    const allowed=member.role==="admin"||visibility==="members"||(visibility==="leads"&&member.role==="lead")||(visibility==="team"&&Boolean(teamCode)&&await canAccessPortalTeam(member,teamCode));
    if(allowed)internalMatches.push(item);
  }
  const visibleProjectSlugs=new Set(internalMatches.map(i=>String(i.slug)));
  const accessibleTeamCodes=new Set(teams.map(i=>String(i.code).toUpperCase()));
  const vehicleMatches=vehicleProfiles.filter(item=>{
    const matches=[item.code,item.name,item.domain,item.platform_type,item.serial_number,item.project_title,item.team_name].some(v=>String(v||"").toLocaleLowerCase("tr-TR").includes(needle));
    return matches&&(member.role==="admin"||accessibleTeamCodes.has(String(item.team_code||"").toUpperCase())||visibleProjectSlugs.has(String(item.project_slug||"")));
  });
  const nativeMatches=nativeRepositories.filter(item=>[item.name,item.slug,item.project_slug,item.team_code].some(v=>String(v||"").toLocaleLowerCase("tr-TR").includes(needle)));
  const meetingMatches=meetings.filter(item=>[item.title,item.agenda,item.space_name,item.team_code,item.project_slug].some(v=>String(v||"").toLocaleLowerCase("tr-TR").includes(needle)));
  const pollMatches=polls.filter(item=>[item.title,item.description,item.team_code].some(v=>String(v||"").toLocaleLowerCase("tr-TR").includes(needle)));
  const budgetMatches=budgets.filter(item=>[item.name,item.team_code,item.project_slug,item.owner_name].some(v=>String(v||"").toLocaleLowerCase("tr-TR").includes(needle)));

  const rows:SearchRow[]=[
    ...teamMatches.map(i=>({id:"team:"+String(i.code),type:"Takım",title:String(i.name),subtitle:String(i.domain||i.description||""),meta:String(i.code),href:"/portal/teams/"+encodeURIComponent(String(i.code))})),
    ...internalMatches.map(i=>({id:"project:"+String(i.slug),type:"Proje",title:String(i.title),subtitle:String(i.summary||i.domain||""),meta:String(i.status)+" · "+String(i.readiness||0)+"%",href:"/portal/projects/"+encodeURIComponent(String(i.slug))})),
    ...vehicleMatches.map(i=>({id:"vehicle:"+String(i.id),type:"Araç",title:String(i.name),subtitle:String(i.team_name||i.team_code||"CORE"),meta:String(i.lifecycle||i.status),href:"/portal/ops"})),
    ...meetingMatches.map(i=>({id:"meeting:"+String(i.id),type:"Toplantı",title:String(i.title),subtitle:String(i.space_name||i.agenda||""),meta:String(i.status)+" · "+String(i.starts_at),href:"/portal/meetings/"+encodeURIComponent(String(i.id))})),
    ...pollMatches.map(i=>({id:"poll:"+String(i.id),type:"Oylama",title:String(i.title),subtitle:String(i.description||""),meta:String(i.status)+" · "+String(i.vote_count||0)+" oy",href:"/portal/polls?poll="+encodeURIComponent(String(i.id))})),
    ...budgetMatches.map(i=>({id:"budget:"+String(i.id),type:"Bütçe",title:String(i.name),subtitle:String(i.team_code||i.project_slug||"CORE"),meta:String(i.currency),href:"/portal/budget?account="+encodeURIComponent(String(i.id))})),
    ...vaultFiles.map(i=>({id:"vault:"+String(i.id),type:"Vault",title:String(i.title),subtitle:String(i.description||i.original_name||""),meta:"R"+String(i.revision)+" · "+formatVaultBytes(i.size_bytes),href:"/portal/library/"+encodeURIComponent(String(i.id))})),
    ...results.tasks.map(i=>({id:"task:"+String(i.id),type:"Görev",title:String(i.title),subtitle:String(i.description||""),meta:portalTaskStatusLabel(String(i.status)),href:"/portal/tasks/"+encodeURIComponent(String(i.id))})),
    ...results.resources.map(i=>({id:"resource:"+String(i.id),type:"Doküman",title:String(i.title),subtitle:String(i.description||""),meta:portalResourceKindLabel(String(i.kind)),href:i.external_url?String(i.external_url):"/portal/library",external:Boolean(i.external_url)})),
    ...nativeMatches.map(i=>({id:"native:"+String(i.id),type:"Repo",title:String(i.name),subtitle:String(i.project_slug||i.team_code||"CORE"),meta:String(i.status||"native"),href:"/portal/repositories"})),
    ...results.repositories.map(i=>({id:"repo:"+String(i.id),type:"Repo",title:String(i.name),subtitle:String(i.project_slug||i.team_code||"CORE"),meta:String(i.health||""),href:String(i.repo_url),external:true})),
    ...results.inventory.map(i=>({id:"stock:"+String(i.id),type:"Stok",title:String(i.name),subtitle:String(i.category)+" · "+String(i.location||"Konum yok"),meta:String(i.quantity)+" "+String(i.unit),href:"/portal/inventory"})),
    ...results.members.map(i=>({id:"member:"+String(i.id),type:"Üye",title:String(i.full_name||i.email),subtitle:String(i.email),meta:portalRoleLabel(String(i.role)),href:"/portal/members/"+encodeURIComponent(String(i.id))})),
  ];
  const types=Array.from(new Set(rows.map(r=>r.type))).sort();
  const visible=typeFilter?rows.filter(r=>r.type===typeFilter):rows;

  return (
    <>
      <PortalPageHeader
        code="GLOBAL SEARCH"
        title={q?"“"+q+"” için sonuçlar":"CORE içinde ara"}
        lead="Görev, dosya, repo, insan, proje, toplantı, oylama, bütçe ve araçları tek nesne dizininde bul."
      />

      <section className="portalRegistryToolbar">
        <form action="/portal/search" method="get">
          <label className="grow"><span>ARA</span><input name="q" defaultValue={q} placeholder="Hydronom, BNO055, toplantı, bütçe..." autoFocus/></label>
          <label><span>TÜR</span><select name="type" defaultValue={typeFilter}><option value="">Tümü</option>{types.map(t=><option value={t} key={t}>{t}</option>)}</select></label>
          <button type="submit">ARA</button>
        </form>
        <div className="portalRegistrySummary"><span>SONUÇ</span><b>{visible.length}</b><small>nesne</small></div>
      </section>

      {!q?<PortalEmpty title="Aramaya başla." text="İsim, proje, parça kodu veya teknik terim yaz."/>:visible.length?(
        <div className="portalDataTableShell">
          <table className="portalDataTable portalSearchDataTable">
            <thead><tr><th scope="col">Nesne</th><th scope="col">Tür</th><th scope="col">Bağlam</th><th scope="col">İşlem</th></tr></thead>
            <tbody>{visible.map(row=>(
              <tr key={row.id}>
                <td className="primaryCell"><a href={row.href} target={row.external?"_blank":undefined} rel={row.external?"noreferrer":undefined}><b>{row.title}</b><small>{row.subtitle}</small></a></td>
                <td><span className="portalStatusText">{row.type}</span></td>
                <td>{row.meta}</td>
                <td className="rowActions"><a href={row.href} target={row.external?"_blank":undefined} rel={row.external?"noreferrer":undefined}>Aç{row.external?" ↗":""}</a></td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      ):<PortalEmpty title="Sonuç yok." text="Filtreyi temizle veya farklı bir terim dene."/>}
    </>
  );
}
