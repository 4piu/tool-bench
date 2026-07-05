import type React from "react";

export type ToolId =
    | "uuid"
    | "password"
    | "base64"
    | "json"
    | "timestamp"
    | "qr"
    | "dns"
    | "hash"
    | "ua"
    | "sound"
    | "noise"
    | "ruler"
    | "angle"
    | "level"
    | "spectrum"
    | "oui";

export type ToolModule = {
    default: React.ComponentType;
};

export type ToolDefinition = {
    id: ToolId;
    titleKey: string;
    descriptionKey: string;
    icon: React.ReactNode;
    loader: () => Promise<ToolModule>;
    fullBleed?: boolean;
};
