"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

type InstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

const mobileItems = [
  ["OV","/portal","Genel"],
  ["PM","/portal/tasks","Görev"],
  ["CH","/portal/chat","Sohbet"],
  ["ML","/portal/mail","Mail"],
  ["VA","/portal/library","Vault"],
] as const;

export default function PortalPwaClient() {
  const pathname = usePathname();
  const [installPrompt, setInstallPrompt] = useState<InstallPromptEvent | null>(null);

  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/portal-sw.js", { scope: "/portal/" }).catch(() => undefined);
    }

    const handler = (event: Event) => {
      event.preventDefault();
      setInstallPrompt(event as InstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  return (
    <>
      <nav className="portalMobileNav" aria-label="Mobil portal navigasyonu">
        {mobileItems.map(([code,href,label]) => {
          const active = href === "/portal" ? pathname === href : pathname === href || pathname.startsWith(href + "/");
          return <a href={href} className={active ? "active" : ""} key={href}><span>{code}</span><b>{label}</b></a>;
        })}
      </nav>
      {installPrompt ? (
        <button
          type="button"
          className="portalInstallButton"
          onClick={async () => {
            await installPrompt.prompt();
            await installPrompt.userChoice.catch(() => ({ outcome: "dismissed" as const }));
            setInstallPrompt(null);
          }}
        >
          PORTALI UYGULAMA OLARAK KUR
        </button>
      ) : null}
    </>
  );
}
