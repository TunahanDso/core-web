"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import PortalNav from "./PortalNav";
import PortalThemeControl from "./PortalThemeControl";

export default function PortalMobileMenu({ canControl }: { canControl: boolean }) {
  const pathname = usePathname();
  const ref = useRef<HTMLDetailsElement>(null);
  useEffect(() => { if (ref.current) ref.current.open = false; }, [pathname]);
  return (
    <details className="portalMobileMenu" ref={ref} onKeyDown={event => {
      if (event.key === "Escape" && ref.current) {
        ref.current.open = false;
        ref.current.querySelector("summary")?.focus();
      }
    }}>
      <summary aria-label="Portal menüsü">☰ <span>Menü</span></summary>
      <div className="portalMobileMenuPanel">
        <PortalNav canControl={canControl} />
        <PortalThemeControl />
      </div>
    </details>
  );
}
