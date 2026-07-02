import React from "react";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import {UAParser} from "ua-parser-js";
import {Alert, Box, Button, Paper, Stack, Tab, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Tabs, TextField} from "@mui/material";
import {copyText} from "../shared/browser";
import {ToolHeader, ToolSurface} from "../shared/ToolScaffold";

const uaExamples = [
    {browser: "Chrome", os: "Windows", value: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36"},
    {browser: "Firefox", os: "Windows", value: "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:127.0) Gecko/20100101 Firefox/127.0"},
    {browser: "Safari", os: "macOS", value: "Mozilla/5.0 (Macintosh; Intel Mac OS X 14_5) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Safari/605.1.15"},
    {browser: "Edge", os: "Windows", value: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36 Edg/126.0"},
    {browser: "Chrome", os: "Android", value: "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Mobile Safari/537.36"},
    {browser: "Safari", os: "iOS", value: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1"},
    {browser: "Googlebot", os: "-", value: "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)"}
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

const parsedRows = (result: UAParser.IResult): [string, string][] => [
    ["Browser", [result.browser.name, result.browser.version].filter(Boolean).join(" ") || "Unknown"],
    ["Browser type", result.browser.type ?? "browser"],
    ["Engine", [result.engine.name, result.engine.version].filter(Boolean).join(" ") || "Unknown"],
    ["OS", [result.os.name, result.os.version].filter(Boolean).join(" ") || "Unknown"],
    ["Device vendor", result.device.vendor ?? "Unavailable"],
    ["Device model", result.device.model ?? "Unavailable"],
    ["Device type", result.device.type ?? "desktop"],
    ["CPU architecture", result.cpu.architecture ?? "Unavailable"]
];

const UserAgentTool = () => {
    const [tab, setTab] = React.useState("mine");
    const [customUa, setCustomUa] = React.useState(uaExamples[0].value);
    const rows = navigatorRows();
    const myResult = React.useMemo(() => new UAParser(navigator.userAgent).getResult(), []);
    const customResult = React.useMemo(() => new UAParser(customUa).getResult(), [customUa]);

    return (
        <ToolSurface>
            <ToolHeader title="User Agent" description="Inspect and parse browser user-agent strings."/>
            <Stack spacing={2}>
                <Tabs value={tab} onChange={(_, value) => setTab(value)}>
                    <Tab value="mine" label="My UA"/>
                    <Tab value="parse" label="Parse UA"/>
                    <Tab value="examples" label="UA examples"/>
                </Tabs>
                {tab === "mine" && (
                    <>
                        <TextField label="navigator.userAgent" value={navigator.userAgent} multiline minRows={4} slotProps={{htmlInput: {readOnly: true}}}/>
                        <Alert severity="info">
                            Modern browsers may intentionally reduce or freeze UA details; Client Hints can also be permission/browser dependent.
                        </Alert>
                        <Button startIcon={<ContentCopyIcon/>} onClick={() => copyText(JSON.stringify({...Object.fromEntries(rows), parsed: myResult}, null, 2))}>Copy as JSON</Button>
                        <TableContainer component={Paper} variant="outlined">
                            <Table size="small">
                                <TableBody>
                                    {parsedRows(myResult).map(([label, value]) => (
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
                {tab === "parse" && (
                    <>
                        <TextField
                            label="User-Agent string to parse"
                            value={customUa}
                            onChange={event => setCustomUa(event.target.value)}
                            multiline
                            minRows={4}
                            fullWidth
                        />
                        <Button startIcon={<ContentCopyIcon/>} onClick={() => copyText(JSON.stringify(customResult, null, 2))}>Copy parsed result as JSON</Button>
                        <TableContainer component={Paper} variant="outlined">
                            <Table size="small">
                                <TableBody>
                                    {parsedRows(customResult).map(([label, value]) => (
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
                                            <Stack direction="row" spacing={1}>
                                                <Button size="small" onClick={() => copyText(example.value)}>Copy</Button>
                                                <Button size="small" onClick={() => {
                                                    setCustomUa(example.value);
                                                    setTab("parse");
                                                }}
                                                >
                                                    Parse
                                                </Button>
                                            </Stack>
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
