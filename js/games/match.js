// @ts-check
/**
 * Matching: put each shape into the slot of the same shape.
 *
 * The shapes sit in the top row, their empty slots in the bottom row, both
 * shuffled independently so the answer is never simply "the one below".
 *
 * Two ways to move a shape, set by `matchInput`:
 *
 *   dragging  pick the shape up with a finger, mouse or stylus and drop it on
 *             a slot; dropping it anywhere else sends it home. A slot also
 *             takes a drop that lands near it, not only dead centre.
 *   scanning  two clicks, the same rule as the rest of the app: the highlight
 *             moves across the shapes, a click takes the lit one; then the
 *             highlight moves across the empty slots, and a click drops the
 *             shape into the lit one.
 *   both      scanning runs, and dragging works at the same time.
 *
 * A wrong slot costs nothing: the shape goes back to the top row and can be
 * tried again. When the last shape is placed the round is praised and a new
 * one is shuffled.
 */

import { Scanner } from '../scanner.js';
import { shapesFor } from '../shapes.js';

/** Menu icon: the game's own shapes. */
const ICON = 'assets/icons/game-match.svg';

/** A drop this far outside a slot (px) still counts as that slot. */
const DROP_SLACK = 40;

/** @type {import('./index.js').GameInfo[]} */
export const matchGames = [
  {
    id: 'match-shapes',
    category: 'match',
    textId: 'match',
    icon: ICON,
    // Every shape can be spoken, whatever the shape count is set to.
    items: shapesFor(4),
    create: (ctx) => new MatchGame(ctx),
  },
];

/**
 * One round: which shapes are in the top row, which slots are below them and
 * what has been placed so far. No DOM and no timers, so the rules can be
 * tested on their own (tests/match.test.js).
 */
export class MatchRound {
  /**
   * @param {import('../shapes.js').Shape[]} shapes  the shapes to play with
   * @param {(n: number) => number[]} [order]  a shuffle, injectable for tests:
   *   given a count it returns those indices in the order to use
   */
  constructor(shapes, order = shuffled) {
    this.shapes = shapes;
    this.order = order;
    /** Shape ids in the top row. @type {string[]} */
    this.top = [];
    /** Shape ids in the slot row. @type {string[]} */
    this.slots = [];
    /** Slot indices already filled. @type {Set<number>} */
    this.filled = new Set();
    /** The shape held right now, an index into `top`. @type {number | null} */
    this.picked = null;
    this.deal();
  }

  /** Shuffle both rows and empty every slot. */
  deal() {
    const ids = this.shapes.map((s) => s.id);
    this.top = this.order(ids.length).map((i) => ids[i]);
    // The slots get their own order. With more than one shape, an order that
    // repeats the top row would make the game "drop it straight down", so it
    // is shuffled again (a few tries, then taken as it comes).
    for (let attempt = 0; attempt < 10; attempt += 1) {
      this.slots = this.order(ids.length).map((i) => ids[i]);
      if (ids.length < 2 || this.slots.some((id, i) => id !== this.top[i])) break;
    }
    this.filled.clear();
    this.picked = null;
  }

  /** Top-row indices still waiting to be placed. */
  remaining() {
    const placed = new Set([...this.filled].map((slot) => this.slots[slot]));
    return this.top.map((_, i) => i).filter((i) => !placed.has(this.top[i]));
  }

  /** Indices of the empty slots. */
  empty() {
    return this.slots.map((_, i) => i).filter((i) => !this.filled.has(i));
  }

  get done() {
    return this.filled.size === this.slots.length;
  }

  /**
   * Take a shape from the top row. Ignored for a shape already placed.
   * @param {number} index  index into `top`
   * @returns {boolean} whether it was taken
   */
  pick(index) {
    if (!this.remaining().includes(index)) return false;
    this.picked = index;
    return true;
  }

  /** Put the held shape back in the top row. */
  drop() {
    this.picked = null;
  }

  /**
   * Try to place the held shape into `slot`.
   * @param {number} slot  index into `slots`
   * @returns {boolean} whether it was the matching slot
   */
  place(slot) {
    if (this.picked === null || this.filled.has(slot)) return false;
    const correct = this.top[this.picked] === this.slots[slot];
    if (correct) this.filled.add(slot);
    this.picked = null;
    return correct;
  }

  /** The shape of a top-row index. */
  shapeAt(index) {
    return /** @type {import('../shapes.js').Shape} */ (this.shapes.find((s) => s.id === this.top[index]));
  }

  /** The shape a slot is waiting for. */
  slotShape(slot) {
    return /** @type {import('../shapes.js').Shape} */ (this.shapes.find((s) => s.id === this.slots[slot]));
  }
}

/** Indices 0…n-1 in random order (Fisher-Yates). */
function shuffled(n) {
  const a = Array.from({ length: n }, (_, i) => i);
  for (let i = a.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** @implements {import('./index.js').Game} */
class MatchGame {
  /** @param {import('./index.js').GameContext} ctx */
  constructor(ctx) {
    this.ctx = ctx;
    const s = ctx.settings();
    this.round = new MatchRound(shapesFor(s.matchShapes));
    /** Set in start() from `matchInput`. */
    this.scanInput = true;
    this.dragInput = false;
    /** Which row the highlight is moving across. @type {'shapes' | 'slots'} */
    this.phase = 'shapes';
    /** Scan index -> row index (placed shapes and filled slots are skipped). @type {number[]} */
    this.scanTargets = [];
    /** The shape being dragged, and where the pointer went down. @type {{ el: HTMLElement, x: number, y: number } | null} */
    this.drag = null;

    this.scanner = new Scanner({
      itemCount: 1,
      intervalMs: s.intervalMs,
      cooldownMs: s.cooldownMs,
      debounceMs: s.debounceMs,
      maxCycles: s.maxCycles,
    });

    // A round of scanning starts after every selection: the phase follows
    // the game's state, so picking a shape moves the highlight to the slots
    // and placing one (or getting it wrong) moves it back to the shapes.
    this.scanner.addEventListener('round', () => {
      if (this.round.done) this.round.deal();
      this.phase = this.round.picked === null ? 'shapes' : 'slots';
      this.scanTargets = this.phase === 'shapes' ? this.round.remaining() : this.round.empty();
      this.scanner.updateOptions({ itemCount: Math.max(this.scanTargets.length, 1) });
      this.render();
    });
    this.scanner.addEventListener('highlight', (event) => {
      this.highlight = this.scanTargets[/** @type {CustomEvent} */ (event).detail.index] ?? -1;
      this.render();
      const settings = ctx.settings();
      // In the slot row there is nothing new to name: the child is holding
      // the shape whose name was just spoken, so only the tick plays.
      if (settings.speakOnHighlight && this.phase === 'shapes' && this.highlight >= 0) {
        ctx.speakItem(this.round.shapeAt(this.highlight));
      } else if (settings.highlightSound) ctx.speech.tick();
    });
    this.scanner.addEventListener('select', (event) => {
      const target = this.scanTargets[/** @type {CustomEvent} */ (event).detail.index];
      if (target === undefined) return;
      if (this.phase === 'shapes') this.take(target);
      else this.put(target);
    });
    this.scanner.addEventListener('pause', () => this.showPaused(true));
    this.scanner.addEventListener('resume', () => this.showPaused(false));

    /** Highlighted row index, or -1. */
    this.highlight = -1;
    this.onPointerMove = (/** @type {PointerEvent} */ e) => this.moveDrag(e);
    this.onPointerUp = (/** @type {PointerEvent} */ e) => this.endDrag(e);
  }

  // ---- Game interface --------------------------------------------------------

  start() {
    const s = this.ctx.settings();
    this.scanInput = s.matchInput === 'scan' || s.matchInput === 'both';
    this.dragInput = s.matchInput === 'drag' || s.matchInput === 'both';
    this.round = new MatchRound(shapesFor(s.matchShapes));
    this.scanner.updateOptions({
      intervalMs: s.intervalMs,
      cooldownMs: s.cooldownMs,
      debounceMs: s.debounceMs,
      maxCycles: s.maxCycles,
    });
    this.buildScreen();
    if (this.scanInput) {
      this.scanner.start(); // emits 'round', which draws the rows
    } else {
      this.highlight = -1;
      this.render();
    }
  }

  stop() {
    this.scanner.stop();
    this.cancelDrag();
    this.ctx.root.replaceChildren();
    this.ctx.controls.replaceChildren();
  }

  press() {
    // While dragging, the press that ends the drag is not also a selection.
    if (this.scanInput && !this.drag) this.scanner.press();
  }

  /**
   * Caregiver keys: either arrow shuffles a fresh round.
   * @param {KeyboardEvent} event
   */
  key(event) {
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return false;
    this.newRound();
    return true;
  }

  newRound() {
    this.ctx.speech.cancel();
    this.round.deal();
    this.showPaused(false);
    if (this.scanInput) this.scanner.start();
    else this.render();
  }

  // ---- Playing ---------------------------------------------------------------

  /** Take the shape at top-row index `index`. */
  take(index) {
    if (!this.round.pick(index)) return;
    if (this.ctx.settings().speakOnSelect) this.ctx.speakItem(this.round.shapeAt(index));
    this.render();
  }

  /**
   * Put the held shape into `slot`. A wrong slot sends it back to the top
   * row, which is a retry, not a mistake: nothing is marked or counted.
   * @param {number} slot
   */
  put(slot) {
    const held = this.round.picked;
    if (held === null) return;
    const correct = this.round.place(slot);
    this.render();
    if (!correct) {
      this.ctx.speech.tick();
      return;
    }
    if (this.round.done) this.finish();
  }

  /** The round is complete: praise it, then deal a new one. */
  finish() {
    const { ctx } = this;
    ctx.say(ctx.t('wellDone'));
    const board = this.board;
    board?.classList.add('done');
    if (this.scanInput) return; // the next scanning round deals, after the cooldown
    setTimeout(() => {
      if (board !== this.board) return; // the game was left or restarted
      this.round.deal();
      this.render();
    }, ctx.settings().cooldownMs);
  }

  // ---- Dragging --------------------------------------------------------------

  /**
   * @param {PointerEvent} event
   * @param {number} index  top-row index of the shape
   */
  startDrag(event, index) {
    if (!this.dragInput || this.drag) return;
    if (!this.round.remaining().includes(index)) return;
    const el = /** @type {HTMLElement} */ (event.currentTarget);
    this.round.pick(index);
    this.drag = { el, x: event.clientX, y: event.clientY };
    el.classList.add('dragging');
    el.setPointerCapture(event.pointerId);
    el.addEventListener('pointermove', this.onPointerMove);
    el.addEventListener('pointerup', this.onPointerUp);
    el.addEventListener('pointercancel', this.onPointerUp);
    if (this.ctx.settings().speakOnSelect) this.ctx.speakItem(this.round.shapeAt(index));
    this.moveDrag(event);
  }

  /** @param {PointerEvent} event */
  moveDrag(event) {
    if (!this.drag) return;
    const { el, x, y } = this.drag;
    // The transform is relative to where the shape sits in its row, so the
    // shape simply follows the pointer by however far it has moved.
    el.style.transform = `translate(${event.clientX - x}px, ${event.clientY - y}px)`;
    const slot = this.slotAt(event.clientX, event.clientY);
    for (const [i, node] of this.slotElements().entries()) node.classList.toggle('over', i === slot);
  }

  /** @param {PointerEvent} event */
  endDrag(event) {
    if (!this.drag) return;
    const slot = this.slotAt(event.clientX, event.clientY);
    this.cancelDrag();
    if (slot === null) {
      this.round.drop();
      this.render();
      return;
    }
    this.put(slot);
  }

  /** Let go of the dragged shape without placing it. */
  cancelDrag() {
    const drag = this.drag;
    this.drag = null;
    if (!drag) return;
    drag.el.classList.remove('dragging');
    drag.el.style.transform = '';
    drag.el.removeEventListener('pointermove', this.onPointerMove);
    drag.el.removeEventListener('pointerup', this.onPointerUp);
    drag.el.removeEventListener('pointercancel', this.onPointerUp);
    for (const node of this.slotElements()) node.classList.remove('over');
  }

  /**
   * The empty slot at (or near) a point, or null. The slack makes a slot
   * forgiving to aim at, which is the whole difficulty of dragging.
   * @param {number} x
   * @param {number} y
   * @returns {number | null}
   */
  slotAt(x, y) {
    let best = /** @type {number | null} */ (null);
    let bestDistance = DROP_SLACK;
    for (const [i, node] of this.slotElements().entries()) {
      if (this.round.filled.has(i)) continue;
      const r = node.getBoundingClientRect();
      const distance = Math.hypot(Math.max(r.left - x, 0, x - r.right), Math.max(r.top - y, 0, y - r.bottom));
      if (distance === 0) return i;
      if (distance < bestDistance) {
        best = i;
        bestDistance = distance;
      }
    }
    return best;
  }

  // ---- Screen ----------------------------------------------------------------

  buildScreen() {
    const { root, t } = this.ctx;
    this.board = document.createElement('div');
    this.board.className = 'match-board';
    this.shapeRow = document.createElement('div');
    this.shapeRow.className = 'match-row match-shapes';
    this.slotRow = document.createElement('div');
    this.slotRow.className = 'match-row match-slots';
    this.pauseOverlay = document.createElement('div');
    this.pauseOverlay.className = 'pause-overlay';
    this.pauseOverlay.hidden = true;
    const p = document.createElement('p');
    const paused = document.createElement('span');
    paused.textContent = t('paused');
    const sub = document.createElement('span');
    sub.className = 'sub';
    sub.textContent = t('clickToContinue');
    p.append(paused, document.createElement('br'), sub);
    this.pauseOverlay.append(p);
    this.board.append(this.shapeRow, this.slotRow);
    root.replaceChildren(this.board, this.pauseOverlay);
  }

  render() {
    const { lang, labelFor } = this.ctx;
    const board = this.board;
    if (!board || !this.shapeRow || !this.slotRow) return;
    board.classList.toggle('done', this.round.done);
    board.dataset.count = String(this.round.top.length);
    const waiting = new Set(this.round.remaining());

    this.shapeRow.replaceChildren(
      ...this.round.top.map((_, i) => {
        const shape = this.round.shapeAt(i);
        const cell = document.createElement('div');
        cell.className = 'match-shape';
        cell.dataset.index = String(i);
        cell.title = labelFor(shape, lang());
        // A shape already in its slot leaves an empty space, so the ones
        // still to place never move.
        cell.classList.toggle('placed', !waiting.has(i));
        cell.classList.toggle('picked', this.round.picked === i);
        cell.classList.toggle('highlighted', this.phase === 'shapes' && this.highlight === i);
        cell.append(shapeSvg(shape, false));
        if (this.dragInput) cell.addEventListener('pointerdown', (e) => this.startDrag(e, i));
        return cell;
      }),
    );

    this.slotRow.replaceChildren(
      ...this.round.slots.map((_, i) => {
        const shape = this.round.slotShape(i);
        const cell = document.createElement('div');
        cell.className = 'match-slot';
        cell.dataset.index = String(i);
        cell.title = labelFor(shape, lang());
        const full = this.round.filled.has(i);
        cell.classList.toggle('full', full);
        cell.classList.toggle('highlighted', this.phase === 'slots' && this.highlight === i);
        cell.append(shapeSvg(shape, !full));
        return cell;
      }),
    );
  }

  slotElements() {
    return /** @type {HTMLElement[]} */ ([...(this.slotRow?.children ?? [])]);
  }

  /** @param {boolean} paused */
  showPaused(paused) {
    if (this.pauseOverlay) this.pauseOverlay.hidden = !paused;
    if (paused) {
      this.highlight = -1;
      this.render();
    }
  }
}

/**
 * The shape drawn as an SVG. An empty slot is the same outline, dashed and
 * uncoloured, so it reads as "this shape belongs here".
 * @param {import('../shapes.js').Shape} shape
 * @param {boolean} outline
 */
function shapeSvg(shape, outline) {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('viewBox', shape.box);
  svg.setAttribute('aria-hidden', 'true');
  const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  path.setAttribute('d', shape.path);
  path.setAttribute('fill', outline ? 'none' : shape.color);
  path.setAttribute('stroke', outline ? 'currentColor' : 'rgb(0 0 0 / 0.25)');
  path.setAttribute('stroke-width', outline ? '4' : '2');
  path.setAttribute('stroke-linejoin', 'round');
  if (outline) path.setAttribute('stroke-dasharray', '8 6');
  svg.append(path);
  return svg;
}
