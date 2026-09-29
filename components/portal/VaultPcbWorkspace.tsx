"use client";

import { useEffect, useState } from "react";
import KiCadBoardPreview from "@/components/portal/KiCadBoardPreview";
import VaultSourceBrowser from "@/components/portal/VaultSourceBrowser";

export default function VaultPcbWorkspace({
  fileId,
  sourceUrl,
  filename,
  sizeBytes,
  revision,
}:{
  fileId:string;
  sourceUrl:string;
  filename:string;
  sizeBytes:number;
  revision:number;
}){
  const [view,setView]=useState<"board"|"source">("board");
  const [expanded,setExpanded]=useState(false);

  useEffect(()=>{
    if(!expanded) return;
    const previous=document.body.style.overflow;
    document.body.style.overflow="hidden";
    const onKeyDown=(event:KeyboardEvent)=>{
      if(event.key==="Escape") setExpanded(false);
    };
    window.addEventListener("keydown",onKeyDown);
    return()=>{
      document.body.style.overflow=previous;
      window.removeEventListener("keydown",onKeyDown);
    };
  },[expanded]);

  return(
    <section className={"vaultPcbWorkspace "+(expanded?"expanded":"")}>
      <div className="vaultPcbWorkspaceTabs">
        <div>
          <span>PCB ÇALIŞMA ALANI</span>
          <b>{filename}</b>
          <small>R{revision} · {view==="board"?"Kart görünümü":"Kaynak görünümü"}</small>
        </div>
        <nav aria-label="PCB görünüm seçimi">
          <button
            type="button"
            className={view==="board"?"active":""}
            onClick={()=>setView("board")}
          >
            PCB
          </button>
          <button
            type="button"
            className={view==="source"?"active":""}
            onClick={()=>setView("source")}
          >
            KAYNAK
          </button>
          <button
            type="button"
            className="vaultWorkspaceExpand"
            onClick={()=>setExpanded((value)=>!value)}
            aria-pressed={expanded}
          >
            {expanded?"KAPAT":"TAM EKRAN"}
          </button>
        </nav>
      </div>

      <div className="vaultPcbViewport">
        {view==="board"?(
          <KiCadBoardPreview
            src={sourceUrl}
            filename={filename}
            sizeBytes={sizeBytes}
          />
        ):(
          <VaultSourceBrowser
            fileId={fileId}
            revision={revision}
            filename={filename}
          />
        )}
      </div>
    </section>
  );
}
