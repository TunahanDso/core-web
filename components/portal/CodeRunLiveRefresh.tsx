"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export function CodeRunLiveRefresh({
  active,
  runId,
  status,
}: {
  active:boolean;
  runId:string;
  status:string;
}) {
  const router=useRouter();

  useEffect(()=>{
    if(!active) return;
    let cancelled=false;
    const poll=async()=>{
      if(document.visibilityState!=="visible") return;
      try{
        const response=await fetch("/api/portal/code-lab/"+encodeURIComponent(runId)+"/status",{
          credentials:"same-origin",
          cache:"no-store",
        });
        if(!response.ok) return;
        const payload=await response.json() as {status?:string};
        if(!cancelled && payload.status && payload.status!==status) router.refresh();
      }catch{
        // Transient runner/network errors must not reload the entire page.
      }
    };
    const timer=globalThis.setInterval(()=>{ void poll(); },5000);
    void poll();
    return()=>{ cancelled=true; globalThis.clearInterval(timer); };
  },[active,runId,status,router]);

  return null;
}
