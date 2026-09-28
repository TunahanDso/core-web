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
      <PortalPageHeader code="ML / INTERNAL MAIL" title="Internal Mail" lead="Long-form communication for decisions, requests and handoffs that deserve a durable thread instead of disappearing inside chat." />

      <section className="portalPanel portalCreatePanel">
        <div className="portalPanelHead"><span>NEW THREAD</span><small>INTERNAL ONLY</small></div>
        <form className="portalMailCompose" action={createMailThreadAction}>
          <label><span>Subject</span><input name="subject" required /></label>
          <fieldset>
            <legend>Recipients</legend>
            <div className="portalRecipientGrid">
              {members.filter((item) => String(item.status) === "active" && String(item.id) !== member.id).map((item) => (
                <label key={String(item.id)}>
                  <input type="checkbox" name="participantId" value={String(item.id)} />
                  <span>{String(item.full_name || item.email)}</span>
                </label>
              ))}
            </div>
          </fieldset>
          <label><span>Message</span><textarea name="body" rows={5} required /></label>
          <button className="portalPrimaryButton" type="submit">START THREAD →</button>
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
      ) : <PortalEmpty title="Inbox is clear." text="Start the first internal thread above." />}
    </>
  );
}
