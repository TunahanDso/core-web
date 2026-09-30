"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";

export default function PortalContent({children}:{children:React.ReactNode}) {
  const pathname=usePathname();
  const viewportMode=
    pathname.startsWith("/portal/mail") ||
    pathname.startsWith("/portal/chat") ||
    /^\/portal\/meetings\/[^/]+$/.test(pathname);

  useEffect(()=>{
    if(!viewportMode)return;
    const root=document.documentElement;
    const viewport=window.visualViewport;
    const sync=()=>{
      // Pin the workspace to the visible area, including mobile keyboard resize.
      root.style.setProperty("--core-workspace-height",`${viewport?.height ?? window.innerHeight}px`);
    };
    sync();
    viewport?.addEventListener("resize",sync);
    window.addEventListener("resize",sync);
    return()=>{
      viewport?.removeEventListener("resize",sync);
      window.removeEventListener("resize",sync);
      root.style.removeProperty("--core-workspace-height");
    };
  },[viewportMode]);

  return (
    <div id="portal-content" tabIndex={-1} className={"portalContent"+(viewportMode?" portalContentViewport":"")}>
      {children}
    </div>
  );
}
