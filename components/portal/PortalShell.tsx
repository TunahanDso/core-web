import type { PortalMember } from "@/lib/portal/auth";
import PortalNav from "@/components/portal/PortalNav";
import { logoutPortalAction } from "@/app/portal/actions";
import { portalRoleLabel } from "@/lib/portal/labels";
import PortalCommandCenter from "@/components/portal/PortalCommandCenter";
import PortalSidebarToggle from "@/components/portal/PortalSidebarToggle";
import PortalContent from "@/components/portal/PortalContent";
import PortalDensityToggle from "@/components/portal/PortalDensityToggle";
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
      <aside className="portalSidebar">
        <div className="portalBrandRow">
          <a className="portalBrand" href="/portal">
            <span className="portalBrandMark">C</span>
            <span className="portalBrandCopy">
              <b>YTÜ CORE</b>
              <small>İÇ PORTAL</small>
            </span>
          </a>
          <PortalSidebarToggle />
        </div>

        <PortalNav canControl={canControl} />

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
          <form className="portalGlobalSearch" action="/portal/search" method="get">
            <span>⌕</span>
            <input name="q" placeholder="Görev, Vault, repo, stok veya üye ara..." aria-label="Portal genel arama" />
            <kbd>⌘K</kbd>
          </form>
          <div className="portalTopActions">
            <PortalDensityToggle />
            <PortalCommandCenter />
            <a href="/portal/notifications" className="portalTopChip">Bildirimler</a>
            <a href="/portal/profile" className="portalIdentity">
              <span>{initials}</span>
              <div>
                <b>{member.fullName || member.email}</b>
                <small>{portalRoleLabel(member.role)} · {member.teams.length ? member.teams.join(" / ") : "CORE"}</small>
              </div>
            </a>
          </div>
        </header>
        <PortalBanner />
        <PortalContent>{children}</PortalContent>
      </section>
    </main>
  );
}
