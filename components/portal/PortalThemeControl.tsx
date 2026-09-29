"use client";

import { useEffect } from "react";
import { applyTheme, notifyAppearance, savePreference, useTheme, type Theme } from "./portal-preferences";

export default function PortalThemeControl() {
  const theme = useTheme();
  useEffect(() => {
    const media = matchMedia("(prefers-color-scheme: dark)");
    const sync = () => {
      applyTheme((document.documentElement.dataset.portalThemePreference || "system") as Theme);
      notifyAppearance();
    };
    sync();
    media.addEventListener("change", sync);
    return () => media.removeEventListener("change", sync);
  }, []);
  return (
    <label className="portalThemeControl">
      <span>Tema</span>
      <select aria-label="Portal teması" value={theme} onChange={event => {
        const next = event.target.value as Theme;
        applyTheme(next);
        savePreference("core.portal.theme", next);
      }}>
        <option value="system">Sistem</option><option value="light">Açık</option><option value="dark">Koyu</option><option value="aurora">Aurora ✦</option>
      </select>
    </label>
  );
}
