"use client";

import { usePathname } from "next/navigation";

export default function PortalContent({children}:{children:React.ReactNode}) {
  const pathname=usePathname();
  const viewportMode=
    pathname.startsWith("/portal/mail") ||
    pathname.startsWith("/portal/chat") ||
    /^\/portal\/meetings\/[^/]+$/.test(pathname);

  return (
    <div className={"portalContent"+(viewportMode?" portalContentViewport":"")}>
      {children}
    </div>
  );
}
