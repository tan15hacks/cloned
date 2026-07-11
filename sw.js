const CACHE = "hearthvale-continent-v3-9-1";
const ASSETS = [
  "./",
  "./index.html",
  "./styles.css",
  "./chapter-one.css",
  "./chapter-two.css",
  "./combat.css",
  "./progression.css",
  "./seasons.css",
  "./ranching.css",
  "./game.js",
  "./game-shared.js",
  "./game-base.js",
  "./game-actions-1.js",
  "./game-actions-2.js",
  "./game-actions-3.js",
  "./game-services-1.js",
  "./game-services-2.js",
  "./game-services-3.js",
  "./game-services-4.js",
  "./game-render-1.js",
  "./game-render-2.js",
  "./game-render-3.js",
  "./game-ui.js",
  "./game-performance.js",
  "./chapter-one.js",
  "./chapter-two-data.js",
  "./game-chapter-two.js",
  "./game-story-dungeon.js",
  "./game-chapter-two-runtime.js",
  "./game-seasons.js",
  "./game-seasons-runtime.js",
  "./seasons-data.js",
  "./ranch-data.js",
  "./game-ranch-core.js",
  "./game-ranch-render.js",
  "./game-ranch-ui-main.js",
  "./game-ranch-machines.js",
  "./game-ranch-runtime.js",
  "./game-ranch-render-runtime.js",
  "./game-combat.js",
  "./game-combat-runtime.js",
  "./game-world-polish.js",
  "./game-world-polish-runtime.js",
  "./game-living-world.js",
  "./game-living-compat.js",
  "./living-world-data.js",
  "./game-progression-core.js",
  "./game-progression-cave.js",
  "./game-progression-cave-runtime.js",
  "./game-progression-economy.js",
  "./progression-data.js",
  "./world-polish-data.js",
  "./world-stream.js",
  "./world.js",
  "./world-data.js",
  "./monster-data.js",
  "./cave.js",
  "./manifest.webmanifest",
  "./assets/icon.svg"
];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key)))).then(() => self.clients.claim()));
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  const requestUrl = new URL(event.request.url);
  const isCoreCode = requestUrl.pathname.endsWith(".js") || requestUrl.pathname.endsWith(".css") || requestUrl.pathname.endsWith("/index.html");
  if (isCoreCode) {
    event.respondWith(fetch(event.request).then((response) => {
      const copy = response.clone();
      caches.open(CACHE).then((cache) => cache.put(event.request, copy));
      return response;
    }).catch(() => caches.match(event.request).then((cached) => cached || caches.match("./index.html"))));
    return;
  }
  event.respondWith(caches.match(event.request).then((cached) => cached || fetch(event.request).then((response) => {
    const copy = response.clone();
    caches.open(CACHE).then((cache) => cache.put(event.request, copy));
    return response;
  }).catch(() => caches.match("./index.html"))));
});
