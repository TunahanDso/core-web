"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Capacitor } from "@capacitor/core";
import { App } from "@capacitor/app";
import { Haptics, ImpactStyle, NotificationType } from "@capacitor/haptics";
import { Network, type ConnectionType } from "@capacitor/network";
import { Preferences } from "@capacitor/preferences";
import { Keyboard } from "@capacitor/keyboard";
import { StatusBar, Style } from "@capacitor/status-bar";
import { Camera, CameraDirection } from "@capacitor/camera";
import { Share } from "@capacitor/share";
import { portalNavigation } from "@/lib/portal/modules";

type NativeExperienceProps = {
  memberName: string;
  memberRole: string;
  portalRole: string;
  canControl: boolean;
  memberInitials: string;
  counts: {
    tasks: number;
    notifications: number;
    mail: number;
    chat: number;
  };
};

type IconName =
  | "home"
  | "tasks"
  | "chat"
  | "mail"
  | "more"
  | "back"
  | "bell"
  | "profile"
  | "plus"
  | "refresh"
  | "wifi"
  | "camera"
  | "search"
  | "star"
  | "recent";

function Icon({ name }: { name: IconName }) {
  const common = {
    width: 22,
    height: 22,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.8,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true,
  };

  if (name === "home") return <svg {...common}><path d="m3 11 9-8 9 8"/><path d="M5 10v10h14V10"/><path d="M9 20v-6h6v6"/></svg>;
  if (name === "tasks") return <svg {...common}><rect x="4" y="3" width="16" height="18" rx="2"/><path d="m8 8 1.5 1.5L12 7"/><path d="M13 9h3"/><path d="m8 14 1.5 1.5L12 13"/><path d="M13 15h3"/></svg>;
  if (name === "chat") return <svg {...common}><path d="M4 5h16v11H8l-4 4z"/><path d="M8 9h8M8 12h5"/></svg>;
  if (name === "mail") return <svg {...common}><rect x="3" y="5" width="18" height="14" rx="2"/><path d="m4 7 8 6 8-6"/></svg>;
  if (name === "more") return <svg {...common}><circle cx="5" cy="12" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/></svg>;
  if (name === "back") return <svg {...common}><path d="m15 18-6-6 6-6"/></svg>;
  if (name === "bell") return <svg {...common}><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9"/><path d="M10 21h4"/></svg>;
  if (name === "profile") return <svg {...common}><circle cx="12" cy="8" r="4"/><path d="M4 21c.8-4.1 3.4-6 8-6s7.2 1.9 8 6"/></svg>;
  if (name === "plus") return <svg {...common}><path d="M12 5v14M5 12h14"/></svg>;
  if (name === "refresh") return <svg {...common}><path d="M20 6v5h-5"/><path d="M4 18v-5h5"/><path d="M18.2 9A7 7 0 0 0 6.4 6.4L4 9M5.8 15A7 7 0 0 0 17.6 17.6L20 15"/></svg>;
  if (name === "camera") return <svg {...common}><path d="M4 7h3l1.5-2h7L17 7h3v12H4z"/><circle cx="12" cy="13" r="4"/></svg>;
  if (name === "search") return <svg {...common}><circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/></svg>;
  if (name === "star") return <svg {...common}><path d="m12 3 2.8 5.7 6.2.9-4.5 4.4 1.1 6.2L12 17.2 6.4 20.2 7.5 14 3 9.6l6.2-.9z"/></svg>;
  if (name === "recent") return <svg {...common}><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>;
  return <svg {...common}><path d="M3 9c5-4 13-4 18 0"/><path d="M6 13c3.4-2.7 8.6-2.7 12 0"/><path d="M9.5 17c1.4-1.2 3.6-1.2 5 0"/><circle cx="12" cy="20" r=".7" fill="currentColor" stroke="none"/></svg>;
}

const tabs = [
  { label: "Ana Sayfa", href: "/portal", icon: "home" as const },
  { label: "Görevler", href: "/portal/tasks", icon: "tasks" as const },
  { label: "Sohbet", href: "/portal/chat", icon: "chat" as const },
  { label: "Mail", href: "/portal/mail", icon: "mail" as const },
] as const;

const quickActions = [
  ["Yeni görev", "/portal/tasks#create-task", "İş oluştur veya görev panosuna git"],
  ["Mail yaz", "/portal/mail?compose=1", "CORE iç yazışmasını başlat"],
  ["Vault'a yükle", "/portal/library#upload", "Dosya ve teknik veri ekle"],
  ["Toplantı planla", "/portal/meetings?create=meeting", "Ses, görüntü, karar ve rapor çalışma alanı"],
  ["Oylamalara git", "/portal/polls", "Takım ve toplantı kararları"],
  ["Takvime git", "/portal/calendar", "Toplantı, test ve saha planı"],
  ["Bütçeyi aç", "/portal/budget", "Gelir, gider ve tahsisler"],
  ["Stok işlemi", "/portal/inventory", "Parça ve ekipman hareketi"],
] as const;

const nativeModules = portalNavigation.flatMap((group) =>
  group.items.map(([label, href, code]) => ({ label, href, code, group: group.label }))
);

const routeTitles = new Map<string, string>([
  ["/portal", "Ana Sayfa"],
  ["/portal/projects", "Projeler"],
  ["/portal/project-map", "Project Map"],
  ["/portal/teams", "Takımlar"],
  ["/portal/tasks", "Görevler"],
  ["/portal/chat", "Sohbet"],
  ["/portal/mail", "Mail"],
  ["/portal/library", "Vault"],
  ["/portal/calendar", "Takvim"],
  ["/portal/meetings", "Toplantılar"],
  ["/portal/polls", "Oylamalar"],
  ["/portal/budget", "Bütçe"],
  ["/portal/notifications", "Bildirimler"],
  ["/portal/inventory", "Stok"],
  ["/portal/projects", "Projeler"],
  ["/portal/repositories", "Repo"],
  ["/portal/mechanical", "Mekanik / CAD"],
  ["/portal/electronics", "PCB / Elektronik"],
  ["/portal/code-lab", "Code Lab"],
  ["/portal/members", "Üyeler"],
  ["/portal/security", "Güvenlik"],
  ["/portal/ops", "Canlı Araç"],
  ["/portal/control", "Ağır Kontrol"],
]);

function nativeRouteTitle(pathname: string) {
  const exact = routeTitles.get(pathname);
  if (exact) return exact;
  const parent = [...routeTitles.entries()]
    .filter(([route]) => route !== "/portal" && pathname.startsWith(route + "/"))
    .sort((a,b) => b[0].length - a[0].length)[0];
  return parent?.[1] || "CORE";
}

function isInteractiveTarget(target: EventTarget | null) {
  return target instanceof HTMLElement &&
    Boolean(target.closest("input,textarea,select,button,a,[contenteditable=true]"));
}

export default function PortalNativeExperience({
  memberName,
  memberRole,
  portalRole,
  canControl,
  memberInitials,
  counts,
}: NativeExperienceProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [native, setNative] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const [quickOpen, setQuickOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [moduleQuery, setModuleQuery] = useState("");
  const [favorites, setFavorites] = useState<string[]>([]);
  const [recentRoutes, setRecentRoutes] = useState<string[]>([]);
  const visibleNativeModules = nativeModules.filter(
    (item) => item.href !== "/portal/control" || canControl
  );
  const [connected, setConnected] = useState(true);
  const [connectionType, setConnectionType] = useState<ConnectionType>("unknown");
  const [keyboardOpen, setKeyboardOpen] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const [exitHint, setExitHint] = useState(false);
  const [capture, setCapture] = useState<{ blob: Blob; preview: string; filename: string } | null>(null);
  const [captureTitle, setCaptureTitle] = useState("");
  const [captureBusy, setCaptureBusy] = useState(false);
  const [captureError, setCaptureError] = useState("");
  const [pushState,setPushState] = useState<"idle"|"registering"|"registered"|"denied"|"error"|"received">("idle");
  const pullStart = useRef<number | null>(null);
  const pullArmed = useRef(false);
  const lastBackAt = useRef(0);
  const backgroundAt = useRef<number | null>(null);
  const wasConnected = useRef<boolean | null>(null);

  const activeTab = (href: string) =>
    href === "/portal"
      ? pathname === href
      : pathname === href || pathname.startsWith(href + "/");

  const hapticTap = () => {
    if (!Capacitor.isNativePlatform()) return;
    void Haptics.impact({ style: ImpactStyle.Light }).catch(() => undefined);
  };

  const navigate = (href: string) => {
    hapticTap();
    setMoreOpen(false);
    setQuickOpen(false);
    setSearchOpen(false);
    const clean = href.split("?")[0]?.split("#")[0] || "/portal";
    const nextRecent = [clean, ...recentRoutes.filter((item) => item !== clean)].slice(0, 6);
    setRecentRoutes(nextRecent);
    if (Capacitor.isNativePlatform()) {
      void Preferences.set({ key: "core_recent_routes", value: JSON.stringify(nextRecent) }).catch(() => undefined);
    }
    router.push(href);
  };

  const toggleFavorite = (href: string) => {
    hapticTap();
    const next = favorites.includes(href)
      ? favorites.filter((item) => item !== href)
      : [href, ...favorites].slice(0, 8);
    setFavorites(next);
    if (Capacitor.isNativePlatform()) {
      void Preferences.set({ key: "core_favorite_routes", value: JSON.stringify(next) }).catch(() => undefined);
    }
  };

  const capturePhoto = async () => {
    if (!Capacitor.isPluginAvailable("Camera")) {
      navigate("/portal/library#upload");
      return;
    }

    setQuickOpen(false);
    setCaptureError("");
    try {
      const result = await Camera.takePhoto({
        quality: 88,
        editable: "no",
        cameraDirection: CameraDirection.Rear,
        targetWidth: 1800,
        targetHeight: 1800,
        correctOrientation: true,
      });
      if (!result.webPath) throw new Error("Kamera çıktısı alınamadı.");

      const response = await fetch(result.webPath);
      const blob = await response.blob();
      if (!blob.size) throw new Error("Fotoğraf verisi boş.");
      if (blob.size > 25 * 1024 * 1024) throw new Error("Fotoğraf 25 MB Vault sınırını aşıyor.");

      const mimeFormat = (blob.type.split("/")[1] || "jpeg").toLowerCase();
      const extension = mimeFormat === "jpeg" ? "jpg" : mimeFormat.replace(/[^a-z0-9]/g, "") || "jpg";
      const now = new Date();
      setCapture({
        blob,
        preview: result.webPath,
        filename: "core-field-" + now.toISOString().replace(/[:.]/g,"-") + "." + extension,
      });
      setCaptureTitle(
        "Saha fotoğrafı · " +
        now.toLocaleString("tr-TR", { dateStyle: "short", timeStyle: "short" })
      );
      await Haptics.impact({ style: ImpactStyle.Medium }).catch(() => undefined);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Kamera açılamadı.";
      if (!/cancel/i.test(message)) setCaptureError(message);
    }
  };

  const uploadCapture = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!capture || captureBusy) return;

    setCaptureBusy(true);
    setCaptureError("");
    try {
      const fields = new FormData(event.currentTarget);
      fields.set("file", new File([capture.blob], capture.filename, {
        type: capture.blob.type || "image/jpeg",
      }));
      fields.set("kind", "media");
      fields.set("visibility", "members");
      fields.set("description", "CORE mobil uygulamasından saha kamerası ile yüklendi.");
      const tags = String(fields.get("tags") || "").trim();
      fields.set("tags", ["native","camera","saha",tags].filter(Boolean).join(","));

      const response = await fetch("/api/portal/vault/upload", {
        method: "POST",
        credentials: "same-origin",
        body: fields,
      });
      const payload = await response.json().catch(() => ({})) as { uploaded?: boolean; href?: string; error?: string };
      if (!response.ok || !payload.uploaded || !payload.href) {
        throw new Error(payload.error || "Vault yüklemesi başarısız.");
      }

      await Haptics.notification({ type: NotificationType.Success }).catch(() => undefined);
      setCapture(null);
      setCaptureTitle("");
      router.push(payload.href);
      router.refresh();
    } catch (error) {
      setCaptureError(error instanceof Error ? error.message : "Vault yüklemesi başarısız.");
      await Haptics.notification({ type: NotificationType.Error }).catch(() => undefined);
    } finally {
      setCaptureBusy(false);
    }
  };

  const enablePush = async () => {
    if (!Capacitor.isNativePlatform()) return;
    setPushState("registering");
    hapticTap();
    window.dispatchEvent(new Event("core:push-opt-in"));
  };

  const shareCurrent = async () => {
    if (!Capacitor.isNativePlatform() || !Capacitor.isPluginAvailable("Share")) return;
    hapticTap();
    try {
      await Share.share({
        title: "YTÜ CORE · " + nativeRouteTitle(pathname),
        text: "CORE Portal çalışma alanı",
        url: window.location.origin + pathname,
        dialogTitle: "CORE ekranını paylaş",
      });
    } catch {
      // Native share can be dismissed without turning that into an app error.
    }
  };

  const refresh = async () => {
    if (refreshing) return;
    setRefreshing(true);
    if (Capacitor.isNativePlatform()) {
      await Haptics.impact({ style: ImpactStyle.Medium }).catch(() => undefined);
    }
    router.refresh();
    window.setTimeout(() => setRefreshing(false), 700);
  };

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;
    setNative(true);
    document.documentElement.dataset.coreNative = "native-v2";

    void StatusBar.setStyle({ style: Style.Dark }).catch(() => undefined);
    void Preferences.set({ key: "core_last_portal_route", value: pathname }).catch(() => undefined);
    void Promise.all([
      Preferences.get({ key: "core_recent_routes" }),
      Preferences.get({ key: "core_favorite_routes" }),
    ]).then(([recent, favorite]) => {
      try { setRecentRoutes(JSON.parse(recent.value || "[]")); } catch { setRecentRoutes([]); }
      try { setFavorites(JSON.parse(favorite.value || "[]")); } catch { setFavorites([]); }
    }).catch(() => undefined);

    const handles: Array<{ remove: () => Promise<void> }> = [];

    void Network.getStatus().then((status) => {
      setConnected(status.connected);
      setConnectionType(status.connectionType);
      wasConnected.current = status.connected;
    }).catch(() => undefined);

    void Network.addListener("networkStatusChange", (status) => {
      const recovered = wasConnected.current === false && status.connected;
      wasConnected.current = status.connected;
      setConnected(status.connected);
      setConnectionType(status.connectionType);
      if (recovered) {
        void Haptics.notification({ type: NotificationType.Success }).catch(() => undefined);
        router.refresh();
      }
    }).then((handle) => handles.push(handle));

    void Keyboard.addListener("keyboardWillShow", () => setKeyboardOpen(true))
      .then((handle) => handles.push(handle));
    void Keyboard.addListener("keyboardWillHide", () => setKeyboardOpen(false))
      .then((handle) => handles.push(handle));

    void App.addListener("appStateChange", ({ isActive }) => {
      if (!isActive) {
        backgroundAt.current = Date.now();
        return;
      }
      const awayFor = backgroundAt.current ? Date.now() - backgroundAt.current : 0;
      backgroundAt.current = null;
      if (awayFor > 45_000) router.refresh();
    }).then((handle) => handles.push(handle));

    void App.addListener("backButton", () => {
      if (searchOpen) {
        setSearchOpen(false);
        return;
      }
      if (quickOpen) {
        setQuickOpen(false);
        return;
      }
      if (moreOpen) {
        setMoreOpen(false);
        return;
      }
      if (pathname !== "/portal") {
        router.back();
        return;
      }

      const now = Date.now();
      if (Capacitor.getPlatform() === "android" && now - lastBackAt.current < 1800) {
        void App.exitApp();
        return;
      }
      lastBackAt.current = now;
      setExitHint(true);
      void Haptics.impact({ style: ImpactStyle.Light }).catch(() => undefined);
      window.setTimeout(() => setExitHint(false), 1800);
    }).then((handle) => handles.push(handle));

    const touchStart = (event: TouchEvent) => {
      if (window.scrollY > 1 || isInteractiveTarget(event.target)) return;
      pullStart.current = event.touches[0]?.clientY ?? null;
      pullArmed.current = false;
    };
    const touchMove = (event: TouchEvent) => {
      if (pullStart.current === null) return;
      const current = event.touches[0]?.clientY ?? pullStart.current;
      const distance = Math.max(0, Math.min(112, (current - pullStart.current) * 0.58));
      setPullDistance(distance);
      if (distance > 72 && !pullArmed.current) {
        pullArmed.current = true;
        void Haptics.impact({ style: ImpactStyle.Light }).catch(() => undefined);
      }
    };
    const touchEnd = () => {
      const shouldRefresh = pullArmed.current;
      pullStart.current = null;
      pullArmed.current = false;
      setPullDistance(0);
      if (shouldRefresh) void refresh();
    };

    window.addEventListener("touchstart", touchStart, { passive: true });
    window.addEventListener("touchmove", touchMove, { passive: true });
    window.addEventListener("touchend", touchEnd, { passive: true });

    return () => {
      delete document.documentElement.dataset.coreNative;
      window.removeEventListener("touchstart", touchStart);
      window.removeEventListener("touchmove", touchMove);
      window.removeEventListener("touchend", touchEnd);
      for (const handle of handles) void handle.remove();
    };
  // The listener set is intentionally rebound per route so Android back behavior
  // always acts on the current portal path.
  }, [pathname, router, moreOpen, quickOpen, searchOpen]);

  useEffect(() => {
    if (!native) return;
    void Preferences.set({ key: "core_last_portal_route", value: pathname }).catch(() => undefined);
  }, [native, pathname]);

  useEffect(() => {
    if (!native) return;
    const listener = (event: Event) => {
      const detail = (event as CustomEvent<{ state?: string }>).detail;
      const next = String(detail?.state || "idle");
      if (["idle","registering","registered","denied","error","received"].includes(next)) {
        setPushState(next as "idle"|"registering"|"registered"|"denied"|"error"|"received");
      }
    };
    window.addEventListener("core:push-status",listener);
    void Preferences.get({key:"core_push_opt_in"}).then((value)=>{
      if(value.value==="1") setPushState((current)=>current==="registered"?current:"registering");
    }).catch(()=>undefined);
    return () => window.removeEventListener("core:push-status",listener);
  },[native]);



  if (!native) return null;

  return (
    <>
      <div
        className={"nativePullIndicator " + (refreshing ? "refreshing" : "")}
        style={{ transform: `translate(-50%, ${Math.max(-42, pullDistance - 42)}px)` }}
        aria-hidden="true"
      >
        <Icon name="refresh" />
        <span>{refreshing ? "YENİLENİYOR" : pullDistance > 72 ? "BIRAK VE YENİLE" : "ÇEK"}</span>
      </div>

      {!connected ? (
        <div className="nativeOfflineBanner">
          <Icon name="wifi" />
          <div><b>Çevrimdışısın</b><span>Yeni işlemler bağlantı gelince devam edecek.</span></div>
          <button type="button" onClick={() => void refresh()}>DENE</button>
        </div>
      ) : null}

      <header className="nativeAppBar">
        <div className="nativeAppBarStart">
          {pathname !== "/portal" ? (
            <button type="button" className="nativeIconButton" onClick={() => { hapticTap(); router.back(); }} aria-label="Geri">
              <Icon name="back" />
            </button>
          ) : (
            <span className="nativeBrandMark">C</span>
          )}
          <div className="nativeAppIdentity">
            <b>{nativeRouteTitle(pathname)}</b>
            <small>YTÜ CORE · {connected ? (connectionType === "wifi" ? "Wi-Fi" : connectionType === "cellular" ? "Mobil" : "Bağlı") : "Çevrimdışı"}</small>
          </div>
        </div>

        <div className="nativeAppBarActions">
          <button type="button" className="nativeIconButton" onClick={() => { hapticTap(); setSearchOpen(true); setMoreOpen(false); setQuickOpen(false); }} aria-label="Ara">
            <Icon name="search" />
          </button>
          <button type="button" className="nativeIconButton nativeBadgeButton" onClick={() => navigate("/portal/notifications")} aria-label="Bildirimler">
            <Icon name="bell" />
            {counts.notifications > 0 ? <em>{counts.notifications > 99 ? "99+" : counts.notifications}</em> : null}
          </button>
          <button type="button" className="nativeAvatarButton" onClick={() => navigate("/portal/profile")} aria-label="Profil">
            {memberInitials}
          </button>
        </div>
      </header>

      {!keyboardOpen ? (
        <>
          <button
            type="button"
            className="nativeFab"
            onClick={() => {
              hapticTap();
              setQuickOpen(true);
              setMoreOpen(false);
            }}
            aria-label="Hızlı işlem"
          >
            <Icon name="plus" />
          </button>

          <nav className="nativeBottomTabs" aria-label="CORE mobil ana menü">
            {tabs.map((tab) => (
              <button
                type="button"
                key={tab.href}
                className={activeTab(tab.href) ? "active" : ""}
                aria-current={activeTab(tab.href) ? "page" : undefined}
                onClick={() => navigate(tab.href)}
              >
                <Icon name={tab.icon} />
                <span>{tab.label}</span>
                {tab.href === "/portal/tasks" && counts.tasks > 0 ? <em className="nativeTabBadge">{counts.tasks > 99 ? "99+" : counts.tasks}</em> : null}
                {tab.href === "/portal/chat" && counts.chat > 0 ? <em className="nativeTabBadge">{counts.chat > 99 ? "99+" : counts.chat}</em> : null}
                {tab.href === "/portal/mail" && counts.mail > 0 ? <em className="nativeTabBadge">{counts.mail > 99 ? "99+" : counts.mail}</em> : null}
              </button>
            ))}
            <button
              type="button"
              className={moreOpen ? "active" : ""}
              onClick={() => {
                hapticTap();
                setMoreOpen((value) => !value);
                setQuickOpen(false);
              }}
            >
              <Icon name="more" />
              <span>Daha Fazla</span>
            </button>
          </nav>
        </>
      ) : null}


      {searchOpen ? (
        <div className="nativeSheetBackdrop" role="presentation" onClick={() => setSearchOpen(false)}>
          <section className="nativeSheet nativeSearchSheet" role="dialog" aria-modal="true" aria-label="CORE içinde ara" onClick={(event) => event.stopPropagation()}>
            <div className="nativeSheetHandle" />
            <header>
              <div><span>CORE / SEARCH</span><h2>Ne arıyorsun?</h2></div>
              <button type="button" onClick={() => setSearchOpen(false)}>KAPAT</button>
            </header>
            <form className="nativeSearchForm" action="/portal/search" method="get" onSubmit={() => hapticTap()}>
              <Icon name="search" />
              <input
                name="q"
                autoFocus
                value={moduleQuery}
                onChange={(event) => setModuleQuery(event.target.value)}
                placeholder="Görev, dosya, repo, stok, üye..."
              />
              <button type="submit">ARA</button>
            </form>
            <div className="nativeSearchSuggestions">
              {visibleNativeModules
                .filter((item) => !moduleQuery || (item.label + " " + item.group).toLowerCase().includes(moduleQuery.toLowerCase()))
                .slice(0,10)
                .map((item) => (
                  <button type="button" key={item.href} onClick={() => navigate(item.href)}>
                    <span>{item.code}</span>
                    <div><b>{item.label}</b><small>{item.group}</small></div>
                    <i>›</i>
                  </button>
                ))}
            </div>
          </section>
        </div>
      ) : null}

      {moreOpen ? (
        <div className="nativeSheetBackdrop" role="presentation" onClick={() => setMoreOpen(false)}>
          <section className="nativeSheet nativeMoreSheet" role="dialog" aria-modal="true" aria-label="Tüm CORE modülleri" onClick={(event) => event.stopPropagation()}>
            <div className="nativeSheetHandle" />
            <header>
              <div>
                <span>CORE / TÜM MODÜLLER</span>
                <h2>Çalışma alanı</h2>
              </div>
              <button type="button" onClick={() => setMoreOpen(false)}>KAPAT</button>
            </header>

            <div className="nativeMemberCard">
              <span className="nativeMemberAvatar">{memberInitials}</span>
              <div><b>{memberName}</b><small>{memberRole} · PUSH {pushState.toUpperCase()}</small></div>
              <button type="button" onClick={() => navigate("/portal/profile")}>PROFİL →</button>
            </div>

            {favorites.length || recentRoutes.length ? (
              <div className="nativePersonalRail">
                {favorites.length ? (
                  <section>
                    <p><Icon name="star" /> FAVORİLER</p>
                    <div>
                      {favorites.map((href) => {
                        const item = visibleNativeModules.find((module) => module.href === href);
                        if (!item) return null;
                        return <button type="button" key={href} onClick={() => navigate(href)}><span>{item.code}</span><b>{item.label}</b></button>;
                      })}
                    </div>
                  </section>
                ) : null}
                {recentRoutes.length ? (
                  <section>
                    <p><Icon name="recent" /> SON KULLANILAN</p>
                    <div>
                      {recentRoutes.slice(0,4).map((href) => {
                        const item = visibleNativeModules.find((module) => module.href === href);
                        if (!item) return null;
                        return <button type="button" key={href} onClick={() => navigate(href)}><span>{item.code}</span><b>{item.label}</b></button>;
                      })}
                    </div>
                  </section>
                ) : null}
              </div>
            ) : null}

            <div className="nativeModuleGroups">
              {portalNavigation.map((group) => (
                <section key={group.label}>
                  <p>{group.label}</p>
                  <div>
                    {group.items
                      .filter(([, href]) => href !== "/portal/control" || canControl)
                      .map(([label, href, code]) => (
                      <div className={"nativeModuleItem " + (activeTab(href) ? "active" : "")} key={href}>
                        <button type="button" className="nativeModuleOpen" onClick={() => navigate(href)}>
                          <span>{code}</span>
                          <b>{label}</b>
                          <i>›</i>
                        </button>
                        <button
                          type="button"
                          className={"nativeFavoriteButton " + (favorites.includes(href) ? "active" : "")}
                          aria-label={favorites.includes(href) ? label + " favorilerden çıkar" : label + " favorilere ekle"}
                          onClick={() => toggleFavorite(href)}
                        >
                          ★
                        </button>
                      </div>
                    ))}
                  </div>
                </section>
              ))}
            </div>
          </section>
        </div>
      ) : null}

      {quickOpen ? (
        <div className="nativeSheetBackdrop" role="presentation" onClick={() => setQuickOpen(false)}>
          <section className="nativeSheet nativeQuickSheet" role="dialog" aria-modal="true" aria-label="Hızlı işlemler" onClick={(event) => event.stopPropagation()}>
            <div className="nativeSheetHandle" />
            <header>
              <div><span>HIZLI İŞLEM</span><h2>Ne yapmak istiyorsun?</h2></div>
              <button type="button" onClick={() => setQuickOpen(false)}>KAPAT</button>
            </header>
            <div className="nativeQuickGrid">
              <button type="button" className="nativeCameraQuick" onClick={() => void capturePhoto()}>
                <span><Icon name="camera" /></span>
                <b>Saha fotoğrafı</b>
                <small>Kameradan çek ve doğrudan CORE Vault'a kaydet</small>
              </button>
              <button type="button" className="nativePushQuick" onClick={() => void enablePush()}>
                <span>NT</span>
                <b>{pushState === "registered" ? "Push aktif" : pushState === "denied" ? "Push izni kapalı" : "Push bildirimlerini aç"}</b>
                <small>APNs / FCM tokenını bu cihazın CORE kaydına bağla</small>
              </button>
              <button type="button" className="nativeShareQuick" onClick={() => void shareCurrent()}>
                <span>SH</span>
                <b>Bu ekranı paylaş</b>
                <small>iOS / Android native Share Sheet'i aç</small>
              </button>

              {quickActions.map(([label, href, description], index) => (
                <button type="button" key={href} onClick={() => navigate(href)}>
                  <span>0{index + 1}</span>
                  <b>{label}</b>
                  <small>{description}</small>
                </button>
              ))}
            </div>
          </section>
        </div>
      ) : null}

      {capture ? (
        <div className="nativeSheetBackdrop" role="presentation" onClick={() => !captureBusy && setCapture(null)}>
          <section className="nativeSheet nativeCaptureSheet" role="dialog" aria-modal="true" aria-label="Saha fotoğrafını Vault'a kaydet" onClick={(event) => event.stopPropagation()}>
            <div className="nativeSheetHandle" />
            <header>
              <div><span>NATIVE CAMERA → CORE VAULT</span><h2>Saha kaydı</h2></div>
              <button type="button" disabled={captureBusy} onClick={() => setCapture(null)}>VAZGEÇ</button>
            </header>
            <img src={capture.preview} alt="Çekilen saha fotoğrafı önizlemesi" className="nativeCapturePreview" />
            <form className="nativeCaptureForm" onSubmit={uploadCapture}>
              <label><span>Başlık</span><input name="title" value={captureTitle} onChange={(event) => setCaptureTitle(event.target.value)} required /></label>
              <div>
                <label><span>Takım</span><input name="teamCode" placeholder="MAR / EMB / SYS" /></label>
                <label><span>Proje</span><input name="projectSlug" placeholder="proje-slug" /></label>
              </div>
              <label><span>Ek etiketler</span><input name="tags" placeholder="test, pcb, arıza, prototip" /></label>
              {captureError ? <p className="nativeCaptureError">{captureError}</p> : null}
              <button type="submit" className="nativeCaptureSubmit" disabled={captureBusy}>
                {captureBusy ? "VAULT'A YÜKLENİYOR..." : "FOTOĞRAFI VAULT'A KAYDET →"}
              </button>
            </form>
          </section>
        </div>
      ) : null}

      {exitHint ? <div className="nativeToast">Çıkmak için geri tuşuna tekrar bas.</div> : null}
    </>
  );
}
