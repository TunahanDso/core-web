"use client";

import { useMemo, useRef, useState } from "react";

type Point={x:number;y:number};
type Edge={a:Point;b:Point};
type Footprint={name:string;at:Point;side:"front"|"back"};
type Track={a:Point;b:Point;width:number;layer:string;net:number};
type Via={at:Point;size:number;net:number};

function n(value:string){
  const parsed=Number(value);
  return Number.isFinite(parsed)?parsed:0;
}

function parseBoard(source:string){
  const edges:Edge[]=[];
  const footprints:Footprint[]=[];
  const tracks:Track[]=[];
  const vias:Via[]=[];
  const netNames=new Map<number,string>();

  for(const match of source.matchAll(/\(net\s+(\d+)\s+"([^"]*)"/g)){
    netNames.set(Number(match[1]),match[2]||("NET-"+match[1]));
  }

  const lineRe=/\(gr_line[\s\S]{0,120}?\(start\s+([-+\d.]+)\s+([-+\d.]+)\)[\s\S]{0,120}?\(end\s+([-+\d.]+)\s+([-+\d.]+)\)[\s\S]{0,260}?\(layer\s+"Edge\.Cuts"\)/g;
  for(const match of source.matchAll(lineRe)){
    edges.push({a:{x:n(match[1]),y:n(match[2])},b:{x:n(match[3]),y:n(match[4])}});
    if(edges.length>4000) break;
  }

  const rectRe=/\(gr_rect[\s\S]{0,120}?\(start\s+([-+\d.]+)\s+([-+\d.]+)\)[\s\S]{0,120}?\(end\s+([-+\d.]+)\s+([-+\d.]+)\)[\s\S]{0,260}?\(layer\s+"Edge\.Cuts"\)/g;
  for(const match of source.matchAll(rectRe)){
    const x1=n(match[1]),y1=n(match[2]),x2=n(match[3]),y2=n(match[4]);
    edges.push(
      {a:{x:x1,y:y1},b:{x:x2,y:y1}},
      {a:{x:x2,y:y1},b:{x:x2,y:y2}},
      {a:{x:x2,y:y2},b:{x:x1,y:y2}},
      {a:{x:x1,y:y2},b:{x:x1,y:y1}},
    );
  }

  const segmentRe=/\(segment[\s\S]{0,90}?\(start\s+([-+\d.]+)\s+([-+\d.]+)\)[\s\S]{0,90}?\(end\s+([-+\d.]+)\s+([-+\d.]+)\)[\s\S]{0,90}?\(width\s+([-+\d.]+)\)[\s\S]{0,120}?\(layer\s+"([^"]+)"\)[\s\S]{0,120}?\(net\s+(\d+)\)/g;
  for(const match of source.matchAll(segmentRe)){
    tracks.push({
      a:{x:n(match[1]),y:n(match[2])},
      b:{x:n(match[3]),y:n(match[4])},
      width:n(match[5]),
      layer:match[6],
      net:Number(match[7]),
    });
    if(tracks.length>30000) break;
  }

  const viaRe=/\(via[\s\S]{0,100}?\(at\s+([-+\d.]+)\s+([-+\d.]+)\)[\s\S]{0,100}?\(size\s+([-+\d.]+)\)[\s\S]{0,240}?\(net\s+(\d+)\)/g;
  for(const match of source.matchAll(viaRe)){
    vias.push({at:{x:n(match[1]),y:n(match[2])},size:n(match[3]),net:Number(match[4])});
    if(vias.length>10000) break;
  }

  const lines=source.split(/\r?\n/);
  for(let i=0;i<lines.length;i+=1){
    const start=lines[i].match(/^\s*\(footprint\s+"?([^"\s()]+)"?/);
    if(!start) continue;
    let side:"front"|"back"="front";
    let at:Point|null=null;
    for(let j=i;j<Math.min(lines.length,i+60);j+=1){
      const layer=lines[j].match(/\(layer\s+"([FB])\.(?:Cu|SilkS|Fab)"/);
      if(layer) side=layer[1]==="B"?"back":"front";
      const pos=lines[j].match(/\(at\s+([-+\d.]+)\s+([-+\d.]+)/);
      if(pos&&!at) at={x:n(pos[1]),y:n(pos[2])};
      if(at&&layer) break;
    }
    if(at) footprints.push({name:start[1],at,side});
    if(footprints.length>1500) break;
  }

  return{edges,footprints,tracks,vias,netNames};
}

export default function KiCadBoardPreview({source}:{source:string}){
  const board=useMemo(()=>parseBoard(source),[source]);
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

  const points=[
    ...board.edges.flatMap((edge)=>[edge.a,edge.b]),
    ...board.footprints.map((item)=>item.at),
    ...board.tracks.flatMap((track)=>[track.a,track.b]),
    ...board.vias.map((via)=>via.at),
  ];
  const minX=points.length?Math.min(...points.map((p)=>p.x)):0;
  const minY=points.length?Math.min(...points.map((p)=>p.y)):0;
  const maxX=points.length?Math.max(...points.map((p)=>p.x)):100;
  const maxY=points.length?Math.max(...points.map((p)=>p.y)):70;
  const width=Math.max(maxX-minX,1);
  const height=Math.max(maxY-minY,1);
  const pad=Math.max(width,height)*.07;
  const centerX=(minX+maxX)/2+pan.x;
  const centerY=(minY+maxY)/2+pan.y;
  const viewWidth=(width+pad*2)/zoom;
  const viewHeight=(height+pad*2)/zoom;

  const nets=[...board.netNames.entries()].sort((a,b)=>a[1].localeCompare(b[1])).slice(0,500);
  const visibleTracks=board.tracks.filter((track)=>{
    if(track.layer==="F.Cu"&&!frontTracks) return false;
    if(track.layer==="B.Cu"&&!backTracks) return false;
    if(track.layer!=="F.Cu"&&track.layer!=="B.Cu") return false;
    return true;
  });

  const reset=()=>{
    setZoom(1);
    setPan({x:0,y:0});
    setSelectedNet(null);
  };

  return(
    <section className="pcbPreview advanced">
      <header>
        <div>
          <span>KICAD PCB ENGINEERING VIEWER</span>
          <b>{board.footprints.length} footprint · {board.netNames.size} net · {board.vias.length} via · {board.tracks.length} track</b>
          <small>{width.toFixed(2)} × {height.toFixed(2)} mm bounding area</small>
        </div>
        <div className="pcbLayerTools">
          <button className={outline?"active":""} type="button" onClick={()=>setOutline((v)=>!v)}>EDGE</button>
          <button className={frontTracks?"active":""} type="button" onClick={()=>setFrontTracks((v)=>!v)}>F.Cu</button>
          <button className={backTracks?"active":""} type="button" onClick={()=>setBackTracks((v)=>!v)}>B.Cu</button>
          <button className={showVias?"active":""} type="button" onClick={()=>setShowVias((v)=>!v)}>VIA</button>
          <button className={front?"active":""} type="button" onClick={()=>setFront((v)=>!v)}>F.FP</button>
          <button className={back?"active":""} type="button" onClick={()=>setBack((v)=>!v)}>B.FP</button>
          <button type="button" onClick={()=>setZoom((v)=>Math.min(8,v*1.25))}>＋</button>
          <button type="button" onClick={()=>setZoom((v)=>Math.max(.45,v/1.25))}>−</button>
          <button type="button" onClick={reset}>FIT</button>
        </div>
      </header>

      <div className="pcbInspectorBar">
        <label>
          <span>NET HIGHLIGHT</span>
          <select value={selectedNet??""} onChange={(event)=>setSelectedNet(event.target.value?Number(event.target.value):null)}>
            <option value="">Tüm netler</option>
            {nets.map(([id,name])=><option value={id} key={id}>{id} · {name||"(unnamed)"}</option>)}
          </select>
        </label>
        <div><span>F.Cu TRACK</span><b>{board.tracks.filter((track)=>track.layer==="F.Cu").length}</b></div>
        <div><span>B.Cu TRACK</span><b>{board.tracks.filter((track)=>track.layer==="B.Cu").length}</b></div>
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
            setZoom((value)=>Math.max(.45,Math.min(8,value*(event.deltaY>0?.9:1.1))));
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
        {!points.length?<div className="vaultViewerOverlay">Bu KiCad dosyasında çizilebilir kart geometrisi bulunamadı.</div>:null}
      </div>

      <footer>
        Pan: sürükle · zoom: tekerlek / +− · net highlight track/via bağlantısını izler · kaynak değiştirilmez; üretim Gerber/KiCad çıktısı esas
      </footer>
    </section>
  );
}
