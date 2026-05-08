import { localeEnglish } from "./locale_en/locale.js";
import { localePolish } from "./locale_pl/locale.js";
import { localeJapanese } from "./locale_ja/locale.js";
import { localeFrench } from "./locale_fr/locale.js";
import { localePortuguese } from "./locale_pt/locale.js";
import { localeChinese } from "./locale_zh/locale.js";
import { localeItalian } from "./locale_it/locale.js";

export const DEFAULT_LOCALE = "en";
export const localeList = {
    en: localeEnglish,
    pl: localePolish,
    ja: localeJapanese,
    fr: localeFrench,
    pt: localePortuguese,
    zh: localeChinese,
    it: localeItalian
};

export type LocaleCode = keyof typeof localeList;
