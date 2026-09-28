import { PortalEmpty, PortalPageHeader } from "@/components/portal/PortalPage";
import { createTaskAction, updateTaskStatusAction } from "@/app/portal/actions";
import { listPortalMembers, listPortalTasks } from "@/lib/portal/db";
import { listProjects } from "@/lib/cms/db";
import { portalPriorityLabel, portalTaskStatusLabel } from "@/lib/portal/labels";
import { requirePortalMember } from "@/lib/portal/auth";

export const dynamic = "force-dynamic";

const statuses = ["backlog","todo","doing","review","blocked","done"];

export default async function PortalTasksPage({
  searchParams,
}: {
  searchParams?: Promise<{
    q?: string;
    status?: string;
    priority?: string;
    project?: string;
    mine?: string;
  }>;
}) {
  const query = searchParams ? await searchParams : {};
  const member = await requirePortalMember();
  const [tasks, projects, members] = await Promise.all([
    listPortalTasks(),
    listProjects(),
    listPortalMembers(),
  ]);
  const activeMembers = members.filter((item) => String(item.status) === "active");

  const q = String(query.q || "").trim().toLocaleLowerCase("tr-TR");
  const statusFilter = statuses.includes(String(query.status)) ? String(query.status) : "";
  const priorityFilter = ["low","medium","high","critical"].includes(String(query.priority))
    ? String(query.priority)
    : "";
  const projectFilter = String(query.project || "").trim();
  const mine = String(query.mine || "") === "1";

  const filteredTasks = tasks.filter((task) => {
    if (q) {
      const haystack = [
        task.title,
        task.description,
        task.project_slug,
        task.team_code,
        task.assignee_name,
      ].map((value) => String(value || "")).join(" ").toLocaleLowerCase("tr-TR");
      if (!haystack.includes(q)) return false;
    }
    if (statusFilter && String(task.status) !== statusFilter) return false;
    if (priorityFilter && String(task.priority) !== priorityFilter) return false;
    if (projectFilter && String(task.project_slug || "") !== projectFilter) return false;
    if (mine && String(task.assignee_id || "") !== String(member.id)) return false;
    return true;
  });

  return (
    <>
      <PortalPageHeader
        code="PM / PROJELER"
        title="Projeler & Görevler"
        lead="Teknik niyeti sahipliği belli işe dönüştür. Görevler proje, takım, öncelik ve inceleme durumuyla bağlı kalır."
      />

      <section className="portalTaskFilters">
        <form action="/portal/tasks" method="get">
          <label className="portalTaskSearch">
            <span>ARA</span>
            <input name="q" defaultValue={String(query.q || "")} placeholder="Görev, proje, takım veya sorumlu..." />
          </label>
          <label>
            <span>DURUM</span>
            <select name="status" defaultValue={statusFilter}>
              <option value="">Tümü</option>
              {statuses.map((item) => <option key={item} value={item}>{portalTaskStatusLabel(item)}</option>)}
            </select>
          </label>
          <label>
            <span>ÖNCELİK</span>
            <select name="priority" defaultValue={priorityFilter}>
              <option value="">Tümü</option>
              <option value="critical">Kritik</option>
              <option value="high">Yüksek</option>
              <option value="medium">Orta</option>
              <option value="low">Düşük</option>
            </select>
          </label>
          <label>
            <span>PROJE</span>
            <select name="project" defaultValue={projectFilter}>
              <option value="">Tümü</option>
              {projects.map((project) => <option value={project.slug} key={project.id}>{project.titleTr || project.slug}</option>)}
            </select>
          </label>
          <label className="portalTaskMine">
            <input type="checkbox" name="mine" value="1" defaultChecked={mine} />
            <span>Yalnız bana atanmışlar</span>
          </label>
          <button type="submit">FİLTRELE</button>
          {(q || statusFilter || priorityFilter || projectFilter || mine) ? <a href="/portal/tasks">TEMİZLE</a> : null}
        </form>
        <div className="portalTaskFilterSummary">
          <b>{filteredTasks.length}</b>
          <span>{filteredTasks.length === tasks.length ? "toplam görev" : tasks.length + " görev içinden eşleşme"}</span>
        </div>
      </section>

      <section className="portalPanel portalCreatePanel" id="create-task">
        <div className="portalPanelHead"><span>YENİ İŞ KALEMİ</span><small>ÜYE YAZMA YETKİSİ</small></div>
        <form className="portalFormGrid" action={createTaskAction}>
          <label><span>Görev başlığı</span><input name="title" required /></label>
          <label>
            <span>Proje</span>
            <select name="projectSlug" defaultValue="">
              <option value="">Genel / projesiz</option>
              {projects.map((project) => <option value={project.slug} key={project.id}>{project.titleTr || project.slug}</option>)}
            </select>
          </label>
          <label><span>Takım kodu</span><input name="teamCode" placeholder="MAR / SYS / EMB..." /></label>
          <label>
            <span>Öncelik</span>
            <select name="priority" defaultValue="medium">
              <option value="low">Düşük</option><option value="medium">Orta</option>
              <option value="high">Yüksek</option><option value="critical">Kritik</option>
            </select>
          </label>
          <label>
            <span>Sorumlu</span>
            <select name="assigneeId" defaultValue="">
              <option value="">Atanmamış</option>
              {activeMembers.map((member) => (
                <option value={String(member.id)} key={String(member.id)}>
                  {String(member.full_name || member.email)}
                </option>
              ))}
            </select>
          </label>
          <label><span>Son tarih</span><input name="dueAt" type="datetime-local" /></label>
          <label className="portalFormWide"><span>Açıklama</span><textarea name="description" rows={3} /></label>
          <button type="submit" className="portalPrimaryButton">GÖREV OLUŞTUR →</button>
        </form>
      </section>

      <section className="portalNativeTaskList" aria-label="Mobil görev listesi">
        {filteredTasks
          .filter((task) => String(task.status) !== "done")
          .sort((a,b) => {
            const rank: Record<string, number> = { critical: 0, high: 1, medium: 2, low: 3 };
            return (rank[String(a.priority)] ?? 4) - (rank[String(b.priority)] ?? 4);
          })
          .slice(0,40)
          .map((task) => (
            <a href={"/portal/tasks/" + encodeURIComponent(String(task.id))} key={String(task.id)}>
              <div className="portalNativeTaskTop">
                <span className={"portalPriority " + String(task.priority)}>{portalPriorityLabel(String(task.priority))}</span>
                <em>{portalTaskStatusLabel(String(task.status))}</em>
              </div>
              <h3>{String(task.title)}</h3>
              <p>{String(task.description || "Açıklama yok.")}</p>
              <footer>
                <span>{String(task.assignee_name || "Atanmamış")}</span>
                <small>{String(task.project_slug || task.team_code || "CORE")}</small>
              </footer>
            </a>
          ))}
      </section>

      <section className="portalTaskBoard">
        {statuses.map((status) => {
          const bucket = filteredTasks.filter((task) => String(task.status) === status);
          return (
            <div className="portalTaskColumn" key={status}>
              <header><span>{portalTaskStatusLabel(status)}</span><b>{bucket.length}</b></header>
              {bucket.map((task) => (
                <article className="portalTaskCard" key={String(task.id)}>
                  <div className="portalTaskMeta">
                    <span className={"portalPriority " + String(task.priority)}>{portalPriorityLabel(String(task.priority))}</span>
                    <small>{String(task.project_slug || task.team_code || "CORE")}</small>
                  </div>
                  <a className="portalTaskOpen" href={"/portal/tasks/" + encodeURIComponent(String(task.id))}>
                    <h3>{String(task.title)}</h3>
                    <p>{String(task.description || "")}</p>
                  </a>
                  <div className="portalTaskCardFacts">
                    <small>{String(task.assignee_name || "Atanmamış")}</small>
                    <small>{task.due_at ? "SON TARİH " + String(task.due_at) : "SON TARİH YOK"}</small>
                  </div>
                  <form action={updateTaskStatusAction}>
                    <input type="hidden" name="id" value={String(task.id)} />
                    <select name="status" defaultValue={String(task.status)}>
                      {statuses.map((item) => <option value={item} key={item}>{portalTaskStatusLabel(item)}</option>)}
                    </select>
                    <button type="submit">TAŞI →</button>
                  </form>
                </article>
              ))}
            </div>
          );
        })}
      </section>

      {!filteredTasks.length ? <PortalEmpty title={tasks.length ? "Bu filtrelerle görev yok." : "Henüz görev yok."} text={tasks.length ? "Filtreleri temizle veya daha geniş bir arama dene." : "Yukarıdan ilk işi oluştur ve proje geçmişini başlat."} /> : null}
    </>
  );
}
