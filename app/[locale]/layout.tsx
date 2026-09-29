import type { Metadata } from "next";
import "../public.css";
import { notFound } from "next/navigation";
import MotionRuntime from "@/components/MotionRuntime";
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
    title: tr
      ? "YTÜ CORE | İnsan İçin Teknoloji"
      : "YTÜ CORE | Technology for People",
    description: tr
      ? "YTÜ CORE — Yıldız Teknik Üniversitesi öğrenci mühendislik takımı. Otonom sistemler, araştırma, üretim ve saha doğrulaması."
      : "YTÜ CORE — Yıldız Technical University student engineering team for autonomous systems, research, building and field validation.",
    alternates: {
      canonical: `https://ytucore.com/${locale}`,
      languages: {
        tr: "https://ytucore.com/tr",
        en: "https://ytucore.com/en",
        "x-default": "https://ytucore.com/tr",
      },
    },
  };
}

export default function LocaleLayout({ children }: LocaleLayoutProps) {
  return (
    <>
      <MotionRuntime />
      <div className="scrollProgress" data-scroll-progress aria-hidden="true" />
      {children}
    </>
  );
}
