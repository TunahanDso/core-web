import { notFound } from "next/navigation";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import { copy, domains } from "@/lib/content";
import { isLocale, locales } from "@/lib/i18n";

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

export default function Home({ params }: { params: { locale: string } }) {
  if (!isLocale(params.locale)) notFound();

  const locale = params.locale;
  const content = copy[locale];
  const domainItems = domains[locale];

  return (
    <main>
      <header>
        <a className="brand" href={`/${locale}`}>
          YTÜ <b>CORE</b>
        </a>
        <nav>
          <a href="#domains">{content.nav[0]}</a>
          <a href="#research">{content.nav[1]}</a>
          <a href="#projects">{content.nav[2]}</a>
          <a href="#contact">{content.nav[3]}</a>
          <LanguageSwitcher locale={locale} />
        </nav>
      </header>

      <section className="hero">
        <p className="eyebrow">{content.eyebrow}</p>
        <h1>{content.title}</h1>
        <p className="lead">{content.lead}</p>
        <div className="actions">
          <a href="#domains">{content.explore}</a>
          <a className="ghost" href="#projects">
            {content.projects}
          </a>
        </div>
      </section>

      <section id="domains">
        <p className="eyebrow">ENGINEERING DOMAINS</p>
        <h2>{content.domainsTitle}</h2>
        <div className="grid">
          {domainItems.map(([name, description], index) => (
            <article key={name}>
              <span>0{index + 1}</span>
              <h3>CORE {name}</h3>
              <p>{description}</p>
            </article>
          ))}
        </div>
      </section>

      <section id="research" className="split">
        <div>
          <p className="eyebrow">CORE RESEARCH</p>
          <h2>{content.researchTitle}</h2>
        </div>
        <p>{content.researchBody}</p>
      </section>

      <section id="projects">
        <p className="eyebrow">{content.projectEyebrow}</p>
        <h2>{content.projectTitle}</h2>
        <p className="lead">{content.projectLead}</p>
        <div className="terminal">
          <span>CORE NETWORK</span>
          <b>{content.initializing}</b>
          <small>{content.coming}</small>
        </div>
      </section>

      <footer id="contact">
        <b>YTÜ CORE</b>
        <span>{content.footer}</span>
        <span>© 2026</span>
      </footer>
    </main>
  );
}
