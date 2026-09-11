// @ts-check
/**
 * In-app neural text-to-speech using Piper voices, for languages that devices
 * rarely have a voice for (Georgian).
 *
 *   text -> phoneme ids   espeak-ng compiled to WebAssembly (piper_phonemize)
 *        -> samples       Piper VITS model run by ONNX Runtime Web
 *        -> WAV           played like a recorded clip
 *
 * The large binaries (about 96 MB for Georgian) are downloaded from pinned
 * URLs on first use and kept in Cache Storage, so later sessions work
 * offline. The small JS glue files are vendored in /vendor.
 */

import { encodeWav } from './wav.js';

const VOICE_CACHE = 'aac-voices-v1';

const ORT_MODULE = new URL('../vendor/onnxruntime-web/ort.wasm.bundle.min.mjs', import.meta.url).href;
const PHONEMIZER_SCRIPT = new URL('../vendor/piper-wasm/piper_phonemize.js', import.meta.url).href;

/**
 * @typedef {object} RemoteFile
 * @property {string} url
 * @property {number} bytes  uncompressed size, used for download progress
 * @property {string} type   MIME type
 */

/** Files shared by every Piper voice. @type {Record<string, RemoteFile>} */
const RUNTIME_FILES = {
  ortWasm: {
    url: 'https://cdn.jsdelivr.net/npm/onnxruntime-web@1.29.0/dist/ort-wasm-simd-threaded.wasm',
    bytes: 13961845,
    type: 'application/wasm',
  },
  phonemizerWasm: {
    url: 'https://cdn.jsdelivr.net/npm/@diffusionstudio/piper-wasm@1.0.0/build/piper_phonemize.wasm',
    bytes: 635212,
    type: 'application/wasm',
  },
  phonemizerData: {
    url: 'https://cdn.jsdelivr.net/npm/@diffusionstudio/piper-wasm@1.0.0/build/piper_phonemize.data',
    bytes: 18077249,
    type: 'application/octet-stream',
  },
};

const PIPER_VOICES_BASE =
  'https://huggingface.co/rhasspy/piper-voices/resolve/1162a9173d0ce503555aed757976b7a9912eae4c';

/**
 * @typedef {object} PiperVoiceInfo
 * @property {string} name     display name
 * @property {string} lang     app language code this voice speaks
 * @property {string} license  shown to the caregiver; all current voices are non-commercial
 * @property {RemoteFile} model
 * @property {RemoteFile} config
 */

/** @type {Record<string, PiperVoiceInfo>} */
export const PIPER_VOICES = {
  'ka_GE-natia-medium': {
    name: 'Natia',
    lang: 'ka',
    license: 'RHVoice, CC BY-NC-SA 4.0',
    model: {
      url: `${PIPER_VOICES_BASE}/ka/ka_GE/natia/medium/ka_GE-natia-medium.onnx`,
      bytes: 63201294,
      type: 'application/octet-stream',
    },
    config: {
      url: `${PIPER_VOICES_BASE}/ka/ka_GE/natia/medium/ka_GE-natia-medium.onnx.json`,
      bytes: 4842,
      type: 'application/json',
    },
  },
};

/** @param {string} id */
export function piperDownloadBytes(id) {
  const voice = PIPER_VOICES[id];
  return [...Object.values(RUNTIME_FILES), voice.model, voice.config].reduce((sum, f) => sum + f.bytes, 0);
}

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
    /** @type {any} */ this.ort = null;
    /** @type {any} */ this.session = null;
    /** @type {any} */ this.phonemizer = null;
    /** @type {any} */ this.config = null;
    /** @type {string[]} */ this.output = [];
    /** @type {Map<string, Promise<string>>} text -> object URL of the WAV */
    this.audioUrls = new Map();
    /** Synthesis runs one at a time; the phonemizer is not reentrant. */
    this.queue = Promise.resolve();
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

    const files = [RUNTIME_FILES.ortWasm, RUNTIME_FILES.phonemizerWasm, RUNTIME_FILES.phonemizerData, this.info.model, this.info.config];
    const total = files.reduce((sum, f) => sum + f.bytes, 0);
    let loaded = 0;
    const onBytes = (/** @type {number} */ n) => {
      loaded += n;
      this.progress = Math.min(1, loaded / total);
      this.dispatchEvent(new Event('change'));
    };
    const [ortWasm, phonemizerWasm, phonemizerData, model, config] = await Promise.all(
      files.map((f) => fetchCached(f, onBytes)),
    );
    navigator.storage?.persist?.().catch(() => {});

    this.#set('loading');
    this.config = JSON.parse(await config.text());

    const ort = await import(ORT_MODULE);
    ort.env.wasm.numThreads = self.crossOriginIsolated ? Math.min(4, navigator.hardwareConcurrency || 1) : 1;
    ort.env.wasm.wasmPaths = { wasm: URL.createObjectURL(ortWasm) };
    this.ort = ort;
    this.session = await ort.InferenceSession.create(new Uint8Array(await model.arrayBuffer()));

    await loadScript(PHONEMIZER_SCRIPT);
    const wasmUrl = URL.createObjectURL(phonemizerWasm);
    const dataUrl = URL.createObjectURL(phonemizerData);
    this.phonemizer = await /** @type {any} */ (window).createPiperPhonemize({
      print: (/** @type {string} */ line) => this.output.push(line),
      printErr: (/** @type {string} */ line) => console.warn('[piper phonemize]', line),
      locateFile: (/** @type {string} */ file) =>
        file.endsWith('.wasm') ? wasmUrl : file.endsWith('.data') ? dataUrl : file,
    });

    this.#set('ready');
  }

  /**
   * URL of a WAV file speaking `text`. Results are cached, so calling this
   * ahead of time (see `prepare`) makes later playback instant.
   * @param {string} text
   * @returns {Promise<string>}
   */
  audioUrl(text) {
    let url = this.audioUrls.get(text);
    if (!url) {
      url = this.#enqueue(async () => {
        const wav = await this.#synthesize(text);
        return URL.createObjectURL(new Blob([wav], { type: 'audio/wav' }));
      });
      url.catch(() => this.audioUrls.delete(text));
      this.audioUrls.set(text, url);
    }
    return url;
  }

  /**
   * Synthesise in the background so the texts play without delay later.
   * @param {string[]} texts
   */
  async prepare(texts) {
    await this.load();
    if (this.status !== 'ready') return;
    await Promise.allSettled(texts.map((t) => this.audioUrl(t)));
  }

  /**
   * @param {string} text
   * @returns {Promise<ArrayBuffer>}
   */
  async #synthesize(text) {
    await this.load();
    if (this.status !== 'ready') throw this.error ?? new Error('Voice not ready');

    // piper_phonemize prints one JSON line per sentence.
    this.output = [];
    this.phonemizer.callMain([
      '-l', this.config.espeak.voice,
      '--input', JSON.stringify([{ text }]),
      '--espeak_data', '/espeak-ng-data',
    ]);
    const sentences = this.output.map((line) => /** @type {number[]} */ (JSON.parse(line).phoneme_ids));

    const { Tensor } = this.ort;
    const { noise_scale, length_scale, noise_w } = this.config.inference;
    const multiSpeaker = Object.keys(this.config.speaker_id_map ?? {}).length > 0;
    /** @type {Float32Array[]} */
    const parts = [];
    for (const ids of sentences) {
      /** @type {Record<string, unknown>} */
      const feeds = {
        input: new Tensor('int64', BigInt64Array.from(ids, BigInt), [1, ids.length]),
        input_lengths: new Tensor('int64', BigInt64Array.from([BigInt(ids.length)]), [1]),
        scales: new Tensor('float32', Float32Array.from([noise_scale, length_scale, noise_w]), [3]),
      };
      if (multiSpeaker) feeds.sid = new Tensor('int64', BigInt64Array.from([0n]), [1]);
      const { output } = await this.session.run(feeds);
      parts.push(output.data);
    }

    const samples = new Float32Array(parts.reduce((n, p) => n + p.length, 0));
    let offset = 0;
    for (const p of parts) {
      samples.set(p, offset);
      offset += p.length;
    }
    return encodeWav(normalize(samples), this.config.audio.sample_rate);
  }

  /**
   * @template T
   * @param {() => Promise<T>} task
   * @returns {Promise<T>}
   */
  #enqueue(task) {
    const result = this.queue.then(task);
    this.queue = result.then(
      () => {},
      () => {},
    );
    return result;
  }

  /** @param {PiperStatus} status */
  #set(status) {
    this.status = status;
    this.dispatchEvent(new Event('change'));
  }
}

/**
 * Scale samples so the loudest one sits just below full volume. The raw model
 * output is quiet; Piper's own CLI normalises the same way.
 * @param {Float32Array} samples
 */
function normalize(samples) {
  let peak = 0;
  for (const s of samples) peak = Math.max(peak, Math.abs(s));
  const gain = 0.95 / Math.max(peak, 0.01);
  for (let i = 0; i < samples.length; i++) samples[i] *= gain;
  return samples;
}

/**
 * Fetch `file`, reporting bytes as they arrive, and keep a copy in Cache
 * Storage. Later calls are served from the cache, which also works offline.
 * @param {RemoteFile} file
 * @param {(bytes: number) => void} onBytes
 * @returns {Promise<Blob>}
 */
async function fetchCached(file, onBytes) {
  const cache = 'caches' in self ? await caches.open(VOICE_CACHE).catch(() => null) : null;
  const hit = await cache?.match(file.url);
  if (hit) {
    onBytes(file.bytes);
    return hit.blob();
  }

  const response = await fetch(file.url);
  if (!response.ok || !response.body) throw new Error(`Download failed (${response.status}): ${file.url}`);
  const reader = response.body.getReader();
  /** @type {Uint8Array[]} */
  const chunks = [];
  let received = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
    received += value.length;
    onBytes(value.length);
  }
  // Keep the total consistent if the real size differs from the listed one.
  if (received < file.bytes) onBytes(file.bytes - received);

  const blob = new Blob(chunks, { type: file.type });
  await cache?.put(file.url, new Response(blob, { headers: { 'Content-Type': file.type } })).catch((error) => {
    console.warn('[piper] could not cache', file.url, error); // e.g. storage quota
  });
  return blob;
}

/** @type {Map<string, Promise<void>>} */
const scripts = new Map();

/** @param {string} src */
function loadScript(src) {
  let promise = scripts.get(src);
  if (!promise) {
    promise = new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = src;
      script.onload = () => resolve();
      script.onerror = () => reject(new Error(`Failed to load ${src}`));
      document.head.append(script);
    });
    scripts.set(src, promise);
  }
  return promise;
}
