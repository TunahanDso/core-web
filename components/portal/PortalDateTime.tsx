/** Preserve the stored wall-clock time; do not reinterpret timezone-less form values. */
export default function PortalDateTime({ value, fallback = "—" }: { value: unknown; fallback?: string }) {
  const raw = String(value || "");
  const parts = /^(\d{4})-(\d{2})-(\d{2})(?:[T ](\d{2}:\d{2}))?/.exec(raw);
  if (!parts) return <>{raw || fallback}</>;
  return <time className="portalDateTime" dateTime={raw.replace(" ", "T")}>
    <span>{parts[3]}.{parts[2]}.{parts[1]}</span>{parts[4] ? <> <span>{parts[4]}</span></> : null}
  </time>;
}
