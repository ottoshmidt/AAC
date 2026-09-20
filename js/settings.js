// @ts-check
/**
 * Caregiver settings, persisted in localStorage.
 *
 * Every setting has a default and limits; anything missing or invalid in
 * storage falls back to the default, so a corrupted or outdated saved value
 * can never break the app.
 */

const STORAGE_KEY = 'aac.settings.v1';

/**
 * @typedef {object} Settings
 * @property {number}  choicesPerRound   pictures shown at once: 2 (side by side) or 4 (2×2)
 * @property {string}  choiceInput       how a picture is chosen: 'scan' (highlight, click anywhere) or 'touch' (tap it)
 * @property {number}  matchShapes       shapes in a Matching round: 2, 3 or 4
 * @property {string}  matchInput        how a shape is moved: 'drag', 'tap' (tap it, then tap a slot),
 *                                       'scan' or 'both' (dragging and scanning at once)
 * @property {string}  matchDeal         how the slots line up with the shapes:
 *                                       'aligned' (each under its own shape), 'random' or
 *                                       'crossed' (never under its own shape)
 * @property {number}  bubbleCount       bubbles on screen at once
 * @property {number}  bubbleHoldMs      how long a bubble must be held before it bursts
 * @property {string}  bubbleSize        bubble size: 'small', 'medium', 'large' or 'xlarge'
 * @property {string}  bubbleMotion      'still' or 'drift' (bubbles float about)
 * @property {string}  bubbleInput       how a bubble is burst: 'touch' (hold it) or 'scan' (hold anywhere)
 * @property {number}  intervalMs        how long each picture stays highlighted
 * @property {number}  cooldownMs        pause after a selection before scanning resumes
 * @property {number}  debounceMs        ignore presses closer together than this
 * @property {number}  maxCycles         pause after this many cycles without a selection (0 = never)
 * @property {boolean} speakOnSelect     speak the selected item
 * @property {boolean} speakOnHighlight  speak each item as it is highlighted (auditory scanning)
 * @property {boolean} highlightSound    short tick when the highlight moves
 * @property {boolean} fullscreen        enter fullscreen when the game starts
 * @property {string}  language          interface and speech language, a key of LANGUAGES
 * @property {string}  voiceEn           voice for English (see below)
 * @property {string}  voiceKa           voice for Georgian (see below)
 * @property {string}  voiceRu           voice for Russian (see below)
 *
 * A voice is '' for the browser default, a device voice name,
 * 'piper:<id>' for an in-app Piper voice, or 'recorded:<voice>' for words
 * recorded with `npm run record` (female/male); words without a recording
 * fall back to the language's default voice.
 */

/** Settings key holding the voice for each language. */
export const VOICE_KEYS = Object.freeze({ en: 'voiceEn', ka: 'voiceKa', ru: 'voiceRu' });

const LANGUAGE_CODES = ['ka', 'en', 'ru'];

/**
 * The app language matching a browser language tag like 'ru-RU', else English.
 * @param {string | undefined} browserLanguage
 */
export function detectLanguage(browserLanguage) {
  const code = (browserLanguage ?? '').toLowerCase().split(/[-_]/)[0];
  return LANGUAGE_CODES.includes(code) ? code : 'en';
}

/** @type {Readonly<Settings>} */
export const DEFAULTS = Object.freeze({
  choicesPerRound: 4,
  choiceInput: 'touch',
  matchShapes: 2,
  matchInput: 'drag',
  matchDeal: 'random',
  bubbleCount: 4,
  bubbleHoldMs: 3000,
  bubbleSize: 'medium',
  bubbleMotion: 'still',
  bubbleInput: 'touch',
  intervalMs: 2000,
  cooldownMs: 2000,
  debounceMs: 300,
  maxCycles: 0, // never pause; caregivers can turn it on
  speakOnSelect: true,
  speakOnHighlight: false,
  highlightSound: true,
  fullscreen: true,
  language: detectLanguage(globalThis.navigator?.language),
  voiceEn: '',
  // Devices almost never ship a Georgian voice, so default to the in-app one.
  voiceKa: 'piper:ka_GE-natia-medium',
  // Russian voices are common on devices; the in-app Denis voice is optional.
  voiceRu: '',
});

/** Allowed values for settings that are a fixed choice. */
export const CHOICES = Object.freeze({
  choicesPerRound: [2, 4],
  choiceInput: ['scan', 'touch'],
  matchShapes: [2, 3, 4],
  matchInput: ['drag', 'tap', 'scan', 'both'],
  matchDeal: ['aligned', 'random', 'crossed'],
  bubbleCount: [2, 3, 4, 6],
  bubbleSize: ['small', 'medium', 'large', 'xlarge'],
  bubbleMotion: ['still', 'drift'],
  bubbleInput: ['touch', 'scan'],
  language: LANGUAGE_CODES,
});

/** Allowed ranges for numeric settings. */
export const LIMITS = Object.freeze({
  bubbleHoldMs: { min: 500, max: 10000 },
  intervalMs: { min: 500, max: 10000 },
  cooldownMs: { min: 0, max: 10000 },
  debounceMs: { min: 0, max: 2000 },
  maxCycles: { min: 0, max: 50 },
});

/**
 * Merge `raw` over the defaults, dropping unknown keys and wrong types and
 * clamping numbers to their limits.
 * @param {unknown} raw
 * @returns {Settings}
 */
export function sanitize(raw) {
  /** @type {Record<string, unknown>} */
  const input = raw && typeof raw === 'object' ? { .../** @type {any} */ (raw) } : {};
  // Before languages existed there was a single `voiceName`, used for English.
  if (typeof input.voiceName === 'string' && input.voiceEn === undefined) input.voiceEn = input.voiceName;

  /** @type {Record<string, unknown>} */
  const out = { ...DEFAULTS };
  for (const [key, fallback] of Object.entries(DEFAULTS)) {
    const value = input[key];
    if (typeof value !== typeof fallback) continue;
    if (typeof value === 'number' && !Number.isFinite(value)) continue;
    const allowed = /** @type {Record<string, readonly unknown[]>} */ (CHOICES)[key];
    if (allowed && !allowed.includes(value)) continue;
    const limit = /** @type {Record<string, {min: number, max: number}>} */ (LIMITS)[key];
    out[key] = limit && typeof value === 'number' ? Math.min(limit.max, Math.max(limit.min, value)) : value;
  }
  return /** @type {Settings} */ (out);
}

/** @returns {Settings} */
export function loadSettings() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return sanitize(stored ? JSON.parse(stored) : {});
  } catch {
    return sanitize({});
  }
}

/** @param {Settings} settings */
export function saveSettings(settings) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(sanitize(settings)));
  } catch {
    // Storage can be unavailable (private mode, blocked site data).
    // Settings then last only for this session.
  }
}
