import { PortalPageHeader } from "@/components/portal/PortalPage";
import { searchPortal } from "@/lib/portal/db";
import { requirePortalMember } from "@/lib/portal/auth";
import { formatVaultBytes, listPortalVaultFiles } from "@/lib/portal/vault";
import { listNativeRepositories } from "@/lib/portal/engineering-services";
import { portalResourceKindLabel, portalTaskStatusLabel, portalRoleLabel } from "@/lib/portal/labels";
import {
  listAccessiblePortalTeams,
  listPortalProjectRegistry,
  listPortalVehicleProfiles,
} from "@/lib/portal/control";
import { canAccessPortalTeam } from "@/lib/portal/governance";

export const dynamic = "force-dynamic";

export default async function PortalSearchPage({
  searchParams,
}: {
  searchParams?: Promise<{ q?: string }>;
}) {
  const query = searchParams ? await searchParams : {};
  const q = String(query.q || "").trim();
  const member = await requirePortalMember();
  const [results, vaultFiles, nativeRepositories, teams, internalProjects, vehicleProfiles] = q
    ? await Promise.all([
        searchPortal(q),
        listPortalVaultFiles({ query: q, lifecycle: "active", limit: 40, viewer: member }),
        listNativeRepositories(),
        listAccessiblePortalTeams(member),
        listPortalProjectRegistry(),
        listPortalVehicleProfiles(),
      ])
    : [
        { tasks: [], resources: [], repositories: [], inventory: [], members: [] },
        [],
        [],
        [],
        [],
        [],
      ];
  const needle = q.toLocaleLowerCase("tr-TR");
  const teamMatches = q
    ? teams.filter((item) =>
        [item.code,item.name,item.domain,item.description].some((value) =>
          String(value || "").toLocaleLowerCase("tr-TR").includes(needle)
        )
      )
    : [];

  const internalMatches = [];
  if (q) {
    for (const item of internalProjects) {
      const matches = [item.slug,item.title,item.summary,item.domain,item.team_code,item.status]
        .some((value) => String(value || "").toLocaleLowerCase("tr-TR").includes(needle));
      if (!matches) continue;
      const visibility = String(item.visibility || "team");
      const teamCode = String(item.team_code || "");
      const allowed =
        member.role === "admin" ||
        visibility === "members" ||
        (visibility === "leads" && member.role === "lead") ||
        (visibility === "team" && Boolean(teamCode) && await canAccessPortalTeam(member,teamCode));
      if (allowed) internalMatches.push(item);
    }
  }

  const visibleProjectSlugs = new Set(internalMatches.map((item) => String(item.slug)));
  const accessibleTeamCodes = new Set(teams.map((item) => String(item.code).toUpperCase()));
  const vehicleMatches = q
    ? vehicleProfiles.filter((item) => {
        const matches = [item.code,item.name,item.domain,item.platform_type,item.serial_number,item.project_title,item.team_name]
          .some((value) => String(value || "").toLocaleLowerCase("tr-TR").includes(needle));
        if (!matches) return false;
        return member.role === "admin" ||
          accessibleTeamCodes.has(String(item.team_code || "").toUpperCase()) ||
          visibleProjectSlugs.has(String(item.project_slug || ""));
      })
    : [];

  const nativeMatches = q
    ? nativeRepositories.filter((item) =>
        [item.name,item.slug,item.project_slug,item.team_code].some((value) => String(value || "").toLowerCase().includes(q.toLowerCase()))
      )
    : [];
  const total =
    results.tasks.length +
    results.resources.length +
    results.repositories.length +
    results.inventory.length +
    results.members.length +
    vaultFiles.length +
    nativeMatches.length +
    teamMatches.length +
    internalMatches.length +
    vehicleMatches.length;

  return (
    <>
      <PortalPageHeader
        code="⌕ / GLOBAL SEARCH"
        title={q ? "“" + q + "” için sonuçlar" : "CORE içinde ara"}
        lead="Görevleri, Vault dosyalarını, native/harici repoları, stok kayıtlarını ve üyeleri tek arama yüzeyinden bul."
      />

      <form className="portalSearchHero" action="/portal/search" method="get">
        <input name="q" defaultValue={q} placeholder="Örn. Hydronom, BNO055, STM32, güç kartı..." autoFocus />
        <button type="submit">ARA →</button>
      </form>

      {q ? <div className="portalSearchCount"><b>{total}</b><span>sonuç bulundu</span></div> : null}

      {q && total === 0 ? <div className="portalEmpty"><span>SONUÇ YOK</span><h3>Bu sorguyla eşleşen kayıt bulunamadı.</h3><p>Farklı bir proje adı, parça kodu, kişi veya teknik terim dene.</p></div> : null}

      {teamMatches.length ? <section className="portalSearchSection"><h2>Takımlar</h2><div className="portalSearchResults">
        {teamMatches.map((item) => <a href={"/portal/teams/" + encodeURIComponent(String(item.code))} key={String(item.code)}><span>{String(item.code)}</span><div><b>{String(item.name)}</b><small>{String(item.domain || item.description || "")}</small></div><em>TEAM</em></a>)}
      </div></section> : null}

      {internalMatches.length ? <section className="portalSearchSection"><h2>Internal Projeler</h2><div className="portalSearchResults">
        {internalMatches.map((item) => <a href={"/portal/projects/" + encodeURIComponent(String(item.slug))} key={String(item.slug)}><span>PJ</span><div><b>{String(item.title)}</b><small>{String(item.team_code || "CORE")} · {String(item.summary || item.domain || "")}</small></div><em>{String(item.status).toUpperCase()} · {String(item.readiness || 0)}%</em></a>)}
      </div></section> : null}

      {vehicleMatches.length ? <section className="portalSearchSection"><h2>Araç Registry</h2><div className="portalSearchResults">
        {vehicleMatches.map((item) => <a href="/portal/ops" key={String(item.id)}><span>{String(item.code)}</span><div><b>{String(item.name)}</b><small>{String(item.team_name || item.team_code || "CORE")} · {String(item.platform_type || item.domain || "")}</small></div><em>{String(item.lifecycle || item.status).toUpperCase()}</em></a>)}
      </div></section> : null}

      {vaultFiles.length ? <section className="portalSearchSection"><h2>CORE Vault</h2><div className="portalSearchResults">
        {vaultFiles.map((item) => <a href={"/portal/library/" + encodeURIComponent(String(item.id))} key={String(item.id)}><span>{String(item.extension || item.kind || "FILE").toUpperCase()}</span><div><b>{String(item.title)}</b><small>{String(item.description || item.original_name || "")}</small></div><em>R{String(item.revision)} · {formatVaultBytes(item.size_bytes)}</em></a>)}
      </div></section> : null}

      {results.tasks.length ? <section className="portalSearchSection"><h2>Görevler</h2><div className="portalSearchResults">
        {results.tasks.map((item) => <a href={"/portal/tasks/" + item.id} key={String(item.id)}><span>TASK</span><div><b>{String(item.title)}</b><small>{String(item.description || "")}</small></div><em>{portalTaskStatusLabel(String(item.status))}</em></a>)}
      </div></section> : null}

      {results.resources.length ? <section className="portalSearchSection"><h2>Bilgi & Doküman</h2><div className="portalSearchResults">
        {results.resources.map((item) => <a href={item.external_url ? String(item.external_url) : "/portal/library"} key={String(item.id)}><span>{portalResourceKindLabel(String(item.kind))}</span><div><b>{String(item.title)}</b><small>{String(item.description || "")}</small></div><em>{String(item.project_slug || "CORE")}</em></a>)}
      </div></section> : null}

      {nativeMatches.length ? <section className="portalSearchSection"><h2>CORE Native Repolar</h2><div className="portalSearchResults">
        {nativeMatches.map((item) => <a href="/portal/repositories" key={String(item.id)}><span>CORE GIT</span><div><b>{String(item.name)}</b><small>{String(item.project_slug || item.team_code || "CORE")}</small></div><em>{String(item.status || "")}</em></a>)}
      </div></section> : null}

      {results.repositories.length ? <section className="portalSearchSection"><h2>Repolar</h2><div className="portalSearchResults">
        {results.repositories.map((item) => <a href={String(item.repo_url)} target="_blank" rel="noreferrer" key={String(item.id)}><span>GIT</span><div><b>{String(item.name)}</b><small>{String(item.project_slug || item.team_code || "CORE")}</small></div><em>{String(item.health || "")}</em></a>)}
      </div></section> : null}

      {results.inventory.length ? <section className="portalSearchSection"><h2>Stok</h2><div className="portalSearchResults">
        {results.inventory.map((item) => <a href="/portal/inventory" key={String(item.id)}><span>{String(item.sku)}</span><div><b>{String(item.name)}</b><small>{String(item.category)} · {String(item.location || "Konum yok")}</small></div><em>{String(item.quantity)} {String(item.unit)}</em></a>)}
      </div></section> : null}

      {results.members.length ? <section className="portalSearchSection"><h2>Üyeler</h2><div className="portalSearchResults">
        {results.members.map((item) => <a href={"/portal/members/" + encodeURIComponent(String(item.id))} key={String(item.id)}><span>ÜYE</span><div><b>{String(item.full_name || item.email)}</b><small>{String(item.email)}</small></div><em>{portalRoleLabel(String(item.role))}</em></a>)}
      </div></section> : null}
    </>
  );
}
