"use client";

import { useMemo, useState } from "react";

type Point = { x: number; y: number };
type Edge = { a: Point; b: Point };
type Footprint = { name: string; at: Point; side: "front" | "back" };

function numberValue(value: string) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function parseBoard(source: string) {
  const edges: Edge[] = [];
  const footprints: Footprint[] = [];

  const lineRe = /\(gr_line[\s\S]{0,40}?\(start\s+([-+\d.]+)\s+([-+\d.]+)\)[\s\S]{0,40}?\(end\s+([-+\d.]+)\s+([-+\d.]+)\)[\s\S]{0,180}?\(layer\s+"Edge\.Cuts"\)/g;
  for (const match of source.matchAll(lineRe)) {
    edges.push({
      a: { x: numberValue(match[1]), y: numberValue(match[2]) },
      b: { x: numberValue(match[3]), y: numberValue(match[4]) },
    });
    if (edges.length > 2000) break;
  }

  const rectRe = /\(gr_rect[\s\S]{0,40}?\(start\s+([-+\d.]+)\s+([-+\d.]+)\)[\s\S]{0,40}?\(end\s+([-+\d.]+)\s+([-+\d.]+)\)[\s\S]{0,180}?\(layer\s+"Edge\.Cuts"\)/g;
  for (const match of source.matchAll(rectRe)) {
    const x1=numberValue(match[1]), y1=numberValue(match[2]);
    const x2=numberValue(match[3]), y2=numberValue(match[4]);
    edges.push(
      {a:{x:x1,y:y1},b:{x:x2,y:y1}},
      {a:{x:x2,y:y1},b:{x:x2,y:y2}},
      {a:{x:x2,y:y2},b:{x:x1,y:y2}},
      {a:{x:x1,y:y2},b:{x:x1,y:y1}},
    );
  }

  const lines = source.split(/\r?\n/);
  for (let i=0;i<lines.length;i+=1) {
    const start = lines[i].match(/^\s*\(footprint\s+"?([^"\s()]+)"?/);
    if (!start) continue;
    let side: "front" | "back" = "front";
    let at: Point | null = null;
    for (let j=i;j<Math.min(lines.length,i+35);j+=1) {
      const layer = lines[j].match(/\(layer\s+"([FB])\.(?:Cu|SilkS|Fab)"/);
      if (layer) side = layer[1] === "B" ? "back" : "front";
      const pos = lines[j].match(/\(at\s+([-+\d.]+)\s+([-+\d.]+)/);
      if (pos && !at) at = {x:numberValue(pos[1]),y:numberValue(pos[2])};
      if (at && layer) break;
    }
    if (at) footprints.push({name:start[1],at,side});
    if (footprints.length > 800) break;
  }

  const nets = (source.match(/\(net\s+\d+\s+"/g) || []).length;
  const vias = (source.match(/\(via(?:\s|\n)/g) || []).length;
  const segments = (source.match(/\(segment(?:\s|\n)/g) || []).length;

  return { edges, footprints, nets, vias, segments };
}

export default function KiCadBoardPreview({ source }: { source: string }) {
  const board = useMemo(() => parseBoard(source), [source]);
  const [front, setFront] = useState(true);
  const [back, setBack] = useState(true);
  const [outline, setOutline] = useState(true);

  const points = [
    ...board.edges.flatMap((edge) => [edge.a,edge.b]),
    ...board.footprints.map((item) => item.at),
  ];
  const minX = points.length ? Math.min(...points.map((p) => p.x)) : 0;
  const minY = points.length ? Math.min(...points.map((p) => p.y)) : 0;
  const maxX = points.length ? Math.max(...points.map((p) => p.x)) : 100;
  const maxY = points.length ? Math.max(...points.map((p) => p.y)) : 70;
  const width = Math.max(maxX-minX,1);
  const height = Math.max(maxY-minY,1);
  const pad = Math.max(width,height)*.08;

  return (
    <section className="pcbPreview">
      <header>
        <div>
          <span>KICAD BOARD ÖNİZLEME</span>
          <b>{board.footprints.length} footprint · {board.nets} net · {board.vias} via · {board.segments} segment</b>
        </div>
        <div className="pcbLayerTools">
          <button className={outline ? "active" : ""} type="button" onClick={() => setOutline((v) => !v)}>EDGE.CUTS</button>
          <button className={front ? "active" : ""} type="button" onClick={() => setFront((v) => !v)}>FRONT</button>
          <button className={back ? "active" : ""} type="button" onClick={() => setBack((v) => !v)}>BACK</button>
        </div>
      </header>
      <div className="pcbCanvas">
        <svg viewBox={`${minX-pad} ${minY-pad} ${width+pad*2} ${height+pad*2}`} role="img" aria-label="KiCad PCB geometry preview">
          {outline ? (
            <g className="pcbOutline">
              {board.edges.map((edge,index) => (
                <line key={index} x1={edge.a.x} y1={edge.a.y} x2={edge.b.x} y2={edge.b.y} />
              ))}
            </g>
          ) : null}
          <g className="pcbFootprints front">
            {front ? board.footprints.filter((item) => item.side === "front").map((item,index) => (
              <g key={"f"+index} transform={`translate(${item.at.x} ${item.at.y})`}>
                <rect x="-1.6" y="-1.2" width="3.2" height="2.4" rx=".3" />
                {index < 80 ? <title>{item.name}</title> : null}
              </g>
            )) : null}
          </g>
          <g className="pcbFootprints back">
            {back ? board.footprints.filter((item) => item.side === "back").map((item,index) => (
              <g key={"b"+index} transform={`translate(${item.at.x} ${item.at.y})`}>
                <circle r="1.45" />
                {index < 80 ? <title>{item.name}</title> : null}
              </g>
            )) : null}
          </g>
        </svg>
        {!board.edges.length && !board.footprints.length ? (
          <div className="vaultViewerOverlay">Bu KiCad dosyasında çizilebilir kart geometrisi bulunamadı.</div>
        ) : null}
      </div>
      <footer>Bu önizleme kaynak dosyayı değiştirmez; üretim için KiCad/Gerber çıktısı esas alınır.</footer>
    </section>
  );
}
