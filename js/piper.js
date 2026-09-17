// @ts-check
/**
 * In-app neural text-to-speech using Piper voices, for languages that devices
 * rarely have a voice for (Georgian).
 *
 * This is the page's side of it: the engine itself (js/piper-engine.js) runs
 * in a Web Worker (js/piper-worker.js), so neither the 96 MB download nor
 * synthesis blocks the interface.
 *
 * Every synthesised word is kept in Cache Storage, so a word is synthesised
 * once ever, not once per app start, and playing it later needs no model at
 * all. `cachedUrl()` answers from that cache alone.
 */

import { clipKey, PiperEngine, PIPER_VOICES, piperDownloadBytes, VOICE_CACHE } from './piper-engine.js';

export { PIPER_VOICES, piperDownloadBytes };

const WORKER_URL = new URL('./piper-worker.js', import.meta.url);

/** @typedef {'idle' | 'downloading' | 'loading' | 'ready' | 'error'} PiperStatus */

/**
 * One Piper voice. Emits 'change' whenever `status` or `progress` changes.
 */
export class PiperVoice extends EventTarget {
  /** @param {string} id key of PIPER_VOICES */
  constructor(id) {
    super();
    this.id = id;
    this.info = PIPER_VOICES[id];
    /** @type {PiperStatus} */
    this.status = 'idle';
    /** download progress, 0..1 */
    this.progress = 0;
    /** @type {Error | null} */
    this.error = null;

    /** @type {Promise<void> | null} */
    this.loading = null;
    /** @type {Map<string, Promise<string>>} text -> object URL of the WAV */
    this.audioUrls = new Map();
    /** @type {Worker | null} */
    this.worker = null;
    /** @type {PiperEngine | null} set only if workers are unavailable */
    this.engine = null;
    /** @type {Map<number, { resolve: (wav: ArrayBuffer) => void, reject: (error: Error) => void }>} */
    this.pending = new Map();
    this.nextRef = 1;
    /** @type {(() => void) | null} */
    this.onReady = null;
    /** @type {((error: Error) => void) | null} */
    this.onFailed = null;
  }

  /** Download (or read from cache) and initialise. Safe to call repeatedly. */
  load() {
    this.loading ??= this.#load().catch((error) => {
      this.loading = null; // allow a retry
      this.error = error instanceof Error ? error : new Error(String(error));
      this.#set('error');
      console.error(`[piper] ${this.id}:`, error);
    });
    return this.loading;
  }

  async #load() {
    this.error = null;
    this.progress = 0;
    this.#set('downloading');
    if (this.#useWorker()) {
      const worker = /** @type {Worker} */ (this.worker);
      await new Promise((resolve, reject) => {
        this.onReady = () => resolve(undefined);
        this.onFailed = reject;
        worker.postMessage({ type: 'load', id: this.id });
      });
    } else {
      this.engine ??= new PiperEngine(this.id);
      await this.engine.load((loaded, total) => this.#progress(loaded, total));
    }
    this.#set('ready');
  }

  /** Start the worker, unless it is running or this browser has no workers. */
  #useWorker() {
    if (this.worker) return true;
    if (this.engine || typeof Worker === 'undefined') return false;
    try {
      this.worker = new Worker(WORKER_URL, { type: 'module' });
    } catch (error) {
      console.warn('[piper] no worker, running in the page instead:', error);
      return false;
    }
    this.worker.addEventListener('message', (event) => this.#onMessage(event.data));
    this.worker.addEventListener('error', (event) => {
      const error = new Error(event.message || 'Voice worker failed');
      this.onFailed?.(error);
      for (const { reject } of this.pending.values()) reject(error);
      this.pending.clear();
    });
    return true;
  }

  /** @param {any} message */
  #onMessage(message) {
    switch (message.type) {
      case 'progress':
        return this.#progress(message.loaded, message.total);
      case 'ready':
        return this.onReady?.();
      case 'error':
        return this.onFailed?.(new Error(message.message));
      case 'wav': {
        this.pending.get(message.ref)?.resolve(message.wav);
        return void this.pending.delete(message.ref);
      }
      case 'failed': {
        this.pending.get(message.ref)?.reject(new Error(message.message));
        return void this.pending.delete(message.ref);
      }
    }
  }

  /**
   * @param {number} loaded
   * @param {number} total
   */
  #progress(loaded, total) {
    this.progress = total > 0 ? Math.min(1, loaded / total) : 0;
    if (this.progress >= 1 && this.status === 'downloading') this.#set('loading');
    else this.dispatchEvent(new Event('change'));
  }

  /**
   * URL of a WAV file speaking `text`, if it was synthesised before (in this
   * session or an earlier one). No model is loaded, so this is safe to call
   * while the voice is still downloading.
   * @param {string} text
   * @returns {Promise<string | null>}
   */
  async cachedUrl(text) {
    const known = this.audioUrls.get(text);
    if (known) return known.catch(() => null);
    if (!('caches' in globalThis)) return null;
    try {
      const cache = await caches.open(VOICE_CACHE);
      const hit = await cache.match(clipKey(this.id, text));
      if (!hit) return null;
      const url = URL.createObjectURL(await hit.blob());
      this.audioUrls.set(text, Promise.resolve(url));
      return url;
    } catch {
      return null;
    }
  }

  /**
   * URL of a WAV file speaking `text`: from the cache if it is there, else
   * synthesised (and then cached). Calling it ahead of time (see `prepare`)
   * makes later playback instant.
   * @param {string} text
   * @returns {Promise<string>}
   */
  audioUrl(text) {
    let url = this.audioUrls.get(text);
    if (!url) {
      url = this.#make(text);
      url.catch(() => this.audioUrls.delete(text));
      this.audioUrls.set(text, url);
    }
    return url;
  }

  /**
   * @param {string} text
   * @returns {Promise<string>}
   */
  async #make(text) {
    const cached = await this.cachedUrl(text);
    if (cached) return cached;
    const wav = await this.#synthesize(text);
    this.#store(text, wav.slice(0)); // a copy: the blob below may be detached
    return URL.createObjectURL(new Blob([wav], { type: 'audio/wav' }));
  }

  /**
   * @param {string} text
   * @returns {Promise<ArrayBuffer>}
   */
  async #synthesize(text) {
    if (this.#useWorker()) {
      const worker = /** @type {Worker} */ (this.worker);
      const ref = this.nextRef++;
      return new Promise((resolve, reject) => {
        this.pending.set(ref, { resolve, reject });
        worker.postMessage({ type: 'say', id: this.id, ref, text });
      });
    }
    await this.load();
    if (this.status !== 'ready') throw this.error ?? new Error('Voice not ready');
    return /** @type {PiperEngine} */ (this.engine).say(text);
  }

  /**
   * Keep a synthesised word for later sessions.
   * @param {string} text
   * @param {ArrayBuffer} wav
   */
  #store(text, wav) {
    if (!('caches' in globalThis)) return;
    caches
      .open(VOICE_CACHE)
      .then((cache) => cache.put(clipKey(this.id, text), new Response(wav, { headers: { 'Content-Type': 'audio/wav' } })))
      .catch((error) => console.warn('[piper] could not cache speech for', text, error));
  }

  /**
   * Synthesise in the background so the texts play without delay later.
   * Words already in the cache cost nothing, and if every word is cached the
   * model is never loaded.
   * @param {string[]} texts
   */
  async prepare(texts) {
    const missing = [];
    for (const text of texts) {
      if (!(await this.cachedUrl(text))) missing.push(text);
    }
    if (missing.length === 0) return; // every word is cached; no model needed
    await this.load();
    if (this.status !== 'ready') return;
    await Promise.allSettled(missing.map((text) => this.audioUrl(text)));
  }

  /** @param {PiperStatus} status */
  #set(status) {
    this.status = status;
    this.dispatchEvent(new Event('change'));
  }
}
