import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { isLocale } from "@/lib/i18n";

export function generateMetadata({
  params,
}: {
  params: { locale: string };
}): Metadata {
  if (!isLocale(params.locale)) notFound();

  const tr = params.locale === "tr";

  return {
    title: tr ? "YTÜ CORE | Otonom Sistemler" : "YTÜ CORE | Autonomous Systems",
    description: tr
      ? "YTÜ CORE — otonom sistemler, mühendislik, araştırma ve saha operasyonları."
      : "YTÜ CORE — autonomous systems, engineering, research and field operations.",
    alternates: {
      canonical: `/${params.locale}`,
      languages: {
        "tr-TR": "/tr",
        "en": "/en",
      },
    },
  };
}

export default function LocaleLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return children;
}
