const CACHE = "hearthvale-continent-v3-20-1";
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
  "./interiors.css",
  "./relationships.css",
  "./cooking.css",
  "./fishing.css",
  "./museum.css",
  "./storage.css",
  "./farmstead-expansion.css",
  "./workshop-automation.css",
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
  "./expanded-interiors-data.js",
  "./game-expanded-interiors.js",
  "./game-expanded-interiors-render.js",
  "./game-expanded-interiors-runtime.js",
  "./relationship-data.js",
  "./game-relationships.js",
  "./game-relationships-runtime.js",
  "./game-relationships-security.js",
  "./cooking-data.js",
  "./game-cooking.js",
  "./game-cooking-runtime.js",
  "./fishing-data.js",
  "./fishing-region-data.js",
  "./game-fishing.js",
  "./game-fishing-runtime.js",
  "./museum-data.js",
  "./game-museum.js",
  "./game-museum-runtime.js",
  "./inventory-storage-data.js",
  "./game-storage.js",
  "./game-storage-runtime.js",
  "./game-storage-overflow-runtime.js",
  "./farmstead-expansion-data.js",
  "./game-farmstead-expansion.js",
  "./game-farmstead-expansion-runtime.js",
  "./game-farmstead-stream-runtime.js",
  "./workshop-automation-data.js",
  "./game-workshop-automation.js",
  "./game-workshop-automation-runtime.js",
  "./game-workshop-automation-stream-runtime.js",
  "./farmstead-art-atlas-chunk-0.js",
  "./farmstead-art-atlas-chunk-1.js",
  "./farmstead-art-atlas-chunk-2.js",
  "./farmstead-art-atlas-chunk-3.js",
  "./farmstead-art-atlas-chunk-4.js",
  "./farmstead-art-data.js",
  "./game-farmstead-art.js",
  "./farmstead-object-art-atlas-chunk-0.js",
  "./farmstead-object-art-atlas-chunk-1.js",
  "./farmstead-object-art-atlas-chunk-2.js",
  "./farmstead-object-art-data.js",
  "./game-farmstead-object-art.js",
  "./game-farmstead-prop-art.js",
  "./game-farmstead-farming-art.js",
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
