"use client";

import { Children, useEffect, useId, useRef, useState, type CSSProperties, type KeyboardEvent, type PointerEvent, type ReactNode } from "react";

type Sizes={split:number;height:number;width:number};
type Axis=keyof Sizes;
const bounds:Record<Axis,[number,number]>={split:[20,80],height:[280,1200],width:[40,100]};
const clamp=(axis:Axis,value:number)=>Math.max(bounds[axis][0],Math.min(bounds[axis][1],value));

/** Pointer capture keeps dragging local; storage only contains layout dimensions. */
export default function ResizableWorkspace({children,storageKey,label,mode="split",initialSplit=68,initialHeight=560,className=""}:{
  children:ReactNode;storageKey:string;label:string;mode?:"split"|"surface";initialSplit?:number;initialHeight?:number;className?:string;
}) {
  const defaults={split:clamp("split",initialSplit),height:clamp("height",initialHeight),width:100};
  const [sizes,setSizes]=useState<Sizes>(defaults);
  const sizesRef=useRef(sizes);
  const rootRef=useRef<HTMLDivElement>(null);
  const drag=useRef<{id:number;axis:Axis;start:number;value:number;extent:number;sign:number;original:Sizes}|null>(null);
  const id=useId(),key="core:workspace:v1:"+storageKey;
  const [dragging,setDragging]=useState(false);

  const update=(next:Sizes)=>{sizesRef.current=next;setSizes(next);};
  const persist=(next:Sizes)=>{try{localStorage.setItem(key,JSON.stringify(next));}catch{/* Layout remains usable with blocked storage. */}};
  useEffect(()=>{
    let next={...defaults};
    try {
      const saved=JSON.parse(localStorage.getItem(key)||"null");
      if(saved && typeof saved==="object")for(const axis of Object.keys(bounds) as Axis[]){
        if(typeof saved[axis]==="number" && Number.isFinite(saved[axis]))next[axis]=clamp(axis,saved[axis]);
      }
    }catch{/* Ignore malformed or unavailable preferences. */}
    update(next);
  // Defaults are stable for each workspace type; navigation can change the key.
  },[key,initialSplit,initialHeight]);

  const reset=()=>{update(defaults);try{localStorage.removeItem(key);}catch{}};
  const start=(event:PointerEvent<HTMLDivElement>,axis:Axis,sign=1)=>{
    if(event.button!==0 || !event.isPrimary)return;
    const root=rootRef.current;if(!root)return;
    event.preventDefault();event.currentTarget.setPointerCapture(event.pointerId);
    drag.current={id:event.pointerId,axis,start:axis==="height"?event.clientY:event.clientX,value:sizesRef.current[axis],extent:root.getBoundingClientRect().width,sign,original:{...sizesRef.current}};
    setDragging(true);
  };
  const move=(event:PointerEvent<HTMLDivElement>)=>{
    const current=drag.current;if(!current || current.id!==event.pointerId)return;
    const delta=((current.axis==="height"?event.clientY:event.clientX)-current.start)*current.sign;
    const value=current.value+(current.axis==="height"?delta:delta/Math.max(1,current.extent)*100);
    update({...sizesRef.current,[current.axis]:clamp(current.axis,value)});
  };
  const finish=(event:PointerEvent<HTMLDivElement>,cancel=false)=>{
    const current=drag.current;if(!current || current.id!==event.pointerId)return;
    drag.current=null;setDragging(false);
    if(cancel)update(current.original);else persist(sizesRef.current);
    if(event.currentTarget.hasPointerCapture(event.pointerId))event.currentTarget.releasePointerCapture(event.pointerId);
  };
  const keyboard=(event:KeyboardEvent<HTMLDivElement>,axis:Axis)=>{
    const horizontal=axis!=="height",step=(axis==="height"?20:2)*(event.shiftKey?5:1);
    const direction=event.key===(horizontal?"ArrowRight":"ArrowDown")?1:event.key===(horizontal?"ArrowLeft":"ArrowUp")?-1:0;
    if(event.key==="Enter"){event.preventDefault();reset();return;}
    if(!direction && event.key!=="Home" && event.key!=="End")return;
    event.preventDefault();
    const value=event.key==="Home"?bounds[axis][0]:event.key==="End"?bounds[axis][1]:sizesRef.current[axis]+direction*step;
    const next={...sizesRef.current,[axis]:clamp(axis,value)};update(next);persist(next);
  };
  const handle=(axis:Axis,position:string,sign=1)=><div
    className={"workbenchResizeHandle "+position} role="separator" tabIndex={0}
    aria-label={label+(axis==="height"?" yüksekliği":" genişliği")}
    aria-orientation={axis==="height"?"horizontal":"vertical"} aria-controls={id}
    aria-valuemin={bounds[axis][0]} aria-valuemax={bounds[axis][1]} aria-valuenow={Math.round(sizes[axis])}
    aria-valuetext={Math.round(sizes[axis])+(axis==="height"?" piksel":" yüzde")}
    title="Sürükle veya ok tuşlarını kullan · çift tık / Enter: sıfırla"
    onPointerDown={event=>start(event,axis,sign)} onPointerMove={move} onPointerUp={event=>finish(event)}
    onPointerCancel={event=>finish(event,true)} onLostPointerCapture={event=>finish(event,true)}
    onKeyDown={event=>keyboard(event,axis)} onDoubleClick={reset}
  ><span aria-hidden="true"/></div>;
  const panels=Children.toArray(children);
  return <div ref={rootRef} className={"workbenchResizeRoot "+className+(dragging?" resizing":"")} style={{"--workbench-split":sizes.split+"%","--workbench-height":sizes.height+"px","--workbench-width":sizes.width+"%"} as CSSProperties}>
    <div className="workbenchResizeToolbar"><span>{label} · Kenarlardan boyutlandır</span><button type="button" onClick={reset}>Düzeni sıfırla</button></div>
    {mode==="split"?<div className="workbenchSplit">
      <div id={id} className="workbenchSplitPane">{panels[0]}</div>
      {handle("split","between")}
      <div className="workbenchSplitPane">{panels.slice(1)}</div>
    </div>:<div className="workbenchSurface">
      {handle("height","top",-1)}
      <div id={id} className="workbenchSurfaceContent">{children}</div>
      {handle("width","right")}{handle("height","bottom")}
    </div>}
  </div>;
}
