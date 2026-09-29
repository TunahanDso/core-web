"use client";

import { useEffect, useState } from "react";

type Density = "compact" | "comfortable";

const STORAGE_KEY = "core.portal.density";

function applyDensity(value: Density) {
  document.documentElement.dataset.density = value;
}

export default function PortalDensityToggle() {
  const [density,setDensity] = useState<Density>("compact");

  useEffect(() => {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    const initial: Density = saved === "comfortable" ? "comfortable" : "compact";
    setDensity(initial);
    applyDensity(initial);
  }, []);

  const toggle = () => {
    const next: Density = density === "compact" ? "comfortable" : "compact";
    setDensity(next);
    window.localStorage.setItem(STORAGE_KEY,next);
    applyDensity(next);
  };

  return (
    <button
      className="portalDensityToggle"
      type="button"
      onClick={toggle}
      aria-label={"Görünüm yoğunluğu: " + (density === "compact" ? "Kompakt" : "Rahat")}
      title={density === "compact" ? "Rahat görünüme geç" : "Kompakt görünüme geç"}
    >
      <span aria-hidden="true">{density === "compact" ? "≡" : "☰"}</span>
      <b>{density === "compact" ? "Kompakt" : "Rahat"}</b>
    </button>
  );
}
