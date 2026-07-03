import React from "react";
import createCache from "@emotion/cache";
import {CacheProvider} from "@emotion/react";
import {CssBaseline} from "@mui/material";
import {ThemeProvider, createTheme} from "@mui/material/styles";
import rtlPlugin from "stylis-plugin-rtl";
import {useLanguageMode} from "./language";
import {useLocalStorageState} from "../tools/shared/hooks";

export type ThemeMode = "system" | "light" | "dark";

const getSystemPrefersDark = () => window.matchMedia("(prefers-color-scheme: dark)").matches;

const ltrCache = createCache({key: "mui", prepend: true});
const rtlCache = createCache({key: "muirtl", stylisPlugins: [rtlPlugin], prepend: true});

type ThemeModeContextValue = {
    mode: ThemeMode;
    resolvedMode: "light" | "dark";
    setMode: (mode: ThemeMode) => void;
};

const ThemeModeContext = React.createContext<ThemeModeContextValue | null>(null);

export const useThemeMode = () => {
    const context = React.useContext(ThemeModeContext);
    if (!context) throw new Error("useThemeMode must be used within ThemeModeProvider");
    return context;
};

export const ThemeModeProvider = ({children}: { children: React.ReactNode }) => {
    const {direction} = useLanguageMode();
    const [mode, setMode] = useLocalStorageState<ThemeMode>("toolbench-theme-mode", "system");
    const [systemPrefersDark, setSystemPrefersDark] = React.useState(() => getSystemPrefersDark());

    React.useEffect(() => {
        const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
        const handleChange = (event: MediaQueryListEvent) => setSystemPrefersDark(event.matches);
        mediaQuery.addEventListener("change", handleChange);
        return () => mediaQuery.removeEventListener("change", handleChange);
    }, []);

    const resolvedMode: "light" | "dark" = mode === "system" ? (systemPrefersDark ? "dark" : "light") : mode;
    const theme = React.useMemo(() => createTheme({palette: {mode: resolvedMode}, direction}), [resolvedMode, direction]);
    const value = React.useMemo(() => ({mode, resolvedMode, setMode}), [mode, resolvedMode, setMode]);

    return (
        <ThemeModeContext.Provider value={value}>
            <CacheProvider value={direction === "rtl" ? rtlCache : ltrCache}>
                <ThemeProvider theme={theme}>
                    <CssBaseline/>
                    {children}
                </ThemeProvider>
            </CacheProvider>
        </ThemeModeContext.Provider>
    );
};
