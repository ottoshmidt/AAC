// @ts-check
import { applyStrings, LANGUAGES, t } from './i18n.js';
import { clipFor, items, labelFor } from './items.js';
import { PIPER_VOICES, PiperVoice, piperDownloadBytes } from './piper.js';
import { PageProgress } from './pages.js';
import { Scanner } from './scanner.js';
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

/** Current page and which of its pictures have been chosen. */
const progress = new PageProgress(items.length, settings.choicesPerRound);
const pageItems = () => progress.pictures.map((i) => items[i]);
/** The scanner only visits pictures not chosen yet: scan index -> slot on the page. */
let scanSlots = progress.remaining;

const scanner = new Scanner({
  itemCount: scanSlots.length,
  intervalMs: settings.intervalMs,
  cooldownMs: settings.cooldownMs,
  debounceMs: settings.debounceMs,
  maxCycles: settings.maxCycles,
});

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

// ---- Scanner -> UI and sound -------------------------------------------------

// Each round (game start, a page turn, and after every choice) moves on to the
// next page if every picture has been chosen, then draws the page and scans
// the pictures that are left, starting from the first.
scanner.addEventListener('round', () => {
  progress.startRound();
  renderPage();
});

scanner.addEventListener('highlight', (event) => {
  const slot = scanSlots[/** @type {CustomEvent} */ (event).detail.index];
  ui.setHighlight(slot);
  if (settings.speakOnHighlight) speakItem(pageItems()[slot]);
  else if (settings.highlightSound) speech.tick();
});

scanner.addEventListener('select', (event) => {
  const slot = scanSlots[/** @type {CustomEvent} */ (event).detail.index];
  progress.choose(slot);
  ui.setSelected(slot);
  if (settings.speakOnSelect) speakItem(pageItems()[slot]);
});

function renderPage() {
  scanSlots = progress.remaining;
  scanner.updateOptions({ itemCount: scanSlots.length });
  ui.renderChoices(pageItems(), lang(), settings.choicesPerRound, progress.chosen);
  ui.setPageIndicator(progress.page + 1, progress.pageCount);
}

/** @param {number} delta +1 for the next page, -1 for the previous one */
function turnPage(delta) {
  progress.turn(delta);
  speech.cancel();
  ui.showPaused(false);
  scanner.start(); // emits 'round', which draws the new page
}

scanner.addEventListener('pause', () => ui.showPaused(true));
scanner.addEventListener('resume', () => ui.showPaused(false));

// ---- User input --------------------------------------------------------------

// Any button, anywhere on the game screen, counts as a press.
// `pointerdown` also covers touch screens and pens.
ui.elements.gameScreen.addEventListener('pointerdown', (event) => {
  event.preventDefault(); // no text selection, no middle-click autoscroll
  scanner.press();
});
ui.elements.gameScreen.addEventListener('contextmenu', (event) => event.preventDefault());

ui.elements.startButton.addEventListener('click', startGame);

// Keyboard is for the caregiver: arrows turn pages, Escape returns to the
// start screen. Only during the game, so arrows still work in the settings.
document.addEventListener('keydown', (event) => {
  if (ui.elements.gameScreen.hidden) return;
  if (event.key === 'Escape') stopGame();
  else if (event.key === 'ArrowRight') turnPage(+1);
  else if (event.key === 'ArrowLeft') turnPage(-1);
  else return;
  event.preventDefault();
});

// Browsers exit fullscreen on Escape without always passing the key to the
// page, so leaving fullscreen during a game also returns to the start screen.
document.addEventListener('fullscreenchange', () => {
  if (!document.fullscreenElement && settings.fullscreen && !ui.elements.gameScreen.hidden) {
    stopGame();
  }
});

function startGame() {
  speech.unlock();
  ui.showScreen('game');
  ui.showPaused(false);
  if (settings.fullscreen && document.fullscreenEnabled) {
    document.documentElement.requestFullscreen().catch(() => {});
  }
  scanner.start();
}

function stopGame() {
  scanner.stop();
  speech.cancel();
  ui.setHighlight(-1);
  ui.showPaused(false);
  ui.showScreen('start');
  if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
  ui.elements.startButton.focus();
}

// ---- Settings ----------------------------------------------------------------

function save() {
  saveSettings(settings);
}

ui.elements.settingsForm.addEventListener('change', () => {
  settings = sanitize(ui.readSettingsForm(settings));
  save();
  progress.setPerPage(settings.choicesPerRound);
  renderPage();
  ui.fillSettingsForm(settings); // show clamped values
  scanner.updateOptions({
    intervalMs: settings.intervalMs,
    cooldownMs: settings.cooldownMs,
    debounceMs: settings.debounceMs,
    maxCycles: settings.maxCycles,
  });
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
  renderPage();
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

// Warm the image cache so page turns appear without flicker.
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
