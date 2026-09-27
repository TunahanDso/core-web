import { notFound } from "next/navigation";
import PublicChrome from "@/components/PublicChrome";
import PublicPageHero from "@/components/PublicPageHero";
import { domains, serviceUnits } from "@/lib/site-data";
import { isLocale } from "@/lib/i18n";
import { siteSlug } from "@/lib/site-slug";

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
            <a
              id={domain.code.toLowerCase()}
              href={`/${locale}/teams/${siteSlug(domain.name)}`}
              className="domainCard studentDomainCard"
              data-tilt
              data-reveal
              key={domain.name}
            >
              <div className="cardTop">
                <span className="index">{String(index + 1).padStart(2, "0")}</span>
                <span className="domainCode">CORE-{domain.code}</span>
              </div>
              <h3>CORE {domain.name}</h3>
              <p>{domain.description[locale]}</p>
              <small>{domain.focus[locale]}</small>
              <div className="domainCapabilityList">
                {domain.capabilities.map((capability) => (
                  <span key={capability.en}>{capability[locale]}</span>
                ))}
              </div>
              <div className="teamCardCorner">OPEN TEAM →</div>
            </a>
          ))}
        </div>
      </section>

      <section className="darkSection publicSection sharedTeamsSection">
        <div className="sectionHeading" data-reveal>
          <div><p className="eyebrow">{c.shared}</p><h2>{c.sharedTitle}</h2></div>
          <p>{c.sharedLead}</p>
        </div>
        <div className="serviceGrid">
          {serviceUnits.map((team) => (
            <a
              id={team.code.toLowerCase()}
              href={`/${locale}/teams/${siteSlug(team.name.replace("CORE ", ""))}`}
              className="serviceCard"
              data-tilt
              data-reveal
              key={team.name}
            >
              <div className="serviceCode">{team.code}</div>
              <h3>{team.name}</h3>
              <p>{team.description[locale]}</p>
              <div className="capabilityList">
                {team.capabilities.map((item) => <span key={item.en}>{item[locale]}</span>)}
              </div>
              <small className="serviceOpenLink">OPEN TEAM →</small>
            </a>
          ))}
        </div>
      </section>

      <section className="teamClubMap">
        <div className="teamClubMapIntro" data-reveal>
          <p className="eyebrow">{locale === "tr" ? "KULÜP YAPISI" : "CLUB STRUCTURE"}</p>
          <h2>
            {locale === "tr"
              ? "Üye → takım → ortak servis → proje → saha."
              : "Member → team → shared service → project → field."}
          </h2>
          <p>
            {locale === "tr"
              ? "CORE'da bir öğrenci tek bir kutuya kapanmaz. Araç takımındaki problemi, gerektiğinde Systems, Embedded, Ops veya Research ile birlikte çözer."
              : "A student at CORE is not trapped in one box. Problems inside a vehicle team cross into Systems, Embedded, Ops or Research whenever needed."}
          </p>
        </div>
        <div className="clubMapRail" data-reveal aria-hidden="true">
          <span>STUDENT</span><i>→</i>
          <span>DOMAIN</span><i>↔</i>
          <span>SHARED UNIT</span><i>→</i>
          <span>PROJECT</span><i>→</i>
          <span>FIELD TEST</span><i>→</i>
          <span>DOCUMENT</span>
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

      <section className="teamsJoinCallout">
        <div data-reveal>
          <span>STUDENT-RUN / YTÜ CORE</span>
          <h2>
            {locale === "tr"
              ? "Hangi takımda başlayacağını bilmiyor musun? Sorun değil."
              : "Not sure where you would start? That is completely fine."}
          </h2>
          <p>
            {locale === "tr"
              ? "Katılım sayfası; ilgi alanından gerçek bir CORE görevine nasıl ilerlediğimizi anlatıyor."
              : "The join page explains how an interest turns into a real CORE responsibility."}
          </p>
        </div>
        <a className="primaryButton" href={`/${locale}/join`}>
          {locale === "tr" ? "KATILIM YOLUNU GÖR" : "SEE THE STUDENT PATH"} →
        </a>
      </section>
    </PublicChrome>
  );
}
