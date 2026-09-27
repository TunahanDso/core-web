import { notFound } from "next/navigation";
import PublicChrome from "@/components/PublicChrome";
import PublicPageHero from "@/components/PublicPageHero";
import { domains, serviceUnits } from "@/lib/site-data";
import { isLocale } from "@/lib/i18n";

const copy = {
  tr: {
    eyebrow: "TAKIMLAR",
    title: "Aynı okulda, farklı dünyalar için üretiyoruz.",
    lead:
      "CORE'un yapısı iki katmanlıdır: araç takımları bir fiziksel ortama odaklanır; ortak servis takımları ise yazılım, elektronik ve operasyon yeteneklerini herkes için üretir.",
    vehicle: "ARAÇ / SAHA TAKIMLARI",
    vehicleTitle: "Yedi ortam, yedi uzmanlaşma alanı.",
    shared: "ORTAK SERVİS TAKIMLARI",
    sharedTitle: "Bilgi bir araçta kilitli kalmaz.",
    sharedLead:
      "Systems, Embedded ve Ops; Marine'den Rocket'a kadar tüm takımların tekrar kullanabildiği ortak mühendislik omurgasıdır.",
    flowTitle: "Bir öğrenci CORE'da nasıl çalışır?",
    flow: [
      ["01", "Bir domain'e katılır", "Marine, Subsea, Land, Air, Industrial, Space veya Rocket."],
      ["02", "Bir probleme sahip olur", "Navigasyon, güç, mekanik, algı, haberleşme ya da görev problemi."],
      ["03", "Ortak servislerle kesişir", "Systems, Embedded ve Ops aynı problemi farklı katmanlardan çözer."],
      ["04", "Sahada doğrular", "Çalışıyor demek için gerçek koşullarda test eder."],
      ["05", "Bilgiyi geri bırakır", "Kod, çizim, test sonucu ve rapor organizasyonda kalır."],
    ],
  },
  en: {
    eyebrow: "TEAMS",
    title: "One university, building for many worlds.",
    lead:
      "CORE has two layers: vehicle teams focus on physical environments while shared service teams build reusable software, electronics and operations capabilities for everyone.",
    vehicle: "VEHICLE / FIELD TEAMS",
    vehicleTitle: "Seven environments, seven areas of specialization.",
    shared: "SHARED SERVICE TEAMS",
    sharedTitle: "Knowledge never gets trapped inside one vehicle.",
    sharedLead:
      "Systems, Embedded and Ops form a reusable engineering backbone shared by every team from Marine to Rocket.",
    flowTitle: "How does a student work inside CORE?",
    flow: [
      ["01", "Join a domain", "Marine, Subsea, Land, Air, Industrial, Space or Rocket."],
      ["02", "Own a problem", "Navigation, power, mechanics, perception, communications or mission logic."],
      ["03", "Cross shared services", "Systems, Embedded and Ops attack the same problem from different layers."],
      ["04", "Validate in the field", "A system is not done until it survives real conditions."],
      ["05", "Leave knowledge behind", "Code, drawings, test results and reports remain with the organization."],
    ],
  },
} as const;

export default async function TeamsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const c = copy[locale];

  return (
    <PublicChrome locale={locale}>
      <PublicPageHero code="01" eyebrow={c.eyebrow} title={c.title} lead={c.lead} />

      <section className="lightSection publicSection">
        <div className="sectionHeading" data-reveal>
          <div><p className="eyebrow">{c.vehicle}</p><h2>{c.vehicleTitle}</h2></div>
          <p>CORE Marine → Subsea → Land → Air → Industrial → Space → Rocket</p>
        </div>
        <div className="domainGrid domainGridExpanded">
          {domains.map((domain, index) => (
            <article id={domain.code.toLowerCase()} className="domainCard studentDomainCard" data-tilt data-reveal key={domain.name}>
              <div className="cardTop">
                <span className="index">{String(index + 1).padStart(2, "0")}</span>
                <span className="domainCode">CORE-{domain.code}</span>
              </div>
              <h3>CORE {domain.name}</h3>
              <p>{domain.description[locale]}</p>
              <small>{domain.focus[locale]}</small>
              <div className="teamCardCorner">STUDENT TEAM</div>
            </article>
          ))}
        </div>
      </section>

      <section className="darkSection publicSection">
        <div className="sectionHeading" data-reveal>
          <div><p className="eyebrow">{c.shared}</p><h2>{c.sharedTitle}</h2></div>
          <p>{c.sharedLead}</p>
        </div>
        <div className="serviceGrid">
          {serviceUnits.map((team) => (
            <article id={team.code.toLowerCase()} className="serviceCard" data-tilt data-reveal key={team.name}>
              <div className="serviceCode">{team.code}</div>
              <h3>{team.name}</h3>
              <p>{team.description[locale]}</p>
              <div className="capabilityList">
                {team.capabilities.map((item) => <span key={item.en}>{item[locale]}</span>)}
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="teamFlowSection">
        <div data-reveal><p className="eyebrow">STUDENT PATH</p><h2>{c.flowTitle}</h2></div>
        <div className="teamFlow">
          {c.flow.map(([n, title, text]) => (
            <article data-reveal key={n}><span>{n}</span><h3>{title}</h3><p>{text}</p></article>
          ))}
        </div>
      </section>
    </PublicChrome>
  );
}
