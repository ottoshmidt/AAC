// @ts-check
/**
 * Audio output: recorded clips, in-app Piper voices, device text-to-speech
 * and the highlight tick.
 *
 * Browsers block sound until the user has interacted with the page, so call
 * `unlock()` from the Start button's click handler before anything else.
 */

/**
 * @typedef {object} Utterance
 * @property {string} text   what to say
 * @property {string} lang   BCP 47 language tag, e.g. 'ka-GE'
 * @property {string} [clip] recorded clip to play instead of speech
 */

const PIPER_PREFIX = 'piper:';

export class Speech {
  constructor() {
    /** @type {SpeechSynthesis | null} */
    this.synth = 'speechSynthesis' in window ? window.speechSynthesis : null;
    /** @type {AudioContext | null} */
    this.audioCtx = null;
    /** @type {HTMLAudioElement | null} */
    this.clip = null;
    /** @type {Map<string, import('./piper.js').PiperVoice>} */
    this.piperVoices = new Map();
    /** Bumped on every speak/cancel, so late async results don't play over newer ones. */
    this.generation = 0;
  }

  get speechSupported() {
    return this.synth !== null;
  }

  /** @param {import('./piper.js').PiperVoice} voice */
  addPiperVoice(voice) {
    this.piperVoices.set(voice.id, voice);
  }

  /**
   * The Piper voice a voice setting refers to, if any.
   * @param {string} voice
   */
  piperVoice(voice) {
    return voice.startsWith(PIPER_PREFIX) ? this.piperVoices.get(voice.slice(PIPER_PREFIX.length)) : undefined;
  }

  /**
   * Device voices load asynchronously; `callback` runs now and whenever the list changes.
   * @param {(voices: SpeechSynthesisVoice[]) => void} callback
   */
  onVoicesChanged(callback) {
    if (!this.synth) return callback([]);
    const synth = this.synth;
    const report = () => callback(synth.getVoices());
    synth.addEventListener('voiceschanged', report);
    report();
  }

  /** Must be called from a user gesture (click) to allow sound later. */
  unlock() {
    const Ctx = window.AudioContext ?? /** @type {any} */ (window).webkitAudioContext;
    if (Ctx && !this.audioCtx) this.audioCtx = new Ctx();
    this.audioCtx?.resume();
    // Speaking an empty utterance inside the gesture unlocks speech on Safari.
    this.synth?.speak(new SpeechSynthesisUtterance(''));
  }

  /** Stop any speech or clip that is playing. */
  cancel() {
    this.generation += 1;
    this.synth?.cancel();
    if (this.clip) {
      this.clip.pause();
      this.clip = null;
    }
  }

  /**
   * Say something: a recorded clip if there is one, otherwise the chosen voice.
   * If an in-app voice isn't ready yet, falls back to the device voice.
   * @param {Utterance} utterance
   * @param {string} voice '' (browser default), a device voice name, or 'piper:<id>'
   */
  speak({ text, lang, clip }, voice) {
    this.cancel();
    if (clip) return this.#play(clip);

    const piper = this.piperVoice(voice);
    if (piper?.status === 'ready') {
      const generation = this.generation;
      piper
        .audioUrl(text)
        .then((url) => {
          if (generation === this.generation) this.#play(url);
        })
        .catch((error) => console.warn('[speech] in-app voice failed:', error));
      return;
    }
    this.#say(text, lang, piper ? '' : voice);
  }

  /**
   * @param {string} text
   * @param {string} lang
   * @param {string} voiceName
   */
  #say(text, lang, voiceName) {
    if (!this.synth) return;
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = lang;
    const voice = this.synth.getVoices().find((v) => v.name === voiceName);
    if (voice) utterance.voice = voice;
    this.synth.speak(utterance);
  }

  /** @param {string} url */
  #play(url) {
    this.clip = new Audio(url);
    this.clip.play().catch(() => {});
  }

  /** Short, soft tick for highlight movement. Generated, so no audio file is needed. */
  tick() {
    const ctx = this.audioCtx;
    if (!ctx || ctx.state !== 'running') return;
    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.value = 660;
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(0.2, t + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.12);
    osc.connect(gain).connect(ctx.destination);
    osc.start(t);
    osc.stop(t + 0.13);
  }
}
