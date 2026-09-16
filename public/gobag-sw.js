/* GoBag only: cache public checklist pages and their static assets, never APIs. */
const CACHE = "gobag-offline-v1";
const isPage = (url) =>
  url.pathname === "/go-bag" ||
  url.pathname === "/go-bag/" ||
  (url.hostname === "gobag.creditcardchris.com" && url.pathname === "/");
const isAsset = (url) =>
  url.pathname.startsWith("/_next/static/") ||
  url.pathname.startsWith("/gobag/");
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) =>
  event.waitUntil(
    (async () => {
      for (const name of await caches.keys())
        if (name.startsWith("gobag-offline-") && name !== CACHE)
          await caches.delete(name);
      await self.clients.claim();
    })(),
  ),
);
self.addEventListener("message", (event) => {
  if (event.data?.type !== "PREPARE_OFFLINE") return;
  event.waitUntil(
    (async () => {
      try {
        const cache = await caches.open(CACHE);
        const page = new URL("/go-bag", self.location.origin);
        const response = await fetch(page.href, {
          cache: "reload",
          headers: { Accept: "text/html" },
        });
        if (
          !response.ok ||
          !response.headers.get("content-type")?.includes("text/html")
        )
          throw new Error("Page unavailable");
        const html = await response.clone().text();
        const htmlAssets = Array.from(
          html.matchAll(/(?:src|href)="([^"<>]+)"/g),
          (m) => m[1].replaceAll("&amp;", "&"),
        );
        const urls = [
          ...new Set([
            ...htmlAssets,
            ...(Array.isArray(event.data.assets) ? event.data.assets : []),
          ]),
        ]
          .map((path) => new URL(path, self.location.origin))
          .filter((url) => url.origin === self.location.origin && isAsset(url));
        await Promise.all(
          urls.map(async (url) => {
            const result = await fetch(url.href, { cache: "reload" });
            if (!result.ok) throw new Error("Asset unavailable");
            await cache.put(url.href, result);
          }),
        );
        // Publish the offline shell only after its complete dependency set is stored.
        await cache.put(page.href, response);
        event.ports[0]?.postMessage({ ok: true });
      } catch {
        event.ports[0]?.postMessage({ ok: false });
      }
    })(),
  );
});
self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);
  if (event.request.method !== "GET" || url.origin !== self.location.origin)
    return;
  if (event.request.mode === "navigate" && isPage(url)) {
    event.respondWith(
      (async () => {
        try {
          const response = await fetch(event.request);
          if (response.ok) return response;
          const saved = await caches.match(
            new URL("/go-bag", self.location.origin).href,
            { cacheName: CACHE },
          );
          return saved || response;
        } catch {
          return (
            (await caches.match(new URL("/go-bag", self.location.origin).href, {
              cacheName: CACHE,
            })) ||
            new Response(
              "Open GoBag online and save it for offline use first.",
              { status: 503, headers: { "Content-Type": "text/plain" } },
            )
          );
        }
      })(),
    );
  } else if (isAsset(url)) {
    event.respondWith(
      (async () => {
        const cache = await caches.open(CACHE);
        const saved = await cache.match(event.request);
        if (saved) return saved;
        const response = await fetch(event.request);
        if (response.ok) await cache.put(event.request, response.clone());
        return response;
      })(),
    );
  }
});
