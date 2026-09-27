import { notFound } from "next/navigation";
import PublicChrome from "@/components/PublicChrome";
import PublicPageHero from "@/components/PublicPageHero";
import { competitions } from "@/lib/site-data";
import { isLocale } from "@/lib/i18n";

const copy = {
  tr: {
    eyebrow: "YARIŞMALAR / SAHA HEDEFLERİ",
    title: "Yarışma amaç değil; sert bir doğrulama ortamı.",
    lead:
      "CORE yarışmaları takvime madalya yazmak için değil, mühendisliği dış gereksinimler altında sınamak için kullanır. Hedefler kesin kayıt anlamına gelmez; planlama panosudur.",
    confirmed: "2027 TARİHİ AÇIKLANDI",
    target: "2027 HEDEF",
    evaluation: "DEĞERLENDİRMEDE",
  },
  en: {
    eyebrow: "COMPETITIONS / FIELD TARGETS",
    title: "Competition is not the purpose. It is a hard validation environment.",
    lead:
      "CORE uses competitions to pressure-test engineering under external requirements. Targets are planning signals, not guarantees of registration.",
    confirmed: "2027 DATE PUBLISHED",
    target: "2027 TARGET",
    evaluation: "UNDER EVALUATION",
  },
} as const;

export default async function CompetitionsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const c = copy[locale];
  const status = (s: "confirmed" | "target" | "evaluation") => s === "confirmed" ? c.confirmed : s === "target" ? c.target : c.evaluation;

  return (
    <PublicChrome locale={locale}>
      <PublicPageHero code="04" eyebrow={c.eyebrow} title={c.title} lead={c.lead} />
      <section className="darkSection publicSection competitionBoard">
        <div className="competitionList">
          {competitions.map((competition, index) => (
            <article className="competitionRow competitionRowPublic" data-reveal key={competition.name}>
              <span className="competitionIndex">{String(index + 1).padStart(2, "0")}</span>
              <div><small>{competition.domain}</small><h3>{competition.name}</h3></div>
              <div className="competitionDate"><b>{competition.date[locale]}</b><span>{competition.location[locale]}</span></div>
              <p>{competition.note[locale]}</p>
              <span className={`statusPill ${competition.status}`}>{status(competition.status)}</span>
            </article>
          ))}
        </div>
      </section>
    </PublicChrome>
  );
}
