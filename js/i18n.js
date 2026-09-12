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
    title: 'AAC Games',
    chooseGame: 'Choose a game',
    escHint: 'Start and Back light up in turn; a click chooses the lit one. In the game, Back is lit after the pictures. Esc and the phone’s Back button also come back here.',
    back: 'Back',
    start: 'Start',
    'categories.guess.name': 'Guess items',
    'games.guess-mixed.name': 'Mixed',
    'games.guess-fruit.name': 'Fruit',
    'games.guess-vegetables.name': 'Vegetables',
    'games.guess-transport.name': 'Transport',
    'games.guess-clothes.name': 'Clothes',
    'games.guess-animals.name': 'Animals',
    'games.guess-birds.name': 'Birds',
    'games.guess.description': 'Pictures light up one after another. Click when the one you want is lit, and it is spoken aloud. A page is done when every picture has been chosen.',
    'games.guess.help': '← → change the page',
    settings: 'Settings',
    language: 'Language',
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
    title: 'AAC თამაშები',
    chooseGame: 'აირჩიეთ თამაში',
    escHint: '„დაწყება“ და „უკან“ რიგრიგობით ინიშნება; დაწკაპუნება ირჩევს მონიშნულს. თამაშში სურათების შემდეგ „უკან“ ინიშნება. Esc და ტელეფონის „უკან“ ღილაკიც აქ აბრუნებს.',
    back: 'უკან',
    start: 'დაწყება',
    'categories.guess.name': 'საგნების გამოცნობა',
    'games.guess-mixed.name': 'შერეული',
    'games.guess-fruit.name': 'ხილი',
    'games.guess-vegetables.name': 'ბოსტნეული',
    'games.guess-transport.name': 'ტრანსპორტი',
    'games.guess-clothes.name': 'ტანსაცმელი',
    'games.guess-animals.name': 'ცხოველები',
    'games.guess-birds.name': 'ფრინველები',
    'games.guess.description': 'სურათები რიგრიგობით ინიშნება. დააწკაპუნეთ, როცა სასურველი სურათია მონიშნული, და ის გახმოვანდება. გვერდი მთავრდება, როცა ყველა სურათი არჩეულია.',
    'games.guess.help': '← → გვერდის შეცვლა',
    settings: 'პარამეტრები',
    language: 'ენა',
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
    title: 'AAC Игры',
    chooseGame: 'Выберите игру',
    escHint: '«Начать» и «Назад» подсвечиваются по очереди; нажатие выбирает подсвеченную. В игре после картинок подсвечивается «Назад». Esc и кнопка «Назад» телефона тоже возвращают сюда.',
    back: 'Назад',
    start: 'Начать',
    'categories.guess.name': 'Угадывать предметы',
    'games.guess-mixed.name': 'Смешанные',
    'games.guess-fruit.name': 'Фрукты',
    'games.guess-vegetables.name': 'Овощи',
    'games.guess-transport.name': 'Транспорт',
    'games.guess-clothes.name': 'Одежда',
    'games.guess-animals.name': 'Животные',
    'games.guess-birds.name': 'Птицы',
    'games.guess.description': 'Картинки подсвечиваются по очереди. Нажмите, когда подсвечена нужная, и она будет произнесена. Страница пройдена, когда выбраны все картинки.',
    'games.guess.help': '← → листать страницы',
    settings: 'Настройки',
    language: 'Язык',
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
