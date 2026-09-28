import { getAdminIdentity } from "@/lib/cms/auth";
import { listCompetitions } from "@/lib/cms/db";
import { cmsStatusLabel } from "@/lib/portal/labels";

export const dynamic = "force-dynamic";

const labels = {
  confirmed: "KESİNLEŞTİ",
  target: "HEDEF",
  evaluation: "DEĞERLENDİRME",
} as const;

export default async function AdminYarışmalarPage() {
  const [competitions, identity] = await Promise.all([
    listCompetitions(),
    getAdminIdentity(),
  ]);

  return (
    <main className="admin adminLight">
      <div className="adminTopline">
        <div>
          <a className="adminBreadcrumb" href="/admin">CORE CONTROL / ADMIN</a>
          <p className="eyebrow">YARIŞMALAR · CANLI D1</p>
        </div>
        <span className="cmsHealth online">
          <i />
          {identity.authenticated ? "YAZMA AÇIK" : "SALT OKUNUR"}
        </span>
      </div>

      <h1>Yarışmalar</h1>
      <p>
        Competition and field-target records are read directly from production
        D1. Dates, locations, planning state and publication status can be
        maintained here.
      </p>

      {competitions.length === 0 ? (
        <section className="emptyState">
          <span>VERİTABANI ÇEVRİMİÇİ</span>
          <h2>Henüz yarışma kaydı yok.</h2>
          <p>Admin ana ekranına dön ve vitrin seed'ini yükle.</p>
        </section>
      ) : (
        <div className="adminCompetitionList">
          {competitions.map((competition) => (
            <article className="adminCompetitionRow" key={competition.id}>
              <div className="adminCompetitionIdentity">
                <span>{competition.domain ?? "ATANMAMIŞ"}</span>
                <h2>{competition.titleTr || competition.titleEn || competition.slug}</h2>
                <small>{competition.slug}</small>
              </div>

              <div className="adminCompetitionTarget">
                <strong>{labels[competition.targetStatus]}</strong>
                <span>{competition.dateTr || "TARİH BEKLENİYOR"}</span>
              </div>

              <div className="adminCompetitionMeta">
                <span>{competition.locationTr || "Konum bekleniyor"}</span>
                <span>{cmsStatusLabel(competition.status)}</span>
                <a
                  className="adminEditLink"
                  href={`/admin/competitions/${encodeURIComponent(competition.id)}`}
                >
                  DÜZENLE →
                </a>
              </div>
            </article>
          ))}
        </div>
      )}

      <div className="terminal">
        <span>YAZMA YETKİSİ</span>
        <b>{identity.authenticated ? "Cloudflare Access JWT doğrulandı" : "Devre dışı"}</b>
        <small>HER YARIŞMA GÜNCELLEMESİ AUDIT_LOG'A KAYDEDİLİR</small>
      </div>
    </main>
  );
}
