"use client";

import { useEffect, useMemo, useRef, useState } from "react";

function languageFromExtension(extension: string) {
  const ext = extension.toLowerCase().replace(/^\./,"");
  const map: Record<string,string> = {
    ts:"TypeScript",tsx:"TypeScript / React",js:"JavaScript",jsx:"JavaScript / React",
    py:"Python",c:"C",h:"C / Header",cpp:"C++",cc:"C++",hpp:"C++ Header",
    ino:"Arduino",rs:"Rust",go:"Go",java:"Java",kt:"Kotlin",swift:"Swift",
    sh:"Shell",bash:"Shell",ps1:"PowerShell",sql:"SQL",json:"JSON",yaml:"YAML",yml:"YAML",
    xml:"XML",html:"HTML",css:"CSS",scss:"SCSS",md:"Markdown",cmake:"CMake",
    kicad_pcb:"KiCad PCB",kicad_sch:"KiCad Schematic",gbr:"Gerber",ger:"Gerber",drl:"Excellon Drill",
  };
  return map[ext] || ext.toUpperCase() || "TEXT";
}

export default function VaultCodeReader({
  source,
  filename,
  extension,
  truncated = false,
}: {
  source: string;
  filename: string;
  extension: string;
  truncated?: boolean;
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [query,setQuery] = useState("");
  const [wrap,setWrap] = useState(false);
  const [copied,setCopied] = useState(false);
  const [lineTarget,setLineTarget] = useState("");
  const [expanded,setExpanded] = useState(false);

  useEffect(() => {
    if (!expanded) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setExpanded(false);
    };
    window.addEventListener("keydown",onKeyDown);
    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener("keydown",onKeyDown);
    };
  },[expanded]);

  const lines = useMemo(() => source.split(/\r?\n/),[source]);
  const normalizedQuery = query.trim().toLocaleLowerCase("tr-TR");
  const matchLines = useMemo(() => {
    if (!normalizedQuery) return new Set<number>();
    const result = new Set<number>();
    lines.forEach((line,index) => {
      if (line.toLocaleLowerCase("tr-TR").includes(normalizedQuery)) result.add(index + 1);
    });
    return result;
  },[lines,normalizedQuery]);

  const gotoLine = () => {
    const line = Math.max(1,Math.min(lines.length,Number(lineTarget || 1)));
    const element = containerRef.current?.querySelector<HTMLElement>(`[data-line="${line}"]`);
    element?.scrollIntoView({ block:"center" });
    element?.classList.add("flash");
    window.setTimeout(() => element?.classList.remove("flash"),900);
  };

  const copyAll = async () => {
    await navigator.clipboard.writeText(source);
    setCopied(true);
    window.setTimeout(() => setCopied(false),1200);
  };

  return (
    <section className={"vaultCodeReader " + (expanded ? "expanded" : "")}>
      <header>
        <div className="vaultCodeIdentity">
          <span>{languageFromExtension(extension)}</span>
          <b>{filename}</b>
          <small>{lines.length.toLocaleString("tr-TR")} satır{truncated ? " · önizleme kesilmiş" : ""}</small>
        </div>
        <div className="vaultCodeTools">
          <label className="vaultCodeSearch">
            <span>⌕</span>
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Dosyada ara..." />
            {query ? <b>{matchLines.size}</b> : null}
          </label>
          <label className="vaultCodeGoto">
            <input value={lineTarget} onChange={(event) => setLineTarget(event.target.value.replace(/\D/g,""))} placeholder="Satır" />
            <button type="button" onClick={gotoLine}>GİT</button>
          </label>
          <button type="button" className={wrap ? "active" : ""} onClick={() => setWrap((value) => !value)}>SATIR SAR</button>
          <button type="button" onClick={() => void copyAll()}>{copied ? "KOPYALANDI" : "KOPYALA"}</button>
          <button type="button" className={expanded ? "active" : ""} onClick={() => setExpanded((value) => !value)}>{expanded ? "KAPAT" : "TAM EKRAN"}</button>
        </div>
      </header>

      <div className={"vaultCodeViewport " + (wrap ? "wrap" : "")} ref={containerRef}>
        <table>
          <tbody>
            {lines.map((line,index) => {
              const number = index + 1;
              const match = matchLines.has(number);
              return (
                <tr data-line={number} className={match ? "match" : ""} key={number}>
                  <td className="lineNumber">{number}</td>
                  <td className="lineSource"><code>{line || " "}</code></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <footer>
        <span>Salt okunur kaynak görünümü</span>
        <span>{normalizedQuery ? matchLines.size + " eşleşen satır" : "Ara · satıra git · satır sar · kopyala"}</span>
      </footer>
    </section>
  );
}
