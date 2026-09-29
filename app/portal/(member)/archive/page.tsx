import { PortalEmpty, PortalPageHeader } from "@/components/portal/PortalPage";
import { requirePortalMember } from "@/lib/portal/auth";
import { listPortalResources } from "@/lib/portal/db";
import { formatVaultBytes, listPortalVaultFiles } from "@/lib/portal/vault";

export const dynamic="force-dynamic";

export default async function PortalArchivePage({
  searchParams,
}:{
  searchParams?:Promise<{q?:string}>;
}){
  const query=searchParams ? await searchParams : {};
  const member=await requirePortalMember();
  const [archived,explicitArchive,legacy]=await Promise.all([
    listPortalVaultFiles({lifecycle:"archived",limit:300,viewer:member}),
    listPortalVaultFiles({kind:"archive",lifecycle:"active",limit:150,viewer:member}),
    listPortalResources("archive"),
  ]);
  const files=[...archived,...explicitArchive.filter(candidate=>!archived.some(item=>String(item.id)===String(candidate.id)))];
  const q=String(query.q||"").trim().toLocaleLowerCase("tr-TR");
  const fileRows=files.filter(item=>!q||[item.title,item.description,item.original_name,item.project_slug,item.team_code].some(v=>String(v||"").toLocaleLowerCase("tr-TR").includes(q)));
  const resourceRows=legacy.filter(item=>!q||[item.title,item.description,item.project_slug,item.team_code].some(v=>String(v||"").toLocaleLowerCase("tr-TR").includes(q)));

  return (
    <>
      <PortalPageHeader
        code="ARŞİV"
        title="Mühendislik Arşivi"
        lead="Emekli tasarımlar, tarihsel kanıtlar ve toplantı raporlarını silmeden, kaynağıyla birlikte koru."
        action={<a className="portalOutlineButton" href="/portal/library?state=archived">Vault arşivi</a>}
      />

      <section className="portalRegistryToolbar">
        <form action="/portal/archive" method="get">
          <label className="grow"><span>ARA</span><input name="q" defaultValue={String(query.q||"")} placeholder="Dosya, toplantı raporu, proje..."/></label>
          <button type="submit">ARA</button>
          {q?<a className="subtle" href="/portal/archive">Temizle</a>:null}
        </form>
        <div className="portalRegistrySummary"><span>KAYIT</span><b>{fileRows.length+resourceRows.length}</b><small>arşiv öğesi</small></div>
      </section>

      {(fileRows.length||resourceRows.length)?(
        <div className="portalDataTableShell">
          <table className="portalDataTable portalArchiveDataTable">
            <thead><tr><th scope="col">Arşiv kaydı</th><th scope="col">Kaynak</th><th scope="col">Revizyon</th><th scope="col">Kapsam</th><th scope="col">Boyut</th><th scope="col">İşlem</th></tr></thead>
            <tbody>
              {fileRows.map(item=>(
                <tr key={"vault:"+String(item.id)}>
                  <td className="primaryCell"><a href={"/portal/library/"+encodeURIComponent(String(item.id))}><b>{String(item.title)}</b><small>{String(item.description||item.original_name)}</small></a></td>
                  <td>Vault</td><td className="mono">R{String(item.revision)}</td><td className="mono">{String(item.project_slug||item.team_code||"CORE")}</td><td className="numeric">{formatVaultBytes(item.size_bytes)}</td><td className="rowActions"><a href={"/portal/library/"+encodeURIComponent(String(item.id))}>Aç</a></td>
                </tr>
              ))}
              {resourceRows.map(item=>(
                <tr key={"resource:"+String(item.id)}>
                  <td className="primaryCell"><div><b>{String(item.title)}</b><small>{String(item.description||"")}</small></div></td>
                  <td>{String(item.tags_json||"").includes("meeting")?"Toplantı raporu":"Legacy / Resource"}</td><td className="mono">—</td><td className="mono">{String(item.project_slug||item.team_code||"CORE")}</td><td className="numeric">—</td><td className="rowActions">{item.external_url?<a href={String(item.external_url)}>Aç</a>:null}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ):<PortalEmpty title="Arşiv boş." text="Dosya yaşam döngüsü Arşiv olduğunda veya toplantı raporu üretildiğinde burada görünür."/>}
    </>
  );
}
