import { notFound } from "next/navigation";
import PublicChrome from "@/components/PublicChrome";
import PublicPageHero from "@/components/PublicPageHero";
import { isLocale } from "@/lib/i18n";
import { getPublicPage } from "@/lib/cms/db";

export const dynamic = "force-dynamic";
const copy = {
  tr: {
    eyebrow: "HAKKIMIZDA",
    title: "Bir öğrenci takımı ne kadar ileri gidebilir?",
    lead:
      "CORE'un cevabı basit: öğrencinin merakını gerçek sorumluluk, ortak altyapı ve güçlü teknik hafızayla buluşturabildiği kadar.",
    notCompany: "Şirket değiliz.",
    notCompanyText: "Ürün dili kullanıyoruz çünkü yaptığımız işi ciddiye alıyoruz; fakat merkezde müşteri değil öğrenen, üreten ve sorumluluk alan öğrenci var.",
    notSingle: "Tek yarışmalık takım değiliz.",
    notSingleText: "Araçlar değişebilir, yarışmalar değişebilir. Kodun, bilginin, test kültürünün ve mühendislik standardının kalmasını istiyoruz.",
    mission: "Misyon",
    missionText: "Yıldız Teknik Üniversitesi öğrencilerinin disiplinler arası gerçek sistemler geliştirerek mühendisliği uygulamalı biçimde öğrenebildiği sürdürülebilir bir teknik kültür kurmak.",
    slogan: "İnsan İçin Teknoloji.",
    sloganText: "Teknoloji bizim için gösteri değil; insanın işini, güvenliğini, bilgisini ve yaşamını iyileştiren bir araç.",
    principles: [
      ["Sahiplik", "Bir işi alan öğrenci sonucunun da sorumluluğunu taşır."],
      ["Açıklık", "Karar, kod ve test gerekçesi mümkün olduğunca görünürdür."],
      ["Doğrulama", "Çalışıyor demek için ölçeriz."],
      ["Devamlılık", "Bilgi mezun olan kişiyle birlikte kaybolmaz."],
      ["İnsan", "Teknik kararın sonunda her zaman bir insan vardır."],
    ],
  },
  en: {
    eyebrow: "ABOUT",
    title: "How far can a student team go?",
    lead:
      "CORE's answer is simple: as far as student curiosity can go when paired with real responsibility, shared infrastructure and durable technical memory.",
    notCompany: "We are not a company.",
    notCompanyText: "We use product language because we take engineering seriously, but the center is not a customer; it is the student who learns, builds and takes responsibility.",
    notSingle: "We are not a one-competition team.",
    notSingleText: "Vehicles and competitions may change. We want code, knowledge, test culture and engineering standards to remain.",
    mission: "Mission",
    missionText: "Build a sustainable technical culture where Yıldız Technical University students learn engineering by creating real interdisciplinary systems.",
    slogan: "Technology for People.",
    sloganText: "Technology is not a spectacle for us; it is a tool for improving people's work, safety, knowledge and life.",
    principles: [
      ["Ownership", "A student who takes a task also owns its outcome."],
      ["Openness", "Decisions, code and test rationale stay as visible as possible."],
      ["Validation", "We measure before we claim it works."],
      ["Continuity", "Knowledge does not graduate with one person."],
      ["People", "There is always a human at the end of a technical decision."],
    ],
  },
} as const;

export default async function AboutPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const c = copy[locale];
  const cms = await getPublicPage("about", locale);

  return (
    <PublicChrome locale={locale}>
      <PublicPageHero
        code={cms?.code || "05"}
        eyebrow={cms?.eyebrow || c.eyebrow}
        title={cms?.title || c.title}
        lead={cms?.summary || c.lead}
      />
      <section className="aboutSplit">
        <article className="aboutAntiCard" data-reveal><span>NO / 01</span><h2>{c.notCompany}</h2><p>{c.notCompanyText}</p></article>
        <article className="aboutAntiCard" data-reveal><span>NO / 02</span><h2>{c.notSingle}</h2><p>{c.notSingleText}</p></article>
      </section>
      <section className="aboutMission">
        <div data-reveal><p className="eyebrow">{c.mission.toUpperCase()}</p><h2>{cms?.body || c.missionText}</h2></div>
        <div className="sloganPoster" data-reveal><span>YTÜ CORE</span><strong>{c.slogan}</strong><p>{c.sloganText}</p></div>
      </section>
      <section className="principlesSection">
        <div className="sectionHeading" data-reveal><div><p className="eyebrow">CORE PRINCIPLES</p><h2>{locale === "tr" ? "Bizi biçimlendiren beş şey." : "Five things that shape us."}</h2></div><p>{locale === "tr" ? "Teknik standart kadar çalışma kültürü de tasarlanır." : "Culture is engineered as deliberately as technical standards."}</p></div>
        <div className="principleGrid">{c.principles.map(([title,text],i)=><article data-tilt data-reveal key={title}><span>{String(i+1).padStart(2,"0")}</span><h3>{title}</h3><p>{text}</p></article>)}</div>
      </section>
    </PublicChrome>
  );
}
