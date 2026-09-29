"use client";

import { savePreference, useDensity } from "./portal-preferences";

export default function PortalDensityToggle() {
  const density = useDensity();
  const toggle = () => {
    const next = density === "compact" ? "comfortable" : "compact";
    document.documentElement.dataset.density = next;
    savePreference("core.portal.density", next);
  };
  return (
    <button className="portalDensityToggle" type="button" onClick={toggle}
      aria-label={"Görünüm yoğunluğu: " + (density === "compact" ? "Kompakt" : "Rahat")}
      aria-pressed={density === "compact"}
      title={density === "compact" ? "Rahat görünüme geç" : "Kompakt görünüme geç"}>
      <span aria-hidden="true">≡</span><b>{density === "compact" ? "Kompakt" : "Rahat"}</b>
    </button>
  );
}
