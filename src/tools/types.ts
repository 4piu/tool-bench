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
    | "sound";

export type ToolModule = {
    default: React.ComponentType;
};

export type ToolDefinition = {
    id: ToolId;
    title: string;
    description: string;
    icon: React.ReactNode;
    loader: () => Promise<ToolModule>;
};
