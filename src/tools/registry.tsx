import React from "react";
import GraphicEqIcon from "@mui/icons-material/GraphicEq";
import KeyIcon from "@mui/icons-material/Key";
import QrCodeIcon from "@mui/icons-material/QrCode";
import SearchIcon from "@mui/icons-material/Search";
import SettingsEthernetIcon from "@mui/icons-material/SettingsEthernet";
import TagIcon from "@mui/icons-material/Tag";
import TerminalIcon from "@mui/icons-material/Terminal";
import TextFieldsIcon from "@mui/icons-material/TextFields";
import TimerIcon from "@mui/icons-material/Timer";
import TravelExploreIcon from "@mui/icons-material/TravelExplore";
import type {ToolDefinition, ToolId} from "./types";

export const tools: ToolDefinition[] = [
    {
        id: "uuid",
        title: "UUID",
        description: "Batch-generate UUIDs",
        icon: <TagIcon/>,
        loader: () => import("./uuid/UuidTool")
    },
    {
        id: "password",
        title: "Password",
        description: "Generate strong passwords",
        icon: <KeyIcon/>,
        loader: () => import("./password/PasswordTool")
    },
    {
        id: "base64",
        title: "Base64",
        description: "Encode and decode text",
        icon: <TextFieldsIcon/>,
        loader: () => import("./base64/Base64Tool")
    },
    {
        id: "json",
        title: "JSON",
        description: "Format and minify JSON",
        icon: <TerminalIcon/>,
        loader: () => import("./json/JsonTool")
    },
    {
        id: "timestamp",
        title: "Timestamp",
        description: "Convert Unix time",
        icon: <TimerIcon/>,
        loader: () => import("./timestamp/TimestampTool")
    },
    {
        id: "qr",
        title: "QR Code",
        description: "Create QR codes",
        icon: <QrCodeIcon/>,
        loader: () => import("./qr/QrTool")
    },
    {
        id: "dns",
        title: "DNS",
        description: "DNS over HTTPS lookup",
        icon: <TravelExploreIcon/>,
        loader: () => import("./dns/DnsTool")
    },
    {
        id: "hash",
        title: "File Hash",
        description: "Calculate checksums",
        icon: <TagIcon/>,
        loader: () => import("./hash/HashTool")
    },
    {
        id: "ua",
        title: "User Agent",
        description: "Inspect your browser",
        icon: <SearchIcon/>,
        loader: () => import("./ua/UserAgentTool")
    },
    {
        id: "sound",
        title: "Sound",
        description: "Generate a tone",
        icon: <GraphicEqIcon/>,
        loader: () => import("./sound/SoundTool")
    },
    {
        id: "oui",
        title: "OUI Lookup",
        description: "Find MAC address vendors",
        icon: <SettingsEthernetIcon/>,
        loader: () => import("./oui/OuiTool")
    }
];

export const findTool = (toolId: ToolId | "home") => tools.find(tool => tool.id === toolId);
