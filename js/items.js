// @ts-check
/**
 * The two pictures shown in the game, left then right.
 *
 * Fields:
 *   id     unique identifier
 *   image  path to the picture (SVG, PNG, JPG, WebP)
 *   label  text per language: shown under the picture and spoken on selection
 *   audio  optional recorded clip per language, played instead of text-to-speech
 *
 * Example with a Georgian recording:
 *   { id: 'ball', image: 'assets/images/ball.svg',
 *     label: { ka: 'ბურთი', en: 'Ball' },
 *     audio: { ka: 'assets/audio/ka/ball.mp3' } }
 *
 * Also add new files to the PRECACHE list in sw.js so they work offline.
 */

/**
 * @typedef {object} Item
 * @property {string} id
 * @property {string} image
 * @property {Record<string, string>} label
 * @property {Record<string, string>} [audio]
 */

/** @type {Item[]} */
export const items = [
  { id: 'apple', image: 'assets/images/apple.svg', label: { ka: 'ვაშლი', en: 'Apple' } },
  { id: 'ball', image: 'assets/images/ball.svg', label: { ka: 'ბურთი', en: 'Ball' } },
];

/**
 * An item's label in `lang`, falling back to English, then to its id.
 * @param {Item} item
 * @param {string} lang
 */
export function labelFor(item, lang) {
  return item.label[lang] ?? item.label.en ?? item.id;
}

/**
 * An item's recorded clip in `lang`, if it has one.
 * @param {Item} item
 * @param {string} lang
 */
export function clipFor(item, lang) {
  return item.audio?.[lang];
}
