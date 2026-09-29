"use client";

import { useEffect, useState } from "react";

declare global {
  interface Window {
    __TAURI_INTERNALS__?: unknown;
  }
}

function desktopRequested() {
  if (typeof window === "undefined") return false;
  return new URLSearchParams(window.location.search).get("desktop") === "1";
}

export default function PortalDesktopExperience() {
  const [desktop, setDesktop] = useState(false);
  const [version, setVersion] = useState("");

  useEffect(() => {
    if (!desktopRequested() && !window.__TAURI_INTERNALS__) return;

    const root = document.documentElement;
    root.classList.add("coreDesktopRuntime");
    setDesktop(true);

    let cancelled = false;
    if (window.__TAURI_INTERNALS__) {
      void import("@tauri-apps/api/app")
        .then(({ getVersion }) => getVersion())
        .then((value) => {
          if (!cancelled) setVersion(value);
        })
        .catch(() => undefined);
    }

    return () => {
      cancelled = true;
      root.classList.remove("coreDesktopRuntime");
    };
  }, []);

  if (!desktop) return null;

  return (
    <div className="portalDesktopStatus" role="status" aria-label="CORE Desktop runtime">
      <span className="portalDesktopProduct">
        <b>CORE DESKTOP</b>
        <em>WORKBENCH</em>
      </span>
      <span className="portalDesktopRuntimeState">
        <i aria-hidden="true" />
        CLOUD WORKSPACE
        {version ? <small>v{version}</small> : null}
      </span>
      <span className="portalDesktopHint">Ctrl / ⌘ + K · Ara ve git</span>
    </div>
  );
}
