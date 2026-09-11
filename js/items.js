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
 *     label: { ka: 'ბურთი', en: 'Ball', ru: 'Мяч' },
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
 * @param {string} id  also the image file name
 * @param {string} ka
 * @param {string} en
 * @param {string} ru
 * @returns {Item}
 */
const item = (id, ka, en, ru) => ({ id, image: `assets/images/${id}.svg`, label: { ka, en, ru } });

/** @type {Item[]} */
export const items = [
  // Page 1: fruit
  item('apple', 'ვაშლი', 'Apple', 'Яблоко'),
  item('banana', 'ბანანი', 'Banana', 'Банан'),
  item('orange', 'ფორთოხალი', 'Orange', 'Апельсин'),
  item('grapes', 'ყურძენი', 'Grapes', 'Виноград'),
  // Page 2: food
  item('strawberry', 'მარწყვი', 'Strawberry', 'Клубника'),
  item('carrot', 'სტაფილო', 'Carrot', 'Морковь'),
  item('bread', 'პური', 'Bread', 'Хлеб'),
  item('cake', 'ტორტი', 'Cake', 'Торт'),
  // Page 3: drinks and home
  item('milk', 'რძე', 'Milk', 'Молоко'),
  item('water', 'წყალი', 'Water', 'Вода'),
  item('bed', 'საწოლი', 'Bed', 'Кровать'),
  item('house', 'სახლი', 'House', 'Дом'),
  // Page 4: toys
  item('ball', 'ბურთი', 'Ball', 'Мяч'),
  item('balloon', 'ბუშტი', 'Balloon', 'Шарик'),
  item('car', 'მანქანა', 'Car', 'Машина'),
  item('book', 'წიგნი', 'Book', 'Книга'),
  // Page 5: sky and tree
  item('sun', 'მზე', 'Sun', 'Солнце'),
  item('moon', 'მთვარე', 'Moon', 'Луна'),
  item('star', 'ვარსკვლავი', 'Star', 'Звезда'),
  item('tree', 'ხე', 'Tree', 'Дерево'),
  // Page 6: flower and animals
  item('flower', 'ყვავილი', 'Flower', 'Цветок'),
  item('fish', 'თევზი', 'Fish', 'Рыба'),
  item('cat', 'კატა', 'Cat', 'Кошка'),
  item('bird', 'ჩიტი', 'Bird', 'Птица'),
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
