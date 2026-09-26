// @ts-check
/**
 * The games shown on the start menu, grouped by category, in menu order.
 *
 * A game module exports one or more GameInfo objects. Strings live in
 * js/i18n.js: `categories.<category>.name`, `games.<id>.name`, and
 * `games.<textId>.help` (textId defaults to id, so games that share help
 * text can share it). Icons and pictures must be in the
 * PRECACHE list of sw.js (tests check this).
 */

import { bubbleGames } from './bubbles.js';
import { guessGames } from './guess.js';
import { letterGames } from './letters.js';
import { matchGames } from './match.js';
import { trainGames } from './train.js';

/**
 * @typedef {object} GameContext
 * @property {HTMLElement} root  the game's screen; the game fills and clears it
 * @property {HTMLElement} backButton  the shell's Back button on the game screen (tap only; not scanned)
 * @property {HTMLElement} controls  slot in the top bar, right of Back, for the game's own tap-only buttons; cleared by the game in stop()
 * @property {() => import('../settings.js').Settings} settings  current settings
 * @property {() => string} lang  current language code
 * @property {import('../speech.js').Speech} speech
 * @property {(item: import('../items.js').Item) => void} speakItem  speak a picture's label (or clip)
 * @property {(text: string) => void} say  speak any text in the current language and voice
 * @property {(item: import('../items.js').Item, lang: string) => string} labelFor
 * @property {(key: string, vars?: Record<string, string | number>) => string} t  translate in the current language
 * @property {() => void} exit  leave the game (what the Back button does)
 */

/**
 * @typedef {object} Game
 * @property {() => void} start  show the game in `root` and begin
 * @property {() => void} stop   stop timers and sounds and clear `root`
 * @property {(event?: PointerEvent) => void} press  the user pressed (click, tap, switch)
 * @property {(event?: PointerEvent) => void} [release]  the user let go; only games
 *   built on holding (js/games/bubbles.js) need it. The event tells which
 *   finger it was, so lifting another one does not end a hold.
 * @property {(event: KeyboardEvent) => boolean} key  a caregiver key; return true if used
 */

/**
 * @typedef {object} GameInfo
 * @property {string} id
 * @property {string} category  key of CATEGORIES
 * @property {string} [textId]  whose help text to show (default: id)
 * @property {string} [settingsCategory]  whose settings fieldset to show (default: category; '' for none)
 * @property {string} icon  path to the menu icon
 * @property {import('../items.js').Item[]} [items]  pictures the game speaks (for voice preparation)
 * @property {(ctx: GameContext) => Game} create
 */

/** Category ids in menu order. */
export const CATEGORIES = ['guess', 'letters', 'match', 'hold'];

/** @type {GameInfo[]} */
export const games = [...trainGames, ...guessGames, ...letterGames, ...matchGames, ...bubbleGames];
