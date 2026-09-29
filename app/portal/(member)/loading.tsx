export default function PortalLoading() {
  return <section className="portalLoading" role="status" aria-live="polite" aria-label="Sayfa yükleniyor">
    <p>Çalışma alanı yükleniyor…</p>
    <div aria-hidden="true"><span/><span/><span/></div>
  </section>;
}
