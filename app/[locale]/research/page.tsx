import { notFound } from "next/navigation";
import PublicChrome from "@/components/PublicChrome";
import PublicPageHero from "@/components/PublicPageHero";
import { isLocale } from "@/lib/i18n";

const copy = {
  tr: {
    eyebrow: "ARAŞTIRMA",
    title: "Donanımdan önce soru vardır.",
    lead:
      "CORE Research araç üretmez; doğru soruyu bulur, hipotezi test eder, ölçer, raporlar ve teknik çıktıyı araç takımlarına geri verir.",
    pillars: [
      ["Ön Tasarım", "Bir sistem üretilmeden önce gereksinim, mimari, risk ve alternatifler masaya yatırılır."],
      ["Deney", "Belirsizlik tartışmayla değil ölçümle azaltılır; test düzeneği de mühendislik ürünüdür."],
      ["Teknik Rapor", "Kararların neden alındığı ve testte ne görüldüğü sonraki üyeye aktarılır."],
      ["Yayın / Patent", "Yeterince özgün ve doğrulanmış çalışmalar akademik ya da fikrî çıktıya dönüşebilir."],
      ["Teknoloji Doğrulama", "Yeni sensör, algoritma, güç mimarisi veya mekanizma araca girmeden önce bağımsız sınanır."],
    ],
    pipeline: "SORU → HİPOTEZ → DENEY → VERİ → KARAR → SİSTEM",
  },
  en: {
    eyebrow: "RESEARCH",
    title: "Before hardware, there is a question.",
    lead:
      "CORE Research does not build vehicles. It finds the right question, tests hypotheses, measures, documents and feeds technical evidence back to vehicle teams.",
    pillars: [
      ["Preliminary Design", "Requirements, architecture, risks and alternatives are challenged before a system is built."],
      ["Experiment", "Uncertainty is reduced through measurement; the test rig itself is an engineering product."],
      ["Technical Report", "Why a decision was made and what a test revealed survives for the next member."],
      ["Publication / Patent", "Sufficiently original and validated work can become academic or intellectual output."],
      ["Technology Validation", "A new sensor, algorithm, power architecture or mechanism is validated before vehicle integration."],
    ],
    pipeline: "QUESTION → HYPOTHESIS → EXPERIMENT → DATA → DECISION → SYSTEM",
  },
} as const;

export default async function ResearchPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const c = copy[locale];

  return (
    <PublicChrome locale={locale}>
      <PublicPageHero code="03" eyebrow={c.eyebrow} title={c.title} lead={c.lead} />
      <section className="researchNotebook">
        <div className="notebookMargin" aria-hidden="true" />
        <div className="researchQuestion" data-reveal>
          <span>CORE RESEARCH / NOTE 001</span>
          <h2>{locale === "tr" ? "“Bunu neden böyle yapıyoruz?” sorusu kaybolmayacak." : "The question “why are we doing it this way?” must never disappear."}</h2>
          <p>{locale === "tr" ? "Araştırmanın görevi yarışma puanı toplamak değil; takımın teknik karar kalitesini yükseltmek." : "Research is not about collecting competition points; it raises the quality of the team's engineering decisions."}</p>
        </div>
        <div className="researchPillars">
          {c.pillars.map(([title, text], index) => (
            <article data-reveal key={title}><span>{String(index + 1).padStart(2, "0")}</span><h3>{title}</h3><p>{text}</p></article>
          ))}
        </div>
      </section>
      <section className="researchPipeline" data-reveal><span>CORE METHOD</span><b>{c.pipeline}</b></section>
    </PublicChrome>
  );
}
