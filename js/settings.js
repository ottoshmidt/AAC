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
 * @property {number}  intervalMs        how long each side stays highlighted
 * @property {number}  cooldownMs        pause after a selection before scanning resumes
 * @property {number}  debounceMs        ignore presses closer together than this
 * @property {number}  maxCycles         pause after this many cycles without a selection (0 = never)
 * @property {boolean} speakOnSelect     speak the selected item
 * @property {boolean} speakOnHighlight  speak each item as it is highlighted (auditory scanning)
 * @property {boolean} highlightSound    short tick when the highlight moves
 * @property {boolean} fullscreen        enter fullscreen when the game starts
 * @property {string}  voiceName         speech voice name ('' = browser default)
 */

/** @type {Readonly<Settings>} */
export const DEFAULTS = Object.freeze({
  intervalMs: 2000,
  cooldownMs: 2000,
  debounceMs: 300,
  maxCycles: 5,
  speakOnSelect: true,
  speakOnHighlight: false,
  highlightSound: true,
  fullscreen: true,
  voiceName: '',
});

/** Allowed ranges for numeric settings. */
export const LIMITS = Object.freeze({
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
  const input = raw && typeof raw === 'object' ? /** @type {any} */ (raw) : {};
  /** @type {Record<string, unknown>} */
  const out = { ...DEFAULTS };
  for (const [key, fallback] of Object.entries(DEFAULTS)) {
    const value = input[key];
    if (typeof value !== typeof fallback) continue;
    if (typeof value === 'number') {
      if (!Number.isFinite(value)) continue;
      const limit = /** @type {Record<string, {min: number, max: number}>} */ (LIMITS)[key];
      out[key] = limit ? Math.min(limit.max, Math.max(limit.min, value)) : value;
    } else {
      out[key] = value;
    }
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
