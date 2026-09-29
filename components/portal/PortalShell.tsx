import Link from "next/link";
import type { PortalMember } from "@/lib/portal/auth";
import PortalNav from "@/components/portal/PortalNav";
import { logoutPortalAction } from "@/app/portal/actions";
import { portalRoleLabel } from "@/lib/portal/labels";
import PortalCommandCenter from "@/components/portal/PortalCommandCenter";
import PortalSidebarToggle from "@/components/portal/PortalSidebarToggle";
import PortalContent from "@/components/portal/PortalContent";
import PortalDensityToggle from "@/components/portal/PortalDensityToggle";
import PortalThemeControl from "./PortalThemeControl";
import PortalMobileMenu from "./PortalMobileMenu";
import PortalBanner from "@/components/portal/PortalBanner";

export default function PortalShell({
  member,
  canControl,
  children,
}: {
  member: PortalMember;
  canControl: boolean;
  children: React.ReactNode;
}) {
  const initials = member.fullName
    ? member.fullName.split(/\s+/).slice(0, 2).map((part) => part[0]).join("").toUpperCase()
    : "CR";

  return (
    <main className="portalApp">
      <a href="#portal-content" className="portalSkipLink">İçeriğe geç</a>
      <aside className="portalSidebar">
        <div className="portalBrandRow">
          <Link className="portalBrand" href="/portal" prefetch={false}>
            <span className="portalBrandMark">C</span>
            <span className="portalBrandCopy">
              <b>YTÜ CORE</b>
              <small>İÇ PORTAL</small>
            </span>
          </Link>
          <PortalSidebarToggle />
        </div>

        <div id="portal-sidebar-navigation" className="portalNavScroll"><PortalNav canControl={canControl} /></div>

        <div className="portalSidebarFoot">
          <a href="/tr" className="portalPublicLink"><span aria-hidden="true">↗</span><b>Vitrin sitesi</b></a>
          <form action={logoutPortalAction}>
            <button type="submit"><span aria-hidden="true">↪</span><b>Çıkış yap</b></button>
          </form>
        </div>
      </aside>

      <section className="portalWorkspace">
        <header className="portalTopbar">
          <div>
            <span className="portalTopLabel">CORE AĞI</span>
            <b>Öğrenci mühendislik çalışma alanı</b>
          </div>
          <PortalMobileMenu canControl={canControl} />
          <PortalCommandCenter canControl={canControl} />
          <div className="portalTopActions">
            <PortalDensityToggle />
            <PortalThemeControl />
            <Link href="/portal/notifications" className="portalTopChip" prefetch={false}>Bildirimler</Link>
            <Link href="/portal/profile" className="portalIdentity" prefetch={false}>
              <span>{initials}</span>
              <div>
                <b>{member.fullName || member.email}</b>
                <small>{portalRoleLabel(member.role)} · {member.teams.length ? member.teams.join(" / ") : "CORE"}</small>
              </div>
            </Link>
          </div>
        </header>
        <PortalBanner />
        <PortalContent>{children}</PortalContent>
      </section>
    </main>
  );
}
