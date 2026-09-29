"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { portalNavigation } from "@/lib/portal/modules";

type CommandItem = {
  label: string;
  hint: string;
  href: string;
  code: string;
  keywords: string;
};

const moduleCommands: CommandItem[] = portalNavigation.flatMap((group) =>
  group.items.map(([label, href, code]) => ({
    label,
    hint: group.label,
    href,
    code,
    keywords: (label + " " + group.label + " " + code).toLocaleLowerCase("tr-TR"),
  }))
);

const quickCommands: CommandItem[] = [
  {
    label: "Yeni görev oluştur",
    hint: "Hızlı işlem",
    href: "/portal/tasks?create=1",
    code: "+PM",
    keywords: "yeni görev task oluştur iş",
  },
  {
    label: "Yeni mail yaz",
    hint: "Hızlı işlem",
    href: "/portal/mail?compose=1",
    code: "+ML",
    keywords: "mail posta mesaj yaz yeni",
  },
  {
    label: "Vault'a dosya yükle",
    hint: "Hızlı işlem",
    href: "/portal/library?upload=1#upload",
    code: "+VA",
    keywords: "vault dosya yükle upload",
  },
  {
    label: "Takvime etkinlik ekle",
    hint: "Hızlı işlem",
    href: "/portal/calendar#create-event",
    code: "+CL",
    keywords: "takvim etkinlik toplantı test ekle",
  },
  {
    label: "Stok hareketi aç",
    hint: "Hızlı işlem",
    href: "/portal/inventory?action=movement",
    code: "+ST",
    keywords: "stok envanter giriş çıkış parça",
  },
];

const allCommands = [...quickCommands, ...moduleCommands];

export default function PortalCommandCenter() {
  const pathname = usePathname();
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const [recents, setRecents] = useState<string[]>([]);

  useEffect(() => {
    try {
      const stored = JSON.parse(localStorage.getItem("core_command_recents") || "[]");
      if (Array.isArray(stored)) setRecents(stored.filter((item) => typeof item === "string").slice(0, 6));
    } catch {
      setRecents([]);
    }
  }, []);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setOpen((value) => !value);
        return;
      }
      if (!open) return;
      if (event.key === "Escape") {
        event.preventDefault();
        setOpen(false);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    setQuery("");
    setActiveIndex(0);
    const timer = window.setTimeout(() => inputRef.current?.focus(), 20);
    return () => window.clearTimeout(timer);
  }, [open]);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  const normalized = query.trim().toLocaleLowerCase("tr-TR");
  const results = useMemo(() => {
    if (normalized) {
      const filtered = allCommands.filter((item) =>
        (item.label + " " + item.hint + " " + item.keywords)
          .toLocaleLowerCase("tr-TR")
          .includes(normalized)
      );
      return filtered.slice(0, 12);
    }

    const recentItems = recents
      .map((href) => allCommands.find((item) => item.href === href))
      .filter((item): item is CommandItem => Boolean(item));
    const recentSet = new Set(recentItems.map((item) => item.href));
    return [...recentItems, ...quickCommands.filter((item) => !recentSet.has(item.href))].slice(0, 10);
  }, [normalized, recents]);

  const persistRecent = (href: string) => {
    const next = [href, ...recents.filter((item) => item !== href)].slice(0, 6);
    setRecents(next);
    try {
      localStorage.setItem("core_command_recents", JSON.stringify(next));
    } catch {
      // Browser storage is only an enhancement.
    }
  };

  const run = (item: CommandItem) => {
    persistRecent(item.href);
    setOpen(false);
    router.push(item.href);
  };

  const submitSearch = () => {
    const value = query.trim();
    if (!value) return;
    setOpen(false);
    router.push("/portal/search?q=" + encodeURIComponent(value));
  };

  return (
    <>
      <button
        type="button"
        className="portalCommandTrigger"
        onClick={() => setOpen(true)}
        aria-label="CORE komut merkezini aç"
      >
        <span>⌘</span>
        <b>Komut</b>
        <kbd>Ctrl / ⌘ K</kbd>
      </button>

      {open ? (
        <div
          className="portalCommandBackdrop"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setOpen(false);
          }}
        >
          <section className="portalCommandPalette" role="dialog" aria-modal="true" aria-label="CORE Komut Merkezi">
            <header>
              <span>CORE COMMAND CENTER</span>
              <button type="button" onClick={() => setOpen(false)}>ESC</button>
            </header>

            <div className="portalCommandSearch">
              <span>⌕</span>
              <input
                ref={inputRef}
                value={query}
                onChange={(event) => {
                  setQuery(event.target.value);
                  setActiveIndex(0);
                }}
                onKeyDown={(event) => {
                  if (event.key === "ArrowDown") {
                    event.preventDefault();
                    setActiveIndex((value) => Math.min(value + 1, Math.max(0, results.length - 1)));
                  } else if (event.key === "ArrowUp") {
                    event.preventDefault();
                    setActiveIndex((value) => Math.max(value - 1, 0));
                  } else if (event.key === "Enter") {
                    event.preventDefault();
                    const item = results[activeIndex];
                    if (item) run(item);
                    else submitSearch();
                  }
                }}
                placeholder="Modül veya işlem ara..."
              />
              {query.trim() ? <button type="button" onClick={submitSearch}>TÜMÜNÜ ARA</button> : null}
            </div>

            <div className="portalCommandResults">
              {!query.trim() && recents.length ? <p>SON KULLANILAN + HIZLI İŞLEMLER</p> : <p>KOMUTLAR</p>}
              {results.map((item, index) => (
                <button
                  type="button"
                  className={index === activeIndex ? "active" : ""}
                  key={item.href}
                  onMouseEnter={() => setActiveIndex(index)}
                  onClick={() => run(item)}
                >
                  <span>{item.code}</span>
                  <div>
                    <b>{item.label}</b>
                    <small>{item.hint}</small>
                  </div>
                  <i>↵</i>
                </button>
              ))}
              {query.trim() ? (
                <button type="button" className="portalCommandSearchAll" onClick={submitSearch}>
                  <span>⌕</span>
                  <div>
                    <b>“{query.trim()}” için tüm portalda ara</b>
                    <small>Görev · Vault · repo · stok · üye</small>
                  </div>
                  <i>↵</i>
                </button>
              ) : null}
            </div>

            <footer>
              <span><kbd>↑↓</kbd> seç</span>
              <span><kbd>Enter</kbd> aç</span>
              <span><kbd>Esc</kbd> kapat</span>
            </footer>
          </section>
        </div>
      ) : null}
    </>
  );
}
