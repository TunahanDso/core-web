import { PortalEmpty, PortalPageHeader } from "@/components/portal/PortalPage";
import { createTaskAction, updateTaskStatusAction } from "@/app/portal/actions";
import { listPortalTasks } from "@/lib/portal/db";
import { listProjes } from "@/lib/cms/db";

export const dynamic = "force-dynamic";

const statuses = ["backlog","todo","doing","review","blocked","done"];

export default async function PortalTasksPage() {
  const [tasks, projects] = await Promise.all([listPortalTasks(), listProjes()]);

  return (
    <>
      <PortalPageHeader
        code="PM / PROJECTS"
        title="Projeler & Görevler"
        lead="Teknik niyeti sahipliği belli işe dönüştür. Görevler proje, takım, öncelik ve inceleme durumuyla bağlı kalır."
      />

      <section className="portalPanel portalCreatePanel">
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
          <label><span>Son tarih</span><input name="dueAt" type="datetime-local" /></label>
          <label className="portalFormWide"><span>Açıklama</span><textarea name="description" rows={3} /></label>
          <button type="submit" className="portalPrimaryButton">GÖREV OLUŞTUR →</button>
        </form>
      </section>

      <section className="portalTaskBoard">
        {statuses.map((status) => {
          const bucket = tasks.filter((task) => String(task.status) === status);
          return (
            <div className="portalTaskColumn" key={status}>
              <header><span>{portalTaskStatusLabel(status)}</span><b>{bucket.length}</b></header>
              {bucket.map((task) => (
                <article className="portalTaskCard" key={String(task.id)}>
                  <div className="portalTaskMeta">
                    <span className={"portalPriority " + String(task.priority)}>{portalPriorityLabel(String(task.priority))}</span>
                    <small>{String(task.project_slug || task.team_code || "CORE")}</small>
                  </div>
                  <h3>{String(task.title)}</h3>
                  <p>{String(task.description || "")}</p>
                  <small>{task.due_at ? "SON TARİH " + String(task.due_at) : "SON TARİH YOK"}</small>
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

      {!tasks.length ? <PortalEmpty title="Henüz görev yok." text="Yukarıdan ilk işi oluştur ve proje geçmişini başlat." /> : null}
    </>
  );
}
