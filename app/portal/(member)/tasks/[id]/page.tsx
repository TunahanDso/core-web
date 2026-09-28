import { PortalPageHeader } from "@/components/portal/PortalPage";
import {
  addTaskCommentAction,
  updateTaskDetailsAction,
} from "@/app/portal/actions";
import { getPortalTask, listPortalMembers } from "@/lib/portal/db";
import {
  portalPriorityLabel,
  portalRoleLabel,
  portalTaskStatusLabel,
} from "@/lib/portal/labels";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

const statuses = ["backlog","todo","doing","review","blocked","done"];
const priorities = ["low","medium","high","critical"];

export default async function PortalTaskDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams?: Promise<{ saved?: string; commented?: string }>;
}) {
  const [{ id }, query] = await Promise.all([
    params,
    searchParams ?? Promise.resolve<{ saved?: string; commented?: string }>({}),
  ]);
  const [data, members] = await Promise.all([
    getPortalTask(decodeURIComponent(id)),
    listPortalMembers(),
  ]);
  if (!data) notFound();

  const task = data.task;
  const activeMembers = members.filter((member) => String(member.status) === "active");

  return (
    <>
      <PortalPageHeader
        code={"TASK / " + String(task.id).slice(0, 8).toUpperCase()}
        title={String(task.title)}
        lead={String(task.description || "Bu görev için açıklama eklenmemiş.")}
        action={<a className="portalOutlineButton" href="/portal/tasks">← GÖREV PANOSU</a>}
      />

      {query.saved === "1" ? <div className="portalSuccess">Görev ayrıntıları güncellendi.</div> : null}
      {query.commented === "1" ? <div className="portalSuccess">Yorum görev geçmişine eklendi.</div> : null}

      <section className="portalTaskDetailGrid">
        <div className="portalPanel">
          <div className="portalPanelHead"><span>GÖREV KONTROLÜ</span><small>CANLI D1</small></div>
          <form className="portalFormGrid taskDetailForm" action={updateTaskDetailsAction}>
            <input type="hidden" name="taskId" value={String(task.id)} />
            <label>
              <span>Durum</span>
              <select name="status" defaultValue={String(task.status)}>
                {statuses.map((status) => <option key={status} value={status}>{portalTaskStatusLabel(status)}</option>)}
              </select>
            </label>
            <label>
              <span>Öncelik</span>
              <select name="priority" defaultValue={String(task.priority)}>
                {priorities.map((priority) => <option key={priority} value={priority}>{portalPriorityLabel(priority)}</option>)}
              </select>
            </label>
            <label>
              <span>Sorumlu</span>
              <select name="assigneeId" defaultValue={String(task.assignee_id || "")}>
                <option value="">Atanmamış</option>
                {activeMembers.map((member) => <option key={String(member.id)} value={String(member.id)}>{String(member.full_name || member.email)}</option>)}
              </select>
            </label>
            <label>
              <span>Son tarih</span>
              <input name="dueAt" type="datetime-local" defaultValue={task.due_at ? String(task.due_at).slice(0,16) : ""} />
            </label>
            <button type="submit" className="portalPrimaryButton">GÖREVİ GÜNCELLE →</button>
          </form>

          <div className="portalTaskFacts">
            <div><span>PROJE</span><b>{String(task.project_slug || "Genel")}</b></div>
            <div><span>TAKIM</span><b>{String(task.team_code || "CORE")}</b></div>
            <div><span>OLUŞTURAN</span><b>{String(task.creator_name || task.creator_email || "—")}</b></div>
            <div><span>SON GÜNCELLEME</span><b>{String(task.updated_at)}</b></div>
          </div>
        </div>

        <div className="portalPanel">
          <div className="portalPanelHead"><span>YORUM / KARAR GEÇMİŞİ</span><small>{data.comments.length} kayıt</small></div>
          <div className="portalTaskComments">
            {data.comments.length ? data.comments.map((comment) => (
              <article key={String(comment.id)}>
                <header>
                  <div><b>{String(comment.full_name || comment.email)}</b><span>{portalRoleLabel(String(comment.role))}</span></div>
                  <small>{String(comment.created_at)}</small>
                </header>
                <p>{String(comment.body)}</p>
              </article>
            )) : <p className="portalMuted">Henüz yorum yok. Kararları ve teknik notları burada kalıcılaştır.</p>}
          </div>
          <form className="portalCommentComposer" action={addTaskCommentAction}>
            <input type="hidden" name="taskId" value={String(task.id)} />
            <textarea name="body" rows={4} placeholder="Teknik not, karar, engel veya test sonucu..." required />
            <button type="submit">YORUM EKLE →</button>
          </form>
        </div>
      </section>
    </>
  );
}
