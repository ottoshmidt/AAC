// @ts-check
/**
 * Recording page (record.html): record the name of every item in a language,
 * one word at a time, and save the clips into the project through the
 * record server (npm run record). Words are the distinct labels of all
 * picture sets; items sharing a word share the clip. Each word can be
 * recorded in two voices (female, male); the app's Voice setting picks one.
 *
 * Each recording is trimmed of silence, peak-normalized, resampled to
 * 16 kHz and stored as a mono WAV next to the pictures.
 */

import { LANGUAGES } from './i18n.js';
import { itemSets, labelFor, RECORDED_VOICES } from './items.js';
import { letterSets } from './letters.js';
import { encodeWav } from './wav.js';

const SAMPLE_RATE = 16000;
const MIC_KEY = 'aac.record.mic';
const SILENCE = 0.01; // about -40 dBFS
const PAD_MS = 80;
const PEAK = 0.9;

const $ = (/** @type {string} */ selector) => /** @type {HTMLElement} */ (document.querySelector(selector));
const ui = {
  langs: $('#record-langs'),
  voices: $('#record-voices'),
  mic: /** @type {HTMLSelectElement} */ ($('#record-mic')),
  progress: $('#record-progress'),
  image: /** @type {HTMLImageElement} */ ($('#record-image')),
  glyph: $('#record-glyph'),
  word: $('#record-word'),
  status: $('#record-status'),
  record: /** @type {HTMLButtonElement} */ ($('#record-button')),
  play: /** @type {HTMLButtonElement} */ ($('#record-play')),
  remove: /** @type {HTMLButtonElement} */ ($('#record-delete')),
  prev: /** @type {HTMLButtonElement} */ ($('#record-prev')),
  next: /** @type {HTMLButtonElement} */ ($('#record-next')),
  list: $('#record-list'),
};

/** @typedef {{ id: string, label: string, image: string, text?: string }} Word */

const state = {
  lang: 'ka',
  /** @type {string} */
  voice: RECORDED_VOICES[0],
  index: 0,
  /** @type {Word[]} */
  words: [],
  /** @type {Record<string, Record<string, Record<string, string>>>} language -> voice -> label -> file */
  clips: {},
  recording: false,
  busy: false,
};

/** @type {MediaStream | null} */
let stream = null;
/** @type {MediaRecorder | null} */
let recorder = null;
/** @type {HTMLAudioElement | null} */
let player = null;

// ---- Words -------------------------------------------------------------------

/** @param {string} lang */
function wordsFor(lang) {
  /** @type {Map<string, Word>} */
  const byLabel = new Map();
  // The pictures first, then the letters of that language's own alphabet.
  for (const item of [...Object.values(itemSets).flat(), ...(letterSets[lang] ?? [])]) {
    const label = labelFor(item, lang);
    if (!byLabel.has(label)) byLabel.set(label, { id: item.id, label, image: item.image ?? '', text: item.text });
  }
  return [...byLabel.values()];
}

function current() {
  return state.words[state.index];
}

/** @param {Word} word */
function clipOf(word) {
  return state.clips[state.lang]?.[state.voice]?.[word.label];
}

// ---- Server ------------------------------------------------------------------

/**
 * @param {string} path
 * @param {RequestInit} [init]
 */
async function api(path, init) {
  let response;
  try {
    response = await fetch(path, init);
  } catch {
    throw new Error('The record server is not running. Start it with: npm run record');
  }
  if (response.status === 501 || response.status === 405 || response.status === 404) {
    // A plain static server (npm start) can't save. Only the record server can.
    throw new Error('This server cannot save recordings. Run: npm run record, then open http://localhost:8888/record.html');
  }
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body.error ?? `Server error ${response.status}`);
  return body;
}

async function loadClips() {
  state.clips = await api('/api/clips');
}

// ---- Audio processing --------------------------------------------------------

/**
 * Decode a recording, trim silence, normalize and resample; returns WAV bytes.
 * @param {Blob} blob
 */
async function toWav(blob) {
  const ctx = new AudioContext();
  const decoded = await ctx.decodeAudioData(await blob.arrayBuffer());
  await ctx.close();

  // Mix to mono.
  const mono = new Float32Array(decoded.length);
  for (let c = 0; c < decoded.numberOfChannels; c++) {
    const data = decoded.getChannelData(c);
    for (let i = 0; i < mono.length; i++) mono[i] += data[i] / decoded.numberOfChannels;
  }

  // Trim leading and trailing silence, keeping a little padding.
  const pad = Math.round((decoded.sampleRate * PAD_MS) / 1000);
  let start = 0;
  while (start < mono.length && Math.abs(mono[start]) < SILENCE) start++;
  let end = mono.length;
  while (end > start && Math.abs(mono[end - 1]) < SILENCE) end--;
  if (end <= start) throw new Error('Nothing was recorded (only silence).');
  const trimmed = mono.subarray(Math.max(0, start - pad), Math.min(mono.length, end + pad));

  // Normalize the peak.
  let peak = 0;
  for (const s of trimmed) peak = Math.max(peak, Math.abs(s));
  const gain = peak > 0 ? PEAK / peak : 1;

  // Resample.
  const length = Math.ceil((trimmed.length * SAMPLE_RATE) / decoded.sampleRate);
  const offline = new OfflineAudioContext(1, length, SAMPLE_RATE);
  const buffer = offline.createBuffer(1, trimmed.length, decoded.sampleRate);
  buffer.copyToChannel(trimmed.map((s) => s * gain), 0);
  const source = offline.createBufferSource();
  source.buffer = buffer;
  source.connect(offline.destination);
  source.start();
  const rendered = await offline.startRendering();
  return encodeWav(rendered.getChannelData(0), SAMPLE_RATE);
}

// ---- Recording ---------------------------------------------------------------

/** The chosen microphone's device id ('' = system default). */
function chosenMic() {
  try {
    return localStorage.getItem(MIC_KEY) ?? '';
  } catch {
    return '';
  }
}

async function ensureStream() {
  if (stream) return stream;
  if (!navigator.mediaDevices?.getUserMedia) {
    throw new Error('No microphone access: open this page at http://localhost:8888/record.html (a secure origin).');
  }
  const deviceId = chosenMic();
  /** @type {MediaTrackConstraints} */
  const audio = { echoCancellation: false, noiseSuppression: false, autoGainControl: false };
  try {
    stream = await navigator.mediaDevices.getUserMedia({ audio: deviceId ? { ...audio, deviceId: { exact: deviceId } } : audio });
  } catch (error) {
    // The saved microphone is unplugged: fall back to the default one.
    if (!deviceId || !(error instanceof DOMException) || error.name !== 'OverconstrainedError') throw error;
    stream = await navigator.mediaDevices.getUserMedia({ audio });
  }
  // Device names are only visible once the page may use the microphone.
  await listMics();
  return stream;
}

/** Stop using the current microphone, so the next recording opens the chosen one. */
function releaseStream() {
  for (const track of stream?.getTracks() ?? []) track.stop();
  stream = null;
}

/** Fill the microphone list from the devices the browser reports. */
async function listMics() {
  if (!navigator.mediaDevices?.enumerateDevices) return;
  const mics = (await navigator.mediaDevices.enumerateDevices()).filter((d) => d.kind === 'audioinput' && d.deviceId !== 'default');
  const saved = chosenMic();
  const active = stream?.getAudioTracks()[0]?.getSettings().deviceId ?? '';
  const options = [new Option('System default', '')];
  mics.forEach((mic, i) => options.push(new Option(mic.label || `Microphone ${i + 1}`, mic.deviceId)));
  ui.mic.replaceChildren(...options);
  ui.mic.value = mics.some((m) => m.deviceId === saved) ? saved : '';
  ui.mic.title = active ? `In use: ${mics.find((m) => m.deviceId === active)?.label ?? active}` : '';
}

async function startRecording() {
  const s = await ensureStream();
  recorder = new MediaRecorder(s);
  /** @type {Blob[]} */
  const chunks = [];
  recorder.addEventListener('dataavailable', (e) => chunks.push(e.data));
  const done = new Promise((resolve) => recorder?.addEventListener('stop', resolve, { once: true }));
  recorder.start();
  state.recording = true;
  setStatus('Recording… click Stop (or press Space) when done.');
  render();
  await done;
  return new Blob(chunks, { type: recorder.mimeType });
}

function stopRecording() {
  recorder?.stop();
  state.recording = false;
}

/** Record the current word, save it, play it back, move on. */
async function recordCurrent() {
  const word = current();
  const blob = await startRecording();
  state.busy = true;
  render();
  try {
    setStatus('Saving…');
    const wav = await toWav(blob);
    const { clips } = await api(`/api/clips/${state.lang}/${state.voice}/${word.id}.wav`, { method: 'POST', body: wav });
    state.clips = clips;
    setStatus(`Saved ${clipOf(word)} (${Math.round(wav.byteLength / 1024)} KB).`);
    render();
    await play(word);
    const next = state.words.findIndex((w, i) => i > state.index && !clipOf(w));
    if (next >= 0) go(next);
  } finally {
    state.busy = false;
    render();
  }
}

/** @param {Word} word */
function play(word) {
  const clip = clipOf(word);
  if (!clip) return Promise.resolve();
  player?.pause();
  player = new Audio(`${clip}?t=${Date.now()}`); // bypass any cached copy
  return new Promise((resolve) => {
    if (!player) return resolve(undefined);
    player.addEventListener('ended', resolve, { once: true });
    player.addEventListener('error', resolve, { once: true });
    player.play().catch(resolve);
  });
}

async function removeCurrent() {
  const word = current();
  const { clips } = await api(`/api/clips/${state.lang}/${state.voice}/${word.id}.wav`, { method: 'DELETE' });
  state.clips = clips;
  setStatus('Removed. The voice will be used for this word again.');
  render();
}

// ---- UI ----------------------------------------------------------------------

/** @param {string} text */
function setStatus(text) {
  ui.status.textContent = text;
  ui.status.classList.remove('error');
}

/** @param {unknown} error */
function showError(error) {
  ui.status.textContent = error instanceof Error ? error.message : String(error);
  ui.status.classList.add('error');
}

/** @param {number} index */
function go(index) {
  state.index = Math.max(0, Math.min(state.words.length - 1, index));
  render();
  ui.list.children[state.index]?.scrollIntoView({ block: 'nearest' });
}

/** @param {string} lang */
function setLang(lang) {
  state.lang = lang;
  state.words = wordsFor(lang);
  state.index = 0;
  renderList();
  render();
}

/** @param {string} voice */
function setVoice(voice) {
  state.voice = voice;
  const first = state.words.findIndex((w) => !clipOf(w));
  state.index = first >= 0 ? first : 0;
  render();
  ui.list.children[state.index]?.scrollIntoView({ block: 'nearest' });
}

function renderList() {
  ui.list.replaceChildren(
    ...state.words.map((word, i) => {
      const li = document.createElement('li');
      const button = document.createElement('button');
      button.type = 'button';
      button.textContent = word.label;
      button.addEventListener('click', () => go(i));
      li.append(button);
      return li;
    }),
  );
}

function render() {
  const word = current();
  const done = state.words.filter((w) => clipOf(w)).length;
  ui.progress.textContent = `${done} / ${state.words.length}`;
  // A letter has no picture: the letter itself is shown, large.
  ui.image.hidden = !word.image;
  ui.glyph.hidden = Boolean(word.image);
  if (word.image) {
    ui.image.src = word.image;
    ui.image.alt = word.label;
  } else {
    ui.glyph.textContent = word.text ?? word.label;
  }
  ui.word.textContent = word.label;

  const has = Boolean(clipOf(word));
  ui.record.textContent = state.recording ? '■ Stop' : has ? '● Record again' : '● Record';
  ui.record.classList.toggle('recording', state.recording);
  ui.record.disabled = state.busy;
  ui.play.disabled = !has || state.recording || state.busy;
  ui.remove.disabled = !has || state.recording || state.busy;
  ui.prev.disabled = state.recording || state.busy;
  ui.next.disabled = state.recording || state.busy;

  for (const [i, li] of [...ui.list.children].entries()) {
    li.classList.toggle('current', i === state.index);
    li.classList.toggle('done', Boolean(clipOf(state.words[i])));
  }
  for (const button of ui.langs.querySelectorAll('button')) {
    button.setAttribute('aria-pressed', String(button.dataset.lang === state.lang));
  }
  for (const button of ui.voices.querySelectorAll('button')) {
    button.setAttribute('aria-pressed', String(button.dataset.voice === state.voice));
  }
}

/** @param {() => Promise<unknown>} action */
function guarded(action) {
  return () => action().catch(showError);
}

ui.langs.replaceChildren(
  ...Object.entries(LANGUAGES).map(([code, { name }]) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.dataset.lang = code;
    button.textContent = name;
    button.addEventListener('click', () => {
      if (!state.recording && !state.busy) setLang(code);
    });
    return button;
  }),
);

ui.voices.replaceChildren(
  ...RECORDED_VOICES.map((voice) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.dataset.voice = voice;
    button.textContent = voice === 'female' ? 'Female voice' : 'Male voice';
    button.addEventListener('click', () => {
      if (!state.recording && !state.busy) setVoice(voice);
    });
    return button;
  }),
);

ui.mic.addEventListener('change', () => {
  try {
    localStorage.setItem(MIC_KEY, ui.mic.value);
  } catch {
    // Not remembered, but still used for this session.
  }
  releaseStream();
  guarded(async () => {
    await ensureStream();
    setStatus(`Microphone: ${ui.mic.selectedOptions[0]?.textContent ?? ''}`);
  })();
});
navigator.mediaDevices?.addEventListener?.('devicechange', () => listMics().catch(showError));

ui.record.addEventListener('click', () => {
  if (state.recording) stopRecording();
  else guarded(recordCurrent)();
});
ui.play.addEventListener('click', guarded(() => play(current())));
ui.remove.addEventListener('click', guarded(removeCurrent));
ui.prev.addEventListener('click', () => go(state.index - 1));
ui.next.addEventListener('click', () => go(state.index + 1));

document.addEventListener('keydown', (event) => {
  if (event.target instanceof HTMLInputElement) return;
  if (event.key === ' ') {
    event.preventDefault();
    ui.record.click();
  } else if (event.key === 'ArrowLeft' && !ui.prev.disabled) go(state.index - 1);
  else if (event.key === 'ArrowRight' && !ui.next.disabled) go(state.index + 1);
});

setLang(state.lang);
listMics().catch(showError);
loadClips()
  .then(() => {
    render();
    const first = state.words.findIndex((w) => !clipOf(w));
    if (first > 0) go(first);
    setStatus('Click Record, say the word, click Stop.');
  })
  .catch(showError);
