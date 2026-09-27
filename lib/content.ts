import type { Locale } from "./i18n";

type Copy = {
  nav: string[];
  eyebrow: string;
  titleLine1: string;
  titleLine2: string;
  lead: string;
  explore: string;
  projects: string;
  domainsTitle: string;
  researchTitleLine1: string;
  researchTitleLine2: string;
  researchBody: string;
  projectEyebrow: string;
  projectTitle: string;
  projectLead: string;
  initializing: string;
  coming: string;
  footer: string;
};

export const copy: Record<Locale, Copy> = {
  tr: {
    nav: ["Alanlar", "Araştırma", "Projeler", "İletişim"],
    eyebrow: "YILDIZ TEKNİK ÜNİVERSİTESİ · OTONOM SİSTEMLER",
    titleLine1: "Otonom hareket eden",
    titleLine2: "sistemler tasarlıyoruz.",
    lead:
      "CORE; otonom araçlar, ortak sistem altyapısı, saha operasyonları ve araştırma etrafında kurulan bir mühendislik girişimidir.",
    explore: "CORE'u keşfet",
    projects: "Projeleri gör →",
    domainsTitle: "Tek CORE. Farklı ortamlar.",
    researchTitleLine1: "Donanımdan önce,",
    researchTitleLine2: "bilgi vardır.",
    researchBody:
      "Research bir araç takımı değildir. Tüm CORE alanlarını güçlendiren raporlar, yayınlar, patentler, deneyler ve ön tasarımlar geliştirir.",
    projectEyebrow: "PROJELER & OPERASYONLAR",
    projectTitle: "Yaşayan bir mühendislik organizasyonu için.",
    projectLead:
      "CORE sistemleri devreye girdikçe proje sayfaları, yayınlar ve izin verilen canlı araç verileri burada yer alacak.",
    initializing: "Altyapı hazırlanıyor",
    coming: "PUBLIC OPERATIONS · YAKINDA",
    footer: "Otonom Sistemler · Mühendislik · Araştırma",
  },
  en: {
    nav: ["Domains", "Research", "Projects", "Contact"],
    eyebrow: "YILDIZ TECHNICAL UNIVERSITY · AUTONOMOUS SYSTEMS",
    titleLine1: "Engineering systems",
    titleLine2: "that move autonomously.",
    lead:
      "CORE is an engineering initiative built around autonomous vehicles, shared systems infrastructure, field operations and research.",
    explore: "Explore CORE",
    projects: "View projects →",
    domainsTitle: "One CORE. Multiple environments.",
    researchTitleLine1: "Before hardware,",
    researchTitleLine2: "there is knowledge.",
    researchBody:
      "Research is not a vehicle team. It develops reports, publications, patents, experiments and preliminary designs that strengthen every CORE domain.",
    projectEyebrow: "PROJECTS & OPERATIONS",
    projectTitle: "Built for a living engineering organization.",
    projectLead:
      "Project pages, publications and approved live vehicle data will grow here as CORE systems come online.",
    initializing: "Infrastructure initializing",
    coming: "PUBLIC OPERATIONS · COMING ONLINE",
    footer: "Autonomous Systems · Engineering · Research",
  },
};

export const domains: Record<Locale, [string, string][]> = {
  tr: [
    ["Marine", "Otonom su üstü sistemleri"],
    ["Subsea", "AUV & ROV sistemleri"],
    ["Land", "UGV & rover sistemleri"],
    ["Air", "Otonom hava sistemleri"],
    ["Industrial", "AMR & endüstriyel otonomi"],
    ["Space", "Uydu, faydalı yük & yer segmenti"],
    ["Rocket", "Yüksek irtifa & itki sistemleri"],
  ],
  en: [
    ["Marine", "Autonomous surface systems"],
    ["Subsea", "AUV & ROV systems"],
    ["Land", "UGV & rover systems"],
    ["Air", "Autonomous aerial systems"],
    ["Industrial", "AMR & industrial autonomy"],
    ["Space", "Satellites, payloads & ground segment"],
    ["Rocket", "High-altitude & propulsion systems"],
  ],
};
