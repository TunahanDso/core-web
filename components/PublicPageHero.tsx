export default function PublicPageHero({
  eyebrow,
  title,
  lead,
  code,
}: {
  eyebrow: string;
  title: string;
  lead: string;
  code: string;
}) {
  return (
    <section className="innerHero">
      <div className="innerHeroGrid" aria-hidden="true" />
      <div data-reveal>
        <span className="innerHeroCode">{code}</span>
        <p className="eyebrow">{eyebrow}</p>
        <h1>{title}</h1>
        <p>{lead}</p>
      </div>
      <div className="innerHeroMark" aria-hidden="true">
        <span>CORE</span>
        <b>{code}</b>
      </div>
    </section>
  );
}
