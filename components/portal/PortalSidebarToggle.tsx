"use client";

import { useEffect, useState } from "react";

const STORAGE_KEY = "core.portal.sidebar.collapsed";

export default function PortalSidebarToggle() {
  const [collapsed,setCollapsed] = useState(false);

  useEffect(() => {
    const saved = window.localStorage.getItem(STORAGE_KEY) === "1";
    setCollapsed(saved);
    document.querySelector(".portalApp")?.classList.toggle("portalSidebarCollapsed", saved);
  }, []);

  const toggle = () => {
    const next = !collapsed;
    setCollapsed(next);
    window.localStorage.setItem(STORAGE_KEY,next ? "1" : "0");
    document.querySelector(".portalApp")?.classList.toggle("portalSidebarCollapsed", next);
  };

  return (
    <button
      className="portalSidebarToggle"
      type="button"
      onClick={toggle}
      aria-label={collapsed ? "Sol menüyü genişlet" : "Sol menüyü daralt"}
      aria-expanded={!collapsed}
      title={collapsed ? "Menüyü genişlet" : "Menüyü daralt"}
    >
      <span aria-hidden="true">{collapsed ? "›" : "‹"}</span>
    </button>
  );
}
