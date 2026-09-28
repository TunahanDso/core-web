import type { Locale } from "@/lib/i18n";
import { listProjects } from "@/lib/cms/db";

export type PublicProjectView = {
  slug: string;
  name: string;
  owner: string;
  category: string;
  description: string;
  progress: number;
  status: string;
  integrations: string[];
};

export async function listPublicProjects(locale: Locale): Promise<PublicProjectView[]> {
  const projects = await listProjects();
  return projects
    .filter((project) => project.status === "published")
    .map((project) => ({
      slug: project.slug,
      name:
        (locale === "tr" ? project.titleTr : project.titleEn) ||
        project.titleTr ||
        project.titleEn ||
        project.slug,
      owner: project.owner || project.domain || "YTÜ CORE",
      category:
        (locale === "tr" ? project.categoryTr : project.categoryEn) ||
        project.domain ||
        "CORE Project",
      description:
        (locale === "tr" ? project.summaryTr : project.summaryEn) ||
        project.summaryTr ||
        project.summaryEn ||
        "",
      progress: Math.max(0,Math.min(100,project.progress ?? 0)),
      status:
        (locale === "tr" ? project.statusTr : project.statusEn) ||
        (locale === "tr" ? "Aktif proje" : "Active project"),
      integrations: project.integrations,
    }));
}

export async function getPublicProject(slug: string, locale: Locale) {
  const projects = await listPublicProjects(locale);
  return projects.find((project) => project.slug === slug) ?? null;
}
