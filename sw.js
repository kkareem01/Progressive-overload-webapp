/* Overload service worker — cache the app shell, never cache API. */

const VERSION = 'overload-v3';
const SHELL = [
  '/',
  '/index.html',
  '/styles.css',
  '/manifest.json',
  '/js/app.js',
  '/js/api.js',
  '/js/store.js',
  '/js/pr.js',
  '/js/util.js',
  '/js/status.js',
  '/js/exercises.js',
  '/js/views/day.js',
  '/js/views/logger.js',
  '/js/views/progress.js',
  '/js/views/history.js',
  '/icons/icon.svg',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(VERSION).then((cache) => cache.addAll(SHELL.map((u) => new Request(u, { cache: 'reload' }))))
      .catch(() => { /* shell tolerates missing icons */ })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Never cache the API.
  if (url.pathname.startsWith('/api/')) return;

  // Same-origin GET: stale-while-revalidate.
  if (event.request.method === 'GET' && url.origin === self.location.origin) {
    event.respondWith(
      caches.open(VERSION).then(async (cache) => {
        const cached = await cache.match(event.request);
        const networkPromise = fetch(event.request).then((res) => {
          if (res && res.ok) cache.put(event.request, res.clone());
          return res;
        }).catch(() => cached || Response.error());
        return cached || networkPromise;
      })
    );
  }
});
