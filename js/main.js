// @ts-check
/**
 * App shell: language, settings, voices and the game menu. Games live in
 * js/games/; the shell starts the chosen one and forwards presses and keys.
 */
import { games } from './games/index.js';
import { applyStrings, LANGUAGES, t } from './i18n.js';
import { clipFor, items, labelFor } from './items.js';
import { PIPER_VOICES, PiperVoice, piperDownloadBytes } from './piper.js';
import { loadSettings, sanitize, saveSettings, VOICE_KEYS } from './settings.js';
import { Speech } from './speech.js';
import * as ui from './ui.js';

let settings = loadSettings();

const speech = new Speech();
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

/** Start downloading the selected in-app voice and pre-render the labels. */
function prepareInAppVoice() {
  const piper = speech.piperVoice(voiceFor());
  if (!piper) return;
  const texts = items.filter((item) => !clipFor(item, lang())).map((item) => labelFor(item, lang()));
  piper.prepare(texts);
}

// ---- Games -------------------------------------------------------------------

/** @type {import('./games/index.js').GameContext} */
const gameContext = {
  root: ui.elements.gameRoot,
  settings: () => settings,
  lang,
  speech,
  speakItem,
  labelFor,
  t: (key, vars) => t(lang(), key, vars),
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
  ui.showScreen('game');
  if (settings.fullscreen && document.fullscreenEnabled) {
    document.documentElement.requestFullscreen().catch(() => {});
  }
  game.start();
}

function stopGame() {
  running?.stop();
  running = null;
  speech.cancel();
  ui.showScreen('intro');
  if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
  window.scrollTo(0, 0);
  ui.elements.startButton.focus({ preventScroll: true });
}

ui.elements.startButton.addEventListener('click', startGame);
ui.elements.backButton.addEventListener('click', closeIntro);

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
  ui.renderGameMenu(games, lang(), openIntro);
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

// Warm the image cache so pictures appear without flicker.
for (const { image } of items) new Image().src = image;

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
}
