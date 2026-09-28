import { PortalEmpty, PortalPageHeader } from "@/components/portal/PortalPage";
import { createTaskAction, updateTaskStatusAction } from "@/app/portal/actions";
import { listPortalTasks } from "@/lib/portal/db";
import { listProjects } from "@/lib/cms/db";

export const dynamic = "force-dynamic";

const statuses = ["backlog","todo","doing","review","blocked","done"];

export default async function PortalTasksPage() {
  const [tasks, projects] = await Promise.all([listPortalTasks(), listProjects()]);

  return (
    <>
      <PortalPageHeader
        code="PM / PROJECTS"
        title="Projects & Tasks"
        lead="Turn technical intent into owned work. Tasks stay linked to projects, teams, priority and review state."
      />

      <section className="portalPanel portalCreatePanel">
        <div className="portalPanelHead"><span>NEW WORK ITEM</span><small>MEMBER WRITE</small></div>
        <form className="portalFormGrid" action={createTaskAction}>
          <label><span>Task title</span><input name="title" required /></label>
          <label>
            <span>Project</span>
            <select name="projectSlug" defaultValue="">
              <option value="">General / no project</option>
              {projects.map((project) => <option value={project.slug} key={project.id}>{project.titleTr || project.slug}</option>)}
            </select>
          </label>
          <label><span>Team code</span><input name="teamCode" placeholder="MAR / SYS / EMB..." /></label>
          <label>
            <span>Priority</span>
            <select name="priority" defaultValue="medium">
              <option value="low">Low</option><option value="medium">Medium</option>
              <option value="high">High</option><option value="critical">Critical</option>
            </select>
          </label>
          <label><span>Due</span><input name="dueAt" type="datetime-local" /></label>
          <label className="portalFormWide"><span>Description</span><textarea name="description" rows={3} /></label>
          <button type="submit" className="portalPrimaryButton">CREATE TASK →</button>
        </form>
      </section>

      <section className="portalTaskBoard">
        {statuses.map((status) => {
          const bucket = tasks.filter((task) => String(task.status) === status);
          return (
            <div className="portalTaskColumn" key={status}>
              <header><span>{status.toUpperCase()}</span><b>{bucket.length}</b></header>
              {bucket.map((task) => (
                <article className="portalTaskCard" key={String(task.id)}>
                  <div className="portalTaskMeta">
                    <span className={"portalPriority " + String(task.priority)}>{String(task.priority).toUpperCase()}</span>
                    <small>{String(task.project_slug || task.team_code || "CORE")}</small>
                  </div>
                  <h3>{String(task.title)}</h3>
                  <p>{String(task.description || "")}</p>
                  <small>{task.due_at ? "DUE " + String(task.due_at) : "NO DEADLINE"}</small>
                  <form action={updateTaskStatusAction}>
                    <input type="hidden" name="id" value={String(task.id)} />
                    <select name="status" defaultValue={String(task.status)}>
                      {statuses.map((item) => <option value={item} key={item}>{item}</option>)}
                    </select>
                    <button type="submit">MOVE →</button>
                  </form>
                </article>
              ))}
            </div>
          );
        })}
      </section>

      {!tasks.length ? <PortalEmpty title="No tasks yet." text="Create the first work item above and start building the project trail." /> : null}
    </>
  );
}
