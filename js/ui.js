// @ts-check
/**
 * The shell's DOM: start screen (menu, language, settings) and screen
 * switching. Each game draws its own screen inside #game-root.
 */

import { t } from './i18n.js';

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
  gameMenu: $('#game-menu'),
  introScreen: $('#intro-screen'),
  backButton: /** @type {HTMLButtonElement} */ ($('#back-button')),
  introIcon: /** @type {HTMLImageElement} */ ($('#intro-icon')),
  introCategory: $('#intro-category'),
  introName: $('#intro-name'),
  introHelp: $('#intro-help'),
  startButton: /** @type {HTMLButtonElement} */ ($('#start-button')),
  settings: /** @type {HTMLDetailsElement} */ ($('#settings')),
  settingsSummary: $('#settings-summary'),
  voiceStatus: $('#voice-status'),
  voiceStatusText: $('#voice-status-text'),
  voiceRetry: /** @type {HTMLButtonElement} */ ($('#voice-retry')),
  settingsForm: /** @type {HTMLFormElement} */ ($('#settings-form')),
  voiceSelect: /** @type {HTMLSelectElement} */ ($('#voice-select')),
  speechNote: $('#speech-note'),
  voiceLicense: $('#voice-license'),
  gameScreen: $('#game-screen'),
  gameRoot: $('#game-root'),
  gameBack: /** @type {HTMLButtonElement} */ ($('#game-back')),
  gameRestart: /** @type {HTMLButtonElement} */ ($('#game-restart')),
  gameControls: $('#game-controls'),
};

/** @param {'start' | 'intro' | 'game'} name */
export function showScreen(name) {
  elements.startScreen.hidden = name !== 'start';
  elements.introScreen.hidden = name !== 'intro';
  elements.gameScreen.hidden = name !== 'game';
}

/**
 * Fill the intro screen for `game` and show only its own settings fieldset
 * (fieldsets with `data-game`) next to the shared ones.
 * @param {import('./games/index.js').GameInfo} game
 * @param {string} lang
 */
export function fillIntro(game, lang) {
  const textId = game.textId ?? game.id;
  elements.introIcon.src = game.icon;
  elements.introCategory.textContent = t(lang, `categories.${game.category}.name`);
  elements.introName.textContent = t(lang, `games.${game.id}.name`);
  elements.introHelp.textContent = t(lang, `games.${textId}.help`);
  for (const fieldset of elements.settingsForm.querySelectorAll('fieldset[data-category]')) {
    /** @type {HTMLElement} */ (fieldset).hidden = fieldset.getAttribute('data-category') !== game.category;
  }
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
 * The menu: a heading per category, then a card (icon + name) per game.
 * Clicking a card opens that game's page.
 * @param {string[]} categories  category ids in order
 * @param {import('./games/index.js').GameInfo[]} games
 * @param {string} lang
 * @param {(id: string) => void} onPick
 */
export function renderGameMenu(categories, games, lang, onPick) {
  elements.gameMenu.replaceChildren(
    ...categories.flatMap((category) => {
      const heading = document.createElement('h2');
      heading.className = 'category-name';
      heading.textContent = t(lang, `categories.${category}.name`);

      const grid = document.createElement('div');
      grid.className = 'category-games';
      grid.append(
        ...games
          .filter((game) => game.category === category)
          .map((game) => {
            const card = document.createElement('button');
            card.type = 'button';
            card.className = 'game-card';
            card.dataset.game = game.id;

            const img = document.createElement('img');
            img.src = game.icon;
            img.alt = '';
            img.draggable = false;

            const name = document.createElement('span');
            name.className = 'game-name';
            name.textContent = t(lang, `games.${game.id}.name`);

            card.append(img, name);
            card.addEventListener('click', () => onPick(game.id));
            return card;
          }),
      );
      return [heading, grid];
    }),
  );
}

/** Focus the card of `id` on the menu (after going back from an intro). */
export function focusMenu(id) {
  /** @type {HTMLElement | null} */ (elements.gameMenu.querySelector(`[data-game="${id}"]`))?.focus();
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
