import { PortalEmpty, PortalPageHeader } from "@/components/portal/PortalPage";
import { createMailThreadAction } from "@/app/portal/actions";
import { requirePortalMember } from "@/lib/portal/auth";
import { listPortalMailThreads, listPortalMembers } from "@/lib/portal/db";

export const dynamic = "force-dynamic";

export default async function PortalMailPage() {
  const member = await requirePortalMember();
  const [threads, members] = await Promise.all([
    listPortalMailThreads(member.id),
    listPortalMembers(),
  ]);

  return (
    <>
      <PortalPageHeader code="ML / İÇ YAZIŞMA" title="İç Yazışma" lead="Sohbette kaybolmaması gereken karar, talep ve devir teslimler için kalıcı yazışma alanı." />

      <section className="portalPanel portalCreatePanel">
        <div className="portalPanelHead"><span>YENİ YAZIŞMA</span><small>YALNIZCA İÇ KULLANIM</small></div>
        <form className="portalMailCompose" action={createMailThreadAction}>
          <label><span>Konu</span><input name="subject" required /></label>
          <fieldset>
            <legend>Alıcılar</legend>
            <div className="portalRecipientGrid">
              {members.filter((item) => String(item.status) === "active" && String(item.id) !== member.id).map((item) => (
                <label key={String(item.id)}>
                  <input type="checkbox" name="participantId" value={String(item.id)} />
                  <span>{String(item.full_name || item.email)}</span>
                </label>
              ))}
            </div>
          </fieldset>
          <label><span>Mesaj</span><textarea name="body" rows={5} required /></label>
          <button className="portalPrimaryButton" type="submit">YAZIŞMAYI BAŞLAT →</button>
        </form>
      </section>

      {threads.length ? (
        <div className="portalMailList">
          {threads.map((thread) => (
            <a href={"/portal/mail/" + encodeURIComponent(String(thread.id))} key={String(thread.id)}>
              <span>MAIL</span>
              <div><b>{String(thread.subject)}</b><p>{String(thread.preview || "")}</p></div>
              <small>{String(thread.updated_at)}</small>
            </a>
          ))}
        </div>
      ) : <PortalEmpty title="Gelen kutusu temiz." text="İlk iç yazışmayı yukarıdan başlat." />}
    </>
  );
}
