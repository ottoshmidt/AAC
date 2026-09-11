// @ts-check
/**
 * Interface languages and their strings.
 *
 * Elements with `data-i18n="key"` get their text from here. Strings may
 * contain `{name}` placeholders, filled in by `t()`.
 */

/**
 * @typedef {object} Language
 * @property {string} name        name of the language in that language
 * @property {string} speechLang  BCP 47 tag for speech, e.g. 'ka-GE'
 */

/** @type {Record<string, Language>} */
export const LANGUAGES = {
  ka: { name: 'ქართული', speechLang: 'ka-GE' },
  en: { name: 'English', speechLang: 'en-US' },
  ru: { name: 'Русский', speechLang: 'ru-RU' },
};

/** @type {Record<string, Record<string, string>>} */
const STRINGS = {
  en: {
    title: 'AAC Choice',
    start: 'Start',
    escHint: 'During the game: ← → change the page, Esc comes back here.',
    settings: 'Settings',
    language: 'Language',
    game: 'Game',
    choicesPerRound: 'Pictures at a time',
    timing: 'Timing',
    intervalBefore: 'Highlight each picture for',
    intervalAfter: 'seconds',
    cooldownBefore: 'Wait after a choice',
    cooldownAfter: 'seconds',
    debounceBefore: 'Ignore repeated clicks within',
    debounceAfter: 'seconds',
    maxCyclesBefore: 'Pause after',
    maxCyclesAfter: 'rounds with no choice (0 = never)',
    sound: 'Sound',
    speakOnSelect: 'Speak the chosen picture',
    speakOnHighlight: 'Speak each picture as it is highlighted',
    highlightSound: 'Tick when the highlight moves',
    voice: 'Voice',
    display: 'Display',
    fullscreen: 'Go fullscreen when the game starts',
    paused: 'Paused',
    clickToContinue: 'Click to continue',
    browserDefault: 'Browser default',
    notOnDevice: '{name} (not on this device)',
    piperOption: '{name}: built in, works offline ({size} MB download)',
    voiceDownloading: 'Voice {name}: downloading, {percent}% of {size} MB',
    voiceLoading: 'Voice {name}: getting ready…',
    voiceReady: 'Voice {name} is ready.',
    voiceError: 'Voice {name} could not be loaded: {error}',
    retry: 'Retry',
    voiceLicense: 'Voice {name}: {license}. Free for personal, non-commercial use only.',
    voiceLicenseFree: 'Voice {name}: {license}, free to use for any purpose.',
    noVoices: 'No speech voices found on this device. On Linux, install speech-dispatcher and a voice such as espeak-ng.',
    noVoiceForLanguage: 'This device has no voice for this language. Choose the built-in voice or use recorded clips.',
    noSpeech: 'This browser does not support text-to-speech. Recorded clips still work.',
  },
  ka: {
    title: 'AAC არჩევანი',
    start: 'დაწყება',
    escHint: 'თამაშის დროს: ← → გვერდის შეცვლა, Esc — აქ დაბრუნება.',
    settings: 'პარამეტრები',
    language: 'ენა',
    game: 'თამაში',
    choicesPerRound: 'სურათების რაოდენობა ერთდროულად',
    timing: 'დრო',
    intervalBefore: 'თითოეული სურათის მონიშვნა',
    intervalAfter: 'წამით',
    cooldownBefore: 'მოცდა არჩევის შემდეგ',
    cooldownAfter: 'წამი',
    debounceBefore: 'განმეორებითი დაწკაპუნებების უგულებელყოფა',
    debounceAfter: 'წამის განმავლობაში',
    maxCyclesBefore: 'შეჩერება',
    maxCyclesAfter: 'წრის შემდეგ, თუ არჩევანი არ გაკეთდა (0 = არასოდეს)',
    sound: 'აუდიო',
    speakOnSelect: 'არჩეული სურათის გახმოვანება',
    speakOnHighlight: 'თითოეული სურათის გახმოვანება მონიშვნისას',
    highlightSound: 'ხმოვანი სიგნალი მონიშვნის გადაადგილებისას',
    voice: 'ხმა',
    display: 'ეკრანი',
    fullscreen: 'სრულეკრანიანი რეჟიმი თამაშის დაწყებისას',
    paused: 'შეჩერებულია',
    clickToContinue: 'დააწკაპუნეთ გასაგრძელებლად',
    browserDefault: 'ბრაუზერის ნაგულისხმევი',
    notOnDevice: '{name} (ამ მოწყობილობაზე არ არის)',
    piperOption: '{name}: ჩაშენებული, მუშაობს ინტერნეტის გარეშე ({size} მბ ჩამოსატვირთი)',
    voiceDownloading: 'ხმა „{name}“: იტვირთება, {percent}% ({size} მბ)',
    voiceLoading: 'ხმა „{name}“: მზადდება…',
    voiceReady: 'ხმა „{name}“ მზადაა.',
    voiceError: 'ხმა „{name}“ ვერ ჩაიტვირთა: {error}',
    retry: 'ხელახლა ცდა',
    voiceLicense: 'ხმა „{name}“: {license}. უფასოა მხოლოდ პირადი, არაკომერციული გამოყენებისთვის.',
    voiceLicenseFree: 'ხმა „{name}“: {license}, შეიძლება თავისუფლად გამოყენება ნებისმიერი მიზნით.',
    noVoices: 'ამ მოწყობილობაზე ხმები ვერ მოიძებნა. Linux-ზე დააყენეთ speech-dispatcher და ხმა, მაგალითად espeak-ng.',
    noVoiceForLanguage: 'ამ მოწყობილობას ამ ენისთვის ხმა არ აქვს. აირჩიეთ ჩაშენებული ხმა ან გამოიყენეთ ჩანაწერები.',
    noSpeech: 'ეს ბრაუზერი ტექსტის გახმოვანებას არ უჭერს მხარს. ჩანაწერები მაინც იმუშავებს.',
  },
  ru: {
    title: 'AAC Выбор',
    start: 'Начать',
    escHint: 'Во время игры: ← → листать страницы, Esc — вернуться сюда.',
    settings: 'Настройки',
    language: 'Язык',
    game: 'Игра',
    choicesPerRound: 'Картинок на странице',
    timing: 'Время',
    intervalBefore: 'Подсвечивать каждую картинку',
    intervalAfter: 'сек.',
    cooldownBefore: 'Пауза после выбора',
    cooldownAfter: 'сек.',
    debounceBefore: 'Не учитывать повторные нажатия в течение',
    debounceAfter: 'сек.',
    maxCyclesBefore: 'Остановиться после',
    maxCyclesAfter: 'кругов без выбора (0 — никогда)',
    sound: 'Звук',
    speakOnSelect: 'Озвучивать выбранную картинку',
    speakOnHighlight: 'Озвучивать каждую картинку при подсветке',
    highlightSound: 'Щелчок при смене подсветки',
    voice: 'Голос',
    display: 'Экран',
    fullscreen: 'Полноэкранный режим при начале игры',
    paused: 'Пауза',
    clickToContinue: 'Нажмите, чтобы продолжить',
    browserDefault: 'Голос браузера по умолчанию',
    notOnDevice: '{name} (нет на этом устройстве)',
    piperOption: '{name}: встроенный, работает без интернета (загрузка {size} МБ)',
    voiceDownloading: 'Голос «{name}»: загрузка, {percent}% из {size} МБ',
    voiceLoading: 'Голос «{name}»: подготовка…',
    voiceReady: 'Голос «{name}» готов.',
    voiceError: 'Не удалось загрузить голос «{name}»: {error}',
    retry: 'Повторить',
    voiceLicense: 'Голос «{name}»: {license}. Бесплатно только для личного некоммерческого использования.',
    voiceLicenseFree: 'Голос «{name}»: {license}, можно свободно использовать для любых целей.',
    noVoices: 'На этом устройстве не найдено голосов. В Linux установите speech-dispatcher и голос, например espeak-ng.',
    noVoiceForLanguage: 'На этом устройстве нет голоса для этого языка. Выберите встроенный голос или используйте записи.',
    noSpeech: 'Этот браузер не поддерживает синтез речи. Записи всё равно будут работать.',
  },
};

/**
 * Translate `key` into `lang`, falling back to English, then to the key.
 * @param {string} lang
 * @param {string} key
 * @param {Record<string, string | number>} [vars]
 */
export function t(lang, key, vars = {}) {
  const template = STRINGS[lang]?.[key] ?? STRINGS.en[key] ?? key;
  return template.replace(/\{(\w+)\}/g, (match, name) => (name in vars ? String(vars[name]) : match));
}

/**
 * Fill every `[data-i18n]` element under `root` and set the page language.
 * @param {string} lang
 * @param {ParentNode} [root]
 */
export function applyStrings(lang, root = document) {
  document.documentElement.lang = lang;
  for (const el of root.querySelectorAll('[data-i18n]')) {
    el.textContent = t(lang, /** @type {HTMLElement} */ (el).dataset.i18n ?? '');
  }
  document.title = t(lang, 'title');
}

/** Every string key must exist in every language. Used by the tests. */
export function missingKeys() {
  const keys = new Set(Object.values(STRINGS).flatMap((s) => Object.keys(s)));
  return Object.entries(STRINGS).flatMap(([lang, s]) => [...keys].filter((k) => !(k in s)).map((k) => `${lang}.${k}`));
}
