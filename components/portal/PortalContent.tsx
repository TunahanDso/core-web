"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";

function keyboardEditable(target:EventTarget|null){
  if(!(target instanceof HTMLElement))return false;
  const editable=target.closest("textarea,input,[contenteditable='true']");
  if(!(editable instanceof HTMLElement))return false;
  if(editable instanceof HTMLInputElement){
    return !["button","checkbox","color","file","hidden","image","radio","range","reset","submit"].includes(editable.type);
  }
  return true;
}

export default function PortalContent({children}:{children:React.ReactNode}) {
  const pathname=usePathname();
  const viewportMode=
    pathname.startsWith("/portal/mail") ||
    pathname.startsWith("/portal/chat") ||
    /^\/portal\/meetings\/[^/]+$/.test(pathname);

  useEffect(()=>{
    if(!viewportMode)return;
    const root=document.documentElement;
    const viewport=window.visualViewport;
    const mobile=()=>window.matchMedia("(max-width:900px)").matches;
    let focusIntent=keyboardEditable(document.activeElement);
    let blurTimer:number|undefined;

    const applyKeyboardState=()=>{
      const focused=keyboardEditable(document.activeElement);
      const visualHeight=viewport?.height ?? window.innerHeight;
      const heightDelta=Math.max(0,window.innerHeight-visualHeight);
      const keyboardOpen=mobile() && focused && (focusIntent || heightDelta>96);
      if(keyboardOpen)root.dataset.coreKeyboard="open";
      else delete root.dataset.coreKeyboard;
    };

    const sync=()=>{
      const height=viewport?.height ?? window.innerHeight;
      const offsetTop=Math.max(0,viewport?.offsetTop ?? 0);
      root.style.setProperty("--core-workspace-height",`${Math.round(height)}px`);
      root.style.setProperty("--core-visual-viewport-top",`${Math.round(offsetTop)}px`);
      applyKeyboardState();
    };

    const onFocusIn=(event:FocusEvent)=>{
      if(!keyboardEditable(event.target))return;
      if(blurTimer!==undefined)window.clearTimeout(blurTimer);
      focusIntent=true;
      root.dataset.coreKeyboard="open";
      sync();
      window.requestAnimationFrame(sync);
      window.setTimeout(sync,50);
      window.setTimeout(sync,250);
    };

    const onFocusOut=()=>{
      focusIntent=false;
      if(blurTimer!==undefined)window.clearTimeout(blurTimer);
      blurTimer=window.setTimeout(()=>{
        focusIntent=keyboardEditable(document.activeElement);
        sync();
      },80);
    };

    sync();
    document.addEventListener("focusin",onFocusIn);
    document.addEventListener("focusout",onFocusOut);
    viewport?.addEventListener("resize",sync);
    viewport?.addEventListener("scroll",sync);
    window.addEventListener("resize",sync);
    window.addEventListener("orientationchange",sync);

    return()=>{
      if(blurTimer!==undefined)window.clearTimeout(blurTimer);
      document.removeEventListener("focusin",onFocusIn);
      document.removeEventListener("focusout",onFocusOut);
      viewport?.removeEventListener("resize",sync);
      viewport?.removeEventListener("scroll",sync);
      window.removeEventListener("resize",sync);
      window.removeEventListener("orientationchange",sync);
      root.style.removeProperty("--core-workspace-height");
      root.style.removeProperty("--core-visual-viewport-top");
      delete root.dataset.coreKeyboard;
    };
  },[viewportMode]);

  return (
    <div id="portal-content" tabIndex={-1} className={"portalContent"+(viewportMode?" portalContentViewport":"")}>
      {children}
    </div>
  );
}
