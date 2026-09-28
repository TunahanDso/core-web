import LanguageSwitcher from "@/components/LanguageSwitcher";
import { domains, serviceUnits } from "@/lib/site-data";
import { siteSlug } from "@/lib/site-slug";
import { getSiteSetting } from "@/lib/cms/extensions";
import { listPublicProjects } from "@/lib/cms/public-projects";
import type { Locale } from "@/lib/i18n";

const labels = {
  tr: {
    teams: "Takımlar",
    projects: "Projeler",
    research: "Araştırma",
    competitions: "Yarışmalar",
    about: "Hakkımızda",
    join: "Katıl",
    portal: "Portal",
    allTeams: "Tüm takımları gör",
    allProjects: "Tüm projeleri gör",
    vehicleTeams: "Araç / saha",
    sharedTeams: "Ortak servisler",
    student: "ÖĞRENCİ MÜHENDİSLİK TAKIMI",
    slogan: "İnsan İçin Teknoloji.",
  },
  en: {
    teams: "Teams",
    projects: "Projects",
    research: "Research",
    competitions: "Competitions",
    about: "About",
    join: "Join",
    portal: "Portal",
    allTeams: "See all teams",
    allProjects: "See all projects",
    vehicleTeams: "Vehicle / field",
    sharedTeams: "Shared services",
    student: "STUDENT ENGINEERING TEAM",
    slogan: "Technology for People.",
  },
} satisfies Record<Locale, Record<string, string>>;

export default async function PublicChrome({
  locale,
  children,
}: {
  locale: Locale;
  children: React.ReactNode;
}) {
  const l = labels[locale];
  const [identity,projects] = await Promise.all([getSiteSetting("site_identity"),listPublicProjects(locale)]);
  const slogan = locale === "tr"
    ? String(identity?.slogan_tr || l.slogan)
    : String(identity?.slogan_en || l.slogan);

  return (
    <main className="publicPage">
      <header className="siteHeader publicHeader">
        <a className="brand coreBrand" href={`/${locale}`} aria-label="YTÜ CORE">
          <span className="brandMark" aria-hidden="true">
            <svg className="coreLogoSvg" viewBox="0 0 64 64" role="img">
              <path d="M48 17H29c-9 0-15 6-15 15s6 15 15 15h19V37H30c-3 0-5-2-5-5s2-5 5-5h18V17Z" />
              <rect x="47" y="17" width="4" height="30" />
            </svg>
          </span>
          <span className="brandWords">
            <b>YTÜ CORE</b>
            <small>{l.student}</small>
          </span>
        </a>

        <nav className="publicNav" aria-label="Main navigation">
          <div className="navPrimary">
            <div className="navDropdown">
              <a className="navDropdownTrigger" href={`/${locale}/teams`}>
                {l.teams}<span>⌄</span>
              </a>
              <div className="navDropdownPanel teamsDropdown">
                <div className="navDropdownHead">
                  <span>CORE / 10</span>
                  <a href={`/${locale}/teams`}>{l.allTeams} →</a>
                </div>
                <div className="navDropdownColumns">
                  <div>
                    <small>{l.vehicleTeams}</small>
                    {domains.map((team) => (
                      <a href={`/${locale}/teams/${siteSlug(team.name)}`} key={team.name}>
                        <span>CORE-{team.code}</span>
                        <b>{team.name}</b>
                      </a>
                    ))}
                  </div>
                  <div>
                    <small>{l.sharedTeams}</small>
                    {serviceUnits.map((team) => (
                      <a href={`/${locale}/teams/${siteSlug(team.name.replace("CORE ", ""))}`} key={team.name}>
                        <span>{team.code}</span>
                        <b>{team.name}</b>
                      </a>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="navDropdown">
              <a className="navDropdownTrigger" href={`/${locale}/projects`}>
                {l.projects}<span>⌄</span>
              </a>
              <div className="navDropdownPanel projectsDropdown">
                <div className="navDropdownHead">
                  <span>PORTFOLIO / {String(projects.length).padStart(2, "0")}</span>
                  <a href={`/${locale}/projects`}>{l.allProjects} →</a>
                </div>
                <div className="navProjectGrid">
                  {projects.map((project, index) => (
                    <a href={`/${locale}/projects/${project.slug}`} key={project.name}>
                      <small>{String(index + 1).padStart(2, "0")}</small>
                      <b>{project.name}</b>
                      <span>{project.owner}</span>
                    </a>
                  ))}
                </div>
              </div>
            </div>

            <a href={`/${locale}/research`}>{l.research}</a>
            <a href={`/${locale}/competitions`}>{l.competitions}</a>
            <a href={`/${locale}/about`}>{l.about}</a>
            <div className="navInlineUtility">
              <a className="portalNavLink" href="/portal">{l.portal}</a>
              <a className="joinNav" href={`/${locale}/join`}>{l.join}</a>
              <LanguageSwitcher locale={locale} />
            </div>
          </div>

          <div className="navUtility navAdminUtility">
            <a className="adminLink" href="/admin">ADMIN</a>
          </div>
        </nav>
      </header>

      <div className="clubIdentityRail" aria-hidden="true">
        <div>
          <span>YILDIZ TECHNICAL UNIVERSITY</span>
          <b>STUDENT ENGINEERING TEAM</b>
          <span>{slogan}</span>
          <b>LEARN · BUILD · TEST · SHARE</b>
          <span>YILDIZ TECHNICAL UNIVERSITY</span>
          <b>STUDENT ENGINEERING TEAM</b>
          <span>{slogan}</span>
          <b>LEARN · BUILD · TEST · SHARE</b>
        </div>
      </div>

      {children}

      <footer className="publicFooter">
        <div className="footerBrand">
          <span className="brandMark" aria-hidden="true">
            <svg className="coreLogoSvg" viewBox="0 0 64 64" role="img">
              <path d="M48 17H29c-9 0-15 6-15 15s6 15 15 15h19V37H30c-3 0-5-2-5-5s2-5 5-5h18V17Z" />
              <rect x="47" y="17" width="4" height="30" />
            </svg>
          </span>
          <div>
            <b>YTÜ CORE</b>
            <small>{slogan}</small>
          </div>
        </div>
        <div className="footerStudentNote">
          <span>{locale === "tr" ? "Yıldız Teknik Üniversitesi · Öğrenci mühendislik takımı" : "Yıldız Technical University · Student engineering team"}</span>
          <small>{locale === "tr" ? "Öğren · Tasarla · Üret · Test Et · Paylaş" : "Learn · Design · Build · Test · Share"}</small>
        </div>
        <div className="footerRight">
          <span>ytucore.com</span>
          <strong>© 2026 Tunahan DELİSALİHOĞLU</strong>
        </div>
      </footer>
    </main>
  );
}
