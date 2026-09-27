import { notFound } from "next/navigation";
import PublicChrome from "@/components/PublicChrome";
import { domains, projects, serviceUnits } from "@/lib/site-data";
import { isLocale, locales } from "@/lib/i18n";

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

const copy = {
  tr: {
    kicker: "YILDIZ TEKNİK ÜNİVERSİTESİ · ÖĞRENCİ MÜHENDİSLİK TAKIMI",
    sloganA: "İnsan İçin",
    sloganB: "Teknoloji.",
    lead:
      "YTÜ CORE; öğrencilerin birlikte öğrendiği, tasarladığı, ürettiği ve sahada doğruladığı otonom sistemler ekosistemi. Denizden uzaya uzanan takımlarımız aynı bilgi, yazılım ve donanım omurgasında buluşur.",
    explore: "Takımları keşfet",
    projects: "Projeleri gör",
    studentLabel: "STUDENT-RUN",
    studentText: "Öğrenciler tarafından yürütülür",
    workshopLabel: "BUILD CULTURE",
    workshopText: "Tasarım masadan sahaya iner",
    knowledgeLabel: "OPEN KNOWLEDGE",
    knowledgeText: "Deneyim takımda kalır",
    statement:
      "Biz bir şirket değiliz. Tek bir yarışma için kurulmuş tek araçlık bir ekip de değiliz. Yıldız'da birbirinden öğrenen öğrencilerin, gerçek mühendislik problemlerini birlikte çözdüğü yaşayan bir takımız.",
    teamsEyebrow: "TAKIM MİMARİSİ",
    teamsTitle: "Bir kampüs. Birçok disiplin. Tek CORE.",
    teamsLead:
      "Araç takımları kendi ortamlarına odaklanır; Systems, Embedded ve Ops tüm ekosistemin ortak servis omurgasını kurar.",
    serviceTitle: "Her takımın arkasında ortak bir teknik omurga var.",
    projectsEyebrow: "ATÖLYEDEN ÇIKANLAR",
    projectsTitle: "Proje değil, öğrenme izi.",
    projectsLead:
      "Her proje bir sonraki takımın daha ileri başlayabilmesi için kod, donanım, test verisi ve dokümantasyon üretir.",
    cultureTitle: "Nasıl çalışıyoruz?",
    culture: [
      ["01", "SOR", "Problemi anlamadan çözüm üretmiyoruz."],
      ["02", "TASARLA", "Mekanik, elektronik ve yazılım aynı masaya oturuyor."],
      ["03", "ÜRET", "Fikir; PCB'ye, koda, gövdeye ve çalışan sisteme dönüşüyor."],
      ["04", "TEST ET", "Laboratuvar yetmez. Sistem sahada da doğrulanıyor."],
      ["05", "PAYLAŞ", "Rapor, repo ve deneyim sonraki öğrenciye kalıyor."],
    ],
    nextTitle: "CORE'un içine gir.",
    nextText:
      "Takımları, projeleri, araştırma yaklaşımını ve yarışma hedeflerini ayrı sayfalarda daha derin incele.",
    about: "Bizi tanı",
  },
  en: {
    kicker: "YILDIZ TECHNICAL UNIVERSITY · STUDENT ENGINEERING TEAM",
    sloganA: "Technology",
    sloganB: "for People.",
    lead:
      "YTÜ CORE is an autonomous-systems ecosystem where students learn together, design, build and validate in the field. Teams from sea to space share one knowledge, software and hardware backbone.",
    explore: "Explore the teams",
    projects: "See the projects",
    studentLabel: "STUDENT-RUN",
    studentText: "Built and led by students",
    workshopLabel: "BUILD CULTURE",
    workshopText: "Ideas leave the desk",
    knowledgeLabel: "OPEN KNOWLEDGE",
    knowledgeText: "Experience stays with the team",
    statement:
      "We are not a company, and we are not a one-vehicle team built around a single competition. We are a living student engineering team at Yıldız, learning from each other while solving real engineering problems together.",
    teamsEyebrow: "TEAM ARCHITECTURE",
    teamsTitle: "One campus. Many disciplines. One CORE.",
    teamsLead:
      "Vehicle teams focus on their environments while Systems, Embedded and Ops form the shared technical backbone of the whole ecosystem.",
    serviceTitle: "Every vehicle team stands on a shared engineering backbone.",
    projectsEyebrow: "FROM THE WORKBENCH",
    projectsTitle: "Not just projects. Learning trails.",
    projectsLead:
      "Every project leaves code, hardware, test data and documentation so the next student can start further ahead.",
    cultureTitle: "How do we work?",
    culture: [
      ["01", "ASK", "We understand the problem before we build the solution."],
      ["02", "DESIGN", "Mechanical, electronics and software meet at the same table."],
      ["03", "BUILD", "Ideas become boards, code, structures and working systems."],
      ["04", "TEST", "The lab is not enough. Systems must survive the field."],
      ["05", "SHARE", "Reports, repositories and lessons remain for the next student."],
    ],
    nextTitle: "Step inside CORE.",
    nextText:
      "Explore teams, projects, research culture and competition targets on dedicated pages.",
    about: "Meet the team",
  },
} as const;

export default async function Home({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();

  const c = copy[locale];

  return (
    <PublicChrome locale={locale}>
      <section className="studentHero">
        <div className="heroBlueprint" aria-hidden="true" />
        <div className="studentHeroCopy" data-reveal>
          <div className="studentStamp">
            <span>YTÜ</span>
            <b>CORE</b>
            <small>{locale === "tr" ? "ÖĞRENCİ TAKIMI" : "STUDENT TEAM"}</small>
          </div>

          <p className="eyebrow">{c.kicker}</p>
          <h1>
            <span>{c.sloganA}</span>
            <em>{c.sloganB}</em>
          </h1>
          <p className="studentHeroLead">{c.lead}</p>

          <div className="actions">
            <a className="primaryButton" href={`/${locale}/teams`}>
              {c.explore} →
            </a>
            <a className="textButton" href={`/${locale}/projects`}>
              {c.projects} ↗
            </a>
          </div>

          <div className="studentHeroMeta">
            <div>
              <b>{c.studentLabel}</b>
              <span>{c.studentText}</span>
            </div>
            <div>
              <b>{c.workshopLabel}</b>
              <span>{c.workshopText}</span>
            </div>
            <div>
              <b>{c.knowledgeLabel}</b>
              <span>{c.knowledgeText}</span>
            </div>
          </div>
        </div>

        <div className="workbenchVisual" data-tilt data-reveal aria-hidden="true">
          <div className="workbenchGrid" />
          <div className="workbenchCore">CORE</div>
          <div className="workbenchCard wbIdea">
            <small>01</small>
            <b>IDEA</b>
            <span>?</span>
          </div>
          <div className="workbenchCard wbCode">
            <small>02</small>
            <b>CODE</b>
            <span>&lt;/&gt;</span>
          </div>
          <div className="workbenchCard wbBuild">
            <small>03</small>
            <b>BUILD</b>
            <span>⌁</span>
          </div>
          <div className="workbenchCard wbField">
            <small>04</small>
            <b>FIELD</b>
            <span>◎</span>
          </div>
          <div className="sketchLine sketchA" />
          <div className="sketchLine sketchB" />
          <div className="sketchLine sketchC" />
          <div className="sketchLine sketchD" />
          <span className="scribbleNote noteA">TEST ≠ DEMO</span>
          <span className="scribbleNote noteB">LEARN / ITERATE</span>
        </div>
      </section>

      <div className="buildMarquee" aria-hidden="true">
        <div>
          BUILD · TEST · FAIL · LEARN · DOCUMENT · SHARE · BUILD · TEST · FAIL ·
          LEARN · DOCUMENT · SHARE ·
        </div>
      </div>

      <section className="studentStatement">
        <div className="statementNumber">01 / WHO WE ARE</div>
        <p>{c.statement}</p>
        <a href={`/${locale}/about`}>{c.about} →</a>
      </section>

      <section className="campusSection">
        <div className="sectionHeading" data-reveal>
          <div>
            <p className="eyebrow">{c.teamsEyebrow}</p>
            <h2>{c.teamsTitle}</h2>
          </div>
          <p>{c.teamsLead}</p>
        </div>

        <div className="domainRibbon">
          {domains.map((domain, index) => (
            <a
              className="domainMiniCard"
              data-tilt
              data-reveal
              href={`/${locale}/teams#${domain.code.toLowerCase()}`}
              key={domain.name}
            >
              <span>{String(index + 1).padStart(2, "0")}</span>
              <b>CORE {domain.name}</b>
              <small>{domain.focus[locale]}</small>
            </a>
          ))}
        </div>

        <div className="sharedBackbone" data-reveal>
          <div>
            <span>SHARED / 03</span>
            <h3>{c.serviceTitle}</h3>
          </div>
          {serviceUnits.map((unit) => (
            <a href={`/${locale}/teams#${unit.code.toLowerCase()}`} key={unit.name}>
              <small>{unit.code}</small>
              <b>{unit.name}</b>
              <span>{unit.description[locale]}</span>
            </a>
          ))}
        </div>
      </section>

      <section className="projectPreviewSection">
        <div className="sectionHeading" data-reveal>
          <div>
            <p className="eyebrow">{c.projectsEyebrow}</p>
            <h2>{c.projectsTitle}</h2>
          </div>
          <p>{c.projectsLead}</p>
        </div>

        <div className="projectPreviewGrid">
          {projects.slice(0, 4).map((project, index) => (
            <article className="projectPreviewCard" data-tilt data-reveal key={project.name}>
              <div className="projectPreviewTop">
                <span>{String(index + 1).padStart(2, "0")}</span>
                <small>{project.owner}</small>
              </div>
              <h3>{project.name}</h3>
              <p>{project.description[locale]}</p>
              <div className="projectPreviewFooter">
                <span>{project.status[locale]}</span>
                <b>{project.progress}%</b>
              </div>
            </article>
          ))}
        </div>

        <a className="sectionLink" href={`/${locale}/projects`}>
          {locale === "tr" ? "TÜM PROJELERİ AÇ" : "OPEN ALL PROJECTS"} →
        </a>
      </section>

      <section className="cultureSection">
        <div className="cultureIntro" data-reveal>
          <p className="eyebrow">CORE METHOD</p>
          <h2>{c.cultureTitle}</h2>
        </div>
        <div className="cultureSteps">
          {c.culture.map(([index, title, text]) => (
            <article data-reveal key={index}>
              <span>{index}</span>
              <b>{title}</b>
              <p>{text}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="nextPortal">
        <div data-reveal>
          <span>02 / EXPLORE</span>
          <h2>{c.nextTitle}</h2>
          <p>{c.nextText}</p>
        </div>
        <div className="portalLinks">
          <a href={`/${locale}/teams`}>
            <span>01</span>
            <b>{locale === "tr" ? "Takımlar" : "Teams"}</b>
            <i>↗</i>
          </a>
          <a href={`/${locale}/projects`}>
            <span>02</span>
            <b>{locale === "tr" ? "Projeler" : "Projects"}</b>
            <i>↗</i>
          </a>
          <a href={`/${locale}/research`}>
            <span>03</span>
            <b>{locale === "tr" ? "Araştırma" : "Research"}</b>
            <i>↗</i>
          </a>
          <a href={`/${locale}/competitions`}>
            <span>04</span>
            <b>{locale === "tr" ? "Yarışmalar" : "Competitions"}</b>
            <i>↗</i>
          </a>
        </div>
      </section>
    </PublicChrome>
  );
}
