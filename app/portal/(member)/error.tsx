"use client";

export default function PortalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <section className="portalEmpty" role="alert">
    <h2>Bu ekran yüklenemedi</h2>
    <p>Bağlantını kontrol edip yeniden deneyebilirsin.</p>
    <button type="button" className="portalPrimaryButton" onClick={reset}>Yeniden dene</button>
  </section>;
}
