"use client";

import { useState } from "react";
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

  return(
    <section className="vaultPcbWorkspace">
      <div className="vaultPcbWorkspaceTabs">
        <div>
          <span>PCB WORKSPACE</span>
          <b>{filename}</b>
        </div>
        <nav aria-label="PCB görünüm seçimi">
          <button
            type="button"
            className={view==="board"?"active":""}
            onClick={()=>setView("board")}
          >
            PCB GÖRÜNÜMÜ
          </button>
          <button
            type="button"
            className={view==="source"?"active":""}
            onClick={()=>setView("source")}
          >
            KAYNAK
          </button>
        </nav>
      </div>

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
    </section>
  );
}
