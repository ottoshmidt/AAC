// @ts-check
/**
 * The shapes of the Matching game.
 *
 * A shape is drawn, not photographed: an SVG path on a 100×100 canvas, so it
 * scales to any screen and needs no image file (and so nothing to precache).
 * The same path draws the shape itself and its empty slot, which is the same
 * outline dashed, so a shape and its slot can never look slightly different.
 *
 * Each shape keeps its colour wherever it appears, so a child can follow it
 * from the top row into the slot below.
 *
 * Each shape carries its own `box` (the SVG viewBox), which is exactly the
 * bounds of its path rather than the whole 100×100 canvas, so every shape
 * fills its cell instead of floating in the empty margin around it.
 *
 * Fields are those of an Item (js/items.js) plus `path`, `box` and `color`,
 * so the shapes can be spoken and prepared for a voice like any other picture.
 */

/**
 * @typedef {import('./items.js').Item & { path: string, box: string, color: string }} Shape
 */

/** @type {Shape[]} */
export const SHAPES = [
  {
    id: 'circle',
    // A circle as a path (two arcs), so every shape is drawn the same way.
    path: 'M50 6a44 44 0 1 0 0.01 0z',
    box: '6 6 88 88',
    color: '#e2332f',
    label: { ka: 'წრე', en: 'Circle', ru: 'Круг' },
  },
  {
    id: 'square',
    path: 'M10 10h80v80h-80z',
    box: '10 10 80 80',
    color: '#3d7eff',
    label: { ka: 'კვადრატი', en: 'Square', ru: 'Квадрат' },
  },
  {
    id: 'triangle',
    path: 'M50 8 94 88h-88z',
    box: '6 8 88 80',
    color: '#2fbf71',
    label: { ka: 'სამკუთხედი', en: 'Triangle', ru: 'Треугольник' },
  },
  {
    id: 'star',
    path: 'M50 6 63 39l35 2-27 23 9 34-30-19-30 19 9-34-27-23 35-2z',
    box: '2 6 96 92',
    color: '#ff9f1c',
    label: { ka: 'ვარსკვლავი', en: 'Star', ru: 'Звезда' },
  },
];

/**
 * The first `count` shapes. The order is fixed, so 2 shapes are always the
 * circle and the square: the easiest pair to tell apart, and the same pair
 * every time, which is what a learner needs.
 * @param {number} count
 */
export function shapesFor(count) {
  return SHAPES.slice(0, Math.min(Math.max(count, 2), SHAPES.length));
}
