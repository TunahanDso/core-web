import PortalDataTable from "@/components/portal/PortalDataTable";
import Link from "next/link";
import { PortalEmpty, PortalPageHeader } from "@/components/portal/PortalPage";
import { listProjects } from "@/lib/cms/db";
import {
  listPortalRepositories,
  listPortalResources,
  listPortalTasks,
} from "@/lib/portal/db";
import { listPortalProjectRegistry } from "@/lib/portal/control";
import { requirePortalMember } from "@/lib/portal/auth";
import { canAccessPortalTeam } from "@/lib/portal/governance";
import { cmsStatusLabel } from "@/lib/portal/labels";

export const dynamic = "force-dynamic";

export default async function PortalProjectsPage({
  searchParams,
}: {
  searchParams?: Promise<{ q?: string; status?: string; source?: string; team?: string }>;
}) {
  const query=searchParams ? await searchParams : {};
  const member = await requirePortalMember();
  const [publicProjects, registry, tasks, resources, repositories] = await Promise.all([
    listProjects(),
    listPortalProjectRegistry(),
    listPortalTasks(500),
    listPortalResources(),
    listPortalRepositories(),
  ]);

  const internalProjects = [];
  for (const project of registry) {
    const visibility = String(project.visibility || "team");
    const teamCode = String(project.team_code || "");
    const allowed =
      member.role === "admin" ||
      visibility === "members" ||
      (visibility === "leads" && member.role === "lead") ||
      (visibility === "team" && Boolean(teamCode) && await canAccessPortalTeam(member,teamCode));
    if (allowed) internalProjects.push(project);
  }

  const internalSlugs = new Set(internalProjects.map((item) => String(item.slug)));
  const rows = [
    ...internalProjects.map((project) => ({
      id: "internal:" + String(project.slug),
      slug: String(project.slug),
      title: String(project.title),
      summary: String(project.summary || ""),
      domain: String(project.domain || project.team_name || "CORE"),
      team: String(project.team_code || ""),
      owner: String(project.owner_name || "Sorumlu atanmadı"),
      status: String(project.status || "concept"),
      progress: Number(project.readiness || 0),
      source: "internal",
      risk: String(project.risk_level || "medium"),
    })),
    ...publicProjects
      .filter((project) => !internalSlugs.has(project.slug))
      .map((project) => ({
        id: "cms:" + String(project.id),
        slug: project.slug,
        title: project.titleTr || project.slug,
        summary: project.summaryTr || "",
        domain: project.domain || "CORE",
        team: "",
        owner: project.owner || "Sorumlu atanmadı",
        status: project.status,
        progress: project.progress ?? 0,
        source: "public",
        risk: "public",
      })),
  ].map((project)=>{
    const projectTasks=tasks.filter((task)=>String(task.project_slug || "")===project.slug);
    return {
      ...project,
      openTasks:projectTasks.filter((task)=>String(task.status)!=="done").length,
      resources:resources.filter((item)=>String(item.project_slug || "")===project.slug).length,
      repos:repositories.filter((item)=>String(item.project_slug || "")===project.slug).length,
    };
  });

  const q=String(query.q || "").trim().toLocaleLowerCase("tr-TR");
  const source=["internal","public"].includes(String(query.source)) ? String(query.source) : "";
  const status=String(query.status || "").trim();
  const team=String(query.team || "").trim();
  const statusOptions=Array.from(new Set(rows.map((item)=>String(item.status)).filter(Boolean))).sort();
  const teamOptions=Array.from(new Set(rows.map((item)=>String(item.team || item.domain)).filter(Boolean))).sort();
  const filtered=rows.filter((item)=>{
    if(source && item.source!==source) return false;
    if(status && item.status!==status) return false;
    if(team && String(item.team || item.domain)!==team) return false;
    if(q){
      const haystack=[item.title,item.slug,item.summary,item.domain,item.team,item.owner]
        .join(" ")
        .toLocaleLowerCase("tr-TR");
      if(!haystack.includes(q)) return false;
    }
    return true;
  });

  return (
    <>
      <PortalPageHeader
        code="PROJELER"
        title="Proje Çalışma Alanları"
        lead="Projeleri kaynak, durum, sahiplik, readiness ve mühendislik varlıklarıyla aynı düzlemde karşılaştır."
        action={<Link prefetch={false} className="portalOutlineButton" href="/portal/project-map">Project Map</Link>}
      />

      <section className="portalRegistryToolbar">
        <form action="/portal/projects" method="get">
          <label className="grow">
            <span>ARA</span>
            <input name="q" defaultValue={String(query.q || "")} placeholder="Proje, slug, domain veya sorumlu..." />
          </label>
          <label>
            <span>KAYNAK</span>
            <select name="source" defaultValue={source}>
              <option value="">Tümü</option>
              <option value="internal">Internal</option>
              <option value="public">Public CMS</option>
            </select>
          </label>
          <label>
            <span>DURUM</span>
            <select name="status" defaultValue={status}>
              <option value="">Tümü</option>
              {statusOptions.map((item)=><option value={item} key={item}>{item}</option>)}
            </select>
          </label>
          <label>
            <span>TAKIM / DOMAIN</span>
            <select name="team" defaultValue={team}>
              <option value="">Tümü</option>
              {teamOptions.map((item)=><option value={item} key={item}>{item}</option>)}
            </select>
          </label>
          <button type="submit">UYGULA</button>
          {(q || source || status || team) ? <Link prefetch={false} className="subtle" href="/portal/projects">Temizle</Link> : null}
        </form>
        <div className="portalRegistrySummary">
          <span>SONUÇ</span>
          <b>{filtered.length}</b>
          <small>{rows.length} proje</small>
        </div>
      </section>

      {filtered.length ? (
        <div className="portalDataTableShell">
          <PortalDataTable className="portalProjectDataTable" columns={["Proje","Kaynak","Durum","Sahiplik","Readiness","Açık görev","Kaynak / Repo","Risk","İşlem"]}>
              {filtered.map((project)=>(
                <tr key={project.id}>
                  <td className="primaryCell">
                    <Link prefetch={false} href={"/portal/projects/" + encodeURIComponent(project.slug)}>
                      <b>{project.title}</b>
                      <small>{project.slug} · {project.domain}</small>
                    </Link>
                  </td>
                  <td><span className={"portalStatusText "+(project.source==="internal"?"active":"")}>{project.source==="internal"?"Internal":"Public CMS"}</span></td>
                  <td>{project.source==="internal" ? String(project.status) : cmsStatusLabel(project.status)}</td>
                  <td><div className="portalCellStack"><b>{project.owner}</b><small>{project.team || project.domain}</small></div></td>
                  <td>
                    <div className="portalInlineProgress">
                      <span><b>{Math.max(0,Math.min(100,project.progress))}%</b></span>
                      <i><b style={{width:Math.max(0,Math.min(100,project.progress))+"%"}} /></i>
                    </div>
                  </td>
                  <td className="numeric">{project.openTasks}</td>
                  <td className="mono">{project.resources} / {project.repos}</td>
                  <td><span className={"portalStatusText "+(project.risk==="critical"?"critical":"")}>{project.risk}</span></td>
                  <td className="rowActions"><Link prefetch={false} href={"/portal/projects/" + encodeURIComponent(project.slug)}>Workspace</Link></td>
                </tr>
              ))}
            </PortalDataTable>
        </div>
      ) : (
        <PortalEmpty
          title={rows.length ? "Bu filtrelerle proje yok." : "Erişilebilir proje kaydı bulunamadı."}
          text={rows.length ? "Filtreleri temizle veya daha geniş bir arama yap." : "Control Plane veya public CMS içindeki proje kayıtları burada görünür."}
        />
      )}
    </>
  );
}
