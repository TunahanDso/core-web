import { notFound } from "next/navigation";
import PublicChrome from "@/components/PublicChrome";
import PublicPageHero from "@/components/PublicPageHero";
import { projects } from "@/lib/site-data";
import { isLocale } from "@/lib/i18n";
import { getPublicPage } from "@/lib/cms/db";
import { siteSlug } from "@/lib/site-slug";

export const dynamic = "force-dynamic";
const copy = {
  tr: {
    eyebrow: "PROJELER",
    title: "Öğrencilerin elinden çıkan yaşayan sistemler.",
    lead:
      "CORE projeleri yalnızca bir yarışmaya yetişmek için değil; tekrar kullanılabilir mimari, test kültürü ve kurumsal teknik hafıza üretmek için geliştirilir.",
    portfolio: "PROJE PORTFÖYÜ",
    portfolioTitle: "Kod, kart, araç ve operasyon aynı zincirin parçaları.",
    progress: "İlerleme",
    integrated: "Birlikte çalıştığı sistemler",
    map: "SİSTEM-OF-SYSTEMS",
    mapTitle: "Bir proje bittiğinde diğeri başlamıyor. Hepsi birbirine bağlanıyor.",
  },
  en: {
    eyebrow: "PROJECTS",
    title: "Living systems built by students.",
    lead:
      "CORE projects are not built only to reach a competition deadline. They create reusable architecture, test culture and institutional technical memory.",
    portfolio: "PROJECT PORTFOLIO",
    portfolioTitle: "Code, boards, vehicles and operations are parts of the same chain.",
    progress: "Progress",
    integrated: "Integrated systems",
    map: "SYSTEM-OF-SYSTEMS",
    mapTitle: "One project does not end where another begins. They connect.",
  },
} as const;

export default async function ProjectsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const c = copy[locale];
  const cms = await getPublicPage("projects", locale);

  return (
    <PublicChrome locale={locale}>
      <PublicPageHero
        code={cms?.code || "02"}
        eyebrow={cms?.eyebrow || c.eyebrow}
        title={cms?.title || c.title}
        lead={cms?.summary || c.lead}
      />
      <section className="lightSection publicSection">
        <div className="sectionHeading" data-reveal>
          <div><p className="eyebrow">{c.portfolio}</p><h2>{c.portfolioTitle}</h2></div>
          <p>{locale === "tr" ? "Her kart bir ürün kadar, o ürünü üretirken öğrenilenlerin de kaydıdır." : "Every card represents both a product and the knowledge created while building it."}</p>
        </div>
        <div className="projectGrid publicProjectGrid">
          {projects.map((project, index) => (
            <a
              className="projectCard publicProjectCard"
              href={`/${locale}/projects/${siteSlug(project.name)}`}
              data-tilt
              data-reveal
              key={project.name}
            >
              <div className="projectSerial">{String(index + 1).padStart(2, "0")} / {String(projects.length).padStart(2, "0")}</div>
              <div className="projectHeader">
                <div><span className="ownerTag">{project.owner}</span><h3>{project.name}</h3><p className="projectCategory">{project.category[locale]}</p></div>
                <strong>{project.progress}%</strong>
              </div>
              <p className="projectDescription">{project.description[locale]}</p>
              <div className="progressMeta"><span>{c.progress}</span><span>{project.status[locale]}</span></div>
              <div className="progressTrack"><span data-progress={project.progress} /></div>
              <div className="integrationTags"><small>{c.integrated}</small><div>{project.integrations.map((x) => <span key={x}>{x}</span>)}</div></div>
              <small className="projectOpenLink">OPEN PROJECT →</small>
            </a>
          ))}
        </div>
      </section>

      <section className="integrationSection publicIntegration">
        <div className="sectionHeading" data-reveal>
          <div><p className="eyebrow">{c.map}</p><h2>{c.mapTitle}</h2></div>
          <p>Hydronom ↔ Hydronom AI ↔ CORE Runtime ↔ Gateway ↔ Ground Station ↔ OPS Screens</p>
        </div>
        <div className="systemConstellation" data-reveal>
          <svg className="constellationLines" viewBox="0 0 1000 620" aria-hidden="true">
            <path d="M500 310 C410 220 310 160 200 125" />
            <path d="M500 310 C570 205 690 145 805 120" />
            <path d="M500 310 C635 300 760 305 900 300" />
            <path d="M500 310 C600 405 715 485 815 520" />
            <path d="M500 310 C390 410 290 500 180 520" />
            <path d="M500 310 C355 325 235 325 105 310" />
            <path d="M200 125 C360 95 610 90 805 120" />
            <path d="M805 120 C870 185 895 235 900 300" />
            <path d="M900 300 C895 390 865 455 815 520" />
            <path d="M815 520 C620 555 375 555 180 520" />
            <path d="M180 520 C120 455 100 385 105 310" />
            <path d="M105 310 C120 220 150 165 200 125" />
          </svg>

          <div className="constellationCore">
            <small>SYSTEM OF SYSTEMS</small>
            <b>CORE</b>
            <span>shared architecture</span>
          </div>

          {projects.map((project, index) => (
            <a
              className={`constellationNode constellationNode${index + 1}`}
              href={`/${locale}/projects/${siteSlug(project.name)}`}
              key={project.name}
            >
              <small>{String(index + 1).padStart(2, "0")}</small>
              <b>{project.name}</b>
              <span>{project.owner}</span>
            </a>
          ))}

          <div className="constellationOrbit orbitOuter" aria-hidden="true" />
          <div className="constellationOrbit orbitInner" aria-hidden="true" />
          <span className="constellationNote noteTop">DATA / POWER / STATE / MISSION</span>
          <span className="constellationNote noteBottom">NO PROJECT IS AN ISLAND</span>
        </div>
      </section>
    </PublicChrome>
  );
}
