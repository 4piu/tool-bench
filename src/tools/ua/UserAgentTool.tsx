import React from "react";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import {UAParser} from "ua-parser-js";
import {Alert, Box, Button, Paper, Stack, Tab, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Tabs, TextField} from "@mui/material";
import {useTranslation} from "react-i18next";
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

const UserAgentTool = () => {
    const {t} = useTranslation();
    const [tab, setTab] = React.useState("mine");
    const [customUa, setCustomUa] = React.useState(uaExamples[0].value);

    const navigatorRows = () => {
        const nav = navigator as Navigator & {
            deviceMemory?: number;
            userAgentData?: unknown;
        };
        return [
            [t("ua.field.userAgent"), nav.userAgent],
            [t("ua.field.platform"), nav.platform],
            [t("ua.field.language"), nav.language],
            [t("ua.field.languages"), nav.languages?.join(", ") ?? ""],
            [t("ua.field.cookiesEnabled"), String(nav.cookieEnabled)],
            [t("ua.field.online"), String(nav.onLine)],
            [t("ua.field.hardwareConcurrency"), String(nav.hardwareConcurrency ?? "")],
            [t("ua.field.deviceMemory"), nav.deviceMemory ? `${nav.deviceMemory} GB` : t("ua.unavailable")],
            [t("ua.field.maxTouchPoints"), String(nav.maxTouchPoints ?? "")],
            [t("ua.field.doNotTrack"), nav.doNotTrack ?? t("ua.unavailable")],
            [t("ua.field.clientHints"), nav.userAgentData ? JSON.stringify(nav.userAgentData) : t("ua.unavailable")]
        ];
    };

    const parsedRows = (result: UAParser.IResult): [string, string][] => [
        [t("ua.field.browser"), [result.browser.name, result.browser.version].filter(Boolean).join(" ") || t("ua.unknown")],
        [t("ua.field.browserType"), result.browser.type ?? t("ua.field.browserTypeDefault")],
        [t("ua.field.engine"), [result.engine.name, result.engine.version].filter(Boolean).join(" ") || t("ua.unknown")],
        [t("ua.field.os"), [result.os.name, result.os.version].filter(Boolean).join(" ") || t("ua.unknown")],
        [t("ua.field.deviceVendor"), result.device.vendor ?? t("ua.unavailable")],
        [t("ua.field.deviceModel"), result.device.model ?? t("ua.unavailable")],
        [t("ua.field.deviceType"), result.device.type ?? t("ua.field.deviceTypeDefault")],
        [t("ua.field.cpuArchitecture"), result.cpu.architecture ?? t("ua.unavailable")]
    ];

    const rows = navigatorRows();
    const myResult = React.useMemo(() => new UAParser(navigator.userAgent).getResult(), []);
    const customResult = React.useMemo(() => new UAParser(customUa).getResult(), [customUa]);

    return (
        <ToolSurface>
            <ToolHeader title={t("ua.title")} description={t("ua.description")}/>
            <Stack spacing={2}>
                <Tabs value={tab} onChange={(_, value) => setTab(value)}>
                    <Tab value="mine" label={t("ua.tab.mine")}/>
                    <Tab value="parse" label={t("ua.tab.parse")}/>
                    <Tab value="examples" label={t("ua.tab.examples")}/>
                </Tabs>
                {tab === "mine" && (
                    <>
                        <TextField label="navigator.userAgent" value={navigator.userAgent} multiline minRows={4} slotProps={{htmlInput: {readOnly: true}}}/>
                        <Alert severity="info">
                            {t("ua.freezeNotice")}
                        </Alert>
                        <Button startIcon={<ContentCopyIcon/>} onClick={() => copyText(JSON.stringify({...Object.fromEntries(rows), parsed: myResult}, null, 2))}>{t("ua.copyAsJson")}</Button>
                        <TableContainer component={Paper} variant="outlined">
                            <Table size="small">
                                <TableBody>
                                    {parsedRows(myResult).map(([label, value]) => (
                                        <TableRow key={label}>
                                            <TableCell sx={{fontWeight: 700, width: 220}}>{t("ua.parsedLabel", {label})}</TableCell>
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
                            label={t("ua.parseInputLabel")}
                            value={customUa}
                            onChange={event => setCustomUa(event.target.value)}
                            multiline
                            minRows={4}
                            fullWidth
                        />
                        <Button startIcon={<ContentCopyIcon/>} onClick={() => copyText(JSON.stringify(customResult, null, 2))}>{t("ua.copyParsedAsJson")}</Button>
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
                                    <TableCell>{t("ua.column.browser")}</TableCell>
                                    <TableCell>{t("ua.column.os")}</TableCell>
                                    <TableCell>{t("ua.column.userAgent")}</TableCell>
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
                                                <Button size="small" onClick={() => copyText(example.value)}>{t("toolScaffold.copy")}</Button>
                                                <Button size="small" onClick={() => {
                                                    setCustomUa(example.value);
                                                    setTab("parse");
                                                }}
                                                >
                                                    {t("ua.parse")}
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
