"use client";

import { useEffect, useMemo, useRef, useState } from "react";

type Vec3 = [number, number, number];
type Edge = [number, number];
type Triangle = [number, number, number];
type Model = { vertices: Vec3[]; edges: Edge[]; triangles: Triangle[] };
function parseModelInWorker(
  ext:string,
  payload:{text?:string;buffer?:ArrayBuffer}
):Promise<Model>{
  if(typeof Worker==="undefined") return Promise.reject(new Error("Web Worker desteği gerekli."));
  return new Promise<Model>((resolve,reject)=>{
    const worker=new Worker("/workers/model-parser.js");
    const cleanup=()=>worker.terminate();
    worker.onmessage=(event:MessageEvent<{ok:boolean;model?:Model;error?:string}>)=>{
      cleanup();
      if(!event.data?.ok||!event.data.model){
        reject(new Error(event.data?.error||"Model worker parse failed."));
        return;
      }
      resolve(event.data.model);
    };
    worker.onerror=(event)=>{
      cleanup();
      reject(new Error(event.message||"Model worker error."));
    };
    if(payload.buffer){
      worker.postMessage({ext,buffer:payload.buffer},[payload.buffer]);
    }else{
      worker.postMessage({ext,text:payload.text||""});
    }
  });
}

function extFromName(name: string) {
  return name.toLowerCase().split(".").pop() || "";
}

function bounds(model: Model) {
  let minX=Infinity,minY=Infinity,minZ=Infinity,maxX=-Infinity,maxY=-Infinity,maxZ=-Infinity;
  for (const [x,y,z] of model.vertices) {
    minX=Math.min(minX,x); minY=Math.min(minY,y); minZ=Math.min(minZ,z);
    maxX=Math.max(maxX,x); maxY=Math.max(maxY,y); maxZ=Math.max(maxZ,z);
  }
  return {
    minX,minY,minZ,maxX,maxY,maxZ,
    sizeX:maxX-minX,sizeY:maxY-minY,sizeZ:maxZ-minZ,
    cx:(minX+maxX)/2,cy:(minY+maxY)/2,cz:(minZ+maxZ)/2,
    span:Math.max(maxX-minX,maxY-minY,maxZ-minZ,1e-6),
  };
}

function compact(value: number) {
  if (!Number.isFinite(value)) return "—";
  const abs=Math.abs(value);
  if(abs>=1000) return value.toFixed(0);
  if(abs>=100) return value.toFixed(1);
  if(abs>=1) return value.toFixed(2);
  return value.toPrecision(3);
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
  const [error,setError] = useState("");
  const [busy,setBusy] = useState(true);
  const [mode,setMode] = useState<"rotate" | "pan">("rotate");
  const [renderMode,setRenderMode] = useState<"solid" | "wire">("solid");
  const [projection,setProjection] = useState<"ortho" | "perspective">("ortho");
  const [axes,setAxes] = useState(true);
  const [camera,setCamera] = useState({ rx:-0.35, ry:0.55, zoom:1, px:0, py:0 });
  const [stats,setStats] = useState({ vertices:0, triangles:0, edges:0, sizeX:0, sizeY:0, sizeZ:0 });

  useEffect(() => {
    let cancelled=false;
    setBusy(true);
    setError("");
    fetch(src,{credentials:"same-origin",cache:"no-store"})
      .then(async(response)=>{
        if(!response.ok) throw new Error(`Model alınamadı (${response.status}).`);
        const ext=extFromName(filename);
        if(ext==="obj"||ext==="gltf") return parseModelInWorker(ext,{text:await response.text()});
        if(ext==="stl"||ext==="glb") return parseModelInWorker(ext,{buffer:await response.arrayBuffer()});
        throw new Error("Doğrudan viewer STL, OBJ, GLB ve embedded glTF destekliyor; ağır CAD formatları converter türevi ister.");
      })
      .then((model)=>{
        if(cancelled) return;
        if(!model.vertices.length) throw new Error("Model geometrisi okunamadı.");
        modelRef.current=model;
        const b=bounds(model);
        setStats({
          vertices:model.vertices.length,
          triangles:model.triangles.length,
          edges:model.edges.length,
          sizeX:b.sizeX,sizeY:b.sizeY,sizeZ:b.sizeZ,
        });
        setBusy(false);
      })
      .catch((reason)=>{
        if(!cancelled){
          setError(reason instanceof Error?reason.message:"Model önizlenemedi.");
          setBusy(false);
        }
      });
    return()=>{cancelled=true;};
  },[src,filename]);

  const statLabel=useMemo(()=>(
    `${stats.vertices.toLocaleString("tr-TR")} vertex · ${stats.triangles.toLocaleString("tr-TR")} triangle · ${stats.edges.toLocaleString("tr-TR")} edge`
  ),[stats]);

  useEffect(() => {
    const canvas=canvasRef.current;
    const model=modelRef.current;
    if(!canvas||!model||busy||error) return;

    const rect=canvas.getBoundingClientRect();
    const dpr=Math.min(window.devicePixelRatio||1,2);
    const width=Math.max(320,Math.floor(rect.width));
    const height=Math.max(300,Math.floor(rect.height));
    canvas.width=Math.floor(width*dpr);
    canvas.height=Math.floor(height*dpr);
    const ctx=canvas.getContext("2d");
    if(!ctx) return;
    ctx.setTransform(dpr,0,0,dpr,0,0);
    ctx.clearRect(0,0,width,height);
    ctx.fillStyle="#f8f9f6";
    ctx.fillRect(0,0,width,height);

    const b=bounds(model);
    const baseScale=(Math.min(width,height)*0.39/b.span)*camera.zoom;
    const cosX=Math.cos(camera.rx),sinX=Math.sin(camera.rx);
    const cosY=Math.cos(camera.ry),sinY=Math.sin(camera.ry);

    const transformed=model.vertices.map(([x0,y0,z0])=>{
      const x=x0-b.cx,y=y0-b.cy,z=z0-b.cz;
      const x1=x*cosY+z*sinY;
      const z1=-x*sinY+z*cosY;
      const y1=y*cosX-z1*sinX;
      const z2=y*sinX+z1*cosX;
      return [x1,y1,z2] as Vec3;
    });

    const projected=transformed.map(([x,y,z])=>{
      const perspective=projection==="perspective"
        ? Math.max(.35,1/(1+z/b.span*.55))
        : 1;
      return [
        width/2+x*baseScale*perspective+camera.px,
        height/2-y*baseScale*perspective+camera.py,
        z,
      ] as [number,number,number];
    });

    if(axes){
      ctx.strokeStyle="rgba(90,96,101,.18)";
      ctx.lineWidth=1;
      ctx.beginPath();
      ctx.moveTo(0,height/2+camera.py);ctx.lineTo(width,height/2+camera.py);
      ctx.moveTo(width/2+camera.px,0);ctx.lineTo(width/2+camera.px,height);
      ctx.stroke();
      ctx.fillStyle="#8d9499";
      ctx.font="10px ui-monospace,monospace";
      ctx.fillText("X",width-18,height/2+camera.py-7);
      ctx.fillText("Y",width/2+camera.px+8,15);
    }

    if(renderMode==="solid"&&model.triangles.length){
      const sorted=model.triangles
        .slice(0,80000)
        .map((triangle)=>({
          triangle,
          depth:(projected[triangle[0]][2]+projected[triangle[1]][2]+projected[triangle[2]][2])/3,
        }))
        .sort((a,b2)=>a.depth-b2.depth);

      for(const {triangle} of sorted){
        const p0=projected[triangle[0]],p1=projected[triangle[1]],p2=projected[triangle[2]];
        if(!p0||!p1||!p2) continue;
        const ux=p1[0]-p0[0],uy=p1[1]-p0[1];
        const vx=p2[0]-p0[0],vy=p2[1]-p0[1];
        const signed=ux*vy-uy*vx;
        const alpha=Math.max(.11,Math.min(.42,.18+Math.abs(signed)/(width*height)*18));
        ctx.beginPath();
        ctx.moveTo(p0[0],p0[1]);ctx.lineTo(p1[0],p1[1]);ctx.lineTo(p2[0],p2[1]);ctx.closePath();
        ctx.fillStyle=`rgba(55,61,66,${alpha})`;
        ctx.fill();
      }
    }

    ctx.lineWidth=renderMode==="wire"?1.05:.65;
    ctx.strokeStyle=renderMode==="wire"?"rgba(27,31,35,.62)":"rgba(27,31,35,.30)";
    ctx.beginPath();
    const maxEdges=Math.min(model.edges.length,100000);
    for(let i=0;i<maxEdges;i+=1){
      const [a,b2]=model.edges[i];
      const pa=projected[a],pb=projected[b2];
      if(!pa||!pb) continue;
      ctx.moveTo(pa[0],pa[1]);ctx.lineTo(pb[0],pb[1]);
    }
    ctx.stroke();

    ctx.strokeStyle="rgba(255,101,0,.72)";
    ctx.lineWidth=1.5;
    ctx.strokeRect(10.5,10.5,width-21,height-21);
  },[camera,busy,error,renderMode,projection,axes]);

  function reset(){
    setCamera({rx:-0.35,ry:0.55,zoom:1,px:0,py:0});
  }

  return (
    <section className="vaultModelViewer advanced">
      <header>
        <div>
          <span>3B ENGINEERING VIEWER</span>
          <b>{filename}</b>
          <small>{statLabel}</small>
        </div>
        <div className="vaultViewerTools">
          <button type="button" className={mode==="rotate"?"active":""} onClick={()=>setMode("rotate")}>ORBIT</button>
          <button type="button" className={mode==="pan"?"active":""} onClick={()=>setMode("pan")}>PAN</button>
          <button type="button" className={renderMode==="solid"?"active":""} onClick={()=>setRenderMode("solid")}>SOLID</button>
          <button type="button" className={renderMode==="wire"?"active":""} onClick={()=>setRenderMode("wire")}>WIRE</button>
          <button type="button" className={projection==="perspective"?"active":""} onClick={()=>setProjection((value)=>value==="ortho"?"perspective":"ortho")}>{projection==="ortho"?"ORTHO":"PERSP"}</button>
          <button type="button" className={axes?"active":""} onClick={()=>setAxes((value)=>!value)}>AXIS</button>
          <button type="button" onClick={reset}>FIT</button>
        </div>
      </header>

      <div className="vaultModelStats">
        <div><span>X</span><b>{compact(stats.sizeX)}</b></div>
        <div><span>Y</span><b>{compact(stats.sizeY)}</b></div>
        <div><span>Z</span><b>{compact(stats.sizeZ)}</b></div>
        <div><span>TRI</span><b>{stats.triangles.toLocaleString("tr-TR")}</b></div>
      </div>

      <div className="vaultModelCanvas">
        <canvas
          ref={canvasRef}
          onPointerDown={(event)=>{
            event.currentTarget.setPointerCapture(event.pointerId);
            dragRef.current={x:event.clientX,y:event.clientY};
          }}
          onPointerUp={()=>{dragRef.current=null;}}
          onPointerCancel={()=>{dragRef.current=null;}}
          onPointerMove={(event)=>{
            if(!dragRef.current) return;
            const dx=event.clientX-dragRef.current.x;
            const dy=event.clientY-dragRef.current.y;
            dragRef.current={x:event.clientX,y:event.clientY};
            setCamera((value)=>mode==="rotate"
              ? {...value,ry:value.ry+dx*.009,rx:value.rx+dy*.009}
              : {...value,px:value.px+dx,py:value.py+dy});
          }}
          onWheel={(event)=>{
            event.preventDefault();
            setCamera((value)=>({...value,zoom:Math.min(9,Math.max(.12,value.zoom*(event.deltaY>0?.9:1.1)))}));
          }}
        />
        {busy?<div className="vaultViewerOverlay">MODEL HAZIRLANIYOR…</div>:null}
        {error?<div className="vaultViewerOverlay error">{error}</div>:null}
      </div>
      <footer>Orbit / pan / zoom · solid + wireframe · ortho / perspective · STL / OBJ / GLB / embedded glTF · ölçüler model birimindedir</footer>
    </section>
  );
}
