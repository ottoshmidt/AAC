# AAC Games

An Augmentative and Alternative Communication (AAC) web app with picture
games for people who can only click. Everything works by **single-switch
scanning**: things light up one after another and a click **anywhere**
selects the lit one, so the user never has to aim the mouse. The same works
with a touch screen, a big-button mouse or any switch that acts as a mouse
click.

The start screen is a menu of games, grouped by category. **Guess items**
starts with **Training**, for learning the click itself, followed by seven
games that differ only in their pictures: **Mixed**, **Fruit**,
**Vegetables**, **Transport**, **Clothes**, **Animals** and **Birds**, 24
pictures each.

In a Guess items game, four pictures are shown in a 2×2 grid (or two side by
side); the highlight moves through them and a click chooses the highlighted
one, which is spoken aloud. The pictures are split into pages of 4 (6 pages).
When every picture on a page has been chosen, the game moves to the next
page, and after the last one it starts over. The caregiver can also turn
pages with the arrow keys.

**Training** is the first step: a single picture lights up for
an interval, goes dark for an interval and lights up again, and its name is
spoken every time it lights up. A click while it is lit speaks the word
again, marks the picture with a ✓ and moves on to the next; a click while it
is dark does nothing. It uses ten everyday pictures from the Mixed set.

The interface and speech are available in **Georgian (ქართული)**,
**Russian (Русский)** and English.

Plain HTML, CSS and JavaScript: no framework, no build step, no npm
dependencies.

## Run it

Browsers restrict pages opened straight from disk, so serve the folder:

```sh
npm start            # or: python3 -m http.server 8080
```

Then open <http://localhost:8080>.

1. The caregiver picks the language and a game on the menu.
2. On the game's page the caregiver adjusts **Settings** if needed and
   clicks **Start**. This goes fullscreen and enables sound. (Scanning
   happens only inside the games; the menu and game pages are operated
   directly.)
3. In **Guess items**, the highlight moves through the pictures (left to right,
   top to bottom).
   A click anywhere selects the highlighted picture, which is spoken aloud.
4. A chosen picture stays in place with a ✓ and is skipped from then on.
   Once every picture on the page has been chosen, the next page appears;
   after the last page the game starts over at page 1.
5. The caregiver can also press **←** / **→** to go to the previous / next
   page (it wraps around; the page starts fresh). The page number is shown in
   the bottom-right corner.
6. To leave the game, tap **‹ Back** in the top-left corner, press Esc, or
   use the phone's Back button or gesture. The scan never lights up Back, so
   a click during the game can't leave it by accident. This returns to the
   game's page; **Back** there returns to the menu.

## Settings

| Setting | Default | Notes |
|---|---|---|
| Pictures at a time | 4 | Page size: 4 (2×2 grid, 6 pages) or 2 (side by side, 12 pages) |
| Highlight each picture for | 2 s | 0.5–10 s |
| Wait after a choice | 2 s | Clicks are ignored during this time |
| Ignore repeated clicks within | 0.3 s | Helps with tremor and double clicks |
| Pause after N rounds with no choice | 0 (never) | With N > 0 the game pauses after N rounds; a click resumes |
| Speak the chosen picture | on | Recorded clip if there is one, otherwise the voice |
| Speak each picture as highlighted | off | Auditory scanning; replaces the tick |
| Tick when the highlight moves | on | Generated sound, no file needed |
| Voice | Georgian: Natia (in-app); Russian, English: browser default | Chosen separately per language; recorded voices appear here once words are recorded |
| Go fullscreen on start | on | Leaving fullscreen ends the game |
| Language | browser language (ka, ru), else English | Buttons at the top of the menu |

While a game runs, the screen is kept on and unlocked (Screen Wake Lock;
Chrome/Android, iOS 16.4+, needs HTTPS). It is released when the game ends.

Settings are on each game's page (below Start) and are saved in the
browser (localStorage) per device.

## Georgian speech

Phones and computers almost never include a Georgian voice, so the app has a
built-in one: **Natia**, a [Piper](https://github.com/rhasspy/piper) neural
voice that runs entirely in the browser.

- **First use downloads about 96 MB** (the voice model, ONNX Runtime and
  espeak-ng data) from jsDelivr and Hugging Face. A status line under the
  game's page shows progress. After that it is kept in the browser's Cache
  Storage and works offline.
- **It runs in a Web Worker** (`js/piper-worker.js`, engine in
  `js/piper-engine.js`), so neither the download nor synthesis blocks the
  interface: the main thread stalls about 15 ms per word instead of the
  150 ms the synthesis itself takes on a fast machine.
- **Every spoken word is cached** in Cache Storage, so a word is synthesised
  once ever rather than once per app start. If all of a game's words are
  already cached, the 96 MB model is not loaded at all, and a cached word
  plays even while the model is still downloading.
- The picture labels of the chosen game are prepared in the background, so
  speech plays instantly during the game (about 0.1–0.2 s per new word).
- Until Natia is ready and for words not yet cached, speech falls back to a
  device voice, which for Georgian is usually silent.
- The Voice setting also lists any Georgian voices the device does have
  (for example `espeak-ng` or RHVoice through speech-dispatcher on Linux).

**License:** the Natia model is a [Piper](https://github.com/rhasspy/piper)
voice trained on the RHVoice Natia recordings, which have a custom license,
not a Creative Commons one. According to the
[RHVoice license page](https://github.com/RHVoice/RHVoice/wiki/License/325174d13f5dd3517d0d15d7bd4fc174355c0e89),
"The Georgian voice can be used free of charge only by individuals for
personal use." Organizations and manufacturers need explicit permission from
the copyright holders before copying, modifying, distributing, selling or
using it. The contacts listed there are Beqa Gozalishvili
(beqaprogger@gmail.com) and Vladimer Urdulashvili
(vladimerurdulashvili@gmail.com). Recorded clips (below) avoid the
restriction entirely and usually sound best.

## Recording words

Instead of a synthetic voice, every word can be a recording, e.g. a parent's
voice. The recording page lives at `record.html` and saves straight into the
project through a small development server:

```sh
npm run record            # then open http://localhost:8888/record.html
```

The page lists every word of the chosen language: the picture labels and
then the letters of that language's own alphabet, shown large instead of a
picture. Pick the language, the voice (**Female voice** or **Male voice**:
each word can be recorded in both) and the **Microphone** (e.g. a USB mic; the
choice is remembered, and the list shows device names once the page has
been allowed to use the microphone), and for each picture click **Record**, say
the word, click **Stop** (or press Space). The clip is trimmed, normalized,
resampled to 16 kHz mono and saved as
`assets/audio/<lang>/<voice>/<id>.wav`; it plays back once and the page
moves on to the next unrecorded word. **Play** replays it, **Record again**
overwrites it, **Delete** removes it. Words that appear in several sets
(ვაშლი in Mixed and Fruit) are recorded once and shared.

In the app, Settings → Voice then offers "Recorded female voice" / "Recorded
male voice" for that language (with how many of the game's words are
recorded); words without a recording fall back to the language's default
voice (Natia for Georgian).

The server also rewrites `js/clips.js` (the word → file registry the app
reads) and the `clips:begin` … `clips:end` block of `sw.js` so the clips
work offline. Commit those two files together with the WAVs and bump
`CACHE_NAME`. Recording needs a secure origin, so use `localhost` on the
computer; on a phone, `adb reverse tcp:8888 tcp:8888` makes
`http://localhost:8888` reach it. It uses port 8888, so it can run next to
`npm start`.

## Russian speech

Most devices already have a Russian voice (Windows, macOS, iOS, Android,
and Chrome's online "Google русский"), so Russian uses the device voice by
default. For offline use, or where there is no Russian voice (e.g. Firefox on
Linux without speech-dispatcher), choose the in-app **Denis** voice in
Settings → Voice. It downloads like Natia; if Natia is already downloaded,
only Denis's own 63 MB model is new. Denis is licensed **CC0**, free for any
use.

## Changing the pictures

The picture sets live in `js/items.js` (`itemSets`), one list per Guess
items game, 24 pictures each. Pages are cut from a list in order, so keep
related pictures together in runs of 4. Each item has a label per language
and, optionally, a recorded clip per language:

```js
export const items = [
  item('apple', 'ვაშლი', 'Apple'), // image: assets/images/apple.svg
  {
    id: 'ball',
    image: 'assets/images/ball.svg',
    label: { ka: 'ბურთი', en: 'Ball' },
    audio: { ka: 'assets/audio/ka/ball.mp3' },
  },
];
```

- `label` is shown under the picture and spoken on selection.
- `audio` (optional) plays a recorded clip instead of text-to-speech, e.g. a
  familiar person's voice. Use MP3 or WAV, which play in every browser.
  Clips made with the recording page (see above) need no `audio` field:
  they are found by label and voice through `js/clips.js`.

**Picture credits.** The Mixed set and a few pictures in the other sets
(pomegranate, plum, fig, apricot, quince, persimmon, pumpkin, beet, radish,
zucchini, cauliflower, ostrich, magpie, swallow, heron) were drawn for this
app; the whole Animals set, the apple, banana, orange, grapes, strawberry,
carrot, cabbage, lettuce, garlic, onion, sweet potato, bread, cake, milk,
water and the sparrow, stork, woodpecker, hummingbird, crow and seagull are
the project owner's own pictures. All other pictures are
[Twemoji](https://github.com/jdecked/twemoji) graphics, © Twitter and
contributors, licensed
[CC-BY 4.0](https://creativecommons.org/licenses/by/4.0/); files are named
by item rather than by emoji code.

Add new files to the `PRECACHE` list in `sw.js` and bump `CACHE_NAME` so
they are available offline. `npm test` fails if an image is missing or not
precached.

## Adding a game

Games live in `js/games/`, and are listed in `js/games/index.js` together
with the category order (`CATEGORIES`). A game module exports one or more
`GameInfo` objects:

```js
export const info = {
  id: 'guess-fruit',
  category: 'guess',       // menu group; name in categories.<category>.name
  textId: 'guess',         // optional: share help text/settings with other games
  icon: 'assets/images/fruit/apple.svg',
  items: itemSets.fruit,   // optional: the pictures it speaks (voice preparation)
  create: (ctx) => new GuessGame(ctx, itemSets.fruit),
};
```

`create` returns an object with `start()`, `stop()`, `press()` and
`key(event)`. The shell (`js/main.js`) gives the game a context with its
screen element (`ctx.root`), a slot in the top bar next to Back for its own
tap-only buttons (`ctx.controls`, e.g. page arrows), the current settings and
language, the speech engine and `speakItem(item)`; it forwards every click on the game screen as
`press()` and every key (except Esc, which returns to the menu) as
`key(event)`. The game draws its own screen inside `ctx.root` and clears it
in `stop()`.

Then add `games.<id>.name` (and `games.<textId>.help`, plus
`categories.<category>.name` for a new category) to every language in
`js/i18n.js`, put the icon in `sw.js`'s `PRECACHE`, and bump `CACHE_NAME`.
Settings shared by a category go in a `<fieldset data-category="<category>">`
in `index.html`; it is shown only on those games' pages. `npm test` checks
all of that.

## Translations

Interface text lives in `js/i18n.js`. To add a language, add it to
`LANGUAGES` and `STRINGS` there, to `LANGUAGE_CODES` and `VOICE_KEYS` (plus
a default voice) in `js/settings.js`, and a label to each item. Optionally
add an in-app voice to `PIPER_VOICES` in `js/piper-engine.js`. `npm test` checks
that no string or label is missing.

## Project layout

```
index.html            start screen and game screen
css/style.css         layout and highlight styles
js/main.js            app shell: menu, language, settings, voices
js/games/index.js     list of games shown on the menu
js/games/guess.js     the Guess items games (one per picture set)
js/games/train.js     the Training game (one picture at a time)
js/scanner.js         scanning logic (no DOM; unit-tested)
js/pages.js           pages and progress through them (unit-tested)
js/settings.js        defaults, limits, load/save
js/i18n.js            languages and interface strings
js/speech.js          chooses clip, in-app voice or device voice; tick sound
js/piper.js           in-app Piper voices: worker client, speech cache
js/piper-engine.js    the Piper engine (download, phonemize, model, WAV)
js/piper-worker.js    runs the engine off the main thread
js/wav.js             WAV encoder for synthesized speech
js/wakelock.js        keeps the screen on during a game
js/ui.js              the shell's DOM (menu, settings form, notes)
js/items.js           the picture sets
vendor/               small third-party JS glue for Piper (see vendor/README.md)
sw.js                 service worker for offline use
manifest.webmanifest  makes the app installable
tests/                unit tests (node --test)
```

## Tests

```sh
npm test
```

Requires Node.js 20.11 or newer. No packages to install.

## Deploying

The app is static files, so any web server works: nginx, Apache, Caddy,
GitHub Pages, Netlify.

- **HTTPS is required** for offline use and "Install app" (except on
  `localhost`).
- Serve `sw.js` with `Cache-Control: no-cache` so updates reach users.
- Use relative paths only (already the case), so the app also works from a
  subfolder such as `https://example.com/aac/`.

- The Georgian voice files come from `cdn.jsdelivr.net` and `huggingface.co`
  at pinned versions. To host them yourself, copy them to your server and
  change the URLs in `js/piper-engine.js`.

Example Caddy config:

```
aac.example.com {
    root * /srv/aac
    file_server
    header /sw.js Cache-Control "no-cache"
}
```

## Text-to-speech on Linux

Browsers use `speech-dispatcher` on Linux. If the voice list is empty, install
it with a voice, e.g. on Arch: `sudo pacman -S speech-dispatcher espeak-ng`.
