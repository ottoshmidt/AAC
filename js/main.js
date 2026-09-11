// @ts-check
import { items } from './items.js';
import { Scanner } from './scanner.js';
import { loadSettings, sanitize, saveSettings } from './settings.js';
import { Speech } from './speech.js';
import * as ui from './ui.js';

let settings = loadSettings();
const speech = new Speech();
speech.setVoice(settings.voiceName);

const scanner = new Scanner({
  itemCount: items.length,
  intervalMs: settings.intervalMs,
  cooldownMs: settings.cooldownMs,
  debounceMs: settings.debounceMs,
  maxCycles: settings.maxCycles,
});

// ---- Scanner -> UI and sound -------------------------------------------------

scanner.addEventListener('highlight', (event) => {
  const { index } = /** @type {CustomEvent} */ (event).detail;
  ui.setHighlight(index);
  if (settings.speakOnHighlight) speech.speakItem(items[index]);
  else if (settings.highlightSound) speech.tick();
});

scanner.addEventListener('select', (event) => {
  const { index } = /** @type {CustomEvent} */ (event).detail;
  ui.setSelected(index);
  if (settings.speakOnSelect) speech.speakItem(items[index]);
});

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

// Keyboard is for the caregiver: Escape returns to the start screen.
document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape' && !ui.elements.gameScreen.hidden) stopGame();
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

ui.fillSettingsForm(settings);

ui.elements.settingsForm.addEventListener('change', () => {
  settings = sanitize(ui.readSettingsForm(settings));
  saveSettings(settings);
  ui.fillSettingsForm(settings); // show clamped values
  speech.setVoice(settings.voiceName);
  scanner.updateOptions({
    intervalMs: settings.intervalMs,
    cooldownMs: settings.cooldownMs,
    debounceMs: settings.debounceMs,
    maxCycles: settings.maxCycles,
  });
});
ui.elements.settingsForm.addEventListener('submit', (event) => event.preventDefault());

if (speech.speechSupported) {
  // Voices often arrive a moment after page load, so only complain if none
  // have shown up after a few seconds.
  const noVoicesTimer = setTimeout(() => {
    ui.setSpeechNote(
      'No speech voices found on this device. On Linux, install speech-dispatcher and a voice such as espeak-ng.',
    );
  }, 3000);
  speech.onVoicesChanged((voices) => {
    ui.fillVoiceSelect(voices, settings.voiceName);
    if (voices.length > 0) {
      clearTimeout(noVoicesTimer);
      ui.setSpeechNote('');
    }
  });
} else {
  ui.elements.voiceSelect.disabled = true;
  ui.setSpeechNote('This browser does not support text-to-speech. Recorded clips still work.');
}

// ---- Start -------------------------------------------------------------------

ui.renderChoices(items);
ui.showScreen('start');

if ('serviceWorker' in navigator && window.isSecureContext) {
  navigator.serviceWorker.register('sw.js').catch((error) => {
    console.warn('Service worker registration failed:', error);
  });
}
