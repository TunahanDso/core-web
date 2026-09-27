import { notFound } from "next/navigation";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import {
  competitions,
  domains,
  networkStats,
  projects,
  serviceUnits,
  ui,
} from "@/lib/site-data";
import { isLocale, locales } from "@/lib/i18n";

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

export default async function Home({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  if (!isLocale(locale)) notFound();

  const c = ui[locale];
  const statusLabel = (status: "confirmed" | "target" | "evaluation") =>
    status === "confirmed"
      ? c.confirmed
      : status === "target"
        ? c.target
        : c.evaluation;

  return (
    <main>
      <header className="siteHeader">
        <a className="brand" href={`/${locale}`} aria-label="YTÜ CORE">
          <span className="brandMark">C</span>
          <span>
            YTÜ <b>CORE</b>
          </span>
        </a>

        <nav>
          <a href="#domains">{c.nav[0]}</a>
          <a href="#teams">{c.nav[1]}</a>
          <a href="#projects">{c.nav[2]}</a>
          <a href="#competitions">{c.nav[3]}</a>
          <a href="#research">{c.nav[4]}</a>
          <LanguageSwitcher locale={locale} />
          <a className="adminLink" href="/admin">
            {c.admin}
          </a>
        </nav>
      </header>

      <section className="hero">
        <div className="heroNoise" />
        <div className="heroCopy">
          <p className="eyebrow">{c.kicker}</p>
          <h1>
            {c.heroA}
            <br />
            <em>{c.heroB}</em>
          </h1>
          <p className="heroLead">{c.heroLead}</p>

          <div className="actions">
            <a className="primaryButton" href="#domains">
              {c.primaryCta}
            </a>
            <a className="textButton" href="#projects">
              {c.secondaryCta} ↘
            </a>
          </div>

          <div className="heroMeta">
            <span>CORE / 2026</span>
            <span>ISTANBUL · TÜRKİYE</span>
            <span>PUBLIC NODE: ONLINE</span>
          </div>
        </div>

        <div className="coreVisual" aria-hidden="true">
          <div className="orbit orbitOne" />
          <div className="orbit orbitTwo" />
          <div className="orbit orbitThree" />
          <div className="corePulse">CORE</div>
          <span className="node n1">M</span>
          <span className="node n2">S</span>
          <span className="node n3">L</span>
          <span className="node n4">A</span>
          <span className="node n5">I</span>
          <span className="node n6">SP</span>
          <span className="node n7">R</span>
        </div>
      </section>

      <section className="manifestoBand">
        <span>01</span>
        <p>{c.manifesto}</p>
        <b>ONE CORE / MANY SYSTEMS</b>
      </section>

      <section id="domains" className="sectionShell">
        <div className="sectionHeading">
          <div>
            <p className="eyebrow">ENGINEERING DOMAINS</p>
            <h2>{c.domainsTitle}</h2>
          </div>
          <p>{c.domainsLead}</p>
        </div>

        <div className="domainGrid">
          {domains.map((domain, index) => (
            <article className="domainCard" key={domain.name}>
              <div className="cardTop">
                <span className="index">0{index + 1}</span>
                <span className="domainCode">CORE-{domain.code}</span>
              </div>
              <h3>CORE {domain.name}</h3>
              <p>{domain.description[locale]}</p>
              <small>{domain.focus[locale]}</small>
            </article>
          ))}
        </div>
      </section>

      <section id="teams" className="sectionShell darkSection">
        <div className="sectionHeading">
          <div>
            <p className="eyebrow">SHARED ENGINEERING SERVICES</p>
            <h2>{c.teamsTitle}</h2>
          </div>
          <p>{c.teamsLead}</p>
        </div>

        <div className="serviceGrid">
          {serviceUnits.map((team) => (
            <article className="serviceCard" key={team.name}>
              <div className="serviceCode">{team.code}</div>
              <h3>{team.name}</h3>
              <p>{team.description[locale]}</p>
              <div className="capabilityList">
                {team.capabilities.map((item) => (
                  <span key={item.en}>{item[locale]}</span>
                ))}
              </div>
            </article>
          ))}
        </div>
      </section>

      <section id="projects" className="sectionShell">
        <div className="sectionHeading">
          <div>
            <p className="eyebrow">PRODUCT / PROJECT PORTFOLIO</p>
            <h2>{c.projectsTitle}</h2>
          </div>
          <p>{c.projectsLead}</p>
        </div>

        <div className="projectGrid">
          {projects.map((project) => (
            <article className="projectCard" key={project.name}>
              <div className="projectHeader">
                <div>
                  <span className="ownerTag">{project.owner}</span>
                  <h3>{project.name}</h3>
                  <p className="projectCategory">{project.category[locale]}</p>
                </div>
                <strong>{project.progress}%</strong>
              </div>

              <p className="projectDescription">{project.description[locale]}</p>

              <div className="progressMeta">
                <span>{c.progress}</span>
                <span>{project.status[locale]}</span>
              </div>
              <div
                className="progressTrack"
                aria-label={`${project.name} ${project.progress}%`}
              >
                <span style={{ width: `${project.progress}%` }} />
              </div>

              <div className="integrationTags">
                <small>{c.integratedWith}</small>
                <div>
                  {project.integrations.map((integration) => (
                    <span key={integration}>{integration}</span>
                  ))}
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="integrationSection">
        <div className="sectionHeading">
          <div>
            <p className="eyebrow">SYSTEM OF SYSTEMS</p>
            <h2>{c.integrationTitle}</h2>
          </div>
          <p>
            Hydronom ↔ Hydronom AI ↔ CORE Runtime ↔ Gateway ↔ Ground Station ↔
            OPS Screens
          </p>
        </div>

        <div className="integrationMap">
          <div className="integrationNode heroNode">Hydronom</div>
          <div className="integrationLine lineA" />
          <div className="integrationLine lineB" />
          <div className="integrationLine lineC" />
          <div className="integrationNode nodeAI">Hydronom AI</div>
          <div className="integrationNode nodeRuntime">CORE Runtime</div>
          <div className="integrationNode nodeGateway">Gateway</div>
          <div className="integrationNode nodeGS">Ground Station</div>
          <div className="integrationNode nodeOps">OPS Screens</div>
          <div className="integrationNode nodeCard">Hydrocard</div>
          <div className="integrationNode nodePower">CORE Power Stack</div>
        </div>
      </section>

      <section id="competitions" className="sectionShell darkSection">
        <div className="sectionHeading">
          <div>
            <p className="eyebrow">TARGET COMPETITIONS / FIELD GOALS</p>
            <h2>{c.competitionsTitle}</h2>
          </div>
          <p>{c.competitionsLead}</p>
        </div>

        <div className="competitionList">
          {competitions.map((competition, index) => (
            <article className="competitionRow" key={competition.name}>
              <span className="competitionIndex">
                {String(index + 1).padStart(2, "0")}
              </span>
              <div>
                <small>{competition.domain}</small>
                <h3>{competition.name}</h3>
              </div>
              <div className="competitionDate">
                <b>{competition.date[locale]}</b>
                <span>{competition.location[locale]}</span>
              </div>
              <p>{competition.note[locale]}</p>
              <span className={`statusPill ${competition.status}`}>
                {statusLabel(competition.status)}
              </span>
            </article>
          ))}
        </div>
      </section>

      <section id="research" className="researchSection">
        <div>
          <p className="eyebrow">CORE RESEARCH</p>
          <h2>{c.researchTitle}</h2>
        </div>
        <p>{c.researchBody}</p>
        <div className="researchTags">
          <span>REPORTS</span>
          <span>PUBLICATIONS</span>
          <span>PATENTS</span>
          <span>EXPERIMENTS</span>
          <span>PRELIMINARY DESIGN</span>
        </div>
      </section>

      <section className="opsSection">
        <div className="sectionHeading compactHeading">
          <div>
            <p className="eyebrow">PUBLIC OPERATIONS PREVIEW</p>
            <h2>{c.opsTitle}</h2>
          </div>
          <span className="liveBadge">
            <i /> ONLINE
          </span>
        </div>

        <div className="statsGrid">
          {networkStats.map((stat) => (
            <div className="statCard" key={stat.value + stat.label.en}>
              <strong>{stat.value}</strong>
              <span>{stat.label[locale]}</span>
            </div>
          ))}
        </div>

        <div className="opsTerminal">
          <div className="terminalBar">
            <span>CORE::PUBLIC_GATEWAY</span>
            <span>READ_ONLY</span>
          </div>
          <div className="terminalRows">
            <p>
              <span>MARINE</span>
              <b>STANDBY</b>
            </p>
            <p>
              <span>SUBSEA</span>
              <b>PLANNING</b>
            </p>
            <p>
              <span>LAND</span>
              <b>ARCHITECTURE</b>
            </p>
            <p>
              <span>AIR</span>
              <b>CONCEPT</b>
            </p>
          </div>
        </div>
      </section>

      <footer id="contact">
        <div className="footerBrand">
          <span className="brandMark">C</span>
          <div>
            <b>YTÜ CORE</b>
            <small>{c.footerLine}</small>
          </div>
        </div>
        <div className="footerRight">
          <span>ytucore.com</span>
          <strong>© 2026 Tunahan DELİSALİHOĞLU</strong>
        </div>
      </footer>
    </main>
  );
}
