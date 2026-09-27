const modules = [
  ["Content", "TR/EN pages, announcements and institutional copy"],
  ["Projects", "Products, owners, integrations, status and completion percentage"],
  ["Competitions", "Target competitions, official dates, locations and planning state"],
  ["Publications", "Research reports, papers and technical releases"],
  ["Media", "Images, project media, documents and public assets"],
  ["Team", "Domain teams, shared service units and public profiles"],
  ["Operations", "Read-only public status and approved telemetry exposure"],
  ["Settings", "Homepage, navigation, SEO, language and publication settings"],
];

export default function Admin() {
  return (
    <main className="admin">
      <p className="eyebrow">CORE CONTROL · PUBLIC CMS</p>
      <h1>Site Administration</h1>
      <p>
        This surface manages the public YTÜ CORE website. Project completion,
        bilingual content, competition targets and public status will be editable
        here once D1 and authentication are connected. CORE Ops vehicle command
        authority remains a separate security domain.
      </p>

      <div className="adminGrid">
        {modules.map(([name, description]) => (
          <section className="adminCard" key={name}>
            <span>MODULE</span>
            <h2>{name}</h2>
            <p>{description}</p>
            <small>SCHEMA READY · UI PENDING</small>
          </section>
        ))}
      </div>

      <div className="terminal">
        <span>SECURITY BOUNDARY</span>
        <b>Closed until authentication is configured</b>
        <small>CLOUDFLARE ACCESS + CORE ROLE AUTHORIZATION + AUDIT LOG</small>
      </div>

      <a href="/">← Return to public site</a>
    </main>
  );
}
