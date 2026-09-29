"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import { portalNavigation } from "@/lib/portal/modules";

const PRIMARY_HREFS = new Set([
  "/portal",
  "/portal/projects",
  "/portal/tasks",
  "/portal/library",
  "/portal/chat",
]);

function itemAllowed(href:string,canControl:boolean){
  return !["/portal/control","/portal/control-center"].includes(href) || canControl;
}

export default function PortalNav({ canControl }: { canControl: boolean }) {
  const pathname=usePathname();
  const visibleGroups=useMemo(
    ()=>portalNavigation.map((group)=>({
      ...group,
      items:group.items.filter(([,href])=>itemAllowed(href,canControl)),
    })),
    [canControl]
  );

  const primary=visibleGroups
    .flatMap((group)=>group.items)
    .filter(([,href])=>PRIMARY_HREFS.has(href));

  const contextual=useMemo(() => visibleGroups.map((group)=>({
    ...group,
    items:group.items.filter(([,href])=>!PRIMARY_HREFS.has(href)),
  })).filter((group)=>group.items.length), [visibleGroups]);

  const routeGroup=Math.max(0,contextual.findIndex((group)=>
    group.items.some(([,href])=>pathname===href||pathname.startsWith(href+"/"))
  ));
  const [activeGroup,setActiveGroup]=useState(routeGroup);

  useEffect(()=>{
    const next=contextual.findIndex((group)=>
      group.items.some(([,href])=>pathname===href||pathname.startsWith(href+"/"))
    );
    if(next>=0) setActiveGroup(next);
  },[pathname,contextual]);

  const active=contextual[Math.min(activeGroup,contextual.length-1)] ?? contextual[0];

  const renderItem=([label,href,code]: readonly [string,string,string])=>{
    const isActive=href==="/portal"
      ? pathname===href
      : pathname===href||pathname.startsWith(href+"/");
    return (
      <Link
        className={isActive?"active":""}
        href={href}
        prefetch={false}
        key={href}
        aria-current={isActive?"page":undefined}
        aria-label={label}
        title={label}
      >
        <span>{code}</span>
        <b>{label}</b>
      </Link>
    );
  };

  return (
    <nav className="portalNav portalNavCompact" aria-label="Portal navigasyonu">
      <section className="portalNavPrimary">
        <p>HIZLI ERİŞİM</p>
        {primary.map(renderItem)}
      </section>

      {active ? (
        <section className="portalNavContext">
          <div className="portalNavGroupTabs" role="group" aria-label="Portal modül grupları">
            {contextual.map((group,index)=>(
              <button
                type="button"

                aria-pressed={index===activeGroup}
                className={index===activeGroup?"active":""}
                key={group.label}
                onClick={()=>setActiveGroup(index)}
                title={group.label}
              >
                {group.label.replace("ÇALIŞMA ALANI","PLAN").replace("BİLGİ & ARŞİV","MÜH").replace("İLETİŞİM","İLT").replace("OPERASYON","OPS")}
              </button>
            ))}
          </div>
          <p>{active.label}</p>
          {active.items.map(renderItem)}
        </section>
      ) : null}
    </nav>
  );
}
