# AAC Choice

An Augmentative and Alternative Communication (AAC) web app for people who
can only click. Two pictures are shown side by side and a highlight moves
between them. A click **anywhere** selects the highlighted picture, so the
user never has to aim the mouse (single-switch scanning). The same works with
a touch screen, a big-button mouse or any switch that acts as a mouse click.

The interface and speech are available in **Georgian (ქართული)** and
English.

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
2. Click **Start**. This goes fullscreen and enables sound.
3. The highlight moves left and right. A click anywhere selects the
   highlighted picture, which is spoken aloud.
4. Press **Esc** to return to the start screen.

## Settings

| Setting | Default | Notes |
|---|---|---|
| Highlight each side for | 2 s | 0.5–10 s |
| Wait after a choice | 2 s | Clicks are ignored during this time |
| Ignore repeated clicks within | 0.3 s | Helps with tremor and double clicks |
| Pause after N rounds with no choice | 5 | 0 = never pause; a click resumes |
| Speak the chosen picture | on | Recorded clip if there is one, otherwise the voice |
| Speak each picture as highlighted | off | Auditory scanning; replaces the tick |
| Tick when the highlight moves | on | Generated sound, no file needed |
| Voice | Georgian: Natia (in-app); English: browser default | Chosen separately per language |
| Go fullscreen on start | on | Leaving fullscreen ends the game |
| Language | browser language, else English | Buttons at the top of the start screen |

Settings are saved in the browser (localStorage) per device.

## Georgian speech

Phones and computers almost never include a Georgian voice, so the app has a
built-in one: **Natia**, a [Piper](https://github.com/rhasspy/piper) neural
voice that runs entirely in the browser.

- **First use downloads about 96 MB** (the voice model, ONNX Runtime and
  espeak-ng data) from jsDelivr and Hugging Face. A status line under the
  Start button shows progress. After that it is kept in the browser's Cache
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

## Changing the pictures

Edit `js/items.js`. Each item has a label per language and, optionally, a
recorded clip per language:

```js
export const items = [
  { id: 'apple', image: 'assets/images/apple.svg', label: { ka: 'ვაშლი', en: 'Apple' } },
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
they are available offline.

## Translations

Interface text lives in `js/i18n.js`. To add a language, add it to
`LANGUAGES` and `STRINGS` there, to `CHOICES.language` and `VOICE_KEYS` (plus
a default voice) in `js/settings.js`, and a label to each item. `npm test`
checks that no string is missing.

## Project layout

```
index.html            start screen and game screen
css/style.css         layout and highlight styles
js/main.js            wires everything together
js/scanner.js         scanning logic (no DOM; unit-tested)
js/settings.js        defaults, limits, load/save
js/i18n.js            languages and interface strings
js/speech.js          chooses clip, in-app voice or device voice; tick sound
js/piper.js           in-app Piper voices (download, cache, synthesis)
js/wav.js             WAV encoder for synthesized speech
js/ui.js              all DOM updates
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
