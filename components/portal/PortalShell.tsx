import type { PortalMember } from "@/lib/portal/auth";
import PortalNav from "@/components/portal/PortalNav";
import { logoutPortalAction } from "@/app/portal/actions";
import { getSiteSetting } from "@/lib/cms/extensions";
import { portalRoleLabel } from "@/lib/portal/labels";
import PortalCommandCenter from "@/components/portal/PortalCommandCenter";

export default async function PortalShell({
  member,
  children,
}: {
  member: PortalMember;
  children: React.ReactNode;
}) {
  const banner = await getSiteSetting("portal_banner");
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
            <small>İÇ PORTAL</small>
          </span>
        </a>

        <PortalNav role={member.role} />

        <div className="portalSidebarFoot">
          <a href="/tr" className="portalPublicLink">← Vitrin sitesi</a>
          <form action={logoutPortalAction}>
            <button type="submit">Çıkış yap</button>
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
        {banner?.enabled && banner.text ? (
          <div className="portalSystemBanner"><span>CORE DUYURU</span><b>{String(banner.text)}</b></div>
        ) : null}
        <div className="portalContent">{children}</div>
      </section>
    </main>
  );
}
