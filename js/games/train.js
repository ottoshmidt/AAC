// @ts-check
/**
 * Training: one picture at a time. It is shown dark first, then lights up
 * for an interval, goes dark for an interval, and lights up again, so the
 * learner can connect "it is lit" with "click now". The word is spoken every
 * time the picture lights up.
 *
 * A click while the picture is lit counts: the word is spoken again, the
 * picture is marked with a ✓, and the next picture follows. A click while the
 * picture is dark is ignored entirely (see press()), so clicking early costs
 * nothing and does not shift the rhythm.
 *
 * Timing, the pause after unanswered rounds and the sounds come from the
 * same settings as the guessing games.
 */

import { itemSets } from '../items.js';
import { Scanner } from '../scanner.js';

/**
 * The ten pictures to train on: the start of the Mixed set, which is
 * everyday things (food, drink, home) rather than one narrow topic.
 */
const TRAINING_ITEMS = itemSets.mixed.slice(0, 10);

/**
 * One Training game for the whole app, not one per picture set. It sits in
 * the Guess category, first, because it teaches the click the other
 * games rely on; it has no picture-count setting of its own.
 * @type {import('./index.js').GameInfo[]}
 */
export const trainGames = [
  {
    id: 'train',
    category: 'guess',
    settingsCategory: '',
    icon: 'assets/images/animals/dog.webp',
    items: TRAINING_ITEMS,
    create: (ctx) => new TrainGame(ctx, TRAINING_ITEMS),
  },
];

/** @implements {import('./index.js').Game} */
class TrainGame {
  /**
   * @param {import('./index.js').GameContext} ctx
   * @param {import('../items.js').Item[]} items  the pictures, in order
   */
  constructor(ctx, items) {
    this.ctx = ctx;
    this.items = items;
    this.index = 0;
    /** Whether the picture is lit right now. */
    this.lit = false;
    /** Set by a click while lit; the next round then moves on. */
    this.answered = false;

    const s = ctx.settings();
    // One "item": every interval the scanner reports it again, which is when
    // the picture turns on or off. Presses, the cooldown after a click and
    // the pause after `maxCycles` quiet rounds all work as in the other games.
    this.scanner = new Scanner({
      itemCount: 1,
      intervalMs: s.intervalMs,
      cooldownMs: s.cooldownMs,
      debounceMs: s.debounceMs,
      maxCycles: s.maxCycles,
    });

    this.scanner.addEventListener('round', () => {
      if (this.answered) {
        this.answered = false;
        this.index = (this.index + 1) % this.items.length;
      }
      // A round starts dark: the first highlight (which follows immediately)
      // turns the picture off, so every picture is shown quietly first and
      // only lights up an interval later. No render here, so it never flashes.
      this.lit = true;
    });
    this.scanner.addEventListener('highlight', () => {
      this.lit = !this.lit;
      this.render();
      if (!this.lit) return;
      const settings = ctx.settings();
      if (settings.speakOnHighlight !== false) ctx.speakItem(this.item());
      else if (settings.highlightSound) ctx.speech.tick();
    });
    this.scanner.addEventListener('select', () => {
      this.answered = true;
      this.render();
      if (ctx.settings().speakOnSelect) ctx.speakItem(this.item());
    });
    this.scanner.addEventListener('pause', () => this.showPaused(true));
    this.scanner.addEventListener('resume', () => this.showPaused(false));
  }

  item() {
    return this.items[this.index];
  }

  // ---- Game interface --------------------------------------------------------

  start() {
    const s = this.ctx.settings();
    this.scanner.updateOptions({
      intervalMs: s.intervalMs,
      cooldownMs: s.cooldownMs,
      debounceMs: s.debounceMs,
      maxCycles: s.maxCycles,
    });
    this.buildScreen();
    this.scanner.start();
  }

  stop() {
    this.scanner.stop();
    this.ctx.root.replaceChildren();
    this.ctx.controls.replaceChildren();
  }

  press() {
    // While the picture is dark a press is ignored completely, so clicking
    // early costs nothing: it neither counts nor delays the next light-up.
    // A press still resumes after the "Paused" overlay.
    if (this.lit || this.scanner.state === 'paused') this.scanner.press();
  }

  /**
   * Caregiver keys: arrows change the picture.
   * @param {KeyboardEvent} event
   * @returns {boolean} whether the key was used
   */
  key(event) {
    if (event.key === 'ArrowRight') this.turn(+1);
    else if (event.key === 'ArrowLeft') this.turn(-1);
    else return false;
    return true;
  }

  /** @param {number} delta */
  turn(delta) {
    this.index = (this.index + delta + this.items.length) % this.items.length;
    this.answered = false;
    this.ctx.speech.cancel();
    this.showPaused(false);
    this.scanner.start(); // a fresh round on the new picture
  }

  // ---- Screen ----------------------------------------------------------------

  buildScreen() {
    const { root, t } = this.ctx;
    this.card = el('figure', 'choice');
    this.image = /** @type {HTMLImageElement} */ (el('img'));
    this.image.draggable = false;
    this.caption = el('figcaption');
    this.card.append(this.image, this.caption);
    const board = el('div', 'choices');
    board.dataset.count = '1';
    board.append(this.card);

    this.counter = el('div', 'page-indicator');
    this.counter.setAttribute('aria-live', 'polite');
    this.pauseOverlay = el('div', 'pause-overlay');
    this.pauseOverlay.hidden = true;
    const p = el('p');
    p.append(el('span', '', t('paused')), el('br'), el('span', 'sub', t('clickToContinue')));
    this.pauseOverlay.append(p);
    root.replaceChildren(board, this.counter, this.pauseOverlay);

    // Previous/next picture in the top bar, for the caregiver's finger.
    this.pictureButtons = [-1, +1].map((delta) => {
      const button = el('button', 'page-button');
      button.type = 'button';
      button.setAttribute('aria-label', t(delta < 0 ? 'previousPicture' : 'nextPicture'));
      button.innerHTML = delta < 0 ? TRIANGLE_LEFT : TRIANGLE_RIGHT;
      button.addEventListener('click', () => this.turn(delta));
      return button;
    });
    this.ctx.controls.replaceChildren(...this.pictureButtons);
    this.render();
  }

  render() {
    const { lang, labelFor } = this.ctx;
    const item = this.item();
    const card = /** @type {HTMLElement} */ (this.card);
    const image = /** @type {HTMLImageElement} */ (this.image);
    const label = labelFor(item, lang());
    if (image.getAttribute('src') !== item.image) image.src = item.image;
    image.alt = label;
    /** @type {HTMLElement} */ (this.caption).textContent = label;
    card.classList.toggle('highlighted', this.lit && !this.answered);
    card.classList.toggle('selected', this.answered);
    card.classList.toggle('done', this.answered);
    /** @type {HTMLElement} */ (this.counter).textContent = `${this.index + 1} / ${this.items.length}`;
  }

  /** @param {boolean} paused */
  showPaused(paused) {
    if (this.pauseOverlay) this.pauseOverlay.hidden = !paused;
    if (paused) {
      this.lit = false;
      this.render();
    }
  }
}

const TRIANGLE_LEFT = '<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M14 3v14L4 10z"/></svg>';
const TRIANGLE_RIGHT = '<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M6 3v14l10-7z"/></svg>';

/**
 * @param {string} tag
 * @param {string} [className]
 * @param {string} [text]
 */
function el(tag, className = '', text = '') {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text) node.textContent = text;
  return node;
}
