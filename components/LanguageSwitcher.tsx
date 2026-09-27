"use client";

import { usePathname } from "next/navigation";
import type { Locale } from "@/lib/i18n";

export default function LanguageSwitcher({ locale }: { locale: Locale }) {
  const pathname = usePathname();
  const nextLocale: Locale = locale === "tr" ? "en" : "tr";

  const parts = pathname.split("/");
  parts[1] = nextLocale;
  const href = parts.join("/") || `/${nextLocale}`;

  return (
    <a className="lang" href={href} aria-label={nextLocale === "tr" ? "Türkçe" : "English"}>
      {nextLocale.toUpperCase()}
    </a>
  );
}
