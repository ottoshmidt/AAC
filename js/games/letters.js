// @ts-check
/**
 * Alphabet: the guessing game played with letters instead of pictures. One
 * game per alphabet (Georgian, English, Russian), each read aloud in its own
 * language whatever the interface language is.
 *
 * The game itself is GuessGame from ./guess.js: letters are just items with
 * `text` instead of `image`, so pages, scanning, touch and the settings all
 * work the same way.
 */

import { letterSets } from '../letters.js';
import { GuessGame } from './guess.js';

/** @type {Record<string, string>} menu icon per alphabet */
const ICONS = {
  ka: 'assets/icons/letters-ka.svg',
  en: 'assets/icons/letters-en.svg',
  ru: 'assets/icons/letters-ru.svg',
};

/**
 * One game per alphabet, all in the 'letters' category, sharing the help
 * text and the Guess items settings (pictures at a time, how to choose).
 * @type {import('./index.js').GameInfo[]}
 */
export const letterGames = Object.keys(letterSets).map((lang) => ({
  id: `letters-${lang}`,
  category: 'letters',
  textId: 'letters',
  settingsCategory: 'guess',
  icon: ICONS[lang],
  items: letterSets[lang],
  create: (/** @type {import('./index.js').GameContext} */ ctx) => new GuessGame(ctx, letterSets[lang]),
}));
