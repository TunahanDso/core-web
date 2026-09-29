import { PortalEmpty, PortalPageHeader } from "@/components/portal/PortalPage";
import { createPortalTeamAction } from "@/app/portal/control-actions";
import { requirePortalMember } from "@/lib/portal/auth";
import { listAccessiblePortalTeams } from "@/lib/portal/control";
import { memberHasPortalCapability } from "@/lib/portal/governance";

export const dynamic = "force-dynamic";

export default async function PortalTeamsPage({
  searchParams,
}: {
  searchParams?: Promise<{ deleted?: string; q?: string; visibility?: string; create?: string }>;
}) {
  const member = await requirePortalMember();
  const [teams,canManageTeams] = await Promise.all([
    listAccessiblePortalTeams(member),
    memberHasPortalCapability(member,"teams.manage"),
  ]);
  const query = searchParams ? await searchParams : {};
  const q=String(query.q || "").trim().toLocaleLowerCase("tr-TR");
  const visibility=["restricted","members"].includes(String(query.visibility)) ? String(query.visibility) : "";
  const createOpen=canManageTeams && String(query.create || "")==="1";
  const filtered=teams.filter((team)=>{
    if(visibility && String(team.visibility)!==visibility) return false;
    if(q){
      const haystack=[team.code,team.name,team.domain,team.description]
        .map((value)=>String(value || ""))
        .join(" ")
        .toLocaleLowerCase("tr-TR");
      if(!haystack.includes(q)) return false;
    }
    return true;
  });

  return (
    <>
      <PortalPageHeader
        code="TAKIMLAR"
        title="Takım Çalışma Alanları"
        lead="CORE birimlerini erişim, domain, üye, proje ve araç sayılarıyla karşılaştır."
        action={canManageTeams ? <a className="portalPrimaryButton" href="/portal/teams?create=1">+ TAKIM OLUŞTUR</a> : undefined}
      />

      {query.deleted ? (
        <div className="portalSuccess">{query.deleted} takımı silindi; bağlı mühendislik varlıkları korunarak takım bağları kaldırıldı.</div>
      ) : null}

      <section className="portalRegistryToolbar">
        <form action="/portal/teams" method="get">
          <label className="grow">
            <span>ARA</span>
            <input name="q" defaultValue={String(query.q || "")} placeholder="Takım adı, kod, domain..." />
          </label>
          <label>
            <span>GÖRÜNÜRLÜK</span>
            <select name="visibility" defaultValue={visibility}>
              <option value="">Tümü</option>
              <option value="restricted">Restricted</option>
              <option value="members">Tüm üyeler</option>
            </select>
          </label>
          <button type="submit">UYGULA</button>
          {(q || visibility) ? <a className="subtle" href="/portal/teams">Temizle</a> : null}
        </form>
        <div className="portalRegistrySummary">
          <span>SONUÇ</span>
          <b>{filtered.length}</b>
          <small>{teams.length} takım</small>
        </div>
      </section>

      {createOpen ? (
        <section className="portalToolSurface">
          <div className="portalToolBody">
            <div className="portalInlineToolHead">
              <div><b>Yeni CORE birimi oluştur</b><small>Kod oluşturulduktan sonra kimlik olarak sabit kalır.</small></div>
              <a href="/portal/teams">Kapat</a>
            </div>
            <form className="portalFormGrid" action={createPortalTeamAction}>
              <label><span>Kod</span><input name="code" placeholder="AI / MAR-2" maxLength={16} required autoFocus /></label>
              <label><span>Takım adı</span><input name="name" placeholder="CORE Intelligence" required /></label>
              <label><span>Domain</span><input name="domain" placeholder="AI / perception / autonomy" /></label>
              <label><span>Görünürlük</span><select name="visibility" defaultValue="restricted"><option value="restricted">Yalnız yetkililer / üyeler</option><option value="members">Tüm CORE üyeleri</option></select></label>
              <label className="portalFormWide"><span>Açıklama</span><textarea name="description" rows={3} placeholder="Takımın kapsamı, sorumluluğu ve çalışma alanı..." /></label>
              <button className="portalPrimaryButton" type="submit">Takımı oluştur</button>
            </form>
          </div>
        </section>
      ) : null}

      {filtered.length ? (
        <div className="portalDataTableShell">
          <table className="portalDataTable portalTeamDataTable">
            <thead>
              <tr>
                <th scope="col">Takım</th>
                <th scope="col">Domain</th>
                <th scope="col">Görünürlük</th>
                <th scope="col">Üye</th>
                <th scope="col">Proje</th>
                <th scope="col">Araç</th>
                <th scope="col">Durum</th>
                <th scope="col">İşlem</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((team)=>{
                const teamCode=String(team.code);
                return (
                  <tr key={teamCode}>
                    <td className="primaryCell">
                      <a className="portalTeamTableIdentity" href={"/portal/teams/" + encodeURIComponent(teamCode)}>
                        <span>{teamCode.slice(0,3)}</span>
                        <div><b>{String(team.name)}</b><small>{teamCode}</small></div>
                      </a>
                    </td>
                    <td>{String(team.domain || "Engineering")}</td>
                    <td><span className="portalStatusText">{String(team.visibility)}</span></td>
                    <td className="numeric">{Number(team.member_count || 0)}</td>
                    <td className="numeric">{Number(team.project_count || 0)}</td>
                    <td className="numeric">{Number(team.vehicle_count || 0)}</td>
                    <td><span className={"portalStatusText "+String(team.status || "active")}>{String(team.status || "active")}</span></td>
                    <td className="rowActions"><a href={"/portal/teams/" + encodeURIComponent(teamCode)}>Workspace</a></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <PortalEmpty
          title={teams.length ? "Bu filtrelerle takım yok." : "Erişilebilir takım alanın yok."}
          text={teams.length ? "Filtreleri temizle veya farklı bir arama yap." : "Takım üyeliğin veya açık bir takım alanı olduğunda burada görünecek."}
        />
      )}
    </>
  );
}
