import LanguageSwitcher from "@/components/LanguageSwitcher";
import type { Locale } from "@/lib/i18n";

const labels = {
  tr: {
    teams: "Takımlar",
    projects: "Projeler",
    research: "Araştırma",
    competitions: "Yarışmalar",
    about: "Hakkımızda",
    join: "Katıl",
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
    student: "STUDENT ENGINEERING TEAM",
    slogan: "Technology for People.",
  },
} satisfies Record<Locale, Record<string, string>>;

export default function PublicChrome({
  locale,
  children,
}: {
  locale: Locale;
  children: React.ReactNode;
}) {
  const l = labels[locale];

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
          <a href={`/${locale}/teams`}>{l.teams}</a>
          <a href={`/${locale}/projects`}>{l.projects}</a>
          <a href={`/${locale}/research`}>{l.research}</a>
          <a href={`/${locale}/competitions`}>{l.competitions}</a>
          <a href={`/${locale}/about`}>{l.about}</a>
          <a className="joinNav" href={`/${locale}/join`}>{l.join}</a>
          <LanguageSwitcher locale={locale} />
          <a className="adminLink" href="/admin">ADMIN</a>
        </nav>
      </header>

      <div className="clubIdentityRail" aria-hidden="true">
        <div>
          <span>YILDIZ TECHNICAL UNIVERSITY</span>
          <b>STUDENT ENGINEERING TEAM</b>
          <span>{l.slogan}</span>
          <b>LEARN · BUILD · TEST · SHARE</b>
          <span>YILDIZ TECHNICAL UNIVERSITY</span>
          <b>STUDENT ENGINEERING TEAM</b>
          <span>{l.slogan}</span>
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
            <small>{l.slogan}</small>
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
