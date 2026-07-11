import React from "react";
import CableIcon from "@mui/icons-material/Cable";
import CurrencyExchangeIcon from "@mui/icons-material/CurrencyExchange";
import EqualizerIcon from "@mui/icons-material/Equalizer";
import ExploreIcon from "@mui/icons-material/Explore";
import GpsFixedIcon from "@mui/icons-material/GpsFixed";
import GraphicEqIcon from "@mui/icons-material/GraphicEq";
import KeyIcon from "@mui/icons-material/Key";
import LanIcon from "@mui/icons-material/Lan";
import QrCodeIcon from "@mui/icons-material/QrCode";
import SearchIcon from "@mui/icons-material/Search";
import SettingsEthernetIcon from "@mui/icons-material/SettingsEthernet";
import SsidChartIcon from "@mui/icons-material/SsidChart";
import StraightenIcon from "@mui/icons-material/Straighten";
import TagIcon from "@mui/icons-material/Tag";
import TerminalIcon from "@mui/icons-material/Terminal";
import TextFieldsIcon from "@mui/icons-material/TextFields";
import TimerIcon from "@mui/icons-material/Timer";
import TravelExploreIcon from "@mui/icons-material/TravelExplore";
import type {ToolDefinition, ToolId} from "./types";

export const tools: ToolDefinition[] = [
    {
        id: "uuid",
        titleKey: "tools.uuid.title",
        descriptionKey: "tools.uuid.description",
        icon: <TagIcon/>,
        loader: () => import("./uuid/UuidTool")
    },
    {
        id: "password",
        titleKey: "tools.password.title",
        descriptionKey: "tools.password.description",
        icon: <KeyIcon/>,
        loader: () => import("./password/PasswordTool")
    },
    {
        id: "base64",
        titleKey: "tools.base64.title",
        descriptionKey: "tools.base64.description",
        icon: <TextFieldsIcon/>,
        loader: () => import("./base64/Base64Tool")
    },
    {
        id: "json",
        titleKey: "tools.json.title",
        descriptionKey: "tools.json.description",
        icon: <TerminalIcon/>,
        loader: () => import("./json/JsonTool")
    },
    {
        id: "timestamp",
        titleKey: "tools.timestamp.title",
        descriptionKey: "tools.timestamp.description",
        icon: <TimerIcon/>,
        loader: () => import("./timestamp/TimestampTool")
    },
    {
        id: "qr",
        titleKey: "tools.qr.title",
        descriptionKey: "tools.qr.description",
        icon: <QrCodeIcon/>,
        loader: () => import("./qr/QrTool")
    },
    {
        id: "dns",
        titleKey: "tools.dns.title",
        descriptionKey: "tools.dns.description",
        icon: <TravelExploreIcon/>,
        loader: () => import("./dns/DnsTool")
    },
    {
        id: "hash",
        titleKey: "tools.hash.title",
        descriptionKey: "tools.hash.description",
        icon: <TagIcon/>,
        loader: () => import("./hash/HashTool")
    },
    {
        id: "ua",
        titleKey: "tools.ua.title",
        descriptionKey: "tools.ua.description",
        icon: <SearchIcon/>,
        loader: () => import("./ua/UserAgentTool")
    },
    {
        id: "sound",
        titleKey: "tools.sound.title",
        descriptionKey: "tools.sound.description",
        icon: <GraphicEqIcon/>,
        loader: () => import("./sound/SoundTool")
    },
    {
        id: "noise",
        titleKey: "tools.noise.title",
        descriptionKey: "tools.noise.description",
        icon: <EqualizerIcon/>,
        loader: () => import("./noise/NoiseTool")
    },
    {
        id: "ruler",
        titleKey: "tools.ruler.title",
        descriptionKey: "tools.ruler.description",
        icon: <StraightenIcon/>,
        loader: () => import("./ruler/RulerTool"),
        fullBleed: true
    },
    {
        id: "angle",
        titleKey: "tools.angle.title",
        descriptionKey: "tools.angle.description",
        icon: <ExploreIcon/>,
        loader: () => import("./angle/AngleTool"),
        fullBleed: true
    },
    {
        id: "level",
        titleKey: "tools.level.title",
        descriptionKey: "tools.level.description",
        icon: <GpsFixedIcon/>,
        loader: () => import("./level/LevelTool")
    },
    {
        id: "spectrum",
        titleKey: "tools.spectrum.title",
        descriptionKey: "tools.spectrum.description",
        icon: <SsidChartIcon/>,
        loader: () => import("./spectrum/SpectrumTool"),
        fullBleed: true
    },
    {
        id: "oui",
        titleKey: "tools.oui.title",
        descriptionKey: "tools.oui.description",
        icon: <SettingsEthernetIcon/>,
        loader: () => import("./oui/OuiTool")
    },
    {
        id: "cidr",
        titleKey: "tools.cidr.title",
        descriptionKey: "tools.cidr.description",
        icon: <LanIcon/>,
        loader: () => import("./cidr/CidrTool")
    },
    {
        id: "currency",
        titleKey: "tools.currency.title",
        descriptionKey: "tools.currency.description",
        icon: <CurrencyExchangeIcon/>,
        loader: () => import("./currency/CurrencyTool")
    },
    {
        id: "serial",
        titleKey: "tools.serial.title",
        descriptionKey: "tools.serial.description",
        icon: <CableIcon/>,
        loader: () => import("./serial/SerialTool")
    }
];

export const findTool = (toolId: ToolId | "home") => tools.find(tool => tool.id === toolId);
