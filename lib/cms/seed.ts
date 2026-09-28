import { env } from "cloudflare:workers";

const SHOWCASE_SEED_SQL = "-- YTÜ CORE public showcase seed\n-- Safe to run more than once.\n\nINSERT INTO site_settings (setting_key, value_json, updated_at)\nVALUES (\n  'cms_seed',\n  '{\"version\":\"2026.09-v2\",\"source\":\"CORE Web V0.3 showcase\"}',\n  CURRENT_TIMESTAMP\n)\nON CONFLICT(setting_key) DO UPDATE SET\n  value_json = excluded.value_json,\n  updated_at = CURRENT_TIMESTAMP;\n\n-- =========================================================\n-- PROJECTS\n-- =========================================================\n\nINSERT INTO content_items (id,type,slug,status,domain,metadata_json,sort_order,published_at)\nVALUES\n('project-hydronom','project','hydronom','published','CORE Marine','{\"progress\":42,\"owner\":\"CORE Marine\",\"category_tr\":\"Otonom Su Üstü Araç Platformu\",\"category_en\":\"Autonomous Surface Vehicle Platform\",\"integrations\":[\"Hydronom AI\",\"Gateway\",\"Ground Station\",\"Hydro SDK\"]}',10,CURRENT_TIMESTAMP),\n('project-hydrocard','project','hydrocard','published','CORE Embedded','{\"progress\":27,\"owner\":\"CORE Embedded\",\"category_tr\":\"Ortak Kontrol ve I/O Kartı\",\"category_en\":\"Shared Control & I/O Board\",\"integrations\":[\"CORE Power Stack\",\"Hydronom\",\"CORE Runtime\"]}',20,CURRENT_TIMESTAMP),\n('project-hydronom-ai','project','hydronom-ai','published','CORE Systems','{\"progress\":38,\"owner\":\"CORE Systems\",\"category_tr\":\"Otonomi ve Karar Katmanı\",\"category_en\":\"Autonomy & Decision Layer\",\"integrations\":[\"Hydronom\",\"CORE Runtime\",\"Hydro SDK\"]}',30,CURRENT_TIMESTAMP),\n('project-gateway','project','gateway','published','CORE Ops / Systems','{\"progress\":53,\"owner\":\"CORE Ops / Systems\",\"category_tr\":\"Araç–Merkez Köprüsü\",\"category_en\":\"Vehicle-to-Core Gateway\",\"integrations\":[\"Telemetry Protocol\",\"Ground Station\",\"OPS Screens\"]}',40,CURRENT_TIMESTAMP),\n('project-ops-screens','project','ops-screens','published','CORE Ops','{\"progress\":46,\"owner\":\"CORE Ops\",\"category_tr\":\"Operasyon Arayüzleri\",\"category_en\":\"Operations Interfaces\",\"integrations\":[\"Gateway\",\"Ground Station\"]}',50,CURRENT_TIMESTAMP),\n('project-hydro-sdk','project','hydro-sdk','published','CORE Systems','{\"progress\":34,\"owner\":\"CORE Systems\",\"category_tr\":\"Geliştirici Kiti\",\"category_en\":\"Developer Kit\",\"integrations\":[\"Hydronom AI\",\"CORE Runtime\",\"Gateway\"]}',60,CURRENT_TIMESTAMP),\n('project-ground-station','project','ground-station','published','CORE Ops','{\"progress\":58,\"owner\":\"CORE Ops\",\"category_tr\":\"Görev Kontrol Merkezi\",\"category_en\":\"Mission Control Station\",\"integrations\":[\"Gateway\",\"OPS Screens\",\"Telemetry Protocol\"]}',70,CURRENT_TIMESTAMP),\n('project-core-runtime','project','core-runtime','published','CORE Systems','{\"progress\":31,\"owner\":\"CORE Systems\",\"category_tr\":\"Ortak Araç Runtime\",\"category_en\":\"Shared Vehicle Runtime\",\"integrations\":[\"Hydronom AI\",\"Hydro SDK\",\"Telemetry Protocol\"]}',80,CURRENT_TIMESTAMP),\n('project-telemetry-protocol','project','telemetry-protocol','published','CORE Systems / Ops','{\"progress\":44,\"owner\":\"CORE Systems / Ops\",\"category_tr\":\"Ortak Haberleşme Standardı\",\"category_en\":\"Shared Communications Standard\",\"integrations\":[\"Gateway\",\"Ground Station\",\"CORE Runtime\"]}',90,CURRENT_TIMESTAMP),\n('project-core-power-stack','project','core-power-stack','published','CORE Embedded','{\"progress\":36,\"owner\":\"CORE Embedded\",\"category_tr\":\"Güç ve Koruma Mimarisi\",\"category_en\":\"Power & Protection Architecture\",\"integrations\":[\"Hydrocard\",\"CORE Embedded\"]}',100,CURRENT_TIMESTAMP)\nON CONFLICT(id) DO UPDATE SET\n  slug=excluded.slug,\n  status=excluded.status,\n  domain=excluded.domain,\n  metadata_json=excluded.metadata_json,\n  sort_order=excluded.sort_order,\n  updated_at=CURRENT_TIMESTAMP,\n  published_at=COALESCE(content_items.published_at, excluded.published_at);\n\nINSERT INTO content_localizations\n(content_id,locale,title,summary,body,seo_title,seo_description,publication_status)\nVALUES\n('project-hydronom','tr','Hydronom','Görev planlama, otonom seyir ve saha doğrulaması için ana deniz aracı platformu.','','Hydronom | YTÜ CORE','CORE Marine otonom su üstü araç platformu.','published'),\n('project-hydronom','en','Hydronom','Primary maritime vehicle platform for mission planning, autonomous navigation and field validation.','','Hydronom | YTÜ CORE','CORE Marine autonomous surface vehicle platform.','published'),\n\n('project-hydrocard','tr','Hydrocard','Güç, MCU, sensör, aktüatör ve haberleşme altyapısını standardize eden ortak kart yaklaşımı.','','Hydrocard | YTÜ CORE','CORE Embedded ortak kontrol ve I/O kartı.','published'),\n('project-hydrocard','en','Hydrocard','Shared board concept standardizing power, MCU, sensor, actuator and communications interfaces.','','Hydrocard | YTÜ CORE','CORE Embedded shared control and I/O board.','published'),\n\n('project-hydronom-ai','tr','Hydronom AI','Navigation, Arrival, Hold, Task, Wrench ve raporlama davranışlarını ortak otonomi katmanında birleştirir.','','Hydronom AI | YTÜ CORE','CORE Systems otonomi ve karar katmanı.','published'),\n('project-hydronom-ai','en','Hydronom AI','Unifies navigation, arrival, hold, task, wrench and reporting behaviors in a shared autonomy layer.','','Hydronom AI | YTÜ CORE','CORE Systems autonomy and decision layer.','published'),\n\n('project-gateway','tr','Gateway','Araç telemetrisi, görev durumu ve sağlık verilerini CORE servislerine güvenli biçimde taşır.','','Gateway | YTÜ CORE','Araç-merkez haberleşme köprüsü.','published'),\n('project-gateway','en','Gateway','Carries vehicle telemetry, mission state and health data securely into CORE services.','','Gateway | YTÜ CORE','Vehicle-to-Core communications gateway.','published'),\n\n('project-ops-screens','tr','OPS Screens','Konum, link kalitesi, batarya, mod, görev ve sistem sağlığını tek operasyon yüzeyinde gösterir.','','OPS Screens | YTÜ CORE','CORE Ops operasyon arayüzleri.','published'),\n('project-ops-screens','en','OPS Screens','Surfaces position, link quality, battery, mode, mission and system health in one operations interface.','','OPS Screens | YTÜ CORE','CORE Ops operations interfaces.','published'),\n\n('project-hydro-sdk','tr','Hydro SDK','Ortak API''ler, veri yapıları, mesaj tipleri ve araç servisleri için geliştirici katmanı.','','Hydro SDK | YTÜ CORE','CORE Systems geliştirici kiti.','published'),\n('project-hydro-sdk','en','Hydro SDK','Developer layer for shared APIs, data structures, message types and vehicle services.','','Hydro SDK | YTÜ CORE','CORE Systems developer kit.','published'),\n\n('project-ground-station','tr','Ground Station','Canlı görev yönetimi, telemetri izleme, kayıt ve saha operasyon koordinasyonu.','','Ground Station | YTÜ CORE','CORE Ops görev kontrol merkezi.','published'),\n('project-ground-station','en','Ground Station','Live mission management, telemetry monitoring, logging and field operations coordination.','','Ground Station | YTÜ CORE','CORE Ops mission control station.','published'),\n\n('project-core-runtime','tr','CORE Runtime','Farklı araç sınıflarında tekrar kullanılabilir servis yaşam döngüsü, durum ve görev altyapısı.','','CORE Runtime | YTÜ CORE','Ortak araç runtime altyapısı.','published'),\n('project-core-runtime','en','CORE Runtime','Reusable service lifecycle, state and mission infrastructure across different vehicle classes.','','CORE Runtime | YTÜ CORE','Shared vehicle runtime infrastructure.','published'),\n\n('project-telemetry-protocol','tr','Telemetry Protocol','Araç, gateway ve yer istasyonu arasındaki mesajları ortak ve izlenebilir bir protokolde birleştirir.','','Telemetry Protocol | YTÜ CORE','CORE ortak telemetri standardı.','published'),\n('project-telemetry-protocol','en','Telemetry Protocol','Unifies messages between vehicles, gateways and ground stations in a common traceable protocol.','','Telemetry Protocol | YTÜ CORE','CORE shared telemetry standard.','published'),\n\n('project-core-power-stack','tr','CORE Power Stack','Sigorta, anahtarlama, dağıtım, regülasyon, ölçüm ve güvenlik katmanını standardize eder.','','CORE Power Stack | YTÜ CORE','CORE Embedded güç ve koruma mimarisi.','published'),\n('project-core-power-stack','en','CORE Power Stack','Standardizes fusing, switching, distribution, regulation, measurement and safety layers.','','CORE Power Stack | YTÜ CORE','CORE Embedded power and protection architecture.','published')\nON CONFLICT(content_id,locale) DO UPDATE SET\n  title=excluded.title,\n  summary=excluded.summary,\n  body=excluded.body,\n  seo_title=excluded.seo_title,\n  seo_description=excluded.seo_description,\n  publication_status=excluded.publication_status;\n\n-- =========================================================\n-- COMPETITION / FIELD TARGETS\n-- =========================================================\n\nINSERT INTO content_items (id,type,slug,status,domain,metadata_json,sort_order,published_at)\nVALUES\n('competition-roboboat','competition','roboboat','published','CORE Marine','{\"target_status\":\"target\",\"date_tr\":\"2027 takvimi bekleniyor\",\"date_en\":\"2027 calendar TBA\",\"location_tr\":\"Uluslararası\",\"location_en\":\"International\"}',210,CURRENT_TIMESTAMP),\n('competition-teknofest-marine','competition','teknofest-insansiz-deniz-araci','published','CORE Marine','{\"target_status\":\"evaluation\",\"date_tr\":\"2027 takvimi bekleniyor\",\"date_en\":\"2027 calendar TBA\",\"location_tr\":\"Türkiye\",\"location_en\":\"Türkiye\"}',220,CURRENT_TIMESTAMP),\n('competition-sauvc-2027','competition','sauvc-2027','published','CORE Subsea','{\"target_status\":\"confirmed\",\"date_tr\":\"24–27 Şubat 2027\",\"date_en\":\"24–27 February 2027\",\"location_tr\":\"Singapore Polytechnic\",\"location_en\":\"Singapore Polytechnic\"}',230,CURRENT_TIMESTAMP),\n('competition-robosub','competition','robosub','published','CORE Subsea','{\"target_status\":\"target\",\"date_tr\":\"2027 takvimi bekleniyor\",\"date_en\":\"2027 calendar TBA\",\"location_tr\":\"ABD / Uluslararası\",\"location_en\":\"USA / International\"}',240,CURRENT_TIMESTAMP),\n('competition-mate-rov','competition','mate-rov','published','CORE Subsea','{\"target_status\":\"evaluation\",\"date_tr\":\"2027 takvimi bekleniyor\",\"date_en\":\"2027 calendar TBA\",\"location_tr\":\"Uluslararası\",\"location_en\":\"International\"}',250,CURRENT_TIMESTAMP),\n('competition-urc-2027','competition','university-rover-challenge-2027','published','CORE Land','{\"target_status\":\"confirmed\",\"date_tr\":\"2–5 Haziran 2027\",\"date_en\":\"2–5 June 2027\",\"location_tr\":\"Mars Desert Research Station · Utah\",\"location_en\":\"Mars Desert Research Station · Utah\"}',260,CURRENT_TIMESTAMP),\n('competition-suas','competition','suas','published','CORE Air','{\"target_status\":\"target\",\"date_tr\":\"2027 takvimi bekleniyor\",\"date_en\":\"2027 calendar TBA\",\"location_tr\":\"ABD / Uluslararası\",\"location_en\":\"USA / International\"}',270,CURRENT_TIMESTAMP),\n('competition-teknofest-industrial','competition','teknofest-sanayide-robotik','published','CORE Industrial','{\"target_status\":\"evaluation\",\"date_tr\":\"2027 takvimi bekleniyor\",\"date_en\":\"2027 calendar TBA\",\"location_tr\":\"Türkiye\",\"location_en\":\"Türkiye\"}',280,CURRENT_TIMESTAMP),\n('competition-space-track','competition','model-uydu-cubesat-track','published','CORE Space','{\"target_status\":\"evaluation\",\"date_tr\":\"2027 takvimi bekleniyor\",\"date_en\":\"2027 calendar TBA\",\"location_tr\":\"Türkiye / Uluslararası\",\"location_en\":\"Türkiye / International\"}',290,CURRENT_TIMESTAMP),\n('competition-teknofest-rocket','competition','teknofest-roket','published','CORE Rocket','{\"target_status\":\"target\",\"date_tr\":\"2027 döngüsü / kategoriye göre\",\"date_en\":\"2027 cycle / category dependent\",\"location_tr\":\"Türkiye\",\"location_en\":\"Türkiye\"}',300,CURRENT_TIMESTAMP)\nON CONFLICT(id) DO UPDATE SET\n  slug=excluded.slug,\n  status=excluded.status,\n  domain=excluded.domain,\n  metadata_json=excluded.metadata_json,\n  sort_order=excluded.sort_order,\n  updated_at=CURRENT_TIMESTAMP,\n  published_at=COALESCE(content_items.published_at, excluded.published_at);\n\nINSERT INTO content_localizations\n(content_id,locale,title,summary,body,seo_title,seo_description,publication_status)\nVALUES\n('competition-roboboat','tr','RoboBoat','Otonom su üstü araçları için ana uluslararası hedeflerden biri.','','RoboBoat | YTÜ CORE','','published'),\n('competition-roboboat','en','RoboBoat','One of the primary international targets for autonomous surface vehicles.','','RoboBoat | YTÜ CORE','','published'),\n\n('competition-teknofest-marine','tr','TEKNOFEST İnsansız Deniz Aracı','2027 kategori ve şartname yayını sonrası değerlendirme.','','TEKNOFEST İnsansız Deniz Aracı | YTÜ CORE','','published'),\n('competition-teknofest-marine','en','TEKNOFEST Unmanned Marine Vehicle','To be evaluated after the 2027 category and rulebook release.','','TEKNOFEST Unmanned Marine Vehicle | YTÜ CORE','','published'),\n\n('competition-sauvc-2027','tr','SAUVC 2027','AUV navigasyon, görsel tanıma, akustik lokalizasyon ve manipülasyon odaklı.','','SAUVC 2027 | YTÜ CORE','','published'),\n('competition-sauvc-2027','en','SAUVC 2027','Focused on AUV navigation, visual identification, acoustic localization and manipulation.','','SAUVC 2027 | YTÜ CORE','','published'),\n\n('competition-robosub','tr','RoboSub','Otonom sualtı algı, navigasyon ve görev icrası için üst seviye hedef.','','RoboSub | YTÜ CORE','','published'),\n('competition-robosub','en','RoboSub','High-level target for autonomous underwater perception, navigation and mission execution.','','RoboSub | YTÜ CORE','','published'),\n\n('competition-mate-rov','tr','MATE ROV Competition','ROV ve görev manipülasyonu tarafı için değerlendiriliyor.','','MATE ROV | YTÜ CORE','','published'),\n('competition-mate-rov','en','MATE ROV Competition','Under evaluation for ROV and manipulation-oriented development.','','MATE ROV | YTÜ CORE','','published'),\n\n('competition-urc-2027','tr','University Rover Challenge 2027','Astrobiyoloji, teslimat, ekipman servis ve otonomi görevleri.','','URC 2027 | YTÜ CORE','','published'),\n('competition-urc-2027','en','University Rover Challenge 2027','Astrobiology, delivery, equipment servicing and autonomy missions.','','URC 2027 | YTÜ CORE','','published'),\n\n('competition-suas','tr','SUAS','Otonom uçuş, navigasyon, uzaktan algılama ve görev icrası.','','SUAS | YTÜ CORE','','published'),\n('competition-suas','en','SUAS','Autonomous flight, navigation, remote sensing and mission execution.','','SUAS | YTÜ CORE','','published'),\n\n('competition-teknofest-industrial','tr','TEKNOFEST Sanayide Robotik Uygulamalar','AMR ve endüstriyel otonomi yeteneklerini saha görevlerine taşımak için aday hedef.','','Sanayide Robotik | YTÜ CORE','','published'),\n('competition-teknofest-industrial','en','TEKNOFEST Industrial Robotics Applications','Candidate target for taking AMR and industrial autonomy capabilities into field missions.','','Industrial Robotics | YTÜ CORE','','published'),\n\n('competition-space-track','tr','Model Uydu / CubeSat Track','Yer istasyonu, haberleşme ve faydalı yük altyapısıyla birlikte değerlendirilecek.','','Space Track | YTÜ CORE','','published'),\n('competition-space-track','en','Model Satellite / CubeSat Track','To be evaluated together with ground-station, communications and payload capabilities.','','Space Track | YTÜ CORE','','published'),\n\n('competition-teknofest-rocket','tr','TEKNOFEST Roket Yarışması','Roket, aviyonik, uçuş modelleme ve özgün itki geliştirme hatları için hedef.','','TEKNOFEST Roket | YTÜ CORE','','published'),\n('competition-teknofest-rocket','en','TEKNOFEST Rocket Competition','Target for rocket, avionics, flight-modeling and indigenous propulsion development tracks.','','TEKNOFEST Rocket | YTÜ CORE','','published')\nON CONFLICT(content_id,locale) DO UPDATE SET\n  title=excluded.title,\n  summary=excluded.summary,\n  body=excluded.body,\n  seo_title=excluded.seo_title,\n  seo_description=excluded.seo_description,\n  publication_status=excluded.publication_status;";


const BASE_PAGE_SEED_SQL = `
INSERT INTO content_items (id,type,slug,status,domain,metadata_json,sort_order,published_at)
VALUES
('page-home','page','home','published',NULL,'{"code":"HOME","eyebrow_tr":"YILDIZ TEKNİK ÜNİVERSİTESİ · ÖĞRENCİ MÜHENDİSLİK TAKIMI","eyebrow_en":"YILDIZ TECHNICAL UNIVERSITY · STUDENT ENGINEERING TEAM","accent_tr":"Teknoloji.","accent_en":"for People."}',1,CURRENT_TIMESTAMP),
('page-teams','page','teams','published',NULL,'{"code":"01","eyebrow_tr":"TAKIMLAR","eyebrow_en":"TEAMS","accent_tr":"","accent_en":""}',2,CURRENT_TIMESTAMP),
('page-projects','page','projects','published',NULL,'{"code":"02","eyebrow_tr":"PROJELER","eyebrow_en":"PROJECTS","accent_tr":"","accent_en":""}',3,CURRENT_TIMESTAMP),
('page-research','page','research','published',NULL,'{"code":"03","eyebrow_tr":"ARAŞTIRMA","eyebrow_en":"RESEARCH","accent_tr":"","accent_en":""}',4,CURRENT_TIMESTAMP),
('page-competitions','page','competitions','published',NULL,'{"code":"04","eyebrow_tr":"YARIŞMALAR / SAHA HEDEFLERİ","eyebrow_en":"COMPETITIONS / FIELD TARGETS","accent_tr":"","accent_en":""}',5,CURRENT_TIMESTAMP),
('page-about','page','about','published',NULL,'{"code":"05","eyebrow_tr":"HAKKIMIZDA","eyebrow_en":"ABOUT","accent_tr":"","accent_en":""}',6,CURRENT_TIMESTAMP),
('page-join','page','join','published',NULL,'{"code":"06","eyebrow_tr":"KATIL / STUDENT PATH","eyebrow_en":"JOIN / STUDENT PATH","accent_tr":"","accent_en":""}',7,CURRENT_TIMESTAMP)
ON CONFLICT(id) DO UPDATE SET
  slug=excluded.slug,
  status=excluded.status,
  metadata_json=excluded.metadata_json,
  sort_order=excluded.sort_order,
  updated_at=CURRENT_TIMESTAMP,
  published_at=COALESCE(content_items.published_at, excluded.published_at);

INSERT INTO content_localizations
(content_id,locale,title,summary,body,seo_title,seo_description,publication_status)
VALUES
('page-home','tr','İnsan İçin','YTÜ CORE; öğrencilerin birlikte öğrendiği, tasarladığı, ürettiği ve sahada doğruladığı otonom sistemler ekosistemi. Denizden uzaya uzanan takımlarımız aynı bilgi, yazılım ve donanım omurgasında buluşur.','Biz bir şirket değiliz. Tek bir yarışma için kurulmuş tek araçlık bir ekip de değiliz. Yıldız''da birbirinden öğrenen öğrencilerin, gerçek mühendislik problemlerini birlikte çözdüğü yaşayan bir takımız.','YTÜ CORE | İnsan İçin Teknoloji','Yıldız Teknik Üniversitesi öğrenci mühendislik takımı; otonom sistemler, araştırma ve saha doğrulama ekosistemi.','published'),
('page-home','en','Technology','YTÜ CORE is an autonomous-systems ecosystem where students learn together, design, build and validate in the field. Teams from sea to space share one knowledge, software and hardware backbone.','We are not a company, and we are not a one-vehicle team built around a single competition. We are a living student engineering team at Yıldız, learning from each other while solving real engineering problems together.','YTÜ CORE | Technology for People','Yıldız Technical University student engineering team for autonomous systems, research and field validation.','published'),

('page-teams','tr','Aynı okulda, farklı dünyalar için üretiyoruz.','CORE''un yapısı iki katmanlıdır: araç takımları bir fiziksel ortama odaklanır; ortak servis takımları ise yazılım, elektronik ve operasyon yeteneklerini herkes için üretir.','','Takımlar | YTÜ CORE','CORE Marine, Subsea, Land, Air, Industrial, Space, Rocket ile Systems, Embedded ve Ops takımları.','published'),
('page-teams','en','One university, building for many worlds.','CORE has two layers: vehicle teams focus on physical environments while shared service teams build reusable software, electronics and operations capabilities for everyone.','','Teams | YTÜ CORE','CORE vehicle domains and shared engineering service teams.','published'),

('page-projects','tr','Öğrencilerin elinden çıkan yaşayan sistemler.','CORE projeleri yalnızca bir yarışmaya yetişmek için değil; tekrar kullanılabilir mimari, test kültürü ve kurumsal teknik hafıza üretmek için geliştirilir.','','Projeler | YTÜ CORE','YTÜ CORE proje portföyü, entegrasyonları ve teknik ilerleme görünümü.','published'),
('page-projects','en','Living systems built by students.','CORE projects are not built only to reach a competition deadline. They create reusable architecture, test culture and institutional technical memory.','','Projects | YTÜ CORE','YTÜ CORE project portfolio, integrations and engineering progress.','published'),

('page-research','tr','Donanımdan önce soru vardır.','CORE Research araç üretmez; doğru soruyu bulur, hipotezi test eder, ölçer, raporlar ve teknik çıktıyı araç takımlarına geri verir.','','Araştırma | YTÜ CORE','YTÜ CORE Research; ön tasarım, deney, teknik rapor ve teknoloji doğrulama.','published'),
('page-research','en','Before hardware, there is a question.','CORE Research does not build vehicles. It finds the right question, tests hypotheses, measures, documents and feeds technical evidence back to vehicle teams.','','Research | YTÜ CORE','YTÜ CORE Research for preliminary design, experiment, reports and technology validation.','published'),

('page-competitions','tr','Yarışma amaç değil; sert bir doğrulama ortamı.','CORE yarışmaları takvime madalya yazmak için değil, mühendisliği dış gereksinimler altında sınamak için kullanır. Hedefler kesin kayıt anlamına gelmez; planlama panosudur.','','Yarışmalar | YTÜ CORE','YTÜ CORE yarışma ve saha doğrulama hedefleri.','published'),
('page-competitions','en','Competition is not the purpose. It is a hard validation environment.','CORE uses competitions to pressure-test engineering under external requirements. Targets are planning signals, not guarantees of registration.','','Competitions | YTÜ CORE','YTÜ CORE competition and field-validation targets.','published'),

('page-about','tr','Bir öğrenci takımı ne kadar ileri gidebilir?','CORE''un cevabı basit: öğrencinin merakını gerçek sorumluluk, ortak altyapı ve güçlü teknik hafızayla buluşturabildiği kadar.','Yıldız Teknik Üniversitesi öğrencilerinin disiplinler arası gerçek sistemler geliştirerek mühendisliği uygulamalı biçimde öğrenebildiği sürdürülebilir bir teknik kültür kurmak.','Hakkımızda | YTÜ CORE','YTÜ CORE öğrenci mühendislik kültürü, misyonu ve yaklaşımı.','published'),
('page-about','en','How far can a student team go?','CORE''s answer is simple: as far as student curiosity can go when paired with real responsibility, shared infrastructure and durable technical memory.','Build a sustainable technical culture where Yıldız Technical University students learn engineering by creating real interdisciplinary systems.','About | YTÜ CORE','YTÜ CORE student engineering culture, mission and approach.','published'),

('page-join','tr','Merakını getir. Gerisini birlikte inşa ederiz.','CORE''a katılmak bir şirkete işe başvurmak değildir. Burada öğrenci olarak öğrenir, küçük bir sorumlulukla başlar, ürettiğini başka sistemlerle birleştirir ve zamanla gerçek bir alt sistemin sahibi olursun.','Açık roller ve başvuru dönemleri burada yayınlanacak.','Katıl | YTÜ CORE','YTÜ CORE öğrenci katılım yolu, teknik alanlar ve takım kültürü.','published'),
('page-join','en','Bring your curiosity. We build the rest together.','Joining CORE is not applying for a corporate job. You learn as a student, begin with a small responsibility, connect what you build with other systems and gradually take ownership of a real subsystem.','Open roles and application periods will be published here.','Join | YTÜ CORE','YTÜ CORE student participation path, engineering areas and team culture.','published')
ON CONFLICT(content_id,locale) DO UPDATE SET
  title=excluded.title,
  summary=excluded.summary,
  body=excluded.body,
  seo_title=excluded.seo_title,
  seo_description=excluded.seo_description,
  publication_status=excluded.publication_status;
`;

function splitSqlStatements(sql: string) {
  const statements: string[] = [];
  let current = "";
  let inString = false;

  for (let index = 0; index < sql.length; index += 1) {
    const char = sql[index];

    if (char === "'") {
      current += char;

      if (inString && sql[index + 1] === "'") {
        current += sql[index + 1];
        index += 1;
        continue;
      }

      inString = !inString;
      continue;
    }

    if (char === ";" && !inString) {
      const statement = current.trim();
      if (statement) statements.push(statement);
      current = "";
      continue;
    }

    current += char;
  }

  const trailing = current.trim();
  if (trailing) statements.push(trailing);

  return statements;
}

export async function applyShowcaseSeed(actor: string) {
  const db = env.DB;
  if (!db) {
    throw new Error("DB binding is not available.");
  }

  const seedSource = [SHOWCASE_SEED_SQL, BASE_PAGE_SEED_SQL]
    .join("\n")
    .split("\n")
    .filter((line) => !line.trimStart().startsWith("--"))
    .join("\n");

  const statements = splitSqlStatements(seedSource);

  if (statements.length === 0) {
    throw new Error("Showcase seed contains no executable statements.");
  }

  const seedStatements = statements.map((statement) => db.prepare(statement));

  const auditStatement = db
    .prepare(`
      INSERT INTO audit_log (actor, action, entity_type, entity_id, details_json)
      VALUES (?, 'seed.apply', 'site', 'showcase', ?)
    `)
    .bind(
      actor,
      JSON.stringify({
        version: "2026.09-v2",
        statementCount: statements.length,
      })
    );

  const results = await db.batch([...seedStatements, auditStatement]);

  return {
    count: results.length,
  };
}
