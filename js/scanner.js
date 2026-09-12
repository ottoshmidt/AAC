// @ts-check
/**
 * Single-switch scanner.
 *
 * Moves a highlight across `itemCount` items at a fixed interval. A press
 * (any click, anywhere) selects the item that is currently highlighted, so
 * the user never has to aim. The scanner knows nothing about the DOM: it only
 * emits events, which makes it easy to test and to reuse with other UIs.
 *
 * Events (all CustomEvent, details in `event.detail`):
 *   'round'     {}         a new round begins (on every start() and after
 *                          each selection), just before the first highlight;
 *                          listeners may change the items and `itemCount` here
 *   'highlight' { index }  the highlight moved to `index`
 *   'select'    { index }  the user selected `index`
 *   'pause'     {}         scanning stopped after `maxCycles` with no selection
 *   'resume'    {}         scanning restarted after a pause
 *   'stop'      {}         scanner stopped
 */

/**
 * @typedef {object} ScannerOptions
 * @property {number} itemCount    number of items to scan across
 * @property {number} intervalMs   how long each item stays highlighted
 * @property {number} cooldownMs   presses are ignored this long after a selection
 * @property {number} debounceMs   presses closer together than this are ignored
 * @property {number} maxCycles    pause after this many full cycles without a selection (0 = never)
 * @property {() => number} [now]  clock, injectable for tests
 */

/** @typedef {'idle' | 'scanning' | 'selected' | 'paused'} ScannerState */

export class Scanner extends EventTarget {
  /** @param {ScannerOptions} options */
  constructor(options) {
    super();
    /** @type {ScannerOptions} */
    this.options = { ...options };
    this.now = options.now ?? (() => performance.now());
    /** @type {ScannerState} */
    this.state = 'idle';
    this.index = -1;
    this.cycles = 0;
    this.lastPressAt = -Infinity;
    /** @type {ReturnType<typeof setTimeout> | null} */
    this.timer = null;
    /** Bumped by start()/stop(), so an event listener that restarts or stops
     * the scanner doesn't get a stale timer scheduled on top. */
    this.run = 0;
  }

  /** @param {Partial<ScannerOptions>} changes */
  updateOptions(changes) {
    Object.assign(this.options, changes);
  }

  start() {
    this.#clearTimer();
    this.run += 1;
    this.#newRound();
  }

  stop() {
    this.#clearTimer();
    this.run += 1;
    this.state = 'idle';
    this.index = -1;
    this.#emit('stop');
  }

  /** Call on every user press (click, tap, switch). */
  press() {
    const now = this.now();
    if (now - this.lastPressAt < this.options.debounceMs) return;
    this.lastPressAt = now;

    switch (this.state) {
      case 'scanning':
        this.#select();
        break;
      case 'paused':
        this.cycles = 0;
        this.#emit('resume');
        this.#highlight(0);
        break;
      // 'idle' and 'selected' (cooldown) ignore presses.
    }
  }

  #select() {
    this.#clearTimer();
    this.state = 'selected';
    const run = this.run;
    this.#emit('select', { index: this.index });
    if (this.run !== run) return; // a listener stopped or restarted us
    this.timer = setTimeout(() => this.#newRound(), this.options.cooldownMs);
  }

  #newRound() {
    this.cycles = 0;
    const run = this.run;
    this.#emit('round');
    if (this.run !== run) return;
    this.#highlight(0);
  }

  #advance() {
    const next = (this.index + 1) % this.options.itemCount;
    if (next === 0) {
      this.cycles += 1;
      const { maxCycles } = this.options;
      if (maxCycles > 0 && this.cycles >= maxCycles) {
        this.#pause();
        return;
      }
    }
    this.#highlight(next);
  }

  #pause() {
    this.#clearTimer();
    this.state = 'paused';
    this.index = -1;
    this.#emit('pause');
  }

  /** @param {number} index */
  #highlight(index) {
    this.state = 'scanning';
    this.index = index;
    const run = this.run;
    this.#emit('highlight', { index });
    if (this.run !== run) return;
    this.timer = setTimeout(() => this.#advance(), this.options.intervalMs);
  }

  #clearTimer() {
    if (this.timer !== null) {
      clearTimeout(this.timer);
      this.timer = null;
    }
  }

  /**
   * @param {string} type
   * @param {object} [detail]
   */
  #emit(type, detail = {}) {
    this.dispatchEvent(new CustomEvent(type, { detail }));
  }
}
