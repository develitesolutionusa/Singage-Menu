/* Signage player service worker — cache media for brief offline survival */
const CACHE_NAME = "signage-media-v1";

self.addEventListener("install", (event) => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)),
      );
      await self.clients.claim();
    })(),
  );
});

self.addEventListener("message", (event) => {
  const data = event.data;
  if (!data || data.type !== "PRECACHE_URLS" || !Array.isArray(data.urls)) {
    return;
  }
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE_NAME);
      await Promise.all(
        data.urls.map(async (url) => {
          try {
            if (await cache.match(url)) return;
            const res = await fetch(url, { mode: "no-cors", credentials: "omit" });
            // opaque responses from no-cors still help for same-origin-ish CDN use;
            // prefer cors when available
            if (res.type === "opaque" || res.ok) {
              await cache.put(url, res);
              return;
            }
          } catch {
            // try cors fetch
          }
          try {
            const res = await fetch(url, { mode: "cors", credentials: "omit" });
            if (res.ok) await cache.put(url, res.clone());
          } catch {
            // ignore individual failures
          }
        }),
      );
    })(),
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;

  const url = new URL(req.url);
  const isMedia =
    url.pathname.includes("/storage/v1/object/public/media/") ||
    /\.(png|jpe?g|gif|webp|mp4|webm|mov)(\?|$)/i.test(url.pathname);

  if (!isMedia) return;

  event.respondWith(
    (async () => {
      const cache = await caches.open(CACHE_NAME);
      const cached = await cache.match(req);
      if (cached) return cached;

      try {
        const fresh = await fetch(req);
        if (fresh.ok) {
          cache.put(req, fresh.clone());
        }
        return fresh;
      } catch (err) {
        if (cached) return cached;
        throw err;
      }
    })(),
  );
});
