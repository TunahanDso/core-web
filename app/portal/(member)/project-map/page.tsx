import { PortalEmpty, PortalPageHeader } from "@/components/portal/PortalPage";
import ProjectMappingCanvas, {
  type ProjectMapEdge,
  type ProjectMapNode,
} from "@/components/portal/ProjectMappingCanvas";
import { requirePortalMember } from "@/lib/portal/auth";
import {
  listAccessiblePortalTeams,
  listPortalProjectMapEdges,
  listPortalProjectRegistry,
  listPortalVehicleProfiles,
} from "@/lib/portal/control";
import { listPortalRepositories } from "@/lib/portal/db";
import { listNativeRepositories } from "@/lib/portal/engineering-services";
import { memberHasPortalCapability } from "@/lib/portal/governance";
import { createPortalMapEdgeAction } from "@/app/portal/control-actions";

export const dynamic = "force-dynamic";

function nodeId(type: string, ref: string) {
  return type + ":" + ref;
}

export default async function PortalProjectMapPage() {
  const member = await requirePortalMember();
  const [teams, projects, vehicles, repositories, nativeRepositories, storedEdges, canEdit] = await Promise.all([
    listAccessiblePortalTeams(member),
    listPortalProjectRegistry(),
    listPortalVehicleProfiles(),
    listPortalRepositories(),
    listNativeRepositories(),
    listPortalProjectMapEdges(),
    memberHasPortalCapability(member,"project.map.edit"),
  ]);

  const accessibleTeamCodes = new Set(teams.map((team) => String(team.code).toUpperCase()));
  const visibleProjects = projects.filter((project) => {
    const visibility = String(project.visibility || "team");
    const teamCode = String(project.team_code || "").toUpperCase();
    if (member.role === "admin") return true;
    if (visibility === "members") return true;
    if (visibility === "leads") return member.role === "lead";
    if (visibility === "admins") return false;
    return Boolean(teamCode && accessibleTeamCodes.has(teamCode));
  });
  const projectSlugs = new Set(visibleProjects.map((project) => String(project.slug)));

  const visibleVehicles = vehicles.filter((vehicle) => {
    const teamCode = String(vehicle.team_code || "").toUpperCase();
    const projectSlug = String(vehicle.project_slug || "");
    return member.role === "admin" || accessibleTeamCodes.has(teamCode) || projectSlugs.has(projectSlug);
  });

  const allRepos = [
    ...repositories.map((repo) => ({
      id: String(repo.id),
      name: String(repo.name),
      project_slug: String(repo.project_slug || ""),
      team_code: String(repo.team_code || ""),
      state: String(repo.health || "external"),
      native: false,
    })),
    ...nativeRepositories.map((repo) => ({
      id: "native-" + String(repo.id),
      name: String(repo.name),
      project_slug: String(repo.project_slug || ""),
      team_code: String(repo.team_code || ""),
      state: String(repo.status || "native"),
      native: true,
    })),
  ].filter((repo) =>
    member.role === "admin" ||
    projectSlugs.has(repo.project_slug) ||
    accessibleTeamCodes.has(repo.team_code.toUpperCase())
  );

  const nodes: ProjectMapNode[] = [
    ...teams.map((team) => ({
      id: nodeId("team",String(team.code)),
      type: "team" as const,
      label: String(team.name),
      subtitle: String(team.domain || team.code),
      href: "/portal/teams/" + encodeURIComponent(String(team.code)),
      state: "active",
    })),
    ...visibleProjects.map((project) => ({
      id: nodeId("project",String(project.slug)),
      type: "project" as const,
      label: String(project.title),
      subtitle: String(project.status) + " · " + String(project.readiness || 0) + "%",
      href: "/portal/projects/" + encodeURIComponent(String(project.slug)),
      state: String(project.risk_level || "medium"),
    })),
    ...visibleVehicles.map((vehicle) => ({
      id: nodeId("vehicle",String(vehicle.id)),
      type: "vehicle" as const,
      label: String(vehicle.name),
      subtitle: String(vehicle.code) + " · " + String(vehicle.lifecycle || vehicle.status || "offline"),
      href: "/portal/ops",
      state: String(vehicle.lifecycle || vehicle.status || "offline"),
    })),
    ...allRepos.map((repo) => ({
      id: nodeId("repo",repo.id),
      type: "repo" as const,
      label: repo.name,
      subtitle: repo.native ? "CORE native repo" : "external mirror",
      href: "/portal/repositories",
      state: repo.state,
    })),
  ];

  const edges: ProjectMapEdge[] = [];
  const seen = new Set<string>();
  const add = (edge: ProjectMapEdge) => {
    const key = edge.source + "|" + edge.target + "|" + edge.relation;
    if (seen.has(key)) return;
    seen.add(key);
    edges.push(edge);
  };

  for (const project of visibleProjects) {
    const teamCode = String(project.team_code || "").toUpperCase();
    if (teamCode && accessibleTeamCodes.has(teamCode)) {
      add({
        id: "inferred-team-project-" + String(project.slug),
        source: nodeId("team",teamCode),
        target: nodeId("project",String(project.slug)),
        relation: "owns",
        label: "sahiplik",
      });
    }
  }

  for (const vehicle of visibleVehicles) {
    const projectSlug = String(vehicle.project_slug || "");
    const teamCode = String(vehicle.team_code || "").toUpperCase();
    if (projectSlug && projectSlugs.has(projectSlug)) {
      add({
        id: "inferred-project-vehicle-" + String(vehicle.id),
        source: nodeId("project",projectSlug),
        target: nodeId("vehicle",String(vehicle.id)),
        relation: "vehicle",
        label: "araç",
      });
    } else if (teamCode && accessibleTeamCodes.has(teamCode)) {
      add({
        id: "inferred-team-vehicle-" + String(vehicle.id),
        source: nodeId("team",teamCode),
        target: nodeId("vehicle",String(vehicle.id)),
        relation: "operates",
        label: "işletir",
      });
    }
  }

  for (const repo of allRepos) {
    if (repo.project_slug && projectSlugs.has(repo.project_slug)) {
      add({
        id: "inferred-project-repo-" + repo.id,
        source: nodeId("project",repo.project_slug),
        target: nodeId("repo",repo.id),
        relation: "repository",
        label: "repo",
      });
    } else if (repo.team_code && accessibleTeamCodes.has(repo.team_code.toUpperCase())) {
      add({
        id: "inferred-team-repo-" + repo.id,
        source: nodeId("team",repo.team_code.toUpperCase()),
        target: nodeId("repo",repo.id),
        relation: "repository",
        label: "repo",
      });
    }
  }

  for (const edge of storedEdges) {
    const source = nodeId(String(edge.source_type),String(edge.source_ref));
    const target = nodeId(String(edge.target_type),String(edge.target_ref));
    if (nodes.some((node) => node.id === source) && nodes.some((node) => node.id === target)) {
      add({
        id: String(edge.id),
        source,
        target,
        relation: String(edge.relation),
        label: String(edge.label || edge.relation),
      });
    }
  }

  return (
    <>
      <PortalPageHeader
        code="MAP / ENGINEERING GRAPH"
        title="Proje Mapping"
        lead="Takımlar, projeler, araçlar ve repolar arasındaki sahiplik ve bağımlılıkları tek mühendislik haritasında gör."
        action={<a className="portalOutlineButton" href="/portal/control">CONTROL PLANE →</a>}
      />

      {nodes.length ? (
        <ProjectMappingCanvas nodes={nodes} edges={edges} />
      ) : (
        <PortalEmpty
          title="Haritalanacak V6 proje kaydı yok."
          text="Control Plane üzerinden internal proje ve araç eklediğinde topology burada oluşacak."
        />
      )}

      {canEdit ? (
        <section className="portalPanel projectMapEdgeEditor">
          <div className="portalPanelHead"><span>MANUEL RELATION</span><small>CONTROL PLANE / GRAPH EDGE</small></div>
          <form className="portalFormGrid" action={createPortalMapEdgeAction}>
            <label><span>Kaynak tür</span><select name="sourceType" defaultValue="project"><option>project</option><option>team</option><option>vehicle</option><option>repo</option><option>vault</option><option>task</option></select></label>
            <label><span>Kaynak ref</span><input name="sourceRef" placeholder="proje-slug / MAR / uuid" required /></label>
            <label><span>Hedef tür</span><select name="targetType" defaultValue="project"><option>project</option><option>team</option><option>vehicle</option><option>repo</option><option>vault</option><option>task</option></select></label>
            <label><span>Hedef ref</span><input name="targetRef" required /></label>
            <label><span>İlişki</span><input name="relation" defaultValue="depends_on" /></label>
            <label><span>Etiket</span><input name="label" placeholder="depends on / feeds / controls..." /></label>
            <button className="portalPrimaryButton" type="submit">RELATION EKLE →</button>
          </form>
        </section>
      ) : null}
    </>
  );
}
