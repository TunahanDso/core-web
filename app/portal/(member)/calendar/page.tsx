import { PortalEmpty, PortalPageHeader } from "@/components/portal/PortalPage";
import { createCalendarEventAction } from "@/app/portal/actions";
import { listPortalCalendar } from "@/lib/portal/db";

export const dynamic = "force-dynamic";

export default async function PortalCalendarPage() {
  const events = await listPortalCalendar();
  return (
    <>
      <PortalPageHeader code="CL / CALENDAR" title="Operating Calendar" lead="Meetings, field tests, reviews, deadlines and competition milestones on one engineering timeline." />
      <section className="portalPanel portalCreatePanel">
        <div className="portalPanelHead"><span>NEW EVENT</span><small>TEAM CALENDAR</small></div>
        <form className="portalFormGrid" action={createCalendarEventAction}>
          <label><span>Title</span><input name="title" required /></label>
          <label><span>Location</span><input name="location" /></label>
          <label><span>Starts</span><input name="startsAt" type="datetime-local" required /></label>
          <label><span>Ends</span><input name="endsAt" type="datetime-local" /></label>
          <label><span>Team</span><input name="teamCode" /></label>
          <label><span>Project</span><input name="projectSlug" /></label>
          <label className="portalFormWide"><span>Description</span><textarea name="description" rows={3} /></label>
          <button className="portalPrimaryButton" type="submit">ADD EVENT →</button>
        </form>
      </section>
      {events.length ? (
        <div className="portalTimeline">
          {events.map((event) => (
            <article key={String(event.id)}>
              <span>{String(event.starts_at)}</span>
              <div><h3>{String(event.title)}</h3><p>{String(event.description || "")}</p></div>
              <small>{String(event.location || event.team_code || "CORE")}</small>
            </article>
          ))}
        </div>
      ) : <PortalEmpty title="Calendar is open." text="Add the first meeting, test or deadline above." />}
    </>
  );
}
