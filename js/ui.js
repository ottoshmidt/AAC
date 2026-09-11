// @ts-check
/**
 * Everything that touches the DOM. main.js wires this to the scanner.
 */

import { labelFor } from './items.js';

/**
 * @param {string} selector
 * @returns {HTMLElement}
 */
function $(selector) {
  const el = document.querySelector(selector);
  if (!(el instanceof HTMLElement)) throw new Error(`Missing element: ${selector}`);
  return el;
}

export const elements = {
  startScreen: $('#start-screen'),
  languageSwitch: $('#language-switch'),
  startButton: /** @type {HTMLButtonElement} */ ($('#start-button')),
  voiceStatus: $('#voice-status'),
  voiceStatusText: $('#voice-status-text'),
  voiceRetry: /** @type {HTMLButtonElement} */ ($('#voice-retry')),
  settingsForm: /** @type {HTMLFormElement} */ ($('#settings-form')),
  voiceSelect: /** @type {HTMLSelectElement} */ ($('#voice-select')),
  speechNote: $('#speech-note'),
  voiceLicense: $('#voice-license'),
  gameScreen: $('#game-screen'),
  choices: $('#choices'),
  pageIndicator: $('#page-indicator'),
  pauseOverlay: $('#pause-overlay'),
};

/** @param {'start' | 'game'} name */
export function showScreen(name) {
  elements.startScreen.hidden = name !== 'start';
  elements.gameScreen.hidden = name !== 'game';
}

/**
 * One button per language, each labelled in its own language.
 * @param {Record<string, import('./i18n.js').Language>} languages
 * @param {(lang: string) => void} onPick
 */
export function renderLanguageSwitch(languages, onPick) {
  elements.languageSwitch.replaceChildren(
    ...Object.entries(languages).map(([code, { name }]) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.lang = code;
      button.dataset.lang = code;
      button.textContent = name;
      button.addEventListener('click', () => onPick(code));
      return button;
    }),
  );
}

/** @param {string} lang */
export function setLanguageSwitch(lang) {
  for (const button of elements.languageSwitch.querySelectorAll('button')) {
    button.setAttribute('aria-pressed', String(button.dataset.lang === lang));
  }
}

/**
 * @param {import('./items.js').Item[]} items
 * @param {string} lang
 * @param {number} slots  pictures per page; picks the grid layout in CSS, so a
 *                        shorter last page keeps the same positions
 * @param {ReadonlySet<number>} [chosen]  positions already chosen: shown with a ✓
 */
export function renderChoices(items, lang, slots, chosen = new Set()) {
  elements.choices.dataset.count = String(slots);
  elements.choices.replaceChildren(
    ...items.map((item, index) => {
      const label = labelFor(item, lang);
      const figure = document.createElement('figure');
      figure.className = 'choice';
      figure.classList.toggle('done', chosen.has(index));
      figure.dataset.index = String(index);

      const img = document.createElement('img');
      img.src = item.image;
      img.alt = label;
      img.draggable = false;

      const caption = document.createElement('figcaption');
      caption.textContent = label;

      figure.append(img, caption);
      return figure;
    }),
  );
}

function choiceElements() {
  return /** @type {HTMLElement[]} */ ([...elements.choices.children]);
}

/** @param {number} index highlighted item, or -1 for none */
export function setHighlight(index) {
  for (const el of choiceElements()) {
    el.classList.toggle('highlighted', Number(el.dataset.index) === index);
    el.classList.remove('selected', 'not-selected');
  }
}

/** @param {number} index */
export function setSelected(index) {
  for (const el of choiceElements()) {
    const isSelected = Number(el.dataset.index) === index;
    el.classList.remove('highlighted');
    el.classList.toggle('selected', isSelected);
    el.classList.toggle('not-selected', !isSelected);
  }
}

/**
 * Small "2 / 6" in the corner of the game screen, for the caregiver.
 * @param {number} current 1-based
 * @param {number} count
 */
export function setPageIndicator(current, count) {
  elements.pageIndicator.textContent = `${current} / ${count}`;
  elements.pageIndicator.hidden = count <= 1;
}

/** @param {boolean} paused */
export function showPaused(paused) {
  elements.pauseOverlay.hidden = !paused;
  if (paused) setHighlight(-1);
}

// ---- Settings form ----------------------------------------------------------
// Inputs are matched to settings by their `name`. Numeric inputs may carry
// `data-scale` to show a different unit (e.g. seconds for a value in ms).

/** @param {import('./settings.js').Settings} settings */
export function fillSettingsForm(settings) {
  for (const el of elements.settingsForm.elements) {
    if (!(el instanceof HTMLInputElement || el instanceof HTMLSelectElement)) continue;
    if (!(el.name in settings)) continue;
    const value = /** @type {Record<string, unknown>} */ (settings)[el.name];
    if (el instanceof HTMLInputElement && el.type === 'checkbox') {
      el.checked = Boolean(value);
    } else if (typeof value === 'number') {
      el.value = String(value / Number(el.dataset.scale ?? 1));
    } else {
      el.value = String(value);
    }
  }
}

/**
 * @param {import('./settings.js').Settings} current
 * @returns {import('./settings.js').Settings}
 */
export function readSettingsForm(current) {
  /** @type {Record<string, unknown>} */
  const next = { ...current };
  for (const el of elements.settingsForm.elements) {
    if (!(el instanceof HTMLInputElement || el instanceof HTMLSelectElement)) continue;
    if (!(el.name in current)) continue;
    if (el instanceof HTMLInputElement && el.type === 'checkbox') {
      next[el.name] = el.checked;
    } else if (typeof next[el.name] === 'number') {
      next[el.name] = Math.round(Number(el.value) * Number(el.dataset.scale ?? 1));
    } else {
      next[el.name] = el.value;
    }
  }
  return /** @type {import('./settings.js').Settings} */ (next);
}

/**
 * @param {{ value: string, label: string }[]} options
 * @param {string} selected
 */
export function fillVoiceSelect(options, selected) {
  elements.voiceSelect.replaceChildren(...options.map((o) => new Option(o.label, o.value)));
  elements.voiceSelect.value = selected;
}

/**
 * @param {HTMLElement} el
 * @param {string} text  '' hides the element
 */
function setNote(el, text) {
  el.textContent = text;
  el.hidden = text === '';
}

/** @param {string} text */
export function setSpeechNote(text) {
  setNote(elements.speechNote, text);
}

/** @param {string} text */
export function setVoiceLicense(text) {
  setNote(elements.voiceLicense, text);
}

/**
 * @param {string} text  '' hides the status line
 * @param {boolean} [canRetry]
 */
export function setVoiceStatus(text, canRetry = false) {
  elements.voiceStatus.hidden = text === '';
  elements.voiceStatusText.textContent = text;
  elements.voiceRetry.hidden = !canRetry;
}
