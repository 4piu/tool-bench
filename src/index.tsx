import "./global.css";
import "./lib/i18n";
import React from "react";
import {createRoot} from "react-dom/client";
import App from "./App";
import {LanguageProvider} from "./lib/language";
import {ThemeModeProvider} from "./lib/theme";

const appElement = document.getElementById("app");

if (!appElement) {
    throw new Error("Could not find app root element");
}

createRoot(appElement).render(
    <LanguageProvider>
        <ThemeModeProvider>
            <React.Suspense fallback={null}>
                <App/>
            </React.Suspense>
        </ThemeModeProvider>
    </LanguageProvider>
);
