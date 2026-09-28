import { notFound } from "next/navigation";
import PublicChrome from "@/components/PublicChrome";
import PublicPageHero from "@/components/PublicPageHero";
import { domains, serviceUnits } from "@/lib/site-data";
import { isLocale } from "@/lib/i18n";
import { siteSlug } from "@/lib/site-slug";
import { listPublicProjects } from "@/lib/cms/public-projects";

export const dynamic = "force-dynamic";
function teamLinksForOwner(owner: string) {
  const candidates = [
    ...domains.map((team) => ({
      label: `CORE ${team.name}`,
      match: team.name,
      slug: siteSlug(team.name),
      code: team.code,
    })),
    ...serviceUnits.map((team) => ({
      label: team.name,
      match: team.name.replace("CORE ", ""),
      slug: siteSlug(team.name.replace("CORE ", "")),
      code: team.code,
    })),
  ];
  return candidates.filter((team) => owner.includes(team.match));
}

export default async function ProjectDetailPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;
  if (!isLocale(locale)) notFound();

  const projects = await listPublicProjects(locale);
  const project = projects.find((item) => item.slug === slug);
  if (!project) notFound();

  const ownerTeams = teamLinksForOwner(project.owner);
  const integrations = project.integrations
    .map((name) => projects.find((item) => item.name === name || item.slug === siteSlug(name)))
    .filter((item): item is (typeof projects)[number] => Boolean(item));

  return (
    <PublicChrome locale={locale}>
      <PublicPageHero
        code="PROJECT"
        eyebrow={project.owner}
        title={project.name}
        lead={project.description}
      />

      <section className="projectDetailStatus">
        <div className="projectDetailProgress" data-reveal>
          <span>{locale === "tr" ? "GEÇİCİ VİTRİN İLERLEMESİ" : "TEMPORARY SHOWCASE PROGRESS"}</span>
          <strong>{project.progress}%</strong>
          <div className="projectDetailTrack"><i style={{ width: `${project.progress}%` }} /></div>
          <small>{project.status}</small>
        </div>

        <div className="projectDetailMeta" data-reveal>
          <div>
            <span>{locale === "tr" ? "KATEGORİ" : "CATEGORY"}</span>
            <b>{project.category}</b>
          </div>
          <div>
            <span>{locale === "tr" ? "SAHİP TAKIM" : "OWNER TEAM"}</span>
            <b>{project.owner}</b>
          </div>
          <div>
            <span>{locale === "tr" ? "ENTEGRASYON" : "INTEGRATION"}</span>
            <b>{project.integrations.length} interfaces</b>
          </div>
        </div>
      </section>

      <section className="projectStorySection">
        <div className="projectStoryLead" data-reveal>
          <p className="eyebrow">{locale === "tr" ? "PROJENİN ROLÜ" : "PROJECT ROLE"}</p>
          <h2>
            {locale === "tr"
              ? "Tek başına çalışan bir ürün değil; CORE mimarisindeki bir görev sahibi."
              : "Not a standalone product; a responsibility inside the CORE architecture."}
          </h2>
          <p>{project.description}</p>
        </div>

        <div className="projectEngineeringLoop">
          {[
            locale === "tr" ? ["01", "Gereksinim", "Ne çözmesi gerektiğini tanımlar."] : ["01", "Requirement", "Defines what the system must solve."],
            locale === "tr" ? ["02", "Arayüz", "Diğer CORE sistemleriyle sınırlarını belirler."] : ["02", "Interface", "Defines boundaries with other CORE systems."],
            locale === "tr" ? ["03", "Doğrulama", "Çalıştığını ölçüm ve saha testiyle kanıtlar."] : ["03", "Validation", "Proves behavior through measurement and field tests."],
            locale === "tr" ? ["04", "Hafıza", "Kararı, kodu ve sonucu organizasyona bırakır."] : ["04", "Memory", "Leaves decisions, code and evidence with the organization."],
          ].map(([n, title, text]) => (
            <article data-reveal key={n}>
              <span>{n}</span>
              <h3>{title}</h3>
              <p>{text}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="projectIntegrationDetail">
        <div className="sectionHeading" data-reveal>
          <div>
            <p className="eyebrow">{locale === "tr" ? "BAĞLANTILAR" : "CONNECTIONS"}</p>
            <h2>{locale === "tr" ? "Bu proje hangi sistemlerle konuşuyor?" : "Which systems does this project talk to?"}</h2>
          </div>
          <p>
            {locale === "tr"
              ? "Entegrasyon; isimlerin yan yana yazılması değil, veri, güç, davranış veya operasyon sorumluluğunun paylaşılmasıdır."
              : "Integration is not names sitting next to each other; it is shared responsibility for data, power, behavior or operations."}
          </p>
        </div>

        <div className="projectOrbitDetail" data-reveal>
          <div className="projectOrbitCore">
            <small>ACTIVE NODE</small>
            <b>{project.name}</b>
          </div>
          {project.integrations.map((name, index) => {
            const linked = integrations.find((item) => item.name === name);
            const className = `orbitPartner orbitPartner${index + 1}`;
            return linked ? (
              <a className={className} href={`/${locale}/projects/${linked.slug}`} key={name}>
                <span>{String(index + 1).padStart(2, "0")}</span>
                <b>{name}</b>
                <small>OPEN →</small>
              </a>
            ) : (
              <div className={className} key={name}>
                <span>{String(index + 1).padStart(2, "0")}</span>
                <b>{name}</b>
                <small>SHARED SYSTEM</small>
              </div>
            );
          })}
          <div className="orbitRing ringOne" />
          <div className="orbitRing ringTwo" />
        </div>
      </section>

      <section className="projectOwnerSection">
        <div data-reveal>
          <p className="eyebrow">{locale === "tr" ? "TAKIM BAĞI" : "TEAM LINK"}</p>
          <h2>{locale === "tr" ? "Projeyi insanlar ve takımlar taşır." : "Projects are carried by people and teams."}</h2>
          <p>
            {locale === "tr"
              ? "Proje sahipliği; karar, entegrasyon, test ve teknik hafıza sorumluluğunu ifade eder."
              : "Project ownership means responsibility for decisions, integration, validation and technical memory."}
          </p>
        </div>
        <div className="ownerTeamLinks">
          {ownerTeams.length ? ownerTeams.map((team) => (
            <a href={`/${locale}/teams/${team.slug}`} key={team.slug}>
              <span>{team.code}</span>
              <b>{team.label}</b>
              <small>OPEN TEAM →</small>
            </a>
          )) : <span>{project.owner}</span>}
        </div>
      </section>

      <section className="detailClosing">
        <div data-reveal>
          <span>PROJECT / {project.slug.toUpperCase()}</span>
          <h2>{locale === "tr" ? "Bir sistem, ancak bağlandığında CORE olur." : "A system becomes CORE when it connects."}</h2>
        </div>
        <a className="primaryButton" href={`/${locale}/projects`}>
          {locale === "tr" ? "TÜM PROJELER" : "ALL PROJECTS"} →
        </a>
      </section>
    </PublicChrome>
  );
}
