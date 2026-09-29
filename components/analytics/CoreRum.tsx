"use client";

import { useEffect } from "react";
import { rumSurfaceForPath,sanitizeRumPath } from "@/lib/platform/rum";

type RumMetric = {
  name:"LCP"|"CLS"|"INP"|"TTFB";
  value:number;
  path:string;
  surface:"portal"|"admin"|"public";
};

function send(metric:RumMetric){
  const body=JSON.stringify(metric);
  if(navigator.sendBeacon){
    navigator.sendBeacon("/api/rum",new Blob([body],{type:"application/json"}));
    return;
  }
  void fetch("/api/rum",{
    method:"POST",
    headers:{"content-type":"application/json"},
    body,
    keepalive:true,
    credentials:"same-origin",
  }).catch(()=>undefined);
}

export default function CoreRum(){
  useEffect(()=>{
    if(process.env.NODE_ENV!=="production") return;

    const path=location.pathname;
    const surface=rumSurfaceForPath(path);
    const safePath=sanitizeRumPath(path);
    const emit=(name:RumMetric["name"],value:number)=>{
      if(!Number.isFinite(value)||value<0) return;
      send({name,value:Math.round(value*100)/100,path:safePath,surface});
    };

    const navigation=performance.getEntriesByType("navigation")[0] as PerformanceNavigationTiming|undefined;
    if(navigation) emit("TTFB",navigation.responseStart);

    let cls=0;
    const observers:PerformanceObserver[]=[];

    try{
      const lcp=new PerformanceObserver((list)=>{
        const entries=list.getEntries();
        const last=entries[entries.length-1];
        if(last) emit("LCP",last.startTime);
      });
      lcp.observe({type:"largest-contentful-paint",buffered:true});
      observers.push(lcp);
    }catch{}

    try{
      const layout=new PerformanceObserver((list)=>{
        for(const entry of list.getEntries()){
          const shift=entry as PerformanceEntry & {value?:number;hadRecentInput?:boolean};
          if(!shift.hadRecentInput) cls+=Number(shift.value||0);
        }
      });
      layout.observe({type:"layout-shift",buffered:true});
      observers.push(layout);
    }catch{}

    try{
      const eventTiming=new PerformanceObserver((list)=>{
        let worst=0;
        for(const entry of list.getEntries()){
          const timing=entry as PerformanceEntry & {duration?:number};
          worst=Math.max(worst,Number(timing.duration||0));
        }
        if(worst) emit("INP",worst);
      });
      eventTiming.observe({type:"event",buffered:true,durationThreshold:40} as PerformanceObserverInit);
      observers.push(eventTiming);
    }catch{}

    const flush=()=>{
      if(cls>0) emit("CLS",cls);
      for(const observer of observers) observer.disconnect();
    };
    addEventListener("pagehide",flush,{once:true});
    return()=>{
      removeEventListener("pagehide",flush);
      for(const observer of observers) observer.disconnect();
    };
  },[]);

  return null;
}
