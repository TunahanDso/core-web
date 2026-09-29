"use client";

import { useEffect, useState } from "react";

type Banner = { enabled?: boolean; text?: string };

export default function PortalBanner() {
  const [banner,setBanner] = useState<Banner | null>(null);

  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | null = null;
    let idleId: number | null = null;

    const load = async () => {
      try {
        const response = await fetch("/api/portal/banner", {
          credentials:"same-origin",
          cache:"no-store",
        });
        if (!response.ok) return;
        const payload = await response.json() as Banner;
        if (!cancelled) setBanner(payload);
      } catch {
        // Banner is non-critical shell decoration.
      }
    };

    if ("requestIdleCallback" in window) {
      idleId = window.requestIdleCallback(() => { void load(); }, { timeout: 1500 });
    } else {
      timer = globalThis.setTimeout(() => { void load(); }, 400);
    }

    return () => {
      cancelled = true;
      if (idleId !== null && "cancelIdleCallback" in window) window.cancelIdleCallback(idleId);
      if (timer !== null) globalThis.clearTimeout(timer);
    };
  }, []);

  if (!banner?.enabled || !banner.text) return null;
  return <div className="portalSystemBanner"><span>CORE DUYURU</span><b>{banner.text}</b></div>;
}
