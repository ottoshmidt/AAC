// @ts-check
/**
 * The Piper text-to-speech engine, without any page or DOM access, so it can
 * run in a Web Worker (js/piper-worker.js) as well as on the main thread.
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

export const VOICE_CACHE = 'aac-voices-v1';

const ORT_MODULE = new URL('../vendor/onnxruntime-web/ort.wasm.bundle.min.mjs', import.meta.url).href;
const PHONEMIZER_SCRIPT = new URL('../vendor/piper-wasm/piper_phonemize.js', import.meta.url).href;

/**
 * @typedef {object} RemoteFile
 * @property {string} url
 * @property {number} bytes  uncompressed size, used for download progress
 * @property {string} type   MIME type
 */

/** Files shared by every Piper voice. @type {Record<string, RemoteFile>} */
export const RUNTIME_FILES = {
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
 * @property {string} license  shown to the caregiver
 * @property {boolean} nonCommercial  license forbids commercial use
 * @property {RemoteFile} model
 * @property {RemoteFile} config
 */

/** @type {Record<string, PiperVoiceInfo>} */
export const PIPER_VOICES = {
  'ka_GE-natia-medium': {
    name: 'Natia',
    lang: 'ka',
    license: 'RHVoice, CC BY-NC-SA 4.0',
    nonCommercial: true,
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
  // Russian devices usually have a voice already; this is the offline option.
  'ru_RU-denis-medium': {
    name: 'Denis',
    lang: 'ru',
    license: 'CC0',
    nonCommercial: false,
    model: {
      url: `${PIPER_VOICES_BASE}/ru/ru_RU/denis/medium/ru_RU-denis-medium.onnx`,
      bytes: 63201294,
      type: 'application/octet-stream',
    },
    config: {
      url: `${PIPER_VOICES_BASE}/ru/ru_RU/denis/medium/ru_RU-denis-medium.onnx.json`,
      bytes: 4823,
      type: 'application/json',
    },
  },
};

/** @param {string} id */
export function piperDownloadBytes(id) {
  const voice = PIPER_VOICES[id];
  return [...Object.values(RUNTIME_FILES), voice.model, voice.config].reduce((sum, f) => sum + f.bytes, 0);
}

/**
 * Cache Storage key for a synthesised word. Made-up https URL: Cache Storage
 * only accepts http(s) requests, and nothing ever fetches it from the network.
 * @param {string} voiceId
 * @param {string} text
 */
export function clipKey(voiceId, text) {
  return `https://aac.invalid/tts/${encodeURIComponent(voiceId)}/${encodeURIComponent(text)}.wav`;
}

/** Total bytes of the voice's downloads, for progress reporting. @param {string} id */
export function downloadTotal(id) {
  return piperDownloadBytes(id);
}

/**
 * Runs one Piper voice: downloads what it needs, then turns text into WAV.
 * Synthesis is serialised because the phonemizer is not reentrant.
 */
export class PiperEngine {
  /** @param {string} id key of PIPER_VOICES */
  constructor(id) {
    this.id = id;
    this.info = PIPER_VOICES[id];
    /** @type {any} */ this.ort = null;
    /** @type {any} */ this.session = null;
    /** @type {any} */ this.phonemizer = null;
    /** @type {any} */ this.config = null;
    /** @type {string[]} */ this.output = [];
    /** @type {Promise<void> | null} */ this.loading = null;
    /** @type {Promise<unknown>} */ this.queue = Promise.resolve();
  }

  /**
   * Download (or read from cache) and initialise. Safe to call repeatedly.
   * @param {(loaded: number, total: number) => void} [onProgress]
   */
  load(onProgress = () => {}) {
    this.loading ??= this.#load(onProgress).catch((error) => {
      this.loading = null; // allow a retry
      throw error;
    });
    return this.loading;
  }

  /** @param {(loaded: number, total: number) => void} onProgress */
  async #load(onProgress) {
    const files = [
      RUNTIME_FILES.ortWasm,
      RUNTIME_FILES.phonemizerWasm,
      RUNTIME_FILES.phonemizerData,
      this.info.model,
      this.info.config,
    ];
    const total = files.reduce((sum, f) => sum + f.bytes, 0);
    let loaded = 0;
    const onBytes = (/** @type {number} */ n) => {
      loaded += n;
      onProgress(Math.min(loaded, total), total);
    };
    const [ortWasm, phonemizerWasm, phonemizerData, model, config] = await Promise.all(
      files.map((f) => fetchCached(f, onBytes)),
    );
    if (typeof navigator !== 'undefined') navigator.storage?.persist?.().catch(() => {});

    this.config = JSON.parse(await config.text());
    const ort = await loadOrt(ortWasm);
    this.ort = ort;
    this.session = await ort.InferenceSession.create(new Uint8Array(await model.arrayBuffer()));

    await loadPhonemizerScript();
    const wasmUrl = URL.createObjectURL(phonemizerWasm);
    const dataUrl = URL.createObjectURL(phonemizerData);
    this.phonemizer = await /** @type {any} */ (globalThis).createPiperPhonemize({
      print: (/** @type {string} */ line) => this.output.push(line),
      printErr: (/** @type {string} */ line) => console.warn('[piper phonemize]', line),
      locateFile: (/** @type {string} */ file) =>
        file.endsWith('.wasm') ? wasmUrl : file.endsWith('.data') ? dataUrl : file,
    });
  }

  /**
   * WAV bytes speaking `text`.
   * @param {string} text
   * @returns {Promise<ArrayBuffer>}
   */
  say(text) {
    const result = this.queue.then(() => this.#synthesize(text));
    this.queue = result.then(
      () => {},
      () => {},
    );
    return result;
  }

  /**
   * @param {string} text
   * @returns {Promise<ArrayBuffer>}
   */
  async #synthesize(text) {
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
export async function fetchCached(file, onBytes) {
  const cache = 'caches' in globalThis ? await caches.open(VOICE_CACHE).catch(() => null) : null;
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

/** @type {Promise<any> | null} */
let ortRuntime = null;

/**
 * Import and configure ONNX Runtime once; every voice shares it.
 * @param {Blob} wasm  the runtime's WebAssembly binary
 */
function loadOrt(wasm) {
  ortRuntime ??= import(ORT_MODULE).then(
    (ort) => {
      ort.env.wasm.numThreads = globalThis.crossOriginIsolated ? Math.min(4, navigator.hardwareConcurrency || 1) : 1;
      ort.env.wasm.wasmPaths = { wasm: URL.createObjectURL(wasm) };
      return ort;
    },
    (error) => {
      ortRuntime = null; // allow a retry
      throw error;
    },
  );
  return ortRuntime;
}

/** @type {Promise<void> | null} */
let phonemizerScript = null;

/**
 * Define `createPiperPhonemize` globally. The vendored file is a classic
 * script: in a document it is added as a <script>, in a worker (no DOM) its
 * source is evaluated in the global scope, which is what its top-level `var`
 * needs.
 */
function loadPhonemizerScript() {
  phonemizerScript ??= (async () => {
    if (typeof document !== 'undefined') {
      await new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = PHONEMIZER_SCRIPT;
        script.onload = () => resolve(undefined);
        script.onerror = () => {
          script.remove();
          reject(new Error(`Failed to load ${PHONEMIZER_SCRIPT}`));
        };
        document.head.append(script);
      });
      return;
    }
    const response = await fetch(PHONEMIZER_SCRIPT);
    if (!response.ok) throw new Error(`Failed to load ${PHONEMIZER_SCRIPT} (${response.status})`);
    const source = await response.text();
    // Indirect eval runs in the global scope, so `var createPiperPhonemize`
    // becomes a property of the worker's global object.
    // eslint-disable-next-line no-eval
    (0, eval)(source);
  })().catch((error) => {
    phonemizerScript = null; // allow a retry
    throw error;
  });
  return phonemizerScript;
}
