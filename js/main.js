// @ts-check
/**
 * App shell: language, settings, voices and the game menu. Games live in
 * js/games/; the shell starts the chosen one and forwards presses and keys.
 */
import { CATEGORIES, games } from './games/index.js';
import { applyStrings, LANGUAGES, t } from './i18n.js';
import { clipFor, itemSets, labelFor } from './items.js';
import { PIPER_VOICES, PiperVoice, piperDownloadBytes } from './piper.js';
import { Scanner } from './scanner.js';
import { loadSettings, sanitize, saveSettings, VOICE_KEYS } from './settings.js';
import { Speech } from './speech.js';
import { WakeLock } from './wakelock.js';
import * as ui from './ui.js';

let settings = loadSettings();

const speech = new Speech();
const wakeLock = new WakeLock();
for (const id of Object.keys(PIPER_VOICES)) {
  const voice = new PiperVoice(id);
  voice.addEventListener('change', refreshVoiceStatus);
  speech.addPiperVoice(voice);
}

/** Device voices, once the browser has reported them. */
let deviceVoices = /** @type {SpeechSynthesisVoice[]} */ ([]);
/** False until voices have arrived or we've waited long enough to say there are none. */
let deviceVoicesSettled = false;

// ---- Language and voice helpers -----------------------------------------------

const lang = () => settings.language;

/** The voice setting for `language`: '', a device voice name, or 'piper:<id>'. */
function voiceFor(language = lang()) {
  const key = /** @type {Record<string, string>} */ (VOICE_KEYS)[language];
  return key ? /** @type {Record<string, any>} */ (settings)[key] : '';
}

/** @param {import('./items.js').Item} item */
function utteranceFor(item) {
  return {
    text: labelFor(item, lang()),
    lang: LANGUAGES[lang()].speechLang,
    clip: clipFor(item, lang()),
  };
}

/** @param {import('./items.js').Item} item */
function speakItem(item) {
  speech.speak(utteranceFor(item), voiceFor());
}

/** Speak any text in the current language and voice. @param {string} text */
function say(text) {
  speech.speak({ text, lang: LANGUAGES[lang()].speechLang }, voiceFor());
}

/**
 * Start downloading the selected in-app voice and pre-render the labels of
 * the chosen game (or, before one is chosen, of the first game).
 */
function prepareInAppVoice() {
  const piper = speech.piperVoice(voiceFor());
  if (!piper) return;
  const items = (selected ?? games[0]).items ?? [];
  const texts = items.filter((item) => !clipFor(item, lang())).map((item) => labelFor(item, lang()));
  piper.prepare(texts);
}

// ---- Games -------------------------------------------------------------------

/** @type {import('./games/index.js').GameContext} */
const gameContext = {
  root: ui.elements.gameRoot,
  backButton: ui.elements.gameBack,
  settings: () => settings,
  lang,
  speech,
  speakItem,
  say,
  labelFor,
  t: (key, vars) => t(lang(), key, vars),
  exit: () => stopGame(),
};

// ---- Scanning on the menu and game pages ------------------------------------
// The shell screens are scanned like a game: buttons light up in turn and a
// press on the background chooses the lit one, so a single-switch user can
// get around the whole app. Direct clicks on buttons still work for caregivers.

const shellScanner = new Scanner({ itemCount: 0, intervalMs: 2000, cooldownMs: 0, debounceMs: 300, maxCycles: 0 });
/** @type {HTMLElement[]} buttons being scanned on the current shell screen */
let shellItems = [];

/** @param {HTMLElement[]} items */
function scanShell(items) {
  shellItems = items;
  shellScanner.updateOptions({
    itemCount: items.length,
    intervalMs: settings.intervalMs,
    cooldownMs: settings.cooldownMs,
    debounceMs: settings.debounceMs,
    maxCycles: 0, // never pause here: a stuck frame on the menu just looks broken
  });
  if (items.length > 0) shellScanner.start();
  else shellScanner.stop();
}

function stopShellScan() {
  shellScanner.stop();
  ui.setScanHighlight(null);
}

shellScanner.addEventListener('highlight', (event) => {
  const el = shellItems[/** @type {CustomEvent} */ (event).detail.index];
  ui.setScanHighlight(el);
  if (settings.speakOnHighlight) {
    say(el.textContent?.replace(/^‹\s*/, '').trim() ?? '');
  } else if (settings.highlightSound) speech.tick();
});
shellScanner.addEventListener('select', (event) => {
  const el = shellItems[/** @type {CustomEvent} */ (event).detail.index];
  ui.setScanHighlight(null);
  el.click();
});
shellScanner.addEventListener('stop', () => ui.setScanHighlight(null));
shellScanner.addEventListener('pause', () => ui.setScanHighlight(null));

// A press on a shell screen's background selects the lit button; presses on
// buttons and form fields are left to them.
for (const screen of [ui.elements.startScreen, ui.elements.introScreen]) {
  screen.addEventListener('pointerdown', (event) => {
    const target = /** @type {Element} */ (event.target);
    if (target.closest('button, a, input, select, textarea, summary, label')) return;
    event.preventDefault();
    shellScanner.press();
  });
}

function scanMenu() {
  scanShell(ui.menuScanStops());
}

function scanIntro() {
  // Settings are for the caregiver, so they are left out of the scan.
  scanShell([ui.elements.startButton, ui.elements.backButton]);
}

/** Game instances, created once and reused between runs. */
const instances = new Map(games.map((info) => [info.id, info.create(gameContext)]));
/** @type {import('./games/index.js').Game | null} the game on screen */
let running = null;
/** @type {import('./games/index.js').GameInfo | null} the game picked on the menu */
let selected = null;

/** @param {string} id */
function openIntro(id) {
  selected = games.find((g) => g.id === id) ?? null;
  if (!selected) return;
  ui.fillIntro(selected, lang());
  prepareInAppVoice();
  ui.showScreen('intro');
  window.scrollTo(0, 0);
  ui.elements.startButton.focus({ preventScroll: true });
  scanIntro();
}

function closeIntro() {
  const id = selected?.id;
  selected = null;
  ui.showScreen('start');
  if (id) ui.focusMenu(id);
  scanMenu();
}

function startGame() {
  const game = selected && instances.get(selected.id);
  if (!game) return;
  speech.unlock();
  stopShellScan();
  running = game;
  // A history entry for the game, so the Android/browser Back button ends the
  // game (popstate below) instead of leaving the app.
  history.pushState({ game: selected?.id }, '');
  ui.showScreen('game');
  wakeLock.acquire(); // keep the screen on and unlocked during the game
  if (settings.fullscreen && document.fullscreenEnabled) {
    document.documentElement.requestFullscreen().catch(() => {});
  }
  game.start();
}

/** popstate events caused by our own history.back(), to be ignored. */
let ownBacks = 0;

/** Leave the game, and drop the history entry it pushed. */
function stopGame() {
  endGame();
  if (history.state?.game) {
    // Ending first, then going back, keeps this safe even if the popstate
    // arrives after the next game has already started.
    ownBacks += 1;
    history.back();
  }
}

function endGame() {
  if (!running) return;
  running.stop();
  running = null;
  wakeLock.release();
  speech.cancel();
  ui.showScreen('intro');
  if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
  window.scrollTo(0, 0);
  ui.elements.startButton.focus({ preventScroll: true });
  scanIntro();
}

ui.elements.startButton.addEventListener('click', startGame);
ui.elements.backButton.addEventListener('click', closeIntro);

// The in-game Back button: a direct click leaves; a press on it is not a
// game press. Games also put it in their scan (see GameContext.backButton).
ui.elements.gameBack.addEventListener('pointerdown', (event) => event.stopPropagation());
ui.elements.gameBack.addEventListener('click', stopGame);

// Back button / gesture (Android, browser) during a game.
window.addEventListener('popstate', () => {
  if (ownBacks > 0) ownBacks -= 1;
  else endGame();
});


// Any button, anywhere on the game screen, counts as a press.
// `pointerdown` also covers touch screens and pens.
ui.elements.gameScreen.addEventListener('pointerdown', (event) => {
  event.preventDefault(); // no text selection, no middle-click autoscroll
  running?.press();
});
ui.elements.gameScreen.addEventListener('contextmenu', (event) => event.preventDefault());

// Keyboard is for the caregiver: Escape returns to the intro screen, other
// keys go to the game. Only during a game, so keys still work in settings.
document.addEventListener('keydown', (event) => {
  if (!running) return;
  if (event.key === 'Escape') stopGame();
  else if (!running.key(event)) return;
  event.preventDefault();
});

// Browsers exit fullscreen on Escape without always passing the key to the
// page, so leaving fullscreen during a game also returns to the menu.
document.addEventListener('fullscreenchange', () => {
  if (!document.fullscreenElement && settings.fullscreen && running) stopGame();
});

// After a reload during a game the entry is stale: drop it so Back leaves normally.
if (history.state?.game) history.replaceState(null, '');

// ---- Settings ----------------------------------------------------------------

function save() {
  saveSettings(settings);
}

ui.elements.settingsForm.addEventListener('change', () => {
  settings = sanitize(ui.readSettingsForm(settings));
  save();
  ui.fillSettingsForm(settings); // show clamped values
});
ui.elements.settingsForm.addEventListener('submit', (event) => event.preventDefault());

// The voice list only shows voices for the current language, and its value
// is stored per language (voiceEn / voiceKa), so it's handled separately.
ui.elements.voiceSelect.addEventListener('change', () => {
  const key = /** @type {Record<string, string>} */ (VOICE_KEYS)[lang()];
  if (!key) return;
  settings = sanitize({ ...settings, [key]: ui.elements.voiceSelect.value });
  save();
  refreshVoiceSelect();
  refreshVoiceStatus();
  prepareInAppVoice();
});

ui.elements.voiceRetry.addEventListener('click', prepareInAppVoice);

/** @param {string} language */
function setLanguage(language) {
  settings = sanitize({ ...settings, language });
  save();
  speech.cancel();
  applyLanguage();
}

function applyLanguage() {
  applyStrings(lang());
  ui.setLanguageSwitch(lang());
  ui.renderGameMenu(CATEGORIES, games, lang(), openIntro);
  if (selected) ui.fillIntro(selected, lang());
  else if (!running) scanMenu(); // the cards were rebuilt
  refreshVoiceSelect();
  refreshVoiceStatus();
  prepareInAppVoice();
}

function refreshVoiceSelect() {
  const language = lang();
  const selected = voiceFor(language);

  /** @type {{ value: string, label: string }[]} */
  const options = [{ value: '', label: t(language, 'browserDefault') }];
  for (const [id, info] of Object.entries(PIPER_VOICES)) {
    if (info.lang !== language) continue;
    const size = Math.round(piperDownloadBytes(id) / 1e6);
    options.push({ value: `piper:${id}`, label: t(language, 'piperOption', { name: info.name, size }) });
  }
  const matching = deviceVoices
    .filter((v) => v.lang.toLowerCase().replace('_', '-').startsWith(language))
    .sort((a, b) => a.name.localeCompare(b.name));
  options.push(...matching.map((v) => ({ value: v.name, label: `${v.name} (${v.lang})` })));
  // Keep a saved voice that isn't available here, so it isn't silently lost.
  if (selected && !options.some((o) => o.value === selected)) {
    options.push({ value: selected, label: t(language, 'notOnDevice', { name: selected }) });
  }
  ui.fillVoiceSelect(options, selected);

  let note = '';
  if (!speech.speechSupported) note = t(language, 'noSpeech');
  else if (speech.piperVoice(selected)) note = '';
  else if (deviceVoicesSettled && matching.length === 0) {
    note = t(language, deviceVoices.length === 0 ? 'noVoices' : 'noVoiceForLanguage');
  }
  ui.setSpeechNote(note);
}

function refreshVoiceStatus() {
  const language = lang();
  const piper = speech.piperVoice(voiceFor(language));
  if (!piper) {
    ui.setVoiceStatus('');
    ui.setVoiceLicense('');
    return;
  }
  const vars = {
    name: piper.info.name,
    size: Math.round(piperDownloadBytes(piper.id) / 1e6),
    percent: Math.floor(piper.progress * 100),
    error: piper.error?.message ?? '',
    license: piper.info.license,
  };
  ui.setVoiceLicense(t(language, piper.info.nonCommercial ? 'voiceLicense' : 'voiceLicenseFree', vars));
  switch (piper.status) {
    case 'downloading':
      return ui.setVoiceStatus(t(language, 'voiceDownloading', vars));
    case 'loading':
      return ui.setVoiceStatus(t(language, 'voiceLoading', vars));
    case 'ready':
      return ui.setVoiceStatus(t(language, 'voiceReady', vars));
    case 'error':
      return ui.setVoiceStatus(t(language, 'voiceError', vars), true);
    default:
      return ui.setVoiceStatus('');
  }
}

// ---- Start -------------------------------------------------------------------

ui.renderLanguageSwitch(LANGUAGES, setLanguage);
ui.fillSettingsForm(settings);
applyLanguage();
ui.showScreen('start');
scanMenu();

// Warm the image cache so pictures appear without flicker.
for (const { image } of Object.values(itemSets).flat()) new Image().src = image;

if (speech.speechSupported) {
  // Voices often arrive a moment after page load, so only report that there
  // are none after waiting a few seconds.
  setTimeout(() => {
    deviceVoicesSettled = true;
    refreshVoiceSelect();
  }, 3000);
  speech.onVoicesChanged((voices) => {
    deviceVoices = voices;
    if (voices.length > 0) deviceVoicesSettled = true;
    refreshVoiceSelect();
  });
}

if ('serviceWorker' in navigator && window.isSecureContext) {
  navigator.serviceWorker.register('sw.js').catch((error) => {
    console.warn('Service worker registration failed:', error);
  });

  // After an update the new service worker takes over while this page still
  // runs the old files. Reload once to pick up the new version, but never in
  // the middle of a game (it will be picked up on the next load instead).
  // On a first visit there was no controller before, so nothing to update.
  const hadController = Boolean(navigator.serviceWorker.controller);
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (hadController && !running) location.reload();
  });
}
