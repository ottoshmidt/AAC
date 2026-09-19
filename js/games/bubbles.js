// @ts-check
/**
 * Bubbles: hold a bubble until it bursts.
 *
 * Every other game here is about clicking at the right moment. This one is
 * about not letting go: the press has to be held for a few seconds (the
 * "Hold for" setting) before the bubble pops. The bubble fills up while it is
 * held, so the wait is visible, and letting go early empties it again with
 * nothing lost.
 *
 * Two ways to burst one, set by `bubbleInput`:
 *
 *   touch     hold the bubble itself, with a finger, mouse or pen
 *   scanning  the highlight moves from bubble to bubble; holding a press
 *             anywhere bursts the lit one. Scanning stops while the press is
 *             held, so the bubble cannot move away mid-hold.
 *
 * When the last bubble is gone a new set floats in.
 */

import { Scanner } from '../scanner.js';

/** Menu icon. */
const ICON = 'assets/icons/game-bubbles.svg';

/** How long the burst animation runs before the bubble is removed (ms). */
const BURST_MS = 320;

/**
 * How much of its own cell a bubble fills, per `bubbleSize` setting. At 1 the
 * bubbles fill their cells completely and sit side by side; below that they
 * are smaller and get room to be placed at random within the cell.
 */
export const BUBBLE_SIZES = Object.freeze({ small: 0.5, medium: 0.78, large: 0.9, xlarge: 1 });

/** @type {import('./index.js').GameInfo[]} */
export const bubbleGames = [
  {
    id: 'bubbles',
    category: 'hold',
    textId: 'bubbles',
    icon: ICON,
    create: (ctx) => new BubbleGame(ctx),
  },
];

/**
 * Where the bubbles sit, as fractions of the board (0–1), and how big they
 * are in units of the board's smaller side (the cqmin the CSS draws them in).
 *
 * The board is cut into a grid with a cell per bubble and each bubble is
 * placed inside its own cell, away from the edges. That keeps them apart
 * without any collision test, and the jitter keeps the set from looking like
 * a grid.
 *
 * The cells are measured in the same unit the bubbles are drawn in, so a wide
 * board really does give wider cells and bigger bubbles; measuring them as
 * fractions of the board instead would throw that space away on any screen
 * that is not square. No DOM, so it can be unit-tested.
 *
 * @param {number} count  how many bubbles
 * @param {() => number} [random]  0–1, injectable for tests
 * @param {number} [scale]  how much of its cell a bubble fills (BUBBLE_SIZES)
 * @param {number} [aspect]  the board's width / height
 * @returns {{ x: number, y: number, size: number }[]}
 */
export function layout(count, random = Math.random, scale = BUBBLE_SIZES.medium, aspect = 1) {
  // The board in units of its own smaller side: 1 across the short way.
  const safeAspect = Number.isFinite(aspect) && aspect > 0 ? aspect : 1;
  const boardWidth = safeAspect >= 1 ? safeAspect : 1;
  const boardHeight = safeAspect >= 1 ? 1 : 1 / safeAspect;
  const { columns, rows } = grid(count, boardWidth, boardHeight);
  const cellWidth = boardWidth / columns;
  const cellHeight = boardHeight / rows;
  // A bubble is at most its cell, so two neighbours can never overlap however
  // the jitter falls; the smaller it is, the more room it has to wander.
  const size = Math.min(cellWidth, cellHeight) * Math.min(Math.max(scale, 0.1), 1);
  return Array.from({ length: count }, (_, i) => {
    const column = i % columns;
    const row = Math.floor(i / columns);
    // The room left inside the cell once the bubble is in it.
    const slackX = Math.max(cellWidth - size, 0);
    const slackY = Math.max(cellHeight - size, 0);
    return {
      x: ((column + 0.5) * cellWidth + (random() - 0.5) * slackX) / boardWidth,
      y: ((row + 0.5) * cellHeight + (random() - 0.5) * slackY) / boardHeight,
      size,
    };
  });
}

/**
 * The arrangement that makes the bubbles as big as possible on this board:
 * every column count is tried and the one with the largest cell wins. Three
 * bubbles then stand in a row on a wide screen but in a square on a narrow
 * one, which is where the room actually is.
 *
 * @param {number} count
 * @param {number} boardWidth   in units of the board's smaller side
 * @param {number} boardHeight
 */
function grid(count, boardWidth, boardHeight) {
  let best = { columns: count, rows: 1, cell: 0 };
  for (let columns = 1; columns <= count; columns += 1) {
    const rows = Math.ceil(count / columns);
    const cell = Math.min(boardWidth / columns, boardHeight / rows);
    if (cell > best.cell) best = { columns, rows, cell };
  }
  return best;
}

/**
 * A set of bubbles and which of them are gone. No DOM and no timers, so the
 * rules can be tested on their own (tests/bubbles.test.js).
 */
export class BubbleField {
  /**
   * @param {number} count
   * @param {() => number} [random]
   * @param {number} [scale]  how much of its cell a bubble fills
   * @param {number} [aspect]  the board's width / height
   */
  constructor(count, random = Math.random, scale = BUBBLE_SIZES.medium, aspect = 1) {
    this.random = random;
    this.count = count;
    this.scale = scale;
    this.aspect = aspect;
    /** @type {{ x: number, y: number, size: number, burst: boolean }[]} */
    this.bubbles = [];
    this.fill();
  }

  /**
   * Place the bubbles again for a new board shape (a rotated phone, a resized
   * window), keeping which of them are already burst.
   * @param {number} aspect
   */
  relayout(aspect) {
    this.aspect = aspect;
    const places = layout(this.count, this.random, this.scale, aspect);
    this.bubbles = this.bubbles.map((bubble, i) => ({ ...places[i], burst: bubble.burst }));
  }

  /** A fresh set of bubbles, none of them burst. */
  fill() {
    this.bubbles = layout(this.count, this.random, this.scale, this.aspect).map((b) => ({ ...b, burst: false }));
  }

  /** Indices of the bubbles still floating. */
  remaining() {
    return this.bubbles.map((_, i) => i).filter((i) => !this.bubbles[i].burst);
  }

  get empty() {
    return this.remaining().length === 0;
  }

  /**
   * Burst a bubble.
   * @param {number} index
   * @returns {boolean} whether it was there to burst
   */
  burst(index) {
    const bubble = this.bubbles[index];
    if (!bubble || bubble.burst) return false;
    bubble.burst = true;
    return true;
  }
}

/**
 * How full a bubble is, 0–1, after holding it for `elapsed` ms.
 * @param {number} elapsed
 * @param {number} holdMs
 */
export function holdProgress(elapsed, holdMs) {
  if (holdMs <= 0) return 1;
  return Math.min(Math.max(elapsed, 0) / holdMs, 1);
}

/** @implements {import('./index.js').Game} */
class BubbleGame {
  /** @param {import('./index.js').GameContext} ctx */
  constructor(ctx) {
    this.ctx = ctx;
    const s = ctx.settings();
    this.field = new BubbleField(s.bubbleCount, Math.random, BUBBLE_SIZES[s.bubbleSize]);
    /** Set in start() from `bubbleInput`. */
    this.scanInput = false;
    /** The bubble being held and when the hold began. @type {{ index: number, startedAt: number } | null} */
    this.hold = null;
    /** @type {number | null} */
    this.frame = null;
    /** @type {ReturnType<typeof setTimeout> | null} */
    this.refillTimer = null;
    /** Highlighted bubble while scanning, or -1. */
    this.highlight = -1;
    /** Scan index -> bubble index. @type {number[]} */
    this.scanTargets = [];
    this.lastPressAt = -Infinity;

    this.scanner = new Scanner({
      itemCount: 1,
      intervalMs: s.intervalMs,
      cooldownMs: s.cooldownMs,
      debounceMs: s.debounceMs,
      maxCycles: s.maxCycles,
    });
    this.scanner.addEventListener('round', () => {
      this.scanTargets = this.field.remaining();
      this.scanner.updateOptions({ itemCount: Math.max(this.scanTargets.length, 1) });
    });
    this.scanner.addEventListener('highlight', (event) => {
      this.highlight = this.scanTargets[/** @type {CustomEvent} */ (event).detail.index] ?? -1;
      this.paint();
      if (ctx.settings().highlightSound) ctx.speech.tick();
    });
    this.scanner.addEventListener('pause', () => this.showPaused(true));
    this.scanner.addEventListener('resume', () => this.showPaused(false));

    this.tick = () => this.step();
    // A rotated phone or a resized window changes the board's shape, so the
    // bubbles are placed again — never mid-hold, which would move the bubble
    // out from under the press.
    this.onResize = () => {
      if (this.hold) return;
      this.field.relayout(this.boardAspect());
      this.render();
    };
  }

  // ---- Game interface --------------------------------------------------------

  start() {
    const s = this.ctx.settings();
    this.scanInput = s.bubbleInput === 'scan';
    this.field = new BubbleField(s.bubbleCount, Math.random, BUBBLE_SIZES[s.bubbleSize]);
    this.scanner.updateOptions({
      intervalMs: s.intervalMs,
      cooldownMs: s.cooldownMs,
      debounceMs: s.debounceMs,
      maxCycles: s.maxCycles,
    });
    this.buildScreen();
    // The board exists now, so its shape is known and the bubbles can be
    // placed to fit it.
    this.field = new BubbleField(s.bubbleCount, Math.random, BUBBLE_SIZES[s.bubbleSize], this.boardAspect());
    this.render();
    window.addEventListener('resize', this.onResize);
    if (this.scanInput) this.scanner.start();
  }

  stop() {
    this.scanner.stop();
    window.removeEventListener('resize', this.onResize);
    this.cancelHold();
    this.stopFrames();
    if (this.refillTimer) clearTimeout(this.refillTimer);
    this.refillTimer = null;
    this.ctx.root.replaceChildren();
    this.ctx.controls.replaceChildren();
  }

  /** A press anywhere: in scanning mode it starts holding the lit bubble. */
  press() {
    if (!this.scanInput || this.highlight < 0) return;
    const now = performance.now();
    if (now - this.lastPressAt < this.ctx.settings().debounceMs) return;
    this.lastPressAt = now;
    // Scanning stops for the hold, so the bubble stays where it is until the
    // press ends, however long that takes.
    this.scanner.stop();
    this.startHold(this.highlight);
  }

  /** The press ended (shell forwards pointerup/pointercancel). */
  release() {
    if (!this.hold) return;
    this.cancelHold();
    if (this.scanInput && !this.field.empty) this.scanner.start();
  }

  /**
   * Caregiver keys: either arrow floats a fresh set of bubbles.
   * @param {KeyboardEvent} event
   */
  key(event) {
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return false;
    this.refill();
    return true;
  }

  // ---- Holding ---------------------------------------------------------------

  /** @param {number} index */
  startHold(index) {
    if (this.field.bubbles[index]?.burst) return;
    this.hold = { index, startedAt: performance.now() };
    this.startFrames();
    this.paint();
  }

  /** Let go without bursting: the bubble empties again. */
  cancelHold() {
    this.hold = null;
    this.stopFrames();
    this.paint();
  }

  /** One animation frame of a hold. */
  step() {
    this.frame = null;
    if (!this.hold) return;
    const holdMs = this.ctx.settings().bubbleHoldMs;
    const progress = holdProgress(performance.now() - this.hold.startedAt, holdMs);
    this.paint();
    if (progress < 1) {
      this.startFrames();
      return;
    }
    this.pop(this.hold.index);
  }

  startFrames() {
    if (this.frame === null) this.frame = requestAnimationFrame(this.tick);
  }

  stopFrames() {
    if (this.frame !== null) cancelAnimationFrame(this.frame);
    this.frame = null;
  }

  /**
   * The hold finished: burst the bubble.
   * @param {number} index
   */
  pop(index) {
    this.hold = null;
    this.stopFrames();
    if (!this.field.burst(index)) return;
    this.ctx.speech.pop();
    const node = this.bubbleElements()[index];
    node?.classList.add('bursting');
    node?.classList.remove('holding');
    this.highlight = -1;
    // The burst plays out before the bubble is taken off the screen.
    setTimeout(() => {
      if (!node?.isConnected) return;
      node.classList.add('gone');
      if (this.field.empty) this.refillSoon();
      else if (this.scanInput) this.scanner.start();
    }, BURST_MS);
  }

  /** Float a new set in after a short pause. */
  refillSoon() {
    if (this.refillTimer) clearTimeout(this.refillTimer);
    this.refillTimer = setTimeout(() => {
      this.refillTimer = null;
      this.refill();
    }, Math.max(this.ctx.settings().cooldownMs, 400));
  }

  refill() {
    if (this.refillTimer) clearTimeout(this.refillTimer);
    this.refillTimer = null;
    this.cancelHold();
    this.field.aspect = this.boardAspect();
    this.field.fill();
    this.highlight = -1;
    this.showPaused(false);
    this.render();
    if (this.scanInput) this.scanner.start();
  }

  // ---- Screen ----------------------------------------------------------------

  buildScreen() {
    const { root, t } = this.ctx;
    this.board = document.createElement('div');
    this.board.className = 'bubble-board';
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
    root.replaceChildren(this.board, this.pauseOverlay);
  }

  /** Draw the whole set. Only called for a new set, not during a hold. */
  render() {
    const board = this.board;
    if (!board) return;
    const drifting = this.ctx.settings().bubbleMotion === 'drift';
    board.classList.toggle('drifting', drifting);
    board.replaceChildren(
      ...this.field.bubbles.map((bubble, i) => {
        const node = document.createElement('div');
        node.className = 'bubble';
        node.dataset.index = String(i);
        node.style.left = `${bubble.x * 100}%`;
        node.style.top = `${bubble.y * 100}%`;
        node.style.setProperty('--size', String(bubble.size * 100));
        // Each bubble drifts on its own rhythm, so they never move in step.
        node.style.setProperty('--drift-delay', `${(i * 1.7).toFixed(2)}s`);
        node.style.setProperty('--drift-time', `${(7 + (i % 3) * 2).toFixed(0)}s`);
        node.append(shine());
        if (!this.scanInput) node.addEventListener('pointerdown', () => this.startHold(i));
        return node;
      }),
    );
    this.paint();
  }

  /** Update what changes during play: the hold's fill and the highlight. */
  paint() {
    const holdMs = this.ctx.settings().bubbleHoldMs;
    const progress = this.hold ? holdProgress(performance.now() - this.hold.startedAt, holdMs) : 0;
    for (const [i, node] of this.bubbleElements().entries()) {
      const held = this.hold?.index === i;
      node.classList.toggle('holding', held);
      node.classList.toggle('highlighted', this.highlight === i);
      node.style.setProperty('--fill', held ? progress.toFixed(3) : '0');
    }
  }

  /** The board's width / height, 1 before it is on screen. */
  boardAspect() {
    const rect = this.board?.getBoundingClientRect();
    return rect && rect.height > 0 ? rect.width / rect.height : 1;
  }

  bubbleElements() {
    return /** @type {HTMLElement[]} */ ([...(this.board?.children ?? [])]);
  }

  /** @param {boolean} paused */
  showPaused(paused) {
    if (this.pauseOverlay) this.pauseOverlay.hidden = !paused;
    if (paused) {
      this.highlight = -1;
      this.paint();
    }
  }
}

/** The highlight on a soap bubble's skin: what makes it read as a bubble. */
function shine() {
  const span = document.createElement('span');
  span.className = 'bubble-shine';
  return span;
}
