import { notFound } from "next/navigation";
import PublicChrome from "@/components/PublicChrome";
import PublicPageHero from "@/components/PublicPageHero";
import { domains, projects, serviceUnits } from "@/lib/site-data";
import { isLocale, locales } from "@/lib/i18n";
import { siteSlug } from "@/lib/site-slug";

const allTeams = [
  ...domains.map((team) => ({ ...team, kind: "domain" as const, slug: siteSlug(team.name) })),
  ...serviceUnits.map((team) => ({
    ...team,
    kind: "service" as const,
    slug: siteSlug(team.name.replace("CORE ", "")),
    focus: {
      tr: team.capabilities.map((item) => item.tr).join(" · "),
      en: team.capabilities.map((item) => item.en).join(" · "),
    },
  })),
];

export function generateStaticParams() {
  return locales.flatMap((locale) =>
    allTeams.map((team) => ({ locale, slug: team.slug }))
  );
}

export default async function TeamDetailPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;
  if (!isLocale(locale)) notFound();

  const team = allTeams.find((item) => item.slug === slug);
  if (!team) notFound();

  const teamLabel = team.kind === "domain"
    ? locale === "tr" ? "ARAÇ / SAHA TAKIMI" : "VEHICLE / FIELD TEAM"
    : locale === "tr" ? "ORTAK SERVİS TAKIMI" : "SHARED SERVICE TEAM";

  const relatedProjects = projects.filter((project) => {
    if (team.kind === "domain") return project.owner.includes(`CORE ${team.name}`);
    const shortName = team.name.replace("CORE ", "");
    return project.owner.includes(shortName) || project.integrations.includes(team.name);
  });

  const connectedTeams = team.kind === "domain"
    ? serviceUnits.map((item) => ({
        name: item.name,
        code: item.code,
        slug: siteSlug(item.name.replace("CORE ", "")),
        description: item.description[locale],
      }))
    : domains.map((item) => ({
        name: `CORE ${item.name}`,
        code: item.code,
        slug: siteSlug(item.name),
        description: item.description[locale],
      }));

  return (
    <PublicChrome locale={locale}>
      <PublicPageHero
        code={`TEAM · ${team.code}`}
        eyebrow={teamLabel}
        title={team.kind === "domain" ? `CORE ${team.name}` : team.name}
        lead={team.description[locale]}
      />

      <section className="teamDetailIdentity">
        <div data-reveal>
          <p className="eyebrow">{locale === "tr" ? "ODAK" : "FOCUS"}</p>
          <h2>{team.focus[locale]}</h2>
          <p>
            {locale === "tr"
              ? "Bu sayfa takımın çalışma sınırını değil, başlangıç yüzeyini anlatır. CORE içinde gerçek problemler disiplinler arasıdır; bu takım gerektiğinde diğer domain ve ortak servislerle aynı sistem üzerinde çalışır."
              : "This page describes the team's starting surface, not a hard boundary. Real CORE problems are interdisciplinary, so this team works across domains and shared services whenever the system requires it."}
          </p>
        </div>
        <div className="teamDetailStamp" data-reveal>
          <span>CORE-{team.code}</span>
          <b>{team.kind === "domain" ? team.name : team.name.replace("CORE ", "")}</b>
          <small>STUDENT-RUN / YTÜ</small>
        </div>
      </section>

      <section className="teamCapabilitySection">
        <div className="sectionHeading" data-reveal>
          <div>
            <p className="eyebrow">{locale === "tr" ? "ÇALIŞMA ALANLARI" : "WORK AREAS"}</p>
            <h2>
              {locale === "tr"
                ? "Öğrencinin elinin gerçekten değdiği alanlar."
                : "Where student work becomes real engineering."}
            </h2>
          </div>
          <p>
            {locale === "tr"
              ? "Her başlık; araştırma, tasarım, üretim, entegrasyon ve test döngüsünün bir parçasıdır."
              : "Each area belongs to the same loop of research, design, build, integration and validation."}
          </p>
        </div>

        <div className="teamCapabilityCards">
          {team.capabilities.map((capability, index) => (
            <article data-tilt data-reveal key={capability.en}>
              <span>{String(index + 1).padStart(2, "0")}</span>
              <h3>{capability[locale]}</h3>
              <p>
                {locale === "tr"
                  ? "Gereksinimi tanımla → tasarla → entegre et → ölç → dokümante et."
                  : "Define the requirement → design → integrate → measure → document."}
              </p>
            </article>
          ))}
        </div>
      </section>

      <section className="teamConnectionsSection">
        <div className="sectionHeading" data-reveal>
          <div>
            <p className="eyebrow">{locale === "tr" ? "CORE İÇİNDEKİ BAĞLAR" : "CONNECTIONS INSIDE CORE"}</p>
            <h2>
              {team.kind === "domain"
                ? locale === "tr" ? "Araç tek başına mühendislik yapmaz." : "A vehicle never engineers alone."
                : locale === "tr" ? "Ortak servis, bütün domainlere dokunur." : "A shared service touches every domain."}
            </h2>
          </div>
          <p>
            {locale === "tr"
              ? "Takımlar birbirinden servis tüketir, veri paylaşır ve aynı saha testinde buluşur."
              : "Teams consume shared capabilities, exchange data and meet again in the same field tests."}
          </p>
        </div>

        <div className="teamConnectionRail">
          {connectedTeams.map((item) => (
            <a data-reveal href={`/${locale}/teams/${item.slug}`} key={item.slug}>
              <span>{item.code}</span>
              <b>{item.name}</b>
              <p>{item.description}</p>
              <small>OPEN TEAM →</small>
            </a>
          ))}
        </div>
      </section>

      <section className="teamProjectsSection">
        <div className="sectionHeading" data-reveal>
          <div>
            <p className="eyebrow">{locale === "tr" ? "İLİŞKİLİ PROJELER" : "RELATED PROJECTS"}</p>
            <h2>
              {relatedProjects.length
                ? locale === "tr" ? "Bu takımın portföyde dokunduğu sistemler." : "Systems this team currently touches in the portfolio."
                : locale === "tr" ? "Bu domain için yeni proje alanı açık." : "This domain is ready for its next project."}
            </h2>
          </div>
        </div>

        {relatedProjects.length ? (
          <div className="teamProjectLinks">
            {relatedProjects.map((project) => (
              <a data-reveal data-tilt href={`/${locale}/projects/${siteSlug(project.name)}`} key={project.name}>
                <small>{project.owner}</small>
                <h3>{project.name}</h3>
                <p>{project.description[locale]}</p>
                <div><span>{project.status[locale]}</span><b>{project.progress}%</b></div>
              </a>
            ))}
          </div>
        ) : (
          <div className="teamEmptyPortfolio" data-reveal>
            <span>OPEN / DOMAIN PIPELINE</span>
            <p>
              {locale === "tr"
                ? "Bu takımın ilk bağımsız platform ve alt sistem projeleri portföye eklendikçe burada görünecek."
                : "The team's first independent platform and subsystem projects will appear here as they enter the portfolio."}
            </p>
          </div>
        )}
      </section>

      <section className="detailClosing">
        <div data-reveal>
          <span>YTÜ CORE / {team.code}</span>
          <h2>{locale === "tr" ? "İnsan İçin Teknoloji." : "Technology for People."}</h2>
          <p>
            {locale === "tr"
              ? "Takımın değeri yalnızca ortaya çıkardığı araçta değil; öğrencinin kazandığı mühendislik sorumluluğunda ve geride bıraktığı teknik hafızadadır."
              : "The value of the team is not only the vehicle it creates, but the engineering ownership students gain and the technical memory they leave behind."}
          </p>
        </div>
        <a className="primaryButton" href={`/${locale}/join`}>
          {locale === "tr" ? "CORE'A KATIL" : "JOIN CORE"} →
        </a>
      </section>
    </PublicChrome>
  );
}
