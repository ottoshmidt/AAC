// @ts-check
/**
 * The two pictures shown in the game, left then right.
 *
 * Fields:
 *   id     unique identifier
 *   label  shown under the picture and spoken on selection
 *   image  path to the picture (SVG, PNG, JPG, WebP)
 *   audio  optional recorded clip played instead of text-to-speech
 *   lang   optional language of the label, e.g. 'en-US'
 *
 * Also add new files to the PRECACHE list in sw.js so they work offline.
 */

/**
 * @typedef {import('./speech.js').SpeakableItem & { id: string, image: string }} Item
 */

/** @type {Item[]} */
export const items = [
  { id: 'apple', label: 'Apple', image: 'assets/images/apple.svg' },
  { id: 'ball', label: 'Ball', image: 'assets/images/ball.svg' },
];
