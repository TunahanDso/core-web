"use client";

import { useEffect, useRef, useState } from "react";

type Vec3 = [number, number, number];
type Edge = [number, number];
type Model = { vertices: Vec3[]; edges: Edge[] };

function parseObj(text: string): Model {
  const vertices: Vec3[] = [];
  const edges: Edge[] = [];
  const seen = new Set<string>();

  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (line.startsWith("v ")) {
      const parts = line.split(/\s+/);
      const x = Number(parts[1]), y = Number(parts[2]), z = Number(parts[3]);
      if ([x,y,z].every(Number.isFinite)) vertices.push([x,y,z]);
    } else if (line.startsWith("f ")) {
      const face = line.split(/\s+/).slice(1)
        .map((token) => Number(token.split("/")[0]))
        .filter(Number.isFinite)
        .map((index) => index < 0 ? vertices.length + index : index - 1)
        .filter((index) => index >= 0 && index < vertices.length);
      for (let i = 0; i < face.length; i += 1) {
        const a = face[i];
        const b = face[(i + 1) % face.length];
        const key = a < b ? `${a}:${b}` : `${b}:${a}`;
        if (!seen.has(key)) {
          seen.add(key);
          edges.push([a,b]);
        }
      }
    }
  }
  return { vertices, edges };
}

function parseStl(buffer: ArrayBuffer): Model {
  const view = new DataView(buffer);
  const vertices: Vec3[] = [];
  const edges: Edge[] = [];

  const binaryCount = buffer.byteLength >= 84 ? view.getUint32(80, true) : 0;
  const looksBinary = binaryCount > 0 && 84 + binaryCount * 50 <= buffer.byteLength;

  if (looksBinary) {
    const maxTriangles = Math.min(binaryCount, 16000);
    let offset = 84;
    for (let tri = 0; tri < maxTriangles; tri += 1) {
      offset += 12; // normal
      const base = vertices.length;
      for (let i = 0; i < 3; i += 1) {
        vertices.push([
          view.getFloat32(offset, true),
          view.getFloat32(offset + 4, true),
          view.getFloat32(offset + 8, true),
        ]);
        offset += 12;
      }
      edges.push([base,base + 1],[base + 1,base + 2],[base + 2,base]);
      offset += 2;
    }
    return { vertices, edges };
  }

  const text = new TextDecoder().decode(buffer);
  const matches = [...text.matchAll(/vertex\s+([-+\deE.]+)\s+([-+\deE.]+)\s+([-+\deE.]+)/gi)];
  const usable = matches.slice(0, 48000);
  for (let i = 0; i + 2 < usable.length; i += 3) {
    const base = vertices.length;
    for (let j = 0; j < 3; j += 1) {
      const match = usable[i + j];
      vertices.push([Number(match[1]),Number(match[2]),Number(match[3])]);
    }
    edges.push([base,base + 1],[base + 1,base + 2],[base + 2,base]);
  }
  return { vertices, edges };
}

function extFromName(name: string) {
  return name.toLowerCase().split(".").pop() || "";
}

export default function VaultModelViewer({
  src,
  filename,
}: {
  src: string;
  filename: string;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const modelRef = useRef<Model | null>(null);
  const dragRef = useRef<{ x: number; y: number } | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(true);
  const [mode, setMode] = useState<"rotate" | "pan">("rotate");
  const [camera, setCamera] = useState({ rx: -0.35, ry: 0.55, zoom: 1, px: 0, py: 0 });

  useEffect(() => {
    let cancelled = false;
    setBusy(true);
    setError("");

    fetch(src, { credentials: "same-origin", cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) throw new Error(`Model alınamadı (${response.status}).`);
        const ext = extFromName(filename);
        if (ext === "obj") return parseObj(await response.text());
        if (ext === "stl") return parseStl(await response.arrayBuffer());
        throw new Error("Bu ilk 3B görüntüleyici STL ve OBJ destekliyor.");
      })
      .then((model) => {
        if (cancelled) return;
        if (!model.vertices.length || !model.edges.length) throw new Error("Model geometrisi okunamadı.");
        modelRef.current = model;
        setBusy(false);
      })
      .catch((reason) => {
        if (!cancelled) {
          setError(reason instanceof Error ? reason.message : "Model önizlenemedi.");
          setBusy(false);
        }
      });

    return () => { cancelled = true; };
  }, [src, filename]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const model = modelRef.current;
    if (!canvas || !model || busy || error) return;

    const rect = canvas.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const width = Math.max(320, Math.floor(rect.width));
    const height = Math.max(280, Math.floor(rect.height));
    canvas.width = Math.floor(width * dpr);
    canvas.height = Math.floor(height * dpr);

    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.setTransform(dpr,0,0,dpr,0,0);
    ctx.clearRect(0,0,width,height);

    const verts = model.vertices;
    let minX=Infinity,minY=Infinity,minZ=Infinity,maxX=-Infinity,maxY=-Infinity,maxZ=-Infinity;
    for (const [x,y,z] of verts) {
      minX=Math.min(minX,x); minY=Math.min(minY,y); minZ=Math.min(minZ,z);
      maxX=Math.max(maxX,x); maxY=Math.max(maxY,y); maxZ=Math.max(maxZ,z);
    }
    const cx=(minX+maxX)/2, cy=(minY+maxY)/2, cz=(minZ+maxZ)/2;
    const span=Math.max(maxX-minX,maxY-minY,maxZ-minZ,1e-6);
    const scale=(Math.min(width,height)*0.39/span)*camera.zoom;
    const cosX=Math.cos(camera.rx), sinX=Math.sin(camera.rx);
    const cosY=Math.cos(camera.ry), sinY=Math.sin(camera.ry);

    const projected = verts.map(([x0,y0,z0]) => {
      const x=x0-cx, y=y0-cy, z=z0-cz;
      const x1=x*cosY + z*sinY;
      const z1=-x*sinY + z*cosY;
      const y1=y*cosX - z1*sinX;
      return [
        width/2 + x1*scale + camera.px,
        height/2 - y1*scale + camera.py,
      ] as [number,number];
    });

    ctx.lineWidth=1;
    ctx.strokeStyle="rgba(30,35,40,.55)";
    ctx.beginPath();
    const maxEdges=Math.min(model.edges.length, 50000);
    for(let i=0;i<maxEdges;i+=1){
      const [a,b]=model.edges[i];
      const pa=projected[a], pb=projected[b];
      if(!pa||!pb) continue;
      ctx.moveTo(pa[0],pa[1]);
      ctx.lineTo(pb[0],pb[1]);
    }
    ctx.stroke();

    ctx.strokeStyle="rgba(255,101,0,.75)";
    ctx.lineWidth=1.5;
    ctx.strokeRect(10.5,10.5,width-21,height-21);
  }, [camera, busy, error]);

  function reset() {
    setCamera({ rx: -0.35, ry: 0.55, zoom: 1, px: 0, py: 0 });
  }

  return (
    <section className="vaultModelViewer">
      <header>
        <div><span>3B ÖNİZLEME</span><b>{filename}</b></div>
        <div className="vaultViewerTools">
          <button type="button" className={mode === "rotate" ? "active" : ""} onClick={() => setMode("rotate")}>DÖNDÜR</button>
          <button type="button" className={mode === "pan" ? "active" : ""} onClick={() => setMode("pan")}>KAYDIR</button>
          <button type="button" onClick={reset}>SIĞDIR</button>
        </div>
      </header>
      <div className="vaultModelCanvas">
        <canvas
          ref={canvasRef}
          onPointerDown={(event) => {
            event.currentTarget.setPointerCapture(event.pointerId);
            dragRef.current={x:event.clientX,y:event.clientY};
          }}
          onPointerUp={() => { dragRef.current=null; }}
          onPointerCancel={() => { dragRef.current=null; }}
          onPointerMove={(event) => {
            if (!dragRef.current) return;
            const dx=event.clientX-dragRef.current.x;
            const dy=event.clientY-dragRef.current.y;
            dragRef.current={x:event.clientX,y:event.clientY};
            setCamera((value) => mode === "rotate"
              ? {...value, ry:value.ry+dx*0.009, rx:value.rx+dy*0.009}
              : {...value, px:value.px+dx, py:value.py+dy});
          }}
          onWheel={(event) => {
            event.preventDefault();
            setCamera((value) => ({
              ...value,
              zoom: Math.min(8,Math.max(.15,value.zoom*(event.deltaY > 0 ? .9 : 1.1))),
            }));
          }}
        />
        {busy ? <div className="vaultViewerOverlay">MODEL HAZIRLANIYOR…</div> : null}
        {error ? <div className="vaultViewerOverlay error">{error}</div> : null}
      </div>
      <footer>Sol sürükleme: {mode === "rotate" ? "döndür" : "kaydır"} · tekerlek: yakınlaştır/uzaklaştır · ilk sürüm STL/OBJ</footer>
    </section>
  );
}
