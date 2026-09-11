// Service worker: makes the app work offline.
//
// Strategy: network first, cache as fallback. When online you always get the
// latest files (no stale versions while developing); when offline the cached
// copy is used. Bump CACHE_NAME when the PRECACHE list changes.

const CACHE_NAME = 'aac-v1';

const PRECACHE = [
  './',
  'index.html',
  'manifest.webmanifest',
  'css/style.css',
  'js/main.js',
  'js/items.js',
  'js/scanner.js',
  'js/settings.js',
  'js/speech.js',
  'js/ui.js',
  'assets/images/apple.svg',
  'assets/images/ball.svg',
  'assets/icons/icon.svg',
  'assets/icons/icon-192.png',
  'assets/icons/icon-512.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(PRECACHE))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((names) => Promise.all(names.filter((n) => n !== CACHE_NAME).map((n) => caches.delete(n))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET' || new URL(request.url).origin !== self.location.origin) return;

  event.respondWith(
    fetch(request)
      .then((response) => {
        if (response.ok) {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
        }
        return response;
      })
      .catch(() =>
        caches
          .match(request, { ignoreSearch: true })
          .then((cached) => cached ?? (request.mode === 'navigate' ? caches.match('index.html') : undefined))
          .then((cached) => cached ?? Response.error()),
      ),
  );
});
