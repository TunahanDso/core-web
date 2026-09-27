import { notFound } from "next/navigation";
import PublicChrome from "@/components/PublicChrome";
import PublicPageHero from "@/components/PublicPageHero";
import { isLocale } from "@/lib/i18n";

const copy = {
  tr: {
    eyebrow: "KATIL / STUDENT PATH",
    title: "Merakını getir. Gerisini birlikte inşa ederiz.",
    lead:
      "CORE'a katılmak bir şirkete işe başvurmak değildir. Burada öğrenci olarak öğrenir, küçük bir sorumlulukla başlar, ürettiğini başka sistemlerle birleştirir ve zamanla gerçek bir alt sistemin sahibi olursun.",
    routesTitle: "CORE'da kendine nerede yer bulursun?",
    routesLead:
      "Bölüm etiketinden çok neyi merak ettiğin önemli. Mekanik, elektronik, yazılım, saha ve araştırma sürekli birbirine dokunur.",
    routes: [
      ["MEKANİK / BUILD", "Gövde, şasi, mekanizma, üretilebilirlik, montaj ve saha dayanımı."],
      ["ELEKTRONİK / EMBEDDED", "PCB, MCU, sensör, aktüatör, güç, kablolama ve donanım doğrulama."],
      ["YAZILIM / AUTONOMY", "Runtime, navigasyon, karar verme, simülasyon, haberleşme ve araç servisleri."],
      ["SAHA / OPS", "Telemetri, yer istasyonu, test planı, görev takibi ve saha operasyon disiplini."],
      ["RESEARCH", "Ön tasarım, deney, ölçüm, teknik rapor, teknoloji doğrulama ve bilgi üretimi."],
    ],
    pathTitle: "İlk görevden gerçek sorumluluğa.",
    path: [
      ["01", "Gözlemle", "Takımı, araçları ve teknik dili tanırsın."],
      ["02", "Küçük bir görev al", "Sınırı net, ölçülebilir ve gerçek bir işe dokunursun."],
      ["03", "Üret ve doğrula", "Kod, parça, kart veya analiz yalnızca yapılmaz; test edilir."],
      ["04", "Entegre ol", "Kendi işinin başka ekiplerin sistemlerine nasıl bağlandığını öğrenirsin."],
      ["05", "Sahiplen", "Bir alt sistemin kararlarını, testini ve dokümantasyonunu taşırsın."],
      ["06", "Devret", "Bilgiyi senden sonra gelen öğrencinin başlayabileceği hale getirirsin."],
    ],
    whatWeValue: "Neye bakıyoruz?",
    values: [
      ["Merak", "Bilmediğini saklamak yerine sorabilmek."],
      ["Sorumluluk", "Aldığın işi takip edip sonucunu sahiplenmek."],
      ["Takım oyunu", "Mekanik, elektronik ve yazılımın tek başına kazanmadığını bilmek."],
      ["Doğrulama", "“Çalışıyor” demeden önce ölçmek."],
      ["Paylaşım", "Bilgiyi kişisel hafıza yerine takım hafızasına bırakmak."],
    ],
    status: "KATILIM DURUMU",
    statusTitle: "Açık roller ve başvuru dönemleri burada yayınlanacak.",
    statusText:
      "Şu anda bu sayfa CORE'un katılım kültürünü ve çalışma biçimini anlatıyor. Aktif ekip ihtiyaçları, rol açıklamaları ve başvuru bağlantıları netleştiğinde aynı sayfadan duyurulacak.",
    teamsCta: "Takımları incele",
  },
  en: {
    eyebrow: "JOIN / STUDENT PATH",
    title: "Bring your curiosity. We build the rest together.",
    lead:
      "Joining CORE is not applying for a corporate job. You learn as a student, begin with a small responsibility, connect what you build with other systems and gradually take ownership of a real subsystem.",
    routesTitle: "Where can you find your place inside CORE?",
    routesLead:
      "What you are curious about matters more than your department label. Mechanics, electronics, software, field work and research constantly overlap.",
    routes: [
      ["MECHANICS / BUILD", "Structures, chassis, mechanisms, manufacturability, assembly and field durability."],
      ["ELECTRONICS / EMBEDDED", "PCBs, MCUs, sensors, actuators, power, wiring and hardware validation."],
      ["SOFTWARE / AUTONOMY", "Runtime, navigation, decision making, simulation, communications and vehicle services."],
      ["FIELD / OPS", "Telemetry, ground stations, test plans, mission tracking and field operations discipline."],
      ["RESEARCH", "Preliminary design, experiment, measurement, technical reports and technology validation."],
    ],
    pathTitle: "From the first task to real ownership.",
    path: [
      ["01", "Observe", "Learn the team, platforms and technical language."],
      ["02", "Take a small task", "Touch a real, measurable problem with a clear boundary."],
      ["03", "Build and validate", "Code, parts, boards or analysis are not only made; they are tested."],
      ["04", "Integrate", "Learn how your work connects to the systems built by other teams."],
      ["05", "Own", "Carry the decisions, testing and documentation of a subsystem."],
      ["06", "Hand over", "Leave knowledge in a form the next student can continue from."],
    ],
    whatWeValue: "What do we value?",
    values: [
      ["Curiosity", "Ask when you do not know instead of hiding it."],
      ["Ownership", "Follow the work you take and own its outcome."],
      ["Teamwork", "Know that mechanics, electronics and software do not win alone."],
      ["Validation", "Measure before saying “it works”."],
      ["Sharing", "Leave knowledge in team memory instead of personal memory."],
    ],
    status: "JOIN STATUS",
    statusTitle: "Open roles and application periods will be published here.",
    statusText:
      "For now, this page explains how participation and learning work inside CORE. When active team needs, role descriptions and application links are ready, they will be announced here.",
    teamsCta: "Explore the teams",
  },
} as const;

export default async function JoinPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const c = copy[locale];

  return (
    <PublicChrome locale={locale}>
      <PublicPageHero
        code="05"
        eyebrow={c.eyebrow}
        title={c.title}
        lead={c.lead}
      />

      <section className="joinRouteSection">
        <div className="sectionHeading" data-reveal>
          <div>
            <p className="eyebrow">FIND YOUR EDGE</p>
            <h2>{c.routesTitle}</h2>
          </div>
          <p>{c.routesLead}</p>
        </div>

        <div className="joinRouteGrid">
          {c.routes.map(([title, text], index) => (
            <article data-reveal data-tilt key={title}>
              <span>{String(index + 1).padStart(2, "0")}</span>
              <h3>{title}</h3>
              <p>{text}</p>
              <small>STUDENT-LED</small>
            </article>
          ))}
        </div>
      </section>

      <section className="joinPathSection">
        <div className="joinPathIntro" data-reveal>
          <p className="eyebrow">GROW INSIDE CORE</p>
          <h2>{c.pathTitle}</h2>
        </div>
        <div className="joinPathTimeline">
          {c.path.map(([n, title, text]) => (
            <article data-reveal key={n}>
              <span>{n}</span>
              <div>
                <h3>{title}</h3>
                <p>{text}</p>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="joinValuesSection">
        <div data-reveal>
          <p className="eyebrow">CORE CULTURE</p>
          <h2>{c.whatWeValue}</h2>
        </div>
        <div className="joinValueCards">
          {c.values.map(([title, text]) => (
            <article data-reveal key={title}>
              <b>{title}</b>
              <p>{text}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="joinStatusSection">
        <div className="joinStatusStamp" aria-hidden="true">
          <span>YTÜ</span>
          <b>CORE</b>
          <small>STUDENT TEAM</small>
        </div>
        <div data-reveal>
          <p className="eyebrow">{c.status}</p>
          <h2>{c.statusTitle}</h2>
          <p>{c.statusText}</p>
          <a className="primaryButton" href={`/${locale}/teams`}>
            {c.teamsCta} →
          </a>
        </div>
      </section>
    </PublicChrome>
  );
}
