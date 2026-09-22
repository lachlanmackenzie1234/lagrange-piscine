/* Service worker — offline cache for the app shell. Bump VERSION on release. */
const VERSION = 'lp-v0.105.0';
const ASSETS = [
  './',
  './index.html',
  './css/styles.css',
  './js/i18n.js',
  './js/photos.js',
  './js/weather.js',
  './js/sync.js',
  './js/quest-core.js',
  './js/quest-profiles.js',
  './js/seed.js',
  './js/store.js',
  './js/app.js',
  './js/pixelart.js',
  './js/pixel-surface.js',
  './js/keeper-art.js',
  './js/maps.js',
  './js/game-motion.js',
  './js/quest-npcs.js',
  './js/quest-ecology.js',
  './js/quest-zones.js',
  './js/living-world.js',
  './js/hub-art.js',
  './js/game.js',
  './assets/quest-hubs/props.png',
  './assets/quest-hubs/manifest.json',
  './assets/quest-world/foliage.png',
  './assets/quest-world/foliage.json',
  './assets/quest-zones/zones.png',
  './assets/quest-zones/manifest.json',
  './assets/quest-motion/manifest.json',
  './assets/quest-motion/monsters.png',
  './assets/quest-motion/auras.png',
  './assets/quest-motion/effects.png',
  './assets/quest-motion/water.png',
  './assets/quest-motion/loot.png',
  './assets/quest-motion/creatures.png',
  './assets/quest-motion/depot.png',
  './assets/quest-hires/manifest.json',
  './assets/quest-hires/bureau.png',
  './assets/quest-hires/depot.png',
  './assets/quest-hires/npcs.png',
  './assets/quest-hires/keepers.png',
  './assets/quest-hires/actors.png',
  './assets/quest-hires/icons.png',
  './assets/quest-hires/tiles.png',
  './assets/quest-hires/water.png',
  './assets/quest-people/manifest.json',
  './assets/quest-people/people.png',
  './assets/quest-hair/manifest.json',
  './assets/quest-hair/hair.png',
  './manifest.webmanifest',
  './fonts/PixelifySans-Regular.ttf',
  './icons/icon.svg',
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(VERSION).then((c) => c.addAll(ASSETS.map(asset => new Request(asset, { cache: 'reload' })))).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  const url = new URL(e.request.url);

  // Cache the Leaflet map library (CDN) for offline use; map tiles stay online-only.
  if (url.hostname === 'unpkg.com' && url.pathname.includes('/leaflet')) {
    e.respondWith(caches.open('lp-vendor').then(async (c) => {
      const hit = await c.match(e.request);
      if (hit) return hit;
      const res = await fetch(e.request);
      if (res.ok) c.put(e.request, res.clone());
      return res;
    }).catch(() => fetch(e.request)));
    return;
  }

  // Cache the Firebase SDK (gstatic) so Team Sync works offline after first load.
  if (url.hostname === 'www.gstatic.com' && url.pathname.includes('/firebasejs/')) {
    e.respondWith(caches.open('lp-vendor').then(async (c) => {
      const hit = await c.match(e.request);
      if (hit) return hit;
      const res = await fetch(e.request);
      if (res.ok) c.put(e.request, res.clone());
      return res;
    }).catch(() => fetch(e.request)));
    return;
  }

  if (url.origin !== location.origin) return; // let other cross-origin requests pass through

  // Network-first: always prefer fresh code/data when online; fall back to
  // cache (and finally the app shell) only when offline. Avoids stale JS/CSS.
  e.respondWith(
    fetch(e.request)
      .then((res) => {
        const copy = res.clone();
        caches.open(VERSION).then((c) => c.put(e.request, copy));
        return res;
      })
      .catch(() => caches.match(e.request).then((hit) => hit || caches.match('./index.html')))
  );
});
