import { PortalEmpty, PortalPageHeader } from "@/components/portal/PortalPage";
import { requirePortalMember } from "@/lib/portal/auth";
import { listAccessiblePortalTeams } from "@/lib/portal/control";

export const dynamic = "force-dynamic";

export default async function PortalTeamsPage() {
  const member = await requirePortalMember();
  const teams = await listAccessiblePortalTeams(member);

  return (
    <>
      <PortalPageHeader
        code="TM / TAKIMLAR"
        title="Takım Çalışma Alanları"
        lead="Yalnızca erişimin olan CORE birimleri görünür. Proje, araç, görev, Vault ve teknik sahiplik takım sınırında bir araya gelir."
      />

      {teams.length ? (
        <section className="portalTeamGrid">
          {teams.map((team) => (
            <a href={"/portal/teams/" + encodeURIComponent(String(team.code))} className="portalTeamCard" key={String(team.code)}>
              <header>
                <span>{String(team.code)}</span>
                <b>{String(team.domain || "CORE")}</b>
              </header>
              <h2>{String(team.name)}</h2>
              <p>{String(team.description || "Takım çalışma alanı.")}</p>
              <div className="portalTeamFacts">
                <div><b>{String(team.member_count || 0)}</b><span>üye</span></div>
                <div><b>{String(team.project_count || 0)}</b><span>proje</span></div>
                <div><b>{String(team.vehicle_count || 0)}</b><span>araç</span></div>
              </div>
              <footer><span>{String(team.visibility).toUpperCase()}</span><b>TAKIMI AÇ →</b></footer>
            </a>
          ))}
        </section>
      ) : (
        <PortalEmpty
          title="Erişilebilir takım alanın yok."
          text="Takım üyeliğin veya açık bir takım alanı olduğunda burada görünecek."
        />
      )}
    </>
  );
}
