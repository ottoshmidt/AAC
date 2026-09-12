# AAC Games

An Augmentative and Alternative Communication (AAC) web app with picture
games for people who can only click. Everything works by **single-switch
scanning**: things light up one after another and a click **anywhere**
selects the lit one, so the user never has to aim the mouse. The same works
with a touch screen, a big-button mouse or any switch that acts as a mouse
click.

The start screen is a menu of games. There is one game so far:

- **Guess items.** Four pictures in a 2×2 grid (or two side by side); the
  highlight moves through them and a click chooses the highlighted one, which
  is spoken aloud. The 24 pictures are split into pages of 4 (6 pages, grouped
  by topic). When every picture on a page has been chosen, the game moves to
  the next page, and after the last one it starts over. The caregiver can also
  turn pages with the arrow keys.

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

1. The caregiver picks the language and adjusts **Settings** on the start
   screen if needed.
2. Click a game card. The game's page shows its description and settings;
   click **Start**. This goes fullscreen and enables sound.
3. In **Guess items**, the highlight moves through the pictures (left to right,
   top to bottom).
   A click anywhere selects the highlighted picture, which is spoken aloud.
4. A chosen picture stays in place with a ✓ and is skipped from then on.
   Once every picture on the page has been chosen, the next page appears;
   after the last page the game starts over at page 1.
5. The caregiver can also press **←** / **→** to go to the previous / next
   page (it wraps around; the page starts fresh). The page number is shown in
   the bottom-right corner.
6. To leave the game: press **Esc**, use the phone's **Back** button or
   gesture, or **hold ✕** in the top-right corner for 2 seconds (a plain
   tap does nothing, so it can't happen by accident). This returns to the
   game's page; **Back** there returns to the menu.

## Settings

| Setting | Default | Notes |
|---|---|---|
| Pictures at a time | 4 | Page size: 4 (2×2 grid, 6 pages) or 2 (side by side, 12 pages) |
| Highlight each picture for | 2 s | 0.5–10 s |
| Wait after a choice | 2 s | Clicks are ignored during this time |
| Ignore repeated clicks within | 0.3 s | Helps with tremor and double clicks |
| Pause after N rounds with no choice | 5 | 0 = never pause; a click resumes |
| Speak the chosen picture | on | Recorded clip if there is one, otherwise the voice |
| Speak each picture as highlighted | off | Auditory scanning; replaces the tick |
| Tick when the highlight moves | on | Generated sound, no file needed |
| Voice | Georgian: Natia (in-app); Russian, English: browser default | Chosen separately per language |
| Go fullscreen on start | on | Leaving fullscreen ends the game |
| Language | browser language (ka, ru), else English | Buttons at the top of the menu |

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
- The picture labels are prepared in the background, so speech plays
  instantly during the game (about 0.1–0.2 s per word to prepare).
- Until Natia is ready, speech falls back to a device voice, which for
  Georgian is usually silent.
- The Voice setting also lists any Georgian voices the device does have
  (for example `espeak-ng` or RHVoice through speech-dispatcher on Linux).

**License:** Natia is trained on the RHVoice Natia recordings, licensed
**CC BY-NC-SA 4.0**. It is free for personal, non-commercial use only;
organizations need permission from the copyright holders. Recorded clips
(below) avoid the restriction entirely and usually sound best.

## Russian speech

Most devices already have a Russian voice (Windows, macOS, iOS, Android,
and Chrome's online "Google русский"), so Russian uses the device voice by
default. For offline use, or where there is no Russian voice (e.g. Firefox on
Linux without speech-dispatcher), choose the in-app **Denis** voice in
Settings → Voice. It downloads like Natia; if Natia is already downloaded,
only Denis's own 63 MB model is new. Denis is licensed **CC0**, free for any
use.

## Changing the pictures

There are 24 pictures on 6 pages: fruit, food, drinks and home, toys, sky
and tree, flower and animals. Edit `js/items.js` to change them. Pages are
cut from the list in order, so keep related pictures together in runs of 4.
Each item has a label per language and, optionally, a recorded clip per
language:

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

Add new files to the `PRECACHE` list in `sw.js` and bump `CACHE_NAME` so
they are available offline. `npm test` fails if an image is missing or not
precached.

## Adding a game

Games live in `js/games/`, one module each, and are listed in
`js/games/index.js` (menu order). A game module exports an `info` object:

```js
export const info = {
  id: 'guess',
  icon: 'assets/icons/game-guess.svg',
  create: (ctx) => new GuessGame(ctx),
};
```

`create` returns an object with `start()`, `stop()`, `press()` and
`key(event)`. The shell (`js/main.js`) gives the game a context with its
screen element (`ctx.root`), the current settings and language, the speech
engine and `speakItem(item)`; it forwards every click on the game screen as
`press()` and every key (except Esc, which returns to the menu) as
`key(event)`. The game draws its own screen inside `ctx.root` and clears it
in `stop()`.

Then add `games.<id>.name`, `.description` and `.help` to every language in
`js/i18n.js`, put the icon in `assets/icons/` and in `sw.js`'s `PRECACHE`,
and bump `CACHE_NAME`. Settings that belong only to the game go in a
`<fieldset data-game="<id>">` in `index.html`; it is shown only on that
game's page. `npm test` checks all of that.

## Translations

Interface text lives in `js/i18n.js`. To add a language, add it to
`LANGUAGES` and `STRINGS` there, to `LANGUAGE_CODES` and `VOICE_KEYS` (plus
a default voice) in `js/settings.js`, and a label to each item. Optionally
add an in-app voice to `PIPER_VOICES` in `js/piper.js`. `npm test` checks
that no string or label is missing.

## Project layout

```
index.html            start screen and game screen
css/style.css         layout and highlight styles
js/main.js            app shell: menu, language, settings, voices
js/games/index.js     list of games shown on the menu
js/games/guess.js     the Guess items game (its screen, scanning, pages)
js/scanner.js         scanning logic (no DOM; unit-tested)
js/pages.js           pages and progress through them (unit-tested)
js/settings.js        defaults, limits, load/save
js/i18n.js            languages and interface strings
js/speech.js          chooses clip, in-app voice or device voice; tick sound
js/piper.js           in-app Piper voices (download, cache, synthesis)
js/wav.js             WAV encoder for synthesized speech
js/ui.js              the shell's DOM (menu, settings form, notes)
js/items.js           the pictures
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
  change the URLs in `js/piper.js`.

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
