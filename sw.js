// Service worker: makes the app work offline.
//
// Strategy: network first, cache as fallback. When online you always get the
// latest files (no stale versions while developing); when offline the cached
// copy is used. Requests revalidate with the server ('no-cache'), otherwise
// the browser's HTTP cache could hand back old files for hours on servers
// that send no cache headers, and even mix old and new files. Bump CACHE_NAME when the PRECACHE list changes.
//
// Downloaded voices live in a separate cache managed by js/piper.js
// ('aac-voices-…'); it is left alone here so updates never re-download them.

const CACHE_NAME = 'aac-app-v66';
const VOICE_CACHE_PREFIX = 'aac-voices-';

const PRECACHE = [
  './',
  'index.html',
  'manifest.webmanifest',
  'css/style.css',
  'js/main.js',
  'js/games/index.js',
  'js/games/guess.js',
  'js/games/letters.js',
  'js/games/train.js',
  'js/i18n.js',
  'js/items.js',
  'js/letters.js',
  'js/piper.js',
  'js/piper-engine.js',
  'js/piper-worker.js',
  'js/pages.js',
  'js/scanner.js',
  'js/settings.js',
  'js/speech.js',
  'js/ui.js',
  'js/clips.js',
  'js/wav.js',
  'js/wakelock.js',
  'vendor/onnxruntime-web/ort.wasm.bundle.min.mjs',
  'vendor/piper-wasm/piper_phonemize.js',
  // Every picture under assets/images (tests/items.test.js checks this).
  'assets/images/animals/bear.webp',
  'assets/images/animals/camel.webp',
  'assets/images/animals/cat.webp',
  'assets/images/animals/cow.webp',
  'assets/images/animals/deer.webp',
  'assets/images/animals/dog.webp',
  'assets/images/animals/elephant.webp',
  'assets/images/animals/fox.webp',
  'assets/images/animals/frog.webp',
  'assets/images/animals/giraffe.webp',
  'assets/images/animals/goat.webp',
  'assets/images/animals/hedgehog.webp',
  'assets/images/animals/horse.webp',
  'assets/images/animals/lion.webp',
  'assets/images/animals/monkey.webp',
  'assets/images/animals/mouse.webp',
  'assets/images/animals/pig.webp',
  'assets/images/animals/rabbit.webp',
  'assets/images/animals/sheep.webp',
  'assets/images/animals/squirrel.webp',
  'assets/images/animals/tiger.webp',
  'assets/images/animals/turtle.webp',
  'assets/images/animals/wolf.webp',
  'assets/images/animals/zebra.webp',
  'assets/images/apple.webp',
  'assets/images/ball.svg',
  'assets/images/balloon.svg',
  'assets/images/banana.webp',
  'assets/images/bed.svg',
  'assets/images/bird.webp',
  'assets/images/birds/chick.svg',
  'assets/images/birds/chicken.svg',
  'assets/images/birds/crow.webp',
  'assets/images/birds/dove.svg',
  'assets/images/birds/duck.svg',
  'assets/images/birds/eagle.svg',
  'assets/images/birds/flamingo.svg',
  'assets/images/birds/goose.svg',
  'assets/images/birds/heron.svg',
  'assets/images/birds/hummingbird.webp',
  'assets/images/birds/magpie.svg',
  'assets/images/birds/ostrich.svg',
  'assets/images/birds/owl.svg',
  'assets/images/birds/parrot.svg',
  'assets/images/birds/peacock.svg',
  'assets/images/birds/penguin.svg',
  'assets/images/birds/rooster.svg',
  'assets/images/birds/seagull.webp',
  'assets/images/birds/sparrow.webp',
  'assets/images/birds/stork.webp',
  'assets/images/birds/swallow.svg',
  'assets/images/birds/swan.svg',
  'assets/images/birds/turkey.svg',
  'assets/images/birds/woodpecker.webp',
  'assets/images/book.svg',
  'assets/images/bread.webp',
  'assets/images/cake.webp',
  'assets/images/car.svg',
  'assets/images/carrot.webp',
  'assets/images/cat.webp',
  'assets/images/clothes/backpack.svg',
  'assets/images/clothes/blouse.svg',
  'assets/images/clothes/boots.svg',
  'assets/images/clothes/cap.svg',
  'assets/images/clothes/coat.svg',
  'assets/images/clothes/dress.svg',
  'assets/images/clothes/glasses.svg',
  'assets/images/clothes/gloves.svg',
  'assets/images/clothes/handbag.svg',
  'assets/images/clothes/hat.svg',
  'assets/images/clothes/high-heels.svg',
  'assets/images/clothes/hiking-boots.svg',
  'assets/images/clothes/jeans.svg',
  'assets/images/clothes/necktie.svg',
  'assets/images/clothes/sandals.svg',
  'assets/images/clothes/scarf.svg',
  'assets/images/clothes/shoes.svg',
  'assets/images/clothes/shorts.svg',
  'assets/images/clothes/sneakers.svg',
  'assets/images/clothes/socks.svg',
  'assets/images/clothes/sun-hat.svg',
  'assets/images/clothes/sunglasses.svg',
  'assets/images/clothes/t-shirt.svg',
  'assets/images/clothes/umbrella.svg',
  'assets/images/fish.webp',
  'assets/images/flower.svg',
  'assets/images/fruit/apple.webp',
  'assets/images/fruit/apricot.svg',
  'assets/images/fruit/avocado.svg',
  'assets/images/fruit/banana.webp',
  'assets/images/fruit/blueberries.svg',
  'assets/images/fruit/cherries.svg',
  'assets/images/fruit/coconut.svg',
  'assets/images/fruit/fig.svg',
  'assets/images/fruit/grapes.webp',
  'assets/images/fruit/green-apple.svg',
  'assets/images/fruit/kiwi.svg',
  'assets/images/fruit/lemon.svg',
  'assets/images/fruit/mango.svg',
  'assets/images/fruit/melon.svg',
  'assets/images/fruit/orange.webp',
  'assets/images/fruit/peach.svg',
  'assets/images/fruit/pear.svg',
  'assets/images/fruit/persimmon.svg',
  'assets/images/fruit/pineapple.svg',
  'assets/images/fruit/plum.svg',
  'assets/images/fruit/pomegranate.svg',
  'assets/images/fruit/quince.svg',
  'assets/images/fruit/strawberry.webp',
  'assets/images/fruit/watermelon.svg',
  'assets/images/grapes.webp',
  'assets/images/house.svg',
  'assets/images/milk.webp',
  'assets/images/moon.svg',
  'assets/images/orange.webp',
  'assets/images/star.svg',
  'assets/images/strawberry.webp',
  'assets/images/sun.svg',
  'assets/images/transport/airplane.svg',
  'assets/images/transport/ambulance.svg',
  'assets/images/transport/bicycle.svg',
  'assets/images/transport/bus.svg',
  'assets/images/transport/cable-car.svg',
  'assets/images/transport/car.svg',
  'assets/images/transport/fire-engine.svg',
  'assets/images/transport/helicopter.svg',
  'assets/images/transport/kick-scooter.svg',
  'assets/images/transport/metro.svg',
  'assets/images/transport/minibus.svg',
  'assets/images/transport/motorcycle.svg',
  'assets/images/transport/police-car.svg',
  'assets/images/transport/rocket.svg',
  'assets/images/transport/sailboat.svg',
  'assets/images/transport/scooter.svg',
  'assets/images/transport/ship.svg',
  'assets/images/transport/speedboat.svg',
  'assets/images/transport/taxi.svg',
  'assets/images/transport/tractor.svg',
  'assets/images/transport/train.svg',
  'assets/images/transport/tram.svg',
  'assets/images/transport/trolleybus.svg',
  'assets/images/transport/truck.svg',
  'assets/images/tree.svg',
  'assets/images/vegetables/beans.webp',
  'assets/images/vegetables/beet.webp',
  'assets/images/vegetables/bell-pepper.webp',
  'assets/images/vegetables/broccoli.webp',
  'assets/images/vegetables/cabbage.webp',
  'assets/images/vegetables/carrot.webp',
  'assets/images/vegetables/cauliflower.webp',
  'assets/images/vegetables/corn.webp',
  'assets/images/vegetables/cucumber.webp',
  'assets/images/vegetables/eggplant.webp',
  'assets/images/vegetables/garlic.webp',
  'assets/images/vegetables/green-beans.webp',
  'assets/images/vegetables/hot-pepper.svg',
  'assets/images/vegetables/lettuce.webp',
  'assets/images/vegetables/mushroom.webp',
  'assets/images/vegetables/olives.webp',
  'assets/images/vegetables/onion.webp',
  'assets/images/vegetables/peas.webp',
  'assets/images/vegetables/potato.webp',
  'assets/images/vegetables/pumpkin.webp',
  'assets/images/vegetables/radish.webp',
  'assets/images/vegetables/sweet-potato.webp',
  'assets/images/vegetables/tomato.webp',
  'assets/images/vegetables/zucchini.webp',
  'assets/images/water.webp',
  'assets/icons/icon.svg',
  'assets/icons/game-guess.svg',
  'assets/icons/letters-ka.svg',
  'assets/icons/letters-en.svg',
  'assets/icons/letters-ru.svg',
  'assets/icons/icon-192.png',
  'assets/icons/icon-512.png',
  // clips:begin (generated by scripts/record-server.mjs)
  'assets/audio/ka/male/apple.wav',
  // clips:end
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(PRECACHE.map((url) => new Request(url, { cache: 'no-cache' }))))
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

/**
 * The same request, but checked with the server instead of the HTTP cache.
 * A navigation request can't be copied with options, so it's rebuilt from its URL.
 * @param {Request} request
 */
function revalidating(request) {
  return request.mode === 'navigate'
    ? new Request(request.url, { cache: 'no-cache', credentials: 'same-origin' })
    : new Request(request, { cache: 'no-cache' });
}

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET' || new URL(request.url).origin !== self.location.origin) return;

  event.respondWith(
    fetch(revalidating(request))
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
