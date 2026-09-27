const modules = [
  ["Content", "Pages, announcements and institutional copy"],
  ["Projects", "Vehicles, project status and public project pages"],
  ["Publications", "Research reports, papers and technical releases"],
  ["Media", "Images, documents and public assets"],
  ["Team", "Public team profiles and roles"],
  ["Settings", "Homepage, navigation and publication settings"],
];

export default function Admin() {
  return (
    <main className="admin">
      <p className="eyebrow">CORE CONTROL · PUBLIC CMS</p>
      <h1>Site Administration</h1>
      <p>
        This administration surface will manage the public website only. CORE
        Ops, telemetry and vehicle command authority are separate systems.
      </p>

      <div className="adminGrid">
        {modules.map(([name, description]) => (
          <section className="adminCard" key={name}>
            <span>MODULE</span>
            <h2>{name}</h2>
            <p>{description}</p>
            <small>NOT CONNECTED</small>
          </section>
        ))}
      </div>

      <div className="terminal">
        <span>SECURITY BOUNDARY</span>
        <b>Closed until authentication is configured</b>
        <small>CLOUDFLARE ACCESS + CORE ROLE AUTHORIZATION</small>
      </div>

      <a href="/">← Return to public site</a>
    </main>
  );
}
