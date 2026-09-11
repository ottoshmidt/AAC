// @ts-check
/**
 * Everything that touches the DOM. main.js wires this to the scanner.
 */

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
  startButton: /** @type {HTMLButtonElement} */ ($('#start-button')),
  settingsForm: /** @type {HTMLFormElement} */ ($('#settings-form')),
  voiceSelect: /** @type {HTMLSelectElement} */ ($('#voice-select')),
  speechNote: $('#speech-note'),
  gameScreen: $('#game-screen'),
  choices: $('#choices'),
  pauseOverlay: $('#pause-overlay'),
};

/** @param {'start' | 'game'} name */
export function showScreen(name) {
  elements.startScreen.hidden = name !== 'start';
  elements.gameScreen.hidden = name !== 'game';
}

/** @param {import('./items.js').Item[]} items */
export function renderChoices(items) {
  elements.choices.replaceChildren(
    ...items.map((item, index) => {
      const figure = document.createElement('figure');
      figure.className = 'choice';
      figure.dataset.index = String(index);

      const img = document.createElement('img');
      img.src = item.image;
      img.alt = item.label;
      img.draggable = false;

      const caption = document.createElement('figcaption');
      caption.textContent = item.label;

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
    } else if (el instanceof HTMLInputElement && el.type === 'number') {
      next[el.name] = Math.round(Number(el.value) * Number(el.dataset.scale ?? 1));
    } else {
      next[el.name] = el.value;
    }
  }
  return /** @type {import('./settings.js').Settings} */ (next);
}

/**
 * @param {SpeechSynthesisVoice[]} voices
 * @param {string} selectedName
 */
export function fillVoiceSelect(voices, selectedName) {
  const select = elements.voiceSelect;
  const defaultOption = new Option('Browser default', '');
  const options = [...voices]
    .sort((a, b) => a.lang.localeCompare(b.lang) || a.name.localeCompare(b.name))
    .map((v) => new Option(`${v.name} (${v.lang})`, v.name));
  // Keep a saved voice that isn't on this device, so changing another
  // setting doesn't silently discard it. Speech falls back to the default.
  if (selectedName && !voices.some((v) => v.name === selectedName)) {
    options.push(new Option(`${selectedName} (not on this device)`, selectedName));
  }
  select.replaceChildren(defaultOption, ...options);
  select.value = selectedName;
}

/** @param {string} text */
export function setSpeechNote(text) {
  elements.speechNote.textContent = text;
  elements.speechNote.hidden = text === '';
}
