"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { portalNavigation } from "@/lib/portal/modules";

export default function PortalNav({ canControl }: { canControl: boolean }) {
  const pathname=usePathname();
  const items=portalNavigation.flatMap(group=>[...group.items]).filter(([,href])=>
    canControl || !["/portal/control","/portal/control-center"].includes(href)
  );
  return <nav className="portalNav portalNavFlat" aria-label="Portal navigasyonu">
    {items.map(([label,href,code])=>{
      const active=href==="/portal"?pathname===href:pathname===href||pathname.startsWith(href+"/");
      return <Link key={href} href={href} prefetch={false} className={active?"active":""} aria-current={active?"page":undefined} aria-label={label} title={label}>
        <span>{code}</span><b>{label}</b>
      </Link>;
    })}
  </nav>;
}
