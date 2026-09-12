// @ts-check
/**
 * Keep the screen on (no dimming, no lock screen) while a game runs, using
 * the Screen Wake Lock API. Needs HTTPS (or localhost); browsers without the
 * API silently do nothing.
 *
 * The browser releases the lock whenever the page is hidden (another app,
 * screen off), so it is re-requested when the page becomes visible again.
 */
export class WakeLock {
  constructor() {
    this.wanted = false;
    /** @type {WakeLockSentinel | null} */
    this.sentinel = null;
    document.addEventListener('visibilitychange', () => {
      if (this.wanted && document.visibilityState === 'visible') this.#request();
    });
  }

  get supported() {
    return 'wakeLock' in navigator;
  }

  /** Start keeping the screen on. */
  acquire() {
    this.wanted = true;
    this.#request();
  }

  /** Let the screen dim and lock normally again. */
  release() {
    this.wanted = false;
    this.sentinel?.release().catch(() => {});
    this.sentinel = null;
  }

  async #request() {
    if (!this.supported || this.sentinel) return;
    try {
      const sentinel = await navigator.wakeLock.request('screen');
      if (!this.wanted) return sentinel.release();
      this.sentinel = sentinel;
      sentinel.addEventListener('release', () => {
        if (this.sentinel === sentinel) this.sentinel = null;
      });
    } catch (error) {
      // Denied (e.g. low battery mode) or not allowed here: nothing to do.
      console.info('[wakelock]', error);
    }
  }
}
