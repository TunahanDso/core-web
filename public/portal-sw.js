const CORE_SW_VERSION = "core-portal-v4-1";

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter((key) => key.startsWith("core-portal-") && key !== CORE_SW_VERSION).map((key) => caches.delete(key)));
    await self.clients.claim();
  })());
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  const sensitive =
    url.pathname.startsWith("/portal") ||
    url.pathname.startsWith("/api/portal") ||
    url.pathname.startsWith("/admin");

  if (sensitive) {
    event.respondWith(fetch(request, { cache: "no-store" }));
    return;
  }

  // Public/static requests remain network-first. Authenticated portal data is never cached here.
  event.respondWith(fetch(request));
});
