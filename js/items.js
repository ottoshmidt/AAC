// @ts-check
/**
 * The picture pool, in page order: pages of 4 (or 2, see the "Pictures at a
 * time" setting) are cut from this list in sequence, so group related
 * pictures in runs of 4.
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

/**
 * @param {string} id
 * @param {string} ka
 * @param {string} en
 * @returns {Item}
 */
const item = (id, ka, en) => ({ id, image: `assets/images/${id}.svg`, label: { ka, en } });

/** @type {Item[]} */
export const items = [
  // Page 1: fruit
  item('apple', 'ვაშლი', 'Apple'),
  item('banana', 'ბანანი', 'Banana'),
  item('orange', 'ფორთოხალი', 'Orange'),
  item('grapes', 'ყურძენი', 'Grapes'),
  // Page 2: food
  item('strawberry', 'მარწყვი', 'Strawberry'),
  item('carrot', 'სტაფილო', 'Carrot'),
  item('bread', 'პური', 'Bread'),
  item('cake', 'ტორტი', 'Cake'),
  // Page 3: drinks and home
  item('milk', 'რძე', 'Milk'),
  item('water', 'წყალი', 'Water'),
  item('bed', 'საწოლი', 'Bed'),
  item('house', 'სახლი', 'House'),
  // Page 4: toys
  item('ball', 'ბურთი', 'Ball'),
  item('balloon', 'ბუშტი', 'Balloon'),
  item('car', 'მანქანა', 'Car'),
  item('book', 'წიგნი', 'Book'),
  // Page 5: sky and tree
  item('sun', 'მზე', 'Sun'),
  item('moon', 'მთვარე', 'Moon'),
  item('star', 'ვარსკვლავი', 'Star'),
  item('tree', 'ხე', 'Tree'),
  // Page 6: flower and animals
  item('flower', 'ყვავილი', 'Flower'),
  item('fish', 'თევზი', 'Fish'),
  item('cat', 'კატა', 'Cat'),
  item('bird', 'ჩიტი', 'Bird'),
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
