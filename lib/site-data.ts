import type { Locale } from "@/lib/i18n";

type Localized = Record<Locale, string>;

export type Domain = {
  code: string;
  name: string;
  description: Localized;
  focus: Localized;
};

export type ServiceUnit = {
  code: string;
  name: string;
  description: Localized;
  capabilities: Localized[];
};

export type Project = {
  name: string;
  owner: string;
  category: Localized;
  description: Localized;
  progress: number;
  status: Localized;
  integrations: string[];
};

export type Competition = {
  domain: string;
  name: string;
  date: Localized;
  location: Localized;
  status: "confirmed" | "target" | "evaluation";
  note: Localized;
};

export const ui = {
  tr: {
    nav: ["Alanlar", "Takımlar", "Projeler", "2027 Hedefleri", "Araştırma"],
    kicker: "YILDIZ TEKNİK ÜNİVERSİTESİ · AUTONOMOUS SYSTEMS ORGANIZATION",
    heroA: "Bir araç değil.",
    heroB: "Bir mühendislik ekosistemi.",
    heroLead:
      "YTÜ CORE; denizden uzaya uzanan otonom sistemleri, ortak yazılım ve elektronik omurgası üzerinde birbirine bağlayan bir mühendislik organizasyonudur.",
    primaryCta: "CORE'u keşfet",
    secondaryCta: "Proje portföyü",
    manifesto:
      "Her ürün bir projedir. Her proje ortak altyapıya bağlanır. Bilgi, kod, donanım ve saha deneyimi organizasyonda kalır.",
    domainsTitle: "Yedi ortam. Tek mühendislik omurgası.",
    domainsLead:
      "Araç takımları kendi platformlarının sorumluluğunu taşır; ortak servis takımları tüm CORE'a tekrar kullanılabilir yetenek sağlar.",
    teamsTitle: "Araçlar ayrı. Omurga ortak.",
    teamsLead:
      "CORE Systems, Embedded ve Ops herhangi bir araca ait değildir. Tüm domainlerin ortak mühendislik servisleridir.",
    projectsTitle: "Entegre ürün portföyü.",
    projectsLead:
      "Aşağıdaki ilerleme oranları V0.2 vitrinini görünür kılmak için geçici başlangıç değerleridir; gerçek CMS devreye girdiğinde admin panelinden güncellenecek.",
    integrationTitle: "Tek tek projeler değil, bağlı bir sistem.",
    competitionsTitle: "2027 hedef tahtası.",
    competitionsLead:
      "Bu bölüm kayıt garantisi değil; CORE domainlerinin değerlendirdiği yarışma ve saha hedeflerini gösterir. Resmi 2027 takvimi açıklanan etkinlikler ayrıca işaretlenir.",
    researchTitle: "Donanımdan önce bilgi vardır.",
    researchBody:
      "CORE Research araç üretmez. Ön tasarım, deney, teknik rapor, yayın, patent fikri ve teknoloji doğrulaması üretir; çıktıları tüm domainlere geri beslenir.",
    opsTitle: "CORE Network / Public Status",
    footerLine: "Autonomous Systems · Engineering · Research",
    admin: "ADMIN",
    progress: "Tamamlanma",
    integratedWith: "Entegre",
    confirmed: "2027 TARİHİ AÇIKLANDI",
    target: "2027 HEDEF",
    evaluation: "DEĞERLENDİRMEDE",
  },
  en: {
    nav: ["Domains", "Teams", "Projects", "2027 Targets", "Research"],
    kicker: "YILDIZ TECHNICAL UNIVERSITY · AUTONOMOUS SYSTEMS ORGANIZATION",
    heroA: "Not a vehicle.",
    heroB: "An engineering ecosystem.",
    heroLead:
      "YTÜ CORE connects autonomous systems from sea to space through a shared software, embedded and operations backbone.",
    primaryCta: "Explore CORE",
    secondaryCta: "Project portfolio",
    manifesto:
      "Every product is a project. Every project connects to shared infrastructure. Knowledge, code, hardware and field experience stay with the organization.",
    domainsTitle: "Seven environments. One engineering backbone.",
    domainsLead:
      "Vehicle teams own their platforms; shared service teams provide reusable capabilities across all CORE domains.",
    teamsTitle: "Different vehicles. Shared backbone.",
    teamsLead:
      "CORE Systems, Embedded and Ops do not belong to one vehicle. They are common engineering services for every domain.",
    projectsTitle: "Integrated product portfolio.",
    projectsLead:
      "The progress values below are temporary V0.2 showcase values. Once the CMS is connected, they will be managed from the admin panel.",
    integrationTitle: "Not isolated projects. One connected system.",
    competitionsTitle: "2027 target board.",
    competitionsLead:
      "This is not a registration guarantee. It shows competitions and field targets under evaluation by CORE domains; events with published 2027 dates are marked separately.",
    researchTitle: "Before hardware, there is knowledge.",
    researchBody:
      "CORE Research does not build vehicles. It produces preliminary designs, experiments, technical reports, publications, patent concepts and technology validation, then feeds those outputs back into every domain.",
    opsTitle: "CORE Network / Public Status",
    footerLine: "Autonomous Systems · Engineering · Research",
    admin: "ADMIN",
    progress: "Progress",
    integratedWith: "Integrated",
    confirmed: "2027 DATE PUBLISHED",
    target: "2027 TARGET",
    evaluation: "UNDER EVALUATION",
  },
} satisfies Record<Locale, Record<string, string | string[]>>;

export const domains: Domain[] = [
  {
    code: "M",
    name: "Marine",
    description: {
      tr: "Otonom su üstü araçları, görev icrası ve deniz saha sistemleri.",
      en: "Autonomous surface vehicles, mission execution and maritime field systems.",
    },
    focus: { tr: "USV · Navigation · Mission", en: "USV · Navigation · Mission" },
  },
  {
    code: "S",
    name: "Subsea",
    description: {
      tr: "AUV/ROV platformları, sualtı algısı, lokalizasyon ve manipülasyon.",
      en: "AUV/ROV platforms, underwater perception, localization and manipulation.",
    },
    focus: { tr: "AUV · ROV · Perception", en: "AUV · ROV · Perception" },
  },
  {
    code: "L",
    name: "Land",
    description: {
      tr: "UGV, rover, otonom navigasyon ve zorlu arazi görevleri.",
      en: "UGVs, rovers, autonomous navigation and rough-terrain missions.",
    },
    focus: { tr: "UGV · Rover · Autonomy", en: "UGV · Rover · Autonomy" },
  },
  {
    code: "A",
    name: "Air",
    description: {
      tr: "İHA, VTOL, görev bilgisayarı ve otonom hava operasyonları.",
      en: "UAVs, VTOL, mission computers and autonomous aerial operations.",
    },
    focus: { tr: "UAV · VTOL · Mission", en: "UAV · VTOL · Mission" },
  },
  {
    code: "I",
    name: "Industrial",
    description: {
      tr: "AMR, iş makineleri, tarım, maden ve fabrika otonomisi.",
      en: "AMRs, heavy machinery, agriculture, mining and factory autonomy.",
    },
    focus: { tr: "AMR · Factory · Field", en: "AMR · Factory · Field" },
  },
  {
    code: "SP",
    name: "Space",
    description: {
      tr: "CubeSat, faydalı yük, yer istasyonu ve uzay sistem mühendisliği.",
      en: "CubeSats, payloads, ground segment and space systems engineering.",
    },
    focus: { tr: "CubeSat · Payload · GS", en: "CubeSat · Payload · GS" },
  },
  {
    code: "R",
    name: "Rocket",
    description: {
      tr: "Yüksek irtifa, roket aviyoniği, itki, simülasyon ve uçuş sistemleri.",
      en: "High-altitude systems, avionics, propulsion, simulation and flight systems.",
    },
    focus: { tr: "Flight · Avionics · Propulsion", en: "Flight · Avionics · Propulsion" },
  },
];

export const serviceUnits: ServiceUnit[] = [
  {
    code: "SYS",
    name: "CORE Systems",
    description: {
      tr: "Runtime, otonomi, karar verme, navigasyon ve ortak yazılım altyapısı.",
      en: "Runtime, autonomy, decision-making, navigation and shared software infrastructure.",
    },
    capabilities: [
      { tr: "Autonomy Runtime", en: "Autonomy Runtime" },
      { tr: "Navigation & Decision", en: "Navigation & Decision" },
      { tr: "SDK & Shared APIs", en: "SDK & Shared APIs" },
      { tr: "Simulation", en: "Simulation" },
    ],
  },
  {
    code: "EMB",
    name: "CORE Embedded",
    description: {
      tr: "Kart, MCU, sensör, aktüatör, güç ve gömülü test altyapısı.",
      en: "Boards, MCUs, sensors, actuators, power and embedded test infrastructure.",
    },
    capabilities: [
      { tr: "Custom Boards", en: "Custom Boards" },
      { tr: "MCU Firmware", en: "MCU Firmware" },
      { tr: "Power Architecture", en: "Power Architecture" },
      { tr: "Hardware Validation", en: "Hardware Validation" },
    ],
  },
  {
    code: "OPS",
    name: "CORE Ops",
    description: {
      tr: "Yer istasyonu, telemetri, görev takibi ve saha operasyonları.",
      en: "Ground stations, telemetry, mission tracking and field operations.",
    },
    capabilities: [
      { tr: "Ground Station", en: "Ground Station" },
      { tr: "Telemetry", en: "Telemetry" },
      { tr: "Mission Control", en: "Mission Control" },
      { tr: "Field Operations", en: "Field Operations" },
    ],
  },
];

export const projects: Project[] = [
  {
    name: "Hydronom",
    owner: "CORE Marine",
    category: { tr: "Otonom Su Üstü Araç Platformu", en: "Autonomous Surface Vehicle Platform" },
    description: {
      tr: "Görev planlama, otonom seyir ve saha doğrulaması için ana deniz aracı platformu.",
      en: "Primary maritime vehicle platform for mission planning, autonomous navigation and field validation.",
    },
    progress: 42,
    status: { tr: "Platform yeniden yapılanıyor", en: "Platform restructuring" },
    integrations: ["Hydronom AI", "Gateway", "Ground Station", "Hydro SDK"],
  },
  {
    name: "Hydrocard",
    owner: "CORE Embedded",
    category: { tr: "Ortak Kontrol ve I/O Kartı", en: "Shared Control & I/O Board" },
    description: {
      tr: "Güç, MCU, sensör, aktüatör ve haberleşme altyapısını standardize eden ortak kart yaklaşımı.",
      en: "Shared board concept standardizing power, MCU, sensor, actuator and communications interfaces.",
    },
    progress: 27,
    status: { tr: "Elektronik mimari", en: "Electronics architecture" },
    integrations: ["CORE Power Stack", "Hydronom", "CORE Runtime"],
  },
  {
    name: "Hydronom AI",
    owner: "CORE Systems",
    category: { tr: "Otonomi ve Karar Katmanı", en: "Autonomy & Decision Layer" },
    description: {
      tr: "Navigation, Arrival, Hold, Task, Wrench ve raporlama davranışlarını ortak otonomi katmanında birleştirir.",
      en: "Unifies navigation, arrival, hold, task, wrench and reporting behaviors in a shared autonomy layer.",
    },
    progress: 38,
    status: { tr: "Mimari doğrulama", en: "Architecture validation" },
    integrations: ["Hydronom", "CORE Runtime", "Hydro SDK"],
  },
  {
    name: "Gateway",
    owner: "CORE Ops / Systems",
    category: { tr: "Araç–Merkez Köprüsü", en: "Vehicle-to-Core Gateway" },
    description: {
      tr: "Araç telemetrisi, görev durumu ve sağlık verilerini CORE servislerine güvenli biçimde taşır.",
      en: "Carries vehicle telemetry, mission state and health data securely into CORE services.",
    },
    progress: 53,
    status: { tr: "Protokol entegrasyonu", en: "Protocol integration" },
    integrations: ["Telemetry Protocol", "Ground Station", "OPS Screens"],
  },
  {
    name: "OPS Screens",
    owner: "CORE Ops",
    category: { tr: "Operasyon Arayüzleri", en: "Operations Interfaces" },
    description: {
      tr: "Konum, link kalitesi, batarya, mod, görev ve sistem sağlığını tek operasyon yüzeyinde gösterir.",
      en: "Surfaces position, link quality, battery, mode, mission and system health in one operations interface.",
    },
    progress: 46,
    status: { tr: "UI prototipleme", en: "UI prototyping" },
    integrations: ["Gateway", "Ground Station"],
  },
  {
    name: "Hydro SDK",
    owner: "CORE Systems",
    category: { tr: "Geliştirici Kiti", en: "Developer Kit" },
    description: {
      tr: "Ortak API'ler, veri yapıları, mesaj tipleri ve araç servisleri için geliştirici katmanı.",
      en: "Developer layer for shared APIs, data structures, message types and vehicle services.",
    },
    progress: 34,
    status: { tr: "API tasarımı", en: "API design" },
    integrations: ["Hydronom AI", "CORE Runtime", "Gateway"],
  },
  {
    name: "Ground Station",
    owner: "CORE Ops",
    category: { tr: "Görev Kontrol Merkezi", en: "Mission Control Station" },
    description: {
      tr: "Canlı görev yönetimi, telemetri izleme, kayıt ve saha operasyon koordinasyonu.",
      en: "Live mission management, telemetry monitoring, logging and field operations coordination.",
    },
    progress: 58,
    status: { tr: "Operasyon prototipi", en: "Operations prototype" },
    integrations: ["Gateway", "OPS Screens", "Telemetry Protocol"],
  },
  {
    name: "CORE Runtime",
    owner: "CORE Systems",
    category: { tr: "Ortak Araç Runtime'ı", en: "Shared Vehicle Runtime" },
    description: {
      tr: "Farklı araç sınıflarında tekrar kullanılabilir servis yaşam döngüsü, durum ve görev altyapısı.",
      en: "Reusable service lifecycle, state and mission infrastructure across different vehicle classes.",
    },
    progress: 31,
    status: { tr: "Çekirdek tasarım", en: "Core design" },
    integrations: ["Hydronom AI", "Hydro SDK", "Telemetry Protocol"],
  },
  {
    name: "Telemetry Protocol",
    owner: "CORE Systems / Ops",
    category: { tr: "Ortak Haberleşme Standardı", en: "Shared Communications Standard" },
    description: {
      tr: "Araç, gateway ve yer istasyonu arasındaki mesajları ortak ve izlenebilir bir protokolde birleştirir.",
      en: "Unifies messages between vehicles, gateways and ground stations in a common traceable protocol.",
    },
    progress: 44,
    status: { tr: "Mesaj sözleşmeleri", en: "Message contracts" },
    integrations: ["Gateway", "Ground Station", "CORE Runtime"],
  },
  {
    name: "CORE Power Stack",
    owner: "CORE Embedded",
    category: { tr: "Güç ve Koruma Mimarisi", en: "Power & Protection Architecture" },
    description: {
      tr: "Sigorta, anahtarlama, dağıtım, regülasyon, ölçüm ve güvenlik katmanını standardize eder.",
      en: "Standardizes fusing, switching, distribution, regulation, measurement and safety layers.",
    },
    progress: 36,
    status: { tr: "Donanım standardizasyonu", en: "Hardware standardization" },
    integrations: ["Hydrocard", "CORE Embedded"],
  },
];

export const competitions: Competition[] = [
  {
    domain: "CORE Marine",
    name: "RoboBoat",
    date: { tr: "2027 takvimi bekleniyor", en: "2027 calendar TBA" },
    location: { tr: "Uluslararası", en: "International" },
    status: "target",
    note: {
      tr: "Otonom su üstü araçları için ana uluslararası hedeflerden biri.",
      en: "One of the primary international targets for autonomous surface vehicles.",
    },
  },
  {
    domain: "CORE Marine",
    name: "TEKNOFEST İnsansız Deniz Aracı",
    date: { tr: "2027 takvimi bekleniyor", en: "2027 calendar TBA" },
    location: { tr: "Türkiye", en: "Türkiye" },
    status: "evaluation",
    note: {
      tr: "2027 kategori ve şartname yayını sonrası değerlendirme.",
      en: "To be evaluated after the 2027 category and rulebook release.",
    },
  },
  {
    domain: "CORE Subsea",
    name: "SAUVC 2027",
    date: { tr: "24–27 Şubat 2027", en: "24–27 February 2027" },
    location: { tr: "Singapore Polytechnic", en: "Singapore Polytechnic" },
    status: "confirmed",
    note: {
      tr: "AUV navigasyon, görsel tanıma, akustik lokalizasyon ve manipülasyon odaklı.",
      en: "Focused on AUV navigation, visual identification, acoustic localization and manipulation.",
    },
  },
  {
    domain: "CORE Subsea",
    name: "RoboSub",
    date: { tr: "2027 takvimi bekleniyor", en: "2027 calendar TBA" },
    location: { tr: "ABD / Uluslararası", en: "USA / International" },
    status: "target",
    note: {
      tr: "Otonom sualtı algı, navigasyon ve görev icrası için üst seviye hedef.",
      en: "High-level target for autonomous underwater perception, navigation and mission execution.",
    },
  },
  {
    domain: "CORE Subsea",
    name: "MATE ROV Competition",
    date: { tr: "2027 takvimi bekleniyor", en: "2027 calendar TBA" },
    location: { tr: "Uluslararası", en: "International" },
    status: "evaluation",
    note: {
      tr: "ROV ve görev manipülasyonu tarafı için değerlendiriliyor.",
      en: "Under evaluation for ROV and manipulation-oriented development.",
    },
  },
  {
    domain: "CORE Land",
    name: "University Rover Challenge 2027",
    date: { tr: "2–5 Haziran 2027", en: "2–5 June 2027" },
    location: { tr: "Mars Desert Research Station · Utah", en: "Mars Desert Research Station · Utah" },
    status: "confirmed",
    note: {
      tr: "Astrobiyoloji, teslimat, ekipman servis ve otonomi görevleri.",
      en: "Astrobiology, delivery, equipment servicing and autonomy missions.",
    },
  },
  {
    domain: "CORE Air",
    name: "SUAS",
    date: { tr: "2027 takvimi bekleniyor", en: "2027 calendar TBA" },
    location: { tr: "ABD / Uluslararası", en: "USA / International" },
    status: "target",
    note: {
      tr: "Otonom uçuş, navigasyon, uzaktan algılama ve görev icrası.",
      en: "Autonomous flight, navigation, remote sensing and mission execution.",
    },
  },
  {
    domain: "CORE Industrial",
    name: "TEKNOFEST Sanayide Robotik Uygulamalar",
    date: { tr: "2027 takvimi bekleniyor", en: "2027 calendar TBA" },
    location: { tr: "Türkiye", en: "Türkiye" },
    status: "evaluation",
    note: {
      tr: "AMR ve endüstriyel otonomi yeteneklerini saha görevlerine taşımak için aday hedef.",
      en: "Candidate target for taking AMR and industrial autonomy capabilities into field missions.",
    },
  },
  {
    domain: "CORE Space",
    name: "Model Uydu / CubeSat Track",
    date: { tr: "2027 takvimi bekleniyor", en: "2027 calendar TBA" },
    location: { tr: "Türkiye / Uluslararası", en: "Türkiye / International" },
    status: "evaluation",
    note: {
      tr: "Yer istasyonu, haberleşme ve faydalı yük altyapısıyla birlikte değerlendirilecek.",
      en: "To be evaluated together with ground-station, communications and payload capabilities.",
    },
  },
  {
    domain: "CORE Rocket",
    name: "TEKNOFEST Roket Yarışması",
    date: { tr: "2027 döngüsü / kategoriye göre", en: "2027 cycle / category dependent" },
    location: { tr: "Türkiye", en: "Türkiye" },
    status: "target",
    note: {
      tr: "Roket, aviyonik, uçuş modelleme ve özgün itki geliştirme hatları için hedef.",
      en: "Target for rocket, avionics, flight-modeling and indigenous propulsion development tracks.",
    },
  },
];

export const networkStats = [
  { value: "07", label: { tr: "Araç domaini", en: "Vehicle domains" } },
  { value: "03", label: { tr: "Ortak servis", en: "Shared services" } },
  { value: "10", label: { tr: "Ürün / proje", en: "Products / projects" } },
  { value: "02", label: { tr: "2027 tarihi açıklanmış hedef", en: "Targets with published 2027 dates" } },
];
