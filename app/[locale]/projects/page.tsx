import { notFound } from "next/navigation";
import PublicChrome from "@/components/PublicChrome";
import PublicPageHero from "@/components/PublicPageHero";
import { projects } from "@/lib/site-data";
import { isLocale } from "@/lib/i18n";

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

  return (
    <PublicChrome locale={locale}>
      <PublicPageHero code="02" eyebrow={c.eyebrow} title={c.title} lead={c.lead} />
      <section className="lightSection publicSection">
        <div className="sectionHeading" data-reveal>
          <div><p className="eyebrow">{c.portfolio}</p><h2>{c.portfolioTitle}</h2></div>
          <p>{locale === "tr" ? "Her kart bir ürün kadar, o ürünü üretirken öğrenilenlerin de kaydıdır." : "Every card represents both a product and the knowledge created while building it."}</p>
        </div>
        <div className="projectGrid publicProjectGrid">
          {projects.map((project, index) => (
            <article className="projectCard publicProjectCard" data-tilt data-reveal key={project.name}>
              <div className="projectSerial">{String(index + 1).padStart(2, "0")} / {String(projects.length).padStart(2, "0")}</div>
              <div className="projectHeader">
                <div><span className="ownerTag">{project.owner}</span><h3>{project.name}</h3><p className="projectCategory">{project.category[locale]}</p></div>
                <strong>{project.progress}%</strong>
              </div>
              <p className="projectDescription">{project.description[locale]}</p>
              <div className="progressMeta"><span>{c.progress}</span><span>{project.status[locale]}</span></div>
              <div className="progressTrack"><span data-progress={project.progress} /></div>
              <div className="integrationTags"><small>{c.integrated}</small><div>{project.integrations.map((x) => <span key={x}>{x}</span>)}</div></div>
            </article>
          ))}
        </div>
      </section>

      <section className="integrationSection publicIntegration">
        <div className="sectionHeading" data-reveal>
          <div><p className="eyebrow">{c.map}</p><h2>{c.mapTitle}</h2></div>
          <p>Hydronom ↔ Hydronom AI ↔ CORE Runtime ↔ Gateway ↔ Ground Station ↔ OPS Screens</p>
        </div>
        <div className="integrationMap" data-reveal>
          <div className="integrationNode heroNode">Hydronom</div>
          <div className="integrationLine lineA" /><div className="integrationLine lineB" /><div className="integrationLine lineC" />
          <div className="integrationNode nodeAI">Hydronom AI</div><div className="integrationNode nodeRuntime">CORE Runtime</div>
          <div className="integrationNode nodeGateway">Gateway</div><div className="integrationNode nodeGS">Ground Station</div>
          <div className="integrationNode nodeOps">OPS Screens</div><div className="integrationNode nodeCard">Hydrocard</div>
          <div className="integrationNode nodePower">CORE Power Stack</div>
        </div>
      </section>
    </PublicChrome>
  );
}
