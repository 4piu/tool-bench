import React from "react";
import i18n, {supportedLanguages, type LanguageCode} from "./i18n";
import {useLocalStorageState} from "../tools/shared/hooks";

export type LanguageMode = "system" | LanguageCode;

const supportedCodes: readonly string[] = supportedLanguages.map(language => language.code);

const detectSystemLanguage = (): LanguageCode => {
    const preferred = navigator.languages ?? [navigator.language];
    for (const tag of preferred) {
        const base = tag.split("-")[0].toLowerCase();
        if (supportedCodes.includes(base)) return base as LanguageCode;
    }
    return "en";
};

type LanguageContextValue = {
    mode: LanguageMode;
    resolvedLanguage: LanguageCode;
    setMode: (mode: LanguageMode) => void;
};

const LanguageContext = React.createContext<LanguageContextValue | null>(null);

export const useLanguageMode = () => {
    const context = React.useContext(LanguageContext);
    if (!context) throw new Error("useLanguageMode must be used within LanguageProvider");
    return context;
};

export const LanguageProvider = ({children}: { children: React.ReactNode }) => {
    const [mode, setMode] = useLocalStorageState<LanguageMode>("toolbench-language-mode", "system");
    const [systemLanguage, setSystemLanguage] = React.useState<LanguageCode>(() => detectSystemLanguage());

    React.useEffect(() => {
        const handleChange = () => setSystemLanguage(detectSystemLanguage());
        window.addEventListener("languagechange", handleChange);
        return () => window.removeEventListener("languagechange", handleChange);
    }, []);

    const resolvedLanguage: LanguageCode = mode === "system" ? systemLanguage : mode;

    React.useEffect(() => {
        void i18n.changeLanguage(resolvedLanguage);
    }, [resolvedLanguage]);

    const value = React.useMemo(() => ({mode, resolvedLanguage, setMode}), [mode, resolvedLanguage, setMode]);

    return (
        <LanguageContext.Provider value={value}>
            {children}
        </LanguageContext.Provider>
    );
};
