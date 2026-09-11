// @ts-check
/**
 * Audio output: text-to-speech, recorded clips and the highlight tick.
 *
 * Browsers block sound until the user has interacted with the page, so call
 * `unlock()` from the Start button's click handler before anything else.
 */

/**
 * @typedef {object} SpeakableItem
 * @property {string} label    text to speak
 * @property {string} [audio]  recorded clip to play instead of speech
 * @property {string} [lang]   language of the label, e.g. 'en-US'
 */

export class Speech {
  constructor() {
    /** @type {SpeechSynthesis | null} */
    this.synth = 'speechSynthesis' in window ? window.speechSynthesis : null;
    /** @type {AudioContext | null} */
    this.audioCtx = null;
    /** @type {HTMLAudioElement | null} */
    this.clip = null;
    this.voiceName = '';
  }

  get speechSupported() {
    return this.synth !== null;
  }

  /**
   * Voices load asynchronously; `callback` runs now and whenever the list changes.
   * @param {(voices: SpeechSynthesisVoice[]) => void} callback
   */
  onVoicesChanged(callback) {
    if (!this.synth) return callback([]);
    const synth = this.synth;
    const report = () => callback(synth.getVoices());
    synth.addEventListener('voiceschanged', report);
    report();
  }

  /** @param {string} name voice name, or '' for the browser default */
  setVoice(name) {
    this.voiceName = name;
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
    this.synth?.cancel();
    if (this.clip) {
      this.clip.pause();
      this.clip = null;
    }
  }

  /** @param {SpeakableItem} item */
  speakItem(item) {
    if (item.audio) this.playClip(item.audio);
    else this.say(item.label, item.lang);
  }

  /**
   * @param {string} text
   * @param {string} [lang]
   */
  say(text, lang) {
    if (!this.synth) return;
    this.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    const voice = this.synth.getVoices().find((v) => v.name === this.voiceName);
    if (voice) utterance.voice = voice;
    if (lang) utterance.lang = lang;
    this.synth.speak(utterance);
  }

  /** @param {string} url */
  playClip(url) {
    this.cancel();
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
