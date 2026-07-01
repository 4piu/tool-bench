import React from "react";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import {Alert, Box, Button, Paper, Stack, Tab, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Tabs, TextField} from "@mui/material";
import {copyText} from "../shared/browser";
import {ToolHeader, ToolSurface} from "../shared/ToolScaffold";

const uaExamples = [
    {browser: "Chrome", os: "Windows", value: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36"},
    {browser: "Firefox", os: "Windows", value: "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:127.0) Gecko/20100101 Firefox/127.0"},
    {browser: "Safari", os: "macOS", value: "Mozilla/5.0 (Macintosh; Intel Mac OS X 14_5) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Safari/605.1.15"},
    {browser: "Edge", os: "Windows", value: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36 Edg/126.0"}
];

const navigatorRows = () => {
    const nav = navigator as Navigator & {
        deviceMemory?: number;
        userAgentData?: unknown;
    };
    return [
        ["User agent", nav.userAgent],
        ["Platform", nav.platform],
        ["Language", nav.language],
        ["Languages", nav.languages?.join(", ") ?? ""],
        ["Cookies enabled", String(nav.cookieEnabled)],
        ["Online", String(nav.onLine)],
        ["Hardware concurrency", String(nav.hardwareConcurrency ?? "")],
        ["Device memory", nav.deviceMemory ? `${nav.deviceMemory} GB` : "Unavailable"],
        ["Max touch points", String(nav.maxTouchPoints ?? "")],
        ["Do not track", nav.doNotTrack ?? "Unavailable"],
        ["User-Agent Client Hints", nav.userAgentData ? JSON.stringify(nav.userAgentData) : "Unavailable"]
    ];
};

const parseUserAgent = (userAgent: string) => {
    const browser = userAgent.includes("Edg/")
        ? "Microsoft Edge"
        : userAgent.includes("Firefox/")
            ? "Firefox"
            : userAgent.includes("Chrome/")
                ? "Chrome / Chromium"
                : userAgent.includes("Safari/")
                    ? "Safari"
                    : "Unknown";
    const os = userAgent.includes("Windows NT")
        ? "Windows"
        : userAgent.includes("Mac OS X")
            ? "macOS"
            : userAgent.includes("Android")
                ? "Android"
                : userAgent.includes("iPhone") || userAgent.includes("iPad")
                    ? "iOS / iPadOS"
                    : userAgent.includes("Linux")
                        ? "Linux"
                        : "Unknown";
    const engine = userAgent.includes("Gecko/") && userAgent.includes("Firefox/")
        ? "Gecko"
        : userAgent.includes("AppleWebKit/")
            ? "WebKit/Blink"
            : "Unknown";
    return {
        browser,
        os,
        engine,
        mobile: /Mobi|Android|iPhone|iPad/i.test(userAgent) ? "Likely mobile/tablet" : "Likely desktop"
    };
};

const UserAgentTool = () => {
    const [tab, setTab] = React.useState("mine");
    const rows = navigatorRows();
    const summary = parseUserAgent(navigator.userAgent);

    return (
        <ToolSurface>
            <ToolHeader title="User Agent" description="Inspect browser user-agent and navigator data."/>
            <Stack spacing={2}>
                <Tabs value={tab} onChange={(_, value) => setTab(value)}>
                    <Tab value="mine" label="My UA"/>
                    <Tab value="examples" label="UA examples"/>
                </Tabs>
                {tab === "mine" && (
                    <>
                        <TextField label="navigator.userAgent" value={navigator.userAgent} multiline minRows={4} slotProps={{htmlInput: {readOnly: true}}}/>
                        <Alert severity="info">
                            Parsed summary: {summary.browser} on {summary.os}, engine {summary.engine}, {summary.mobile.toLowerCase()}.
                            Modern browsers may intentionally reduce or freeze UA details; Client Hints can also be permission/browser dependent.
                        </Alert>
                        <Button startIcon={<ContentCopyIcon/>} onClick={() => copyText(JSON.stringify({...Object.fromEntries(rows), summary}, null, 2))}>Copy as JSON</Button>
                        <TableContainer component={Paper} variant="outlined">
                            <Table size="small">
                                <TableBody>
                                    {Object.entries(summary).map(([label, value]) => (
                                        <TableRow key={label}>
                                            <TableCell sx={{fontWeight: 700, width: 220}}>Parsed {label}</TableCell>
                                            <TableCell sx={{wordBreak: "break-all"}}>{value}</TableCell>
                                        </TableRow>
                                    ))}
                                    {rows.map(([label, value]) => (
                                        <TableRow key={label}>
                                            <TableCell sx={{fontWeight: 700, width: 220}}>{label}</TableCell>
                                            <TableCell sx={{wordBreak: "break-all"}}>{value}</TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </TableContainer>
                    </>
                )}
                {tab === "examples" && (
                    <TableContainer component={Paper} variant="outlined">
                        <Table size="small">
                            <TableHead>
                                <TableRow>
                                    <TableCell>Browser</TableCell>
                                    <TableCell>OS</TableCell>
                                    <TableCell>User agent</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {uaExamples.map(example => (
                                    <TableRow key={`${example.browser}-${example.os}`}>
                                        <TableCell>{example.browser}</TableCell>
                                        <TableCell>{example.os}</TableCell>
                                        <TableCell sx={{wordBreak: "break-all"}}>
                                            <Box>{example.value}</Box>
                                            <Button size="small" onClick={() => copyText(example.value)}>Copy</Button>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </TableContainer>
                )}
            </Stack>
        </ToolSurface>
    );
};

export default UserAgentTool;
