"use client";

import { useEffect, useState, type ComponentType } from "react";

type ModelProps={src:string;filename:string};
type PcbProps={fileId:string;sourceUrl:string;filename:string;sizeBytes:number;revision:number};

type Props =
  | ({ kind:"model" } & ModelProps)
  | ({ kind:"pcb" } & PcbProps);

export default function VaultHeavyPreview(props:Props){
  const [armed,setArmed]=useState(false);
  const [Model,setModel]=useState<ComponentType<ModelProps>|null>(null);
  const [Pcb,setPcb]=useState<ComponentType<PcbProps>|null>(null);

  useEffect(()=>{
    if(!armed) return;
    let cancelled=false;
    const load=async()=>{
      if(props.kind==="model"){
        const module=await import("@/components/portal/VaultModelViewer");
        if(!cancelled) setModel(()=>module.default);
      }else{
        const module=await import("@/components/portal/VaultPcbWorkspace");
        if(!cancelled) setPcb(()=>module.default);
      }
    };
    void load();
    return()=>{cancelled=true;};
  },[armed,props.kind]);

  if(!armed){
    return (
      <div className="vaultConversionPanel vaultDeferredPreview">
        <span>{props.kind==="model"?"3B ENGINEERING VIEWER":"PCB ENGINEERING VIEWER"}</span>
        <h3>Ağır önizleme isteğe bağlı yüklenir.</h3>
        <p>Kaynak dosya sayfa açılışında parse edilmez. Viewer yalnız gerçekten açıldığında ayrı bir client chunk olarak indirilir.</p>
        <button type="button" className="portalPrimaryButton" onClick={()=>setArmed(true)}>
          ÖNİZLEMEYİ AÇ →
        </button>
      </div>
    );
  }

  if(props.kind==="model"){
    return Model ? <Model src={props.src} filename={props.filename}/> : <div className="vaultViewerOverlay">3B VIEWER YÜKLENİYOR…</div>;
  }

  return Pcb ? (
    <Pcb
      fileId={props.fileId}
      sourceUrl={props.sourceUrl}
      filename={props.filename}
      sizeBytes={props.sizeBytes}
      revision={props.revision}
    />
  ) : <div className="vaultViewerOverlay">PCB VIEWER YÜKLENİYOR…</div>;
}
