"use client";

import { useSyncExternalStore } from "react";

export type Theme = "system" | "light" | "dark";
export type Density = "compact" | "comfortable";
const eventName = "core:appearance";

function subscribe(listener: () => void) {
  window.addEventListener(eventName, listener);
  return () => window.removeEventListener(eventName, listener);
}

export function notifyAppearance() { window.dispatchEvent(new Event(eventName)); }
export function savePreference(key: string, value: string) {
  try { localStorage.setItem(key, value); } catch { /* Keep the current-session choice. */ }
  notifyAppearance();
}

export function useSidebarCollapsed() {
  return useSyncExternalStore(subscribe, () => document.documentElement.dataset.portalSidebar === "collapsed", () => false);
}
export function useDensity() {
  return useSyncExternalStore(subscribe, () => document.documentElement.dataset.density === "compact" ? "compact" : "comfortable", () => "comfortable") as Density;
}
export function useTheme() {
  return useSyncExternalStore(subscribe, () => (document.documentElement.dataset.portalThemePreference || "system") as Theme, () => "system" as Theme);
}
export function applyTheme(preference: Theme) {
  const root = document.documentElement;
  root.dataset.portalThemePreference = preference;
  root.dataset.portalTheme = preference === "dark" || (preference === "system" && matchMedia("(prefers-color-scheme: dark)").matches) ? "dark" : "light";
}
