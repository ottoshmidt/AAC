// Service worker: makes the app work offline.
//
// Strategy: network first, cache as fallback. When online you always get the
// latest files (no stale versions while developing); when offline the cached
// copy is used. Bump CACHE_NAME when the PRECACHE list changes.
//
// Downloaded voices live in a separate cache managed by js/piper.js
// ('aac-voices-…'); it is left alone here so updates never re-download them.

const CACHE_NAME = 'aac-app-v5';
const VOICE_CACHE_PREFIX = 'aac-voices-';

const PRECACHE = [
  './',
  'index.html',
  'manifest.webmanifest',
  'css/style.css',
  'js/main.js',
  'js/i18n.js',
  'js/items.js',
  'js/piper.js',
  'js/pages.js',
  'js/scanner.js',
  'js/settings.js',
  'js/speech.js',
  'js/ui.js',
  'js/wav.js',
  'vendor/onnxruntime-web/ort.wasm.bundle.min.mjs',
  'vendor/piper-wasm/piper_phonemize.js',
  // Keep in sync with js/items.js (tests/items.test.js checks this).
  'assets/images/apple.svg',
  'assets/images/ball.svg',
  'assets/images/balloon.svg',
  'assets/images/banana.svg',
  'assets/images/bed.svg',
  'assets/images/bird.svg',
  'assets/images/book.svg',
  'assets/images/bread.svg',
  'assets/images/cake.svg',
  'assets/images/car.svg',
  'assets/images/carrot.svg',
  'assets/images/cat.svg',
  'assets/images/fish.svg',
  'assets/images/flower.svg',
  'assets/images/grapes.svg',
  'assets/images/house.svg',
  'assets/images/milk.svg',
  'assets/images/moon.svg',
  'assets/images/orange.svg',
  'assets/images/star.svg',
  'assets/images/strawberry.svg',
  'assets/images/sun.svg',
  'assets/images/tree.svg',
  'assets/images/water.svg',
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
      .then((names) =>
        Promise.all(
          names
            .filter((n) => n !== CACHE_NAME && !n.startsWith(VOICE_CACHE_PREFIX))
            .map((n) => caches.delete(n)),
        ),
      )
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
