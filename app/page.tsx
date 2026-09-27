const domains = [
  ["Marine","Autonomous surface systems"],["Subsea","AUV & ROV systems"],["Land","UGV & rover systems"],["Air","Autonomous aerial systems"],["Industrial","AMR & industrial autonomy"],["Space","Satellites, payloads & ground segment"],["Rocket","High-altitude & propulsion systems"]
];
export default function Home(){return <main>
<header><a className="brand" href="/">YTÜ <b>CORE</b></a><nav><a href="#domains">Domains</a><a href="#research">Research</a><a href="#projects">Projects</a><a href="#contact">Contact</a></nav></header>
<section className="hero"><p className="eyebrow">YILDIZ TECHNICAL UNIVERSITY · AUTONOMOUS SYSTEMS</p><h1>Engineering systems<br/>that move <em>autonomously.</em></h1><p className="lead">CORE is an engineering initiative built around autonomous vehicles, shared systems infrastructure, field operations and research.</p><div className="actions"><a href="#domains">Explore CORE</a><a className="ghost" href="#projects">View projects →</a></div></section>
<section id="domains"><p className="eyebrow">ENGINEERING DOMAINS</p><h2>One CORE. Multiple environments.</h2><div className="grid">{domains.map(([n,d],i)=><article key={n}><span>0{i+1}</span><h3>CORE {n}</h3><p>{d}</p></article>)}</div></section>
<section id="research" className="split"><div><p className="eyebrow">CORE RESEARCH</p><h2>Before hardware,<br/>there is knowledge.</h2></div><p>Research is not a vehicle team. It develops reports, publications, patents, experiments and preliminary designs that strengthen every CORE domain.</p></section>
<section id="projects"><p className="eyebrow">PROJECTS & OPERATIONS</p><h2>Built for a living engineering organization.</h2><p className="lead">Project pages, publications and approved live vehicle data will grow here as CORE systems come online.</p><div className="terminal"><span>CORE NETWORK</span><b>Infrastructure initializing</b><small>PUBLIC OPERATIONS · COMING ONLINE</small></div></section>
<footer id="contact"><b>YTÜ CORE</b><span>Autonomous Systems · Engineering · Research</span><span>© 2026</span></footer>
</main>}
