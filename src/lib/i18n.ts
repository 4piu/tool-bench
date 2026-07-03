import i18n from "i18next";
import resourcesToBackend from "i18next-resources-to-backend";
import {initReactI18next} from "react-i18next";

export const supportedLanguages = [
    {code: "en", label: "English"},
    {code: "zh", label: "中文"}
] as const;

export type LanguageCode = typeof supportedLanguages[number]["code"];

void i18n
    .use(resourcesToBackend((language: string) => import(`../locales/${language}.json`)))
    .use(initReactI18next)
    .init({
        lng: "en",
        fallbackLng: "en",
        supportedLngs: supportedLanguages.map(language => language.code),
        interpolation: {escapeValue: false}
    });

export default i18n;
