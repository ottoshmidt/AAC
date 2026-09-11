# AAC Choice

An Augmentative and Alternative Communication (AAC) web app for people who
can only click. Two pictures are shown side by side and a highlight moves
between them. A click **anywhere** selects the highlighted picture, so the
user never has to aim the mouse (single-switch scanning). The same works with
a touch screen, a big-button mouse or any switch that acts as a mouse click.

Plain HTML, CSS and JavaScript: no framework, no build step, no dependencies.

## Run it

Browsers restrict pages opened straight from disk, so serve the folder:

```sh
npm start            # or: python3 -m http.server 8000
```

Then open <http://localhost:8000>.

1. The caregiver adjusts **Settings** on the start screen if needed.
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
| Speak the chosen picture | on | Browser text-to-speech, or a recorded clip |
| Speak each picture as highlighted | off | Auditory scanning; replaces the tick |
| Tick when the highlight moves | on | Generated sound, no file needed |
| Voice | browser default | Lists the voices installed on the device |
| Go fullscreen on start | on | Leaving fullscreen ends the game |

Settings are saved in the browser (localStorage) per device.

## Changing the pictures

Edit `js/items.js`:

```js
export const items = [
  { id: 'apple', label: 'Apple', image: 'assets/images/apple.svg' },
  { id: 'ball', label: 'Ball', image: 'assets/images/ball.svg', audio: 'assets/audio/ball.mp3' },
];
```

- `label` is shown under the picture and spoken on selection.
- `audio` (optional) plays a recorded clip instead of text-to-speech. Use MP3
  or WAV, which play in every browser.
- `lang` (optional) sets the speech language, e.g. `'en-US'`.

Add new files to the `PRECACHE` list in `sw.js` and bump `CACHE_NAME` so
they are available offline.

## Project layout

```
index.html            start screen and game screen
css/style.css         layout and highlight styles
js/main.js            wires everything together
js/scanner.js         scanning logic (no DOM; unit-tested)
js/settings.js        defaults, limits, load/save
js/speech.js          text-to-speech, audio clips, tick sound
js/ui.js              all DOM updates
js/items.js           the pictures
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
