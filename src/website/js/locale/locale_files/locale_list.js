import { localeEnglish } from "./locale_en/locale.js";
import { localePolish } from "./locale_pl/locale.js";
import { localeJapanese } from "./locale_ja/locale.js";
import { localeFrench } from "./locale_fr/locale.js";

export const DEFAULT_LOCALE = "en";
/**
 * @enum {CompleteLocaleTypedef}
 */
export const localeList = {
    "en": localeEnglish,
    "pl": localePolish,
    "ja": localeJapanese,
    "fr": localeFrench
};
/**
 * @typedef {
 *     "en"
 *     |"pl"
 *     |"ja"
 *     |"fr"
 * } LocaleList
 */