// @ts-check
/**
 * Guess items: pictures are highlighted one after another (single-switch
 * scanning); a press anywhere selects the highlighted one, which is spoken.
 * Pictures come in pages; once every picture on a page has been chosen the
 * next page appears.
 *
 * After the pictures, the scan visits the shell's Back button, so a
 * single-switch user can leave the game.
 *
 * The game owns everything inside its screen. The shell (main.js) gives it a
 * root element and a context, and forwards presses and key strokes.
 */

import { itemSets } from '../items.js';
import { PageProgress } from '../pages.js';
import { Scanner } from '../scanner.js';

/** Menu icon per set (an item's own picture, or the game icon for Mixed). */
const ICONS = {
  mixed: 'assets/icons/game-guess.svg',
  fruit: 'assets/images/fruit/apple.svg',
  vegetables: 'assets/images/vegetables/carrot.svg',
  transport: 'assets/images/transport/car.svg',
  clothes: 'assets/images/clothes/t-shirt.svg',
  animals: 'assets/images/animals/cat.svg',
  birds: 'assets/images/birds/owl.svg',
};

/**
 * One "Guess items" game per picture set, all in the 'guess' category and
 * sharing the same description, help and settings (textId 'guess').
 * @type {import('./index.js').GameInfo[]}
 */
export const guessGames = Object.entries(ICONS).map(([set, icon]) => ({
  id: `guess-${set}`,
  category: 'guess',
  textId: 'guess',
  icon,
  items: itemSets[set],
  create: (ctx) => new GuessGame(ctx, itemSets[set]),
}));

/** @implements {import('./index.js').Game} */
class GuessGame {
  /**
   * @param {import('./index.js').GameContext} ctx
   * @param {import('../items.js').Item[]} items  the pictures, in page order
   */
  constructor(ctx, items) {
    this.ctx = ctx;
    this.items = items;
    this.progress = new PageProgress(items.length, ctx.settings().choicesPerRound);
    /** Scan index -> slot on the page; chosen slots are left out. */
    this.scanSlots = this.progress.remaining;
    const s = ctx.settings();
    this.scanner = new Scanner({
      itemCount: this.scanSlots.length,
      intervalMs: s.intervalMs,
      cooldownMs: s.cooldownMs,
      debounceMs: s.debounceMs,
      maxCycles: s.maxCycles,
    });

    // Each round (start, page turn, after every choice) moves on to the next
    // page if all pictures were chosen, then draws the page and scans what's
    // left, starting from the first.
    this.scanner.addEventListener('round', () => {
      this.progress.startRound();
      this.renderPage();
    });
    this.scanner.addEventListener('highlight', (event) => {
      const { index } = /** @type {CustomEvent} */ (event).detail;
      const s = ctx.settings();
      if (index === this.scanSlots.length) {
        // Last stop of the round: the Back button.
        this.setHighlight(-1);
        ctx.backButton.classList.add('scan-highlight');
        if (s.speakOnHighlight) ctx.say(ctx.t('back'));
        else if (s.highlightSound) ctx.speech.tick();
        return;
      }
      const slot = this.scanSlots[index];
      this.setHighlight(slot);
      if (s.speakOnHighlight) ctx.speakItem(this.pageItems()[slot]);
      else if (s.highlightSound) ctx.speech.tick();
    });
    this.scanner.addEventListener('select', (event) => {
      const { index } = /** @type {CustomEvent} */ (event).detail;
      if (index === this.scanSlots.length) {
        ctx.exit();
        return;
      }
      const slot = this.scanSlots[index];
      this.progress.choose(slot);
      this.setSelected(slot);
      if (ctx.settings().speakOnSelect) ctx.speakItem(this.pageItems()[slot]);
    });
    this.scanner.addEventListener('pause', () => this.showPaused(true));
    this.scanner.addEventListener('resume', () => this.showPaused(false));
  }

  pageItems() {
    return this.progress.pictures.map((i) => this.items[i]);
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
    this.progress.setPerPage(s.choicesPerRound);
    this.buildScreen();
    this.scanner.start(); // emits 'round', which draws the page
  }

  stop() {
    this.scanner.stop();
    this.ctx.backButton.classList.remove('scan-highlight');
    this.ctx.root.replaceChildren();
  }

  press() {
    this.scanner.press();
  }

  /**
   * Caregiver keys: arrows turn pages.
   * @param {KeyboardEvent} event
   * @returns {boolean} whether the key was used
   */
  key(event) {
    if (event.key === 'ArrowRight') this.turnPage(+1);
    else if (event.key === 'ArrowLeft') this.turnPage(-1);
    else return false;
    return true;
  }

  /** @param {number} delta */
  turnPage(delta) {
    this.progress.turn(delta);
    this.ctx.speech.cancel();
    this.showPaused(false);
    this.scanner.start();
  }

  // ---- Screen ----------------------------------------------------------------

  buildScreen() {
    const { root, t } = this.ctx;
    this.choices = el('div', 'choices');
    this.pageIndicator = el('div', 'page-indicator');
    this.pageIndicator.setAttribute('aria-live', 'polite');
    this.pauseOverlay = el('div', 'pause-overlay');
    this.pauseOverlay.hidden = true;
    const p = el('p');
    p.append(el('span', '', t('paused')), el('br'), el('span', 'sub', t('clickToContinue')));
    this.pauseOverlay.append(p);
    root.replaceChildren(this.choices, this.pageIndicator, this.pauseOverlay);
  }

  renderPage() {
    const { lang, labelFor, settings } = this.ctx;
    this.scanSlots = this.progress.remaining;
    this.scanner.updateOptions({ itemCount: this.scanSlots.length + 1 }); // + Back

    const choices = /** @type {HTMLElement} */ (this.choices);
    choices.dataset.count = String(settings().choicesPerRound); // grid layout; a short last page keeps positions
    choices.replaceChildren(
      ...this.pageItems().map((item, slot) => {
        const label = labelFor(item, lang());
        const figure = el('figure', 'choice');
        figure.classList.toggle('done', this.progress.chosen.has(slot));
        figure.dataset.index = String(slot);
        const img = el('img');
        img.src = item.image;
        img.alt = label;
        img.draggable = false;
        figure.append(img, el('figcaption', '', label));
        return figure;
      }),
    );

    const indicator = /** @type {HTMLElement} */ (this.pageIndicator);
    indicator.textContent = `${this.progress.page + 1} / ${this.progress.pageCount}`;
    indicator.hidden = this.progress.pageCount <= 1;
  }

  choiceElements() {
    return /** @type {HTMLElement[]} */ ([...(this.choices?.children ?? [])]);
  }

  /** @param {number} slot highlighted slot, or -1 for none */
  setHighlight(slot) {
    this.ctx.backButton.classList.remove('scan-highlight');
    for (const c of this.choiceElements()) {
      c.classList.toggle('highlighted', Number(c.dataset.index) === slot);
      c.classList.remove('selected', 'not-selected');
    }
  }

  /** @param {number} slot */
  setSelected(slot) {
    for (const c of this.choiceElements()) {
      const isSelected = Number(c.dataset.index) === slot;
      c.classList.remove('highlighted');
      c.classList.toggle('selected', isSelected);
      c.classList.toggle('not-selected', !isSelected && !c.classList.contains('done'));
    }
  }

  /** @param {boolean} paused */
  showPaused(paused) {
    if (this.pauseOverlay) this.pauseOverlay.hidden = !paused;
    if (paused) this.setHighlight(-1);
  }
}

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
