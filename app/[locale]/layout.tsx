import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { isLocale } from "@/lib/i18n";

type LocaleLayoutProps = {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({
  params,
}: Pick<LocaleLayoutProps, "params">): Promise<Metadata> {
  const { locale } = await params;

  if (!isLocale(locale)) notFound();

  const tr = locale === "tr";

  return {
    title: tr ? "YTÜ CORE | Otonom Sistemler" : "YTÜ CORE | Autonomous Systems",
    description: tr
      ? "YTÜ CORE — otonom sistemler, mühendislik, araştırma ve saha operasyonları."
      : "YTÜ CORE — autonomous systems, engineering, research and field operations.",
    alternates: {
      canonical: `/${locale}`,
      languages: {
        "tr-TR": "/tr",
        en: "/en",
      },
    },
  };
}

export default function LocaleLayout({ children }: LocaleLayoutProps) {
  return children;
}
