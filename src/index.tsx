import "./global.css";
import React from "react";
import {createRoot} from "react-dom/client";
import {StyledEngineProvider} from "@mui/material/styles";
import App from "./App";
import {ThemeModeProvider} from "./lib/theme";

const appElement = document.getElementById("app");

if (!appElement) {
    throw new Error("Could not find app root element");
}

createRoot(appElement).render(
    <StyledEngineProvider injectFirst>
        <ThemeModeProvider>
            <App/>
        </ThemeModeProvider>
    </StyledEngineProvider>
);
