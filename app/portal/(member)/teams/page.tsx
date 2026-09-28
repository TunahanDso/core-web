import { PortalEmpty, PortalPageHeader } from "@/components/portal/PortalPage";
import { createPortalTeamAction } from "@/app/portal/control-actions";
import { requirePortalMember } from "@/lib/portal/auth";
import { listAccessiblePortalTeams } from "@/lib/portal/control";
import { memberHasPortalCapability } from "@/lib/portal/governance";

export const dynamic = "force-dynamic";

export default async function PortalTeamsPage({
  searchParams,
}: {
  searchParams?: Promise<{ deleted?: string }>;
}) {
  const member = await requirePortalMember();
  const [teams,canManageTeams] = await Promise.all([
    listAccessiblePortalTeams(member),
    memberHasPortalCapability(member,"teams.manage"),
  ]);
  const query: { deleted?: string } = searchParams ? await searchParams : {};

  return (
    <>
      <PortalPageHeader
        code="TM / TAKIMLAR"
        title="Takım Çalışma Alanları"
        lead="CORE birimlerini, teknik sahipliği ve erişim sınırlarını tek yerden yönet. Her takım kendi proje, araç, görev, Vault ve repository bağlamını taşır."
      />

      {query.deleted ? (
        <div className="portalSuccess">{query.deleted} takımı silindi; bağlı mühendislik varlıkları korunarak takım bağları kaldırıldı.</div>
      ) : null}

      {canManageTeams ? (
        <section className="portalManagementStrip">
          <div className="portalManagementIntro">
            <span>TEAM REGISTRY</span>
            <h2>Yeni CORE birimi oluştur</h2>
            <p>Takım kodu oluşturulduktan sonra kimlik olarak sabit kalır; ad, domain, açıklama ve görünürlük takım sayfasından değiştirilebilir.</p>
          </div>
          <form className="portalManagementForm" action={createPortalTeamAction}>
            <label><span>Kod</span><input name="code" placeholder="AI / MAR-2" maxLength={16} required /></label>
            <label><span>Takım adı</span><input name="name" placeholder="CORE Intelligence" required /></label>
            <label><span>Domain</span><input name="domain" placeholder="AI / perception / autonomy" /></label>
            <label><span>Görünürlük</span><select name="visibility" defaultValue="restricted"><option value="restricted">Yalnız yetkililer / üyeler</option><option value="members">Tüm CORE üyeleri</option></select></label>
            <label className="wide"><span>Açıklama</span><textarea name="description" rows={3} placeholder="Takımın kapsamı, sorumluluğu ve çalışma alanı..." /></label>
            <button className="portalPrimaryButton" type="submit">TAKIM OLUŞTUR →</button>
          </form>
        </section>
      ) : null}

      {teams.length ? (
        <section className="portalEntityGrid portalTeamDirectory">
          {teams.map((team) => {
            const teamCode=String(team.code);
            const members=Number(team.member_count || 0);
            const projects=Number(team.project_count || 0);
            const vehicles=Number(team.vehicle_count || 0);
            return (
              <a href={"/portal/teams/" + encodeURIComponent(teamCode)} className="portalEntityCard portalTeamEntityCard" key={teamCode}>
                <header className="portalEntityHeader">
                  <div className="portalEntityMark">{teamCode.slice(0,3)}</div>
                  <div className="portalEntityIdentity">
                    <span className="portalEntityEyebrow">CORE UNIT · {teamCode}</span>
                    <b>{String(team.domain || "Engineering")}</b>
                  </div>
                  <span className="portalEntityState active">{String(team.visibility).toUpperCase()}</span>
                </header>

                <div className="portalEntityBody">
                  <h2>{String(team.name)}</h2>
                  <p>{String(team.description || "Takım çalışma alanı ve teknik sahiplik yüzeyi.")}</p>
                </div>

                <div className="portalEntityMetrics">
                  <div><b>{members}</b><span>ÜYE</span></div>
                  <div><b>{projects}</b><span>PROJE</span></div>
                  <div><b>{vehicles}</b><span>ARAÇ</span></div>
                </div>

                <footer className="portalEntityFooter">
                  <div className="portalEntityTags">
                    <span>{teamCode}</span>
                    <span>{String(team.status || "active").toUpperCase()}</span>
                  </div>
                  <strong>WORKSPACE →</strong>
                </footer>
              </a>
            );
          })}
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
