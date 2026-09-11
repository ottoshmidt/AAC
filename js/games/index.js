// @ts-check
/**
 * The games shown on the start menu, in menu order.
 *
 * Each game is a module exporting an `info` object (see GameInfo). Its
 * strings live in js/i18n.js under `games.<id>.name`, `.description` and
 * `.help`; its icon goes in assets/icons and in the PRECACHE list of sw.js.
 */

import { info as guess } from './guess.js';

/**
 * @typedef {object} GameContext
 * @property {HTMLElement} root  the game's screen; the game fills and clears it
 * @property {() => import('../settings.js').Settings} settings  current settings
 * @property {() => string} lang  current language code
 * @property {import('../speech.js').Speech} speech
 * @property {(item: import('../items.js').Item) => void} speakItem  speak a picture's label (or clip)
 * @property {(item: import('../items.js').Item, lang: string) => string} labelFor
 * @property {(key: string, vars?: Record<string, string | number>) => string} t  translate in the current language
 */

/**
 * @typedef {object} Game
 * @property {() => void} start  show the game in `root` and begin
 * @property {() => void} stop   stop timers and sounds and clear `root`
 * @property {() => void} press  the user pressed (click, tap, switch)
 * @property {(event: KeyboardEvent) => boolean} key  a caregiver key; return true if used
 */

/**
 * @typedef {object} GameInfo
 * @property {string} id
 * @property {string} icon  path to the menu icon
 * @property {(ctx: GameContext) => Game} create
 */

/** @type {GameInfo[]} */
export const games = [guess];
