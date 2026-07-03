import type {LanguageCode} from "./i18n";

const rtlLanguages: readonly string[] = ["ar"];

export const isRtlLanguage = (code: LanguageCode) => rtlLanguages.includes(code);
