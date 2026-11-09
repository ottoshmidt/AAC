// @ts-check

/** Silence detection and trimming (see `trimSilence`). */
const WINDOW_MS = 10; // loudness is measured over a window, not per sample
const FLOOR = 0.004; // about -48 dBFS: below this everything counts as silence
const START_SHARE = 0.08; // speech starts where a window reaches 8% of the peak
const END_SHARE = 0.015; // but a word's tail is quiet: let it fade to 1.5%
const PAD_IN_MS = 80;
const PAD_OUT_MS = 250; // generous, so no ending is clipped
const FADE_IN_MS = 8;
const FADE_OUT_MS = 30; // ends at zero, so playback has nothing to click on

/**
 * Cut the silence around a recorded word, without cutting the word itself.
 *
 * Loudness is measured over short windows rather than sample by sample, and
 * the end is held to a lower threshold than the start with more padding
 * after it: the tail of a word (a vowel dying away, a final consonant) is
 * much quieter than its middle, and cutting it is what makes a clip sound
 * as if it stops mid-word. Both edges fade, so the clip starts and ends at
 * zero instead of at a step that clicks.
 *
 * @param {Float32Array} samples  mono, -1..1
 * @param {number} sampleRate
 * @returns {Float32Array} the trimmed copy, or an empty array if all silence
 */
export function trimSilence(samples, sampleRate) {
  const window = Math.max(1, Math.round((sampleRate * WINDOW_MS) / 1000));
  const windows = Math.ceil(samples.length / window);

  // Loudness (RMS) of each window, and the loudest of them.
  const loudness = new Float32Array(windows);
  let peak = 0;
  for (let w = 0; w < windows; w++) {
    const from = w * window;
    const to = Math.min(samples.length, from + window);
    let sum = 0;
    for (let i = from; i < to; i++) sum += samples[i] * samples[i];
    loudness[w] = Math.sqrt(sum / Math.max(1, to - from));
    peak = Math.max(peak, loudness[w]);
  }
  if (peak < FLOOR) return new Float32Array(0);

  const startLevel = Math.max(FLOOR, peak * START_SHARE);
  const endLevel = Math.max(FLOOR, peak * END_SHARE);
  let first = 0;
  while (first < windows && loudness[first] < startLevel) first++;
  let last = windows - 1;
  while (last > first && loudness[last] < endLevel) last--;

  const start = Math.max(0, first * window - Math.round((sampleRate * PAD_IN_MS) / 1000));
  const end = Math.min(samples.length, (last + 1) * window + Math.round((sampleRate * PAD_OUT_MS) / 1000));
  const clip = samples.slice(start, end);

  // Fade both edges to zero.
  const fadeIn = Math.min(Math.round((sampleRate * FADE_IN_MS) / 1000), clip.length);
  const fadeOut = Math.min(Math.round((sampleRate * FADE_OUT_MS) / 1000), clip.length);
  for (let i = 0; i < fadeIn; i++) clip[i] *= i / fadeIn;
  for (let i = 0; i < fadeOut; i++) clip[clip.length - 1 - i] *= i / fadeOut;
  return clip;
}

/**
 * Encode mono float samples (-1..1) as a 16-bit PCM WAV file.
 * @param {Float32Array} samples
 * @param {number} sampleRate
 * @returns {ArrayBuffer}
 */
export function encodeWav(samples, sampleRate) {
  const headerBytes = 44;
  const view = new DataView(new ArrayBuffer(headerBytes + samples.length * 2));
  const ascii = (/** @type {number} */ offset, /** @type {string} */ text) => {
    for (let i = 0; i < text.length; i++) view.setUint8(offset + i, text.charCodeAt(i));
  };

  ascii(0, 'RIFF');
  view.setUint32(4, view.byteLength - 8, true);
  ascii(8, 'WAVE');
  ascii(12, 'fmt ');
  view.setUint32(16, 16, true); // fmt chunk size
  view.setUint16(20, 1, true); // PCM
  view.setUint16(22, 1, true); // mono
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true); // byte rate
  view.setUint16(32, 2, true); // block align
  view.setUint16(34, 16, true); // bits per sample
  ascii(36, 'data');
  view.setUint32(40, samples.length * 2, true);

  for (let i = 0; i < samples.length; i++) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    view.setInt16(headerBytes + i * 2, s < 0 ? s * 0x8000 : s * 0x7fff, true);
  }
  return view.buffer;
}
