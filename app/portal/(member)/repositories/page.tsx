import { PortalEmpty, PortalPageHeader } from "@/components/portal/PortalPage";
import { createRepositoryAction } from "@/app/portal/actions";
import { requirePortalMember } from "@/lib/portal/auth";
import { listPortalRepositories } from "@/lib/portal/db";

export const dynamic = "force-dynamic";

export default async function PortalRepositoriesPage() {
  const [member, repositories] = await Promise.all([requirePortalMember(), listPortalRepositories()]);
  const canWrite = member.role === "admin" || member.role === "lead";

  return (
    <>
      <PortalPageHeader code="RP / REPOSITORIES" title="Repository Service" lead="A single registry for code ownership, project links and repository health. Private GitHub synchronization can be connected without exposing tokens to the browser." />

      {canWrite ? (
        <section className="portalPanel portalCreatePanel">
          <div className="portalPanelHead"><span>REGISTER REPOSITORY</span><small>LEAD / ADMIN</small></div>
          <form className="portalFormGrid" action={createRepositoryAction}>
            <label><span>Name</span><input name="name" required /></label>
            <label><span>Repository URL</span><input name="repoUrl" type="url" required /></label>
            <label><span>Project slug</span><input name="projectSlug" /></label>
            <label><span>Team</span><input name="teamCode" /></label>
            <label><span>Visibility</span><select name="visibility"><option>private</option><option>internal</option><option>public</option></select></label>
            <button type="submit" className="portalPrimaryButton">REGISTER →</button>
          </form>
        </section>
      ) : null}

      {repositories.length ? (
        <div className="portalRepoList">
          {repositories.map((repo) => (
            <a href={String(repo.repo_url)} target="_blank" rel="noreferrer" key={String(repo.id)}>
              <span>GIT</span>
              <div><b>{String(repo.name)}</b><small>{String(repo.project_slug || repo.team_code || "CORE")}</small></div>
              <em>{String(repo.visibility).toUpperCase()}</em>
              <strong>{String(repo.health).toUpperCase()}</strong>
            </a>
          ))}
        </div>
      ) : <PortalEmpty title="No repositories registered yet." text="Leads can register private or public repository links above." />}
    </>
  );
}
