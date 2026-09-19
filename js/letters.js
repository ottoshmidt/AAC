// @ts-check
/**
 * The alphabets of the three languages, as items for the guessing game.
 *
 * A letter item has `text` (the letter) and `lang` (the language it belongs
 * to) instead of an `image`. The game draws the letter itself, and the shell
 * speaks it in its own language, so Georgian letters are read in Georgian
 * even when the interface is in English.
 */

/** @typedef {{ id: string, text: string, lang: string, label: Record<string, string> }} Letter */

const ALPHABETS = {
  ka: 'ა ბ გ დ ე ვ ზ თ ი კ ლ მ ნ ო პ ჟ რ ს ტ უ ფ ქ ღ ყ შ ჩ ც ძ წ ჭ ხ ჯ ჰ',
  en: 'A B C D E F G H I J K L M N O P Q R S T U V W X Y Z',
  ru: 'А Б В Г Д Е Ё Ж З И Й К Л М Н О П Р С Т У Ф Х Ц Ч Ш Щ Ъ Ы Ь Э Ю Я',
};

/**
 * Letters of each alphabet, in its own order.
 * @type {Record<string, Letter[]>}
 */
export const letterSets = Object.fromEntries(
  Object.entries(ALPHABETS).map(([lang, letters]) => [
    lang,
    letters.split(' ').map((text, i) => ({
      id: `${lang}-${i + 1}`,
      text,
      lang,
      // The letter is the same in every interface language.
      label: { ka: text, en: text, ru: text },
    })),
  ]),
);
