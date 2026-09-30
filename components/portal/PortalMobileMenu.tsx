"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { usePathname } from "next/navigation";
import PortalNav from "./PortalNav";
import PortalThemeControl from "./PortalThemeControl";

export default function PortalMobileMenu({ canControl }: { canControl: boolean }) {
  const pathname=usePathname();
  const [open,setOpen]=useState(false);
  const trigger=useRef<HTMLButtonElement>(null);
  const dialog=useRef<HTMLDialogElement>(null);
  useEffect(()=>{setOpen(false);},[pathname]);
  useEffect(()=>{
    if(!open || !dialog.current)return;
    const previous=document.body.style.overflow;
    dialog.current.showModal();
    document.body.style.overflow="hidden";
    return()=>{document.body.style.overflow=previous;trigger.current?.focus();};
  },[open]);
  return <div className="portalMobileMenu">
    <button ref={trigger} className="portalMobileMenuTrigger" type="button" aria-label="Portal menüsünü aç" aria-haspopup="dialog" aria-expanded={open} onClick={()=>setOpen(true)}>
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><path d="M4 6h16M4 12h16M4 18h16"/></svg>
      <span>Menü</span>
    </button>
    {open?createPortal(<dialog ref={dialog} className="portalMobileDialog" aria-labelledby="portal-mobile-title" onCancel={()=>setOpen(false)} onClick={event=>{if(event.target===event.currentTarget)setOpen(false);}}>
      <section className="portalMobileSheet">
        <header><div><small>YTÜ CORE</small><h2 id="portal-mobile-title">Çalışma alanın</h2></div><button type="button" aria-label="Menüyü kapat" onClick={()=>setOpen(false)}>✕</button></header>
        <div className="portalMobileAppearance"><b>Görünüm</b><PortalThemeControl/></div>
        <div className="portalMobileNavArea" onClick={event=>{if((event.target as Element).closest("a"))setOpen(false);}}><PortalNav canControl={canControl}/></div>
        <footer><Link href="/portal/profile" prefetch={false} onClick={()=>setOpen(false)}>Profil</Link><Link href="/portal/security" prefetch={false} onClick={()=>setOpen(false)}>Uygulama ve cihazlar</Link></footer>
      </section>
    </dialog>,document.body):null}
  </div>;
}
