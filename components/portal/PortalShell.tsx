import type { PortalMember } from "@/lib/portal/auth";
import { portalNavigation } from "@/lib/portal/modules";
import { logoutPortalAction } from "@/app/portal/actions";

export default function PortalShell({
  member,
  children,
}: {
  member: PortalMember;
  children: React.ReactNode;
}) {
  const initials = member.fullName
    ? member.fullName.split(/\s+/).slice(0, 2).map((part) => part[0]).join("").toUpperCase()
    : "CR";

  return (
    <main className="portalApp">
      <aside className="portalSidebar">
        <a className="portalBrand" href="/portal">
          <span className="portalBrandMark">C</span>
          <span>
            <b>YTÜ CORE</b>
            <small>INTERNAL PORTAL</small>
          </span>
        </a>

        <nav className="portalNav" aria-label="Portal navigation">
          {portalNavigation.map((group) => (
            <section key={group.label}>
              <p>{group.label}</p>
              {group.items.map(([label, href, code]) => (
                <a href={href} key={href}>
                  <span>{code}</span>
                  <b>{label}</b>
                </a>
              ))}
            </section>
          ))}
        </nav>

        <div className="portalSidebarFoot">
          <a href="/tr" className="portalPublicLink">← Public site</a>
          <form action={logoutPortalAction}>
            <button type="submit">Sign out</button>
          </form>
        </div>
      </aside>

      <section className="portalWorkspace">
        <header className="portalTopbar">
          <div>
            <span className="portalTopLabel">CORE NETWORK</span>
            <b>Student engineering workspace</b>
          </div>
          <div className="portalTopActions">
            <a href="/portal/notifications" className="portalTopChip">Notifications</a>
            <div className="portalIdentity">
              <span>{initials}</span>
              <div>
                <b>{member.fullName || member.email}</b>
                <small>{member.role.toUpperCase()} · {member.teams.length ? member.teams.join(" / ") : "CORE"}</small>
              </div>
            </div>
          </div>
        </header>
        <div className="portalContent">{children}</div>
      </section>
    </main>
  );
}
