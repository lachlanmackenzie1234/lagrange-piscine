/* Service worker — offline cache for the app shell. Bump VERSION on release. */
const VERSION = 'lp-v0.34';
const ASSETS = [
  './',
  './index.html',
  './css/styles.css',
  './js/i18n.js',
  './js/photos.js',
  './js/weather.js',
  './js/sync.js',
  './js/seed.js',
  './js/store.js',
  './js/app.js',
  './manifest.webmanifest',
  './icons/icon.svg',
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(VERSION).then((c) => c.addAll(ASSETS)).then(() => self.skipWaiting()));
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
