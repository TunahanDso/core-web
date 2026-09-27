import { notFound } from "next/navigation";
import { copy, domains } from "@/lib/content";
import { isLocale, locales } from "@/lib/i18n";
export function generateStaticParams(){return locales.map(locale=>({locale}));}
export default function Home({params}:{params:{locale:string}}){if(!isLocale(params.locale))notFound();const l=params.locale,c=copy[l],d=domains[l],other=l==="tr"?"en":"tr";return <main>
<header><a className="brand" href={`/${l}`}>YTÜ <b>CORE</b></a><nav><a href="#domains">{c.nav[0]}</a><a href="#research">{c.nav[1]}</a><a href="#projects">{c.nav[2]}</a><a href="#contact">{c.nav[3]}</a><a className="lang" href={`/${other}`}>{other.toUpperCase()}</a></nav></header>
<section className="hero"><p className="eyebrow">{c.eyebrow}</p><h1>{c.title}</h1><p className="lead">{c.lead}</p><div className="actions"><a href="#domains">{c.explore}</a><a className="ghost" href="#projects">{c.projects}</a></div></section>
<section id="domains"><p className="eyebrow">ENGINEERING DOMAINS</p><h2>{c.domainsTitle}</h2><div className="grid">{d.map(([n,desc],i)=><article key={n}><span>0{i+1}</span><h3>CORE {n}</h3><p>{desc}</p></article>)}</div></section>
<section id="research" className="split"><div><p className="eyebrow">CORE RESEARCH</p><h2>{c.researchTitle}</h2></div><p>{c.researchBody}</p></section>
<section id="projects"><p className="eyebrow">{c.projectEyebrow}</p><h2>{c.projectTitle}</h2><p className="lead">{c.projectLead}</p><div className="terminal"><span>CORE NETWORK</span><b>{c.initializing}</b><small>{c.coming}</small></div></section>
<footer id="contact"><b>YTÜ CORE</b><span>{c.footer}</span><span>© 2026</span></footer></main>}
