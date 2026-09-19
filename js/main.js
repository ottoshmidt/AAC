// @ts-check
/**
 * App shell: language, settings, voices and the game menu. Games live in
 * js/games/; the shell starts the chosen one and forwards presses and keys.
 */
import { CATEGORIES, games } from './games/index.js';
import { applyStrings, LANGUAGES, t } from './i18n.js';
import { clipFor, itemSets, labelFor, RECORDED_PREFIX, RECORDED_VOICES, recordedCount, recordedVoiceOf } from './items.js';
import { PIPER_VOICES, PiperVoice, piperDownloadBytes } from './piper.js';
import { DEFAULTS, loadSettings, sanitize, saveSettings, VOICE_KEYS } from './settings.js';
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

/** The voice setting for `language`: '', a device voice name, 'piper:<id>' or 'recorded:<voice>'. */
function voiceFor(language = lang()) {
  const key = /** @type {Record<string, string>} */ (VOICE_KEYS)[language];
  return key ? /** @type {Record<string, any>} */ (settings)[key] : '';
}

/**
 * The synthetic voice to speak with: the setting itself, or, when a recorded
 * voice is chosen, the language's default voice for words that have no clip.
 */
function spokenVoiceFor(language = lang()) {
  const voice = voiceFor(language);
  if (!recordedVoiceOf(voice)) return voice;
  const key = /** @type {Record<string, string>} */ (VOICE_KEYS)[language];
  return key ? /** @type {Record<string, any>} */ (DEFAULTS)[key] : '';
}

/** Words of `language` (of the chosen game, or all) and how many have a clip in `voice`. */
function recordedWords(language, voice) {
  const items = (selected ?? games[0]).items ?? [];
  const labels = new Set(items.map((item) => labelFor(item, language)));
  const done = [...labels].filter((label) => items.some((item) => labelFor(item, language) === label && clipFor(item, language, voice)));
  return { done: done.length, total: labels.size };
}

/** @param {import('./items.js').Item} item */
function utteranceFor(item) {
  // A letter carries its own language, so the Georgian alphabet is read in
  // Georgian even when the interface is in English.
  const language = item.lang ?? lang();
  return {
    text: item.text ?? labelFor(item, language),
    lang: LANGUAGES[language]?.speechLang ?? '',
    clip: item.text ? undefined : clipFor(item, language, recordedVoiceOf(voiceFor(language))),
  };
}

/** @param {import('./items.js').Item} item */
function speakItem(item) {
  speech.speak(utteranceFor(item), spokenVoiceFor(item.lang ?? lang()));
}

/** Speak any text in the current language and voice. @param {string} text */
function say(text) {
  speech.speak({ text, lang: LANGUAGES[lang()].speechLang }, spokenVoiceFor());
}

/**
 * Start downloading the selected in-app voice and pre-render the labels of
 * the chosen game (or, before one is chosen, of the first game).
 */
function prepareInAppVoice() {
  const items = (selected ?? games[0]).items ?? [];
  // Items may belong to different languages (the alphabets), so prepare each
  // language with its own voice.
  /** @type {Map<string, string[]>} */
  const byLanguage = new Map();
  for (const item of items) {
    const language = item.lang ?? lang();
    const text = item.text ?? labelFor(item, language);
    if (!item.text && clipFor(item, language, recordedVoiceOf(voiceFor(language)))) continue;
    byLanguage.set(language, [...(byLanguage.get(language) ?? []), text]);
  }
  for (const [language, texts] of byLanguage) {
    speech.piperVoice(spokenVoiceFor(language))?.prepare(texts);
  }
}

// ---- Games -------------------------------------------------------------------

/** @type {import('./games/index.js').GameContext} */
const gameContext = {
  root: ui.elements.gameRoot,
  backButton: ui.elements.gameBack,
  controls: ui.elements.gameControls,
  settings: () => settings,
  lang,
  speech,
  speakItem,
  say,
  labelFor,
  t: (key, vars) => t(lang(), key, vars),
  exit: () => stopGame(),
};

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
}

function closeIntro() {
  const id = selected?.id;
  selected = null;
  ui.showScreen('start');
  if (id) ui.focusMenu(id);
}

function startGame() {
  const game = selected && instances.get(selected.id);
  if (!game) return;
  speech.unlock();
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

/** Start the game over from the beginning, from wherever it is now. */
function restartGame() {
  if (!running || !selected) return;
  running.stop();
  speech.cancel();
  // A fresh instance, so nothing (e.g. the page and the pictures already
  // chosen) carries over from the run being replaced.
  running = selected.create(gameContext);
  instances.set(selected.id, running);
  running.start();
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
}

ui.elements.startButton.addEventListener('click', startGame);
ui.elements.backButton.addEventListener('click', closeIntro);

// The in-game Back button: a direct click leaves; a press on it is not a
// game press. It is not part of any scan, so a stray click can't leave the game.
ui.elements.gameBack.addEventListener('pointerdown', (event) => event.stopPropagation());
ui.elements.gameBack.addEventListener('click', stopGame);
// Restart sits next to Back and works the same way: a direct tap only.
ui.elements.gameRestart.addEventListener('pointerdown', (event) => event.stopPropagation());
ui.elements.gameRestart.addEventListener('click', restartGame);
// Same for the game's own buttons in the top bar (page arrows).
ui.elements.gameControls.addEventListener('pointerdown', (event) => event.stopPropagation());

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
  refreshVoiceSelect();
  refreshVoiceStatus();
  prepareInAppVoice();
}

function refreshVoiceSelect() {
  const language = lang();
  const selected = voiceFor(language);

  /** @type {{ value: string, label: string }[]} */
  const options = [{ value: '', label: t(language, 'browserDefault') }];
  // Recorded voices, when some words of this language were recorded in them.
  for (const voice of RECORDED_VOICES) {
    if (recordedCount(language, voice) === 0) continue;
    const { done, total } = recordedWords(language, voice);
    const name = t(language, voice === 'female' ? 'voiceFemale' : 'voiceMale');
    options.push({ value: `${RECORDED_PREFIX}${voice}`, label: t(language, 'recordedOption', { name, done, total }) });
  }
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
  else if (speech.piperVoice(spokenVoiceFor(language))) note = '';
  else if (deviceVoicesSettled && matching.length === 0) {
    note = t(language, deviceVoices.length === 0 ? 'noVoices' : 'noVoiceForLanguage');
  }
  ui.setSpeechNote(note);
}

function refreshVoiceStatus() {
  const language = lang();
  const recorded = recordedVoiceOf(voiceFor(language));
  const piper = speech.piperVoice(spokenVoiceFor(language));
  if (recorded) {
    // Recorded voice: say how much of the chosen game it covers; the rest
    // falls back to the language's default voice, whose status follows.
    const { done, total } = recordedWords(language, recorded);
    const name = t(language, recorded === 'female' ? 'voiceFemale' : 'voiceMale');
    const fallback = piper ? piper.info.name : t(language, 'browserDefault');
    ui.setVoiceStatus(t(language, done < total ? 'recordedPartial' : 'recordedComplete', { name, done, total, fallback }));
    ui.setVoiceLicense('');
    if (done === total || !piper) return;
  } else if (!piper) {
    ui.setVoiceStatus('');
    ui.setVoiceLicense('');
    return;
  }
  if (!piper) return;
  const vars = {
    name: piper.info.name,
    size: Math.round(piperDownloadBytes(piper.id) / 1e6),
    percent: Math.floor(piper.progress * 100),
    error: piper.error?.message ?? '',
    license: piper.info.license,
  };
  ui.setVoiceLicense(t(language, piper.info.nonCommercial ? 'voiceLicense' : 'voiceLicenseFree', vars));
  const prefix = recorded ? `${ui.elements.voiceStatusText.textContent} ` : '';
  switch (piper.status) {
    case 'downloading':
      return ui.setVoiceStatus(prefix + t(language, 'voiceDownloading', vars));
    case 'loading':
      return ui.setVoiceStatus(prefix + t(language, 'voiceLoading', vars));
    case 'ready':
      return ui.setVoiceStatus(prefix + t(language, 'voiceReady', vars));
    case 'error':
      return ui.setVoiceStatus(prefix + t(language, 'voiceError', vars), true);
    default:
      return ui.setVoiceStatus(prefix.trim());
  }
}

// ---- Start -------------------------------------------------------------------

ui.renderLanguageSwitch(LANGUAGES, setLanguage);
ui.fillSettingsForm(settings);
applyLanguage();
ui.showScreen('start');

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
