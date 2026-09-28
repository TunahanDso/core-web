"use client";

import { usePathname } from "next/navigation";
import { portalNavigation } from "@/lib/portal/modules";

export default function PortalNav({ role }: { role: string }) {
  const pathname = usePathname();

  return (
    <nav className="portalNav" aria-label="Portal navigasyonu">
      {portalNavigation.map((group) => (
        <section key={group.label}>
          <p>{group.label}</p>
          {group.items
            .filter(([, href]) => href !== "/portal/control" || role === "admin" || role === "lead")
            .map(([label, href, code]) => {
            const active =
              href === "/portal"
                ? pathname === href
                : pathname === href || pathname.startsWith(href + "/");

            return (
              <a
                className={active ? "active" : ""}
                href={href}
                key={href}
                aria-current={active ? "page" : undefined}
              >
                <span>{code}</span>
                <b>{label}</b>
              </a>
            );
          })}
        </section>
      ))}
    </nav>
  );
}
