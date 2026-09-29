"use client";

import { savePreference, useSidebarCollapsed } from "./portal-preferences";

export default function PortalSidebarToggle() {
  const collapsed = useSidebarCollapsed();
  const toggle = () => {
    const next = !collapsed;
    document.documentElement.dataset.portalSidebar = next ? "collapsed" : "expanded";
    savePreference("core.portal.sidebar.collapsed", next ? "1" : "0");
  };
  return (
    <button className="portalSidebarToggle" type="button" onClick={toggle}
      aria-label={collapsed ? "Sol menüyü genişlet" : "Sol menüyü daralt"}
      aria-expanded={!collapsed} aria-controls="portal-sidebar-navigation"
      title={collapsed ? "Menüyü genişlet" : "Menüyü daralt"}>
      <span aria-hidden="true">{collapsed ? "›" : "‹"}</span>
    </button>
  );
}
