"use client";

import { useEffect, useMemo, useRef, useState } from "react";

type Point={x:number;y:number};
type Edge={a:Point;b:Point};
type Footprint={name:string;at:Point;side:"front"|"back"};
type Track={a:Point;b:Point;width:number;layer:string;net:number};
type Via={at:Point;size:number;net:number};
type Board={
  edges:Edge[];
  footprints:Footprint[];
  tracks:Track[];
  vias:Via[];
  netNames:Map<number,string>;
};

function emptyBoard():Board{
  return{edges:[],footprints:[],tracks:[],vias:[],netNames:new Map<number,string>()};
}
function n(value:string){
  const parsed=Number(value);
  return Number.isFinite(parsed)?parsed:0;
}

function parseBoard(source:string):Board{
  const edges:Edge[]=[];
  const footprints:Footprint[]=[];
  const tracks:Track[]=[];
  const vias:Via[]=[];
  const netNames=new Map<number,string>();

  for(const match of source.matchAll(/\(net\s+(\d+)\s+"([^"]*)"/g)){
    netNames.set(Number(match[1]),match[2]||("NET-"+match[1]));
    if(netNames.size>5000) break;
  }

  const lineRe=/\(gr_line[\s\S]{0,160}?\(start\s+([-+\d.]+)\s+([-+\d.]+)\)[\s\S]{0,160}?\(end\s+([-+\d.]+)\s+([-+\d.]+)\)[\s\S]{0,320}?\(layer\s+"Edge\.Cuts"\)/g;
  for(const match of source.matchAll(lineRe)){
    edges.push({a:{x:n(match[1]),y:n(match[2])},b:{x:n(match[3]),y:n(match[4])}});
    if(edges.length>=8000) break;
  }

  const rectRe=/\(gr_rect[\s\S]{0,160}?\(start\s+([-+\d.]+)\s+([-+\d.]+)\)[\s\S]{0,160}?\(end\s+([-+\d.]+)\s+([-+\d.]+)\)[\s\S]{0,320}?\(layer\s+"Edge\.Cuts"\)/g;
  for(const match of source.matchAll(rectRe)){
    const x1=n(match[1]),y1=n(match[2]),x2=n(match[3]),y2=n(match[4]);
    edges.push(
      {a:{x:x1,y:y1},b:{x:x2,y:y1}},
      {a:{x:x2,y:y1},b:{x:x2,y:y2}},
      {a:{x:x2,y:y2},b:{x:x1,y:y2}},
      {a:{x:x1,y:y2},b:{x:x1,y:y1}},
    );
    if(edges.length>=8000) break;
  }

  const segmentRe=/\(segment[\s\S]{0,120}?\(start\s+([-+\d.]+)\s+([-+\d.]+)\)[\s\S]{0,120}?\(end\s+([-+\d.]+)\s+([-+\d.]+)\)[\s\S]{0,120}?\(width\s+([-+\d.]+)\)[\s\S]{0,160}?\(layer\s+"([^"]+)"\)[\s\S]{0,160}?\(net\s+(\d+)\)/g;
  for(const match of source.matchAll(segmentRe)){
    tracks.push({
      a:{x:n(match[1]),y:n(match[2])},
      b:{x:n(match[3]),y:n(match[4])},
      width:n(match[5]),
      layer:match[6],
      net:Number(match[7]),
    });
    if(tracks.length>=60000) break;
  }

  const viaRe=/\(via[\s\S]{0,120}?\(at\s+([-+\d.]+)\s+([-+\d.]+)\)[\s\S]{0,120}?\(size\s+([-+\d.]+)\)[\s\S]{0,300}?\(net\s+(\d+)\)/g;
  for(const match of source.matchAll(viaRe)){
    vias.push({at:{x:n(match[1]),y:n(match[2])},size:n(match[3]),net:Number(match[4])});
    if(vias.length>=20000) break;
  }

  const lines=source.split(/\r?\n/);
  for(let i=0;i<lines.length;i+=1){
    const start=lines[i].match(/^\s*\(footprint\s+"?([^"\s()]+)"?/);
    if(!start) continue;
    let side:"front"|"back"="front";
    let at:Point|null=null;
    for(let j=i;j<Math.min(lines.length,i+90);j+=1){
      const layer=lines[j].match(/\(layer\s+"([FB])\.(?:Cu|SilkS|Fab)"/);
      if(layer) side=layer[1]==="B"?"back":"front";
      const pos=lines[j].match(/\(at\s+([-+\d.]+)\s+([-+\d.]+)/);
      if(pos&&!at) at={x:n(pos[1]),y:n(pos[2])};
      if(at&&layer) break;
    }
    if(at) footprints.push({name:start[1],at,side});
    if(footprints.length>=4000) break;
  }

  return{edges,footprints,tracks,vias,netNames};
}

function bounds(board:Board){
  let minX=Number.POSITIVE_INFINITY;
  let minY=Number.POSITIVE_INFINITY;
  let maxX=Number.NEGATIVE_INFINITY;
  let maxY=Number.NEGATIVE_INFINITY;
  let count=0;
  const take=(point:Point)=>{
    if(!Number.isFinite(point.x)||!Number.isFinite(point.y)) return;
    minX=Math.min(minX,point.x);
    minY=Math.min(minY,point.y);
    maxX=Math.max(maxX,point.x);
    maxY=Math.max(maxY,point.y);
    count+=1;
  };
  for(const edge of board.edges){take(edge.a);take(edge.b);}
  for(const item of board.footprints) take(item.at);
  for(const track of board.tracks){take(track.a);take(track.b);}
  for(const via of board.vias) take(via.at);
  if(!count) return{minX:0,minY:0,maxX:100,maxY:70,count:0};
  return{minX,minY,maxX,maxY,count};
}

function humanBytes(bytes:number){
  if(bytes<1024) return bytes+" B";
  if(bytes<1024*1024) return (bytes/1024).toFixed(1)+" KB";
  return (bytes/(1024*1024)).toFixed(1)+" MB";
}

export default function KiCadBoardPreview({
  source,
  src,
  filename="KiCad PCB",
  sizeBytes=0,
}:{
  source?:string;
  src?:string;
  filename?:string;
  sizeBytes?:number;
}){
  const [board,setBoard]=useState<Board>(()=>source?parseBoard(source):emptyBoard());
  const [phase,setPhase]=useState<"loading"|"parsing"|"ready"|"error">(source?"ready":"loading");
  const [loadBytes,setLoadBytes]=useState(source?new TextEncoder().encode(source).byteLength:0);
  const [error,setError]=useState("");
  const drag=useRef<{x:number;y:number;cx:number;cy:number}|null>(null);
  const [front,setFront]=useState(true);
  const [back,setBack]=useState(true);
  const [outline,setOutline]=useState(true);
  const [frontTracks,setFrontTracks]=useState(true);
  const [backTracks,setBackTracks]=useState(true);
  const [showVias,setShowVias]=useState(true);
  const [selectedNet,setSelectedNet]=useState<number|null>(null);
  const [zoom,setZoom]=useState(1);
  const [pan,setPan]=useState({x:0,y:0});

  useEffect(()=>{
    if(source){
      setBoard(parseBoard(source));
      setPhase("ready");
      setLoadBytes(new TextEncoder().encode(source).byteLength);
      return;
    }
    if(!src){
      setPhase("error");
      setError("PCB kaynağı belirtilmedi.");
      return;
    }

    const controller=new AbortController();
    let alive=true;
    void (async()=>{
      try{
        setPhase("loading");
        setError("");
        setLoadBytes(0);
        const response=await fetch(src,{
          signal:controller.signal,
          headers:{Accept:"application/octet-stream,text/plain,*/*"},
        });
        if(!response.ok) throw new Error("PCB kaynağı HTTP "+response.status+" ile açılamadı.");

        const reader=response.body?.getReader();
        if(!reader){
          const text=await response.text();
          if(!alive) return;
          setLoadBytes(new TextEncoder().encode(text).byteLength);
          setPhase("parsing");
          await new Promise<void>((resolve)=>requestAnimationFrame(()=>resolve()));
          if(!alive) return;
          setBoard(parseBoard(text));
          setPhase("ready");
          return;
        }

        const chunks:Uint8Array[]=[];
        let total=0;
        while(true){
          const result=await reader.read();
          if(result.done) break;
          if(result.value){
            chunks.push(result.value);
            total+=result.value.byteLength;
            if(alive) setLoadBytes(total);
          }
        }
        if(!alive) return;

        const bytes=new Uint8Array(total);
        let cursor=0;
        for(const chunk of chunks){
          bytes.set(chunk,cursor);
          cursor+=chunk.byteLength;
        }
        const text=new TextDecoder("utf-8",{fatal:false}).decode(bytes);
        setPhase("parsing");
        await new Promise<void>((resolve)=>requestAnimationFrame(()=>resolve()));
        if(!alive) return;
        setBoard(parseBoard(text));
        setPhase("ready");
      }catch(loadError){
        if(controller.signal.aborted) return;
        setPhase("error");
        setError(loadError instanceof Error?loadError.message:"PCB kaynağı açılamadı.");
      }
    })();

    return()=>{
      alive=false;
      controller.abort();
    };
  },[source,src]);

  const box=useMemo(()=>bounds(board),[board]);
  const width=Math.max(box.maxX-box.minX,1);
  const height=Math.max(box.maxY-box.minY,1);
  const pad=Math.max(width,height)*.07;
  const centerX=(box.minX+box.maxX)/2+pan.x;
  const centerY=(box.minY+box.maxY)/2+pan.y;
  const viewWidth=(width+pad*2)/zoom;
  const viewHeight=(height+pad*2)/zoom;

  const nets=useMemo(
    ()=>[...board.netNames.entries()].sort((a,b)=>a[1].localeCompare(b[1])).slice(0,1000),
    [board]
  );
  const frontTrackCount=useMemo(()=>board.tracks.filter((track)=>track.layer==="F.Cu").length,[board]);
  const backTrackCount=useMemo(()=>board.tracks.filter((track)=>track.layer==="B.Cu").length,[board]);
  const visibleTracks=useMemo(()=>board.tracks.filter((track)=>{
    if(track.layer==="F.Cu"&&!frontTracks) return false;
    if(track.layer==="B.Cu"&&!backTracks) return false;
    return track.layer==="F.Cu"||track.layer==="B.Cu";
  }),[board,frontTracks,backTracks]);

  const reset=()=>{
    setZoom(1);
    setPan({x:0,y:0});
    setSelectedNet(null);
  };
  const totalBytes=sizeBytes||loadBytes;
  const loadPercent=totalBytes
    ? Math.max(0,Math.min(100,Math.round((loadBytes/totalBytes)*100)))
    : phase==="ready"?100:0;

  return(
    <section className="pcbPreview advanced largeSource">
      <header>
        <div>
          <span>KICAD PCB ENGINEERING VIEWER</span>
          <b>{filename}</b>
          <small>
            {phase==="ready"
              ? board.footprints.length+" footprint · "+board.netNames.size+" net · "+board.vias.length+" via · "+board.tracks.length+" track"
              : phase==="loading"
                ? "R2 source okunuyor · "+humanBytes(loadBytes)+(sizeBytes?" / "+humanBytes(sizeBytes):"")
                : phase==="parsing"
                  ? "KiCad geometrisi ayrıştırılıyor…"
                  : error}
          </small>
        </div>
        <div className="pcbLayerTools">
          <button className={outline?"active":""} type="button" onClick={()=>setOutline((v)=>!v)} disabled={phase!=="ready"}>EDGE</button>
          <button className={frontTracks?"active":""} type="button" onClick={()=>setFrontTracks((v)=>!v)} disabled={phase!=="ready"}>F.Cu</button>
          <button className={backTracks?"active":""} type="button" onClick={()=>setBackTracks((v)=>!v)} disabled={phase!=="ready"}>B.Cu</button>
          <button className={showVias?"active":""} type="button" onClick={()=>setShowVias((v)=>!v)} disabled={phase!=="ready"}>VIA</button>
          <button className={front?"active":""} type="button" onClick={()=>setFront((v)=>!v)} disabled={phase!=="ready"}>F.FP</button>
          <button className={back?"active":""} type="button" onClick={()=>setBack((v)=>!v)} disabled={phase!=="ready"}>B.FP</button>
          <button type="button" onClick={()=>setZoom((v)=>Math.min(10,v*1.25))} disabled={phase!=="ready"}>＋</button>
          <button type="button" onClick={()=>setZoom((v)=>Math.max(.35,v/1.25))} disabled={phase!=="ready"}>−</button>
          <button type="button" onClick={reset} disabled={phase!=="ready"}>FIT</button>
        </div>
      </header>

      {phase!=="ready"?(
        <div className="pcbLargeLoadState">
          <div>
            <span>{phase==="loading"?"R2 STREAM":phase==="parsing"?"PARSER":"VIEWER ERROR"}</span>
            <b>{phase==="error"?error:phase==="parsing"?"Kart topolojisi oluşturuluyor…":"Büyük KiCad kaynağı yükleniyor…"}</b>
            <small>{phase==="loading"?(sizeBytes?loadPercent+"% · "+humanBytes(loadBytes)+" / "+humanBytes(sizeBytes):humanBytes(loadBytes)+" okundu"):""}</small>
          </div>
          {phase!=="error"?<i><b style={{width:(phase==="parsing"?100:loadPercent)+"%"}}/></i>:null}
        </div>
      ):(
        <>
          <div className="pcbInspectorBar">
            <label>
              <span>NET HIGHLIGHT</span>
              <select value={selectedNet??""} onChange={(event)=>setSelectedNet(event.target.value?Number(event.target.value):null)}>
                <option value="">Tüm netler</option>
                {nets.map(([id,name])=><option value={id} key={id}>{id} · {name||"(unnamed)"}</option>)}
              </select>
            </label>
            <div><span>F.Cu TRACK</span><b>{frontTrackCount}</b></div>
            <div><span>B.Cu TRACK</span><b>{backTrackCount}</b></div>
            <div><span>VIA</span><b>{board.vias.length}</b></div>
            <div><span>FOOTPRINT</span><b>{board.footprints.length}</b></div>
          </div>

          <div className="pcbCanvas advanced">
            <svg
              viewBox={`${centerX-viewWidth/2} ${centerY-viewHeight/2} ${viewWidth} ${viewHeight}`}
              role="img"
              aria-label="KiCad PCB interactive geometry preview"
              onWheel={(event)=>{
                event.preventDefault();
                setZoom((value)=>Math.max(.35,Math.min(10,value*(event.deltaY>0?.9:1.1))));
              }}
              onPointerDown={(event)=>{
                event.currentTarget.setPointerCapture(event.pointerId);
                drag.current={x:event.clientX,y:event.clientY,cx:pan.x,cy:pan.y};
              }}
              onPointerMove={(event)=>{
                if(!drag.current) return;
                const rect=event.currentTarget.getBoundingClientRect();
                const dx=(event.clientX-drag.current.x)/rect.width*viewWidth;
                const dy=(event.clientY-drag.current.y)/rect.height*viewHeight;
                setPan({x:drag.current.cx-dx,y:drag.current.cy-dy});
              }}
              onPointerUp={()=>{drag.current=null;}}
              onPointerCancel={()=>{drag.current=null;}}
            >
              {outline?<g className="pcbOutline">{board.edges.map((edge,index)=><line key={index} x1={edge.a.x} y1={edge.a.y} x2={edge.b.x} y2={edge.b.y}/>)}</g>:null}

              <g className="pcbTracks">
                {visibleTracks.map((track,index)=>{
                  const selected=selectedNet!==null&&track.net===selectedNet;
                  const muted=selectedNet!==null&&!selected;
                  return <line
                    key={index}
                    className={(track.layer==="F.Cu"?"front ":"back ")+(selected?"selected ":muted?"muted ":"")}
                    x1={track.a.x} y1={track.a.y} x2={track.b.x} y2={track.b.y}
                    strokeWidth={Math.max(.12,track.width)}
                  ><title>{track.layer} · net {track.net} {board.netNames.get(track.net)||""} · {track.width}mm</title></line>;
                })}
              </g>

              {showVias?<g className="pcbVias">{board.vias.map((via,index)=>{
                const selected=selectedNet!==null&&via.net===selectedNet;
                const muted=selectedNet!==null&&!selected;
                return <circle key={index} className={(selected?"selected ":muted?"muted ":"")} cx={via.at.x} cy={via.at.y} r={Math.max(.28,via.size/2)}><title>Via · net {via.net} {board.netNames.get(via.net)||""}</title></circle>;
              })}</g>:null}

              {front?<g className="pcbFootprints front">{board.footprints.filter((item)=>item.side==="front").map((item,index)=><g key={"f"+index} transform={`translate(${item.at.x} ${item.at.y})`}><rect x="-1.6" y="-1.2" width="3.2" height="2.4" rx=".3"/><title>{item.name}</title></g>)}</g>:null}
              {back?<g className="pcbFootprints back">{board.footprints.filter((item)=>item.side==="back").map((item,index)=><g key={"b"+index} transform={`translate(${item.at.x} ${item.at.y})`}><circle r="1.45"/><title>{item.name}</title></g>)}</g>:null}
            </svg>
            {!box.count?<div className="vaultViewerOverlay">Bu KiCad dosyasında çizilebilir kart geometrisi bulunamadı.</div>:null}
          </div>
        </>
      )}

      <footer>
        {phase==="ready"
          ? width.toFixed(2)+" × "+height.toFixed(2)+" mm · pan: sürükle · zoom: tekerlek / +− · net highlight track/via bağlantısını izler"
          : "Kaynak R2'den salt okunur alınır; dosya ve revision değiştirilmez."}
      </footer>
    </section>
  );
}
