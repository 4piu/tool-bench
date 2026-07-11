import React from "react";
import {FitAddon} from "@xterm/addon-fit";
import {Terminal} from "@xterm/xterm";
import "@xterm/xterm/css/xterm.css";
import CableIcon from "@mui/icons-material/Cable";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutlineOutlined";
import LinkOffIcon from "@mui/icons-material/LinkOff";
import SendIcon from "@mui/icons-material/Send";
import SettingsIcon from "@mui/icons-material/Settings";
import {
    Alert,
    Box,
    Button,
    Chip,
    Container,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    IconButton,
    MenuItem,
    Paper,
    Stack,
    Tab,
    Tabs,
    TextField,
    ToggleButton,
    ToggleButtonGroup,
    Tooltip,
    Typography,
    useMediaQuery
} from "@mui/material";
import {useTheme} from "@mui/material/styles";
import {useTranslation} from "react-i18next";
import {useLocalStorageState} from "../shared/hooks";
import {ToolHeader} from "../shared/ToolScaffold";

type SupportState = "checking" | "unsupported" | "insecure" | "ready";
type Mode = "command" | "terminal";
type LineEnding = "none" | "lf" | "cr" | "crlf";
type LogType = "tx" | "rx" | "info";
type LogEntry = { id: number; type: LogType; text: string; timestamp: number };
type TerminalSizePreset = "fit" | "80x24" | "100x30" | "120x30" | "132x24" | "custom";
type FontOptionId = "system" | "jetbrains-mono" | "fira-code" | "source-code-pro" | "ibm-plex-mono" | "space-mono" | "roboto-mono";
type FontOption = { id: FontOptionId; label: string; stack: string; loader?: () => Promise<unknown> };
type SettingsTab = "serial" | "font";

type SerialSettings = {
    baudRate: number;
    dataBits: 7 | 8;
    stopBits: 1 | 2;
    parity: "none" | "even" | "odd";
    flowControl: "none" | "hardware";
};

const BAUD_RATE_PRESETS = [300, 1200, 2400, 4800, 9600, 19200, 38400, 57600, 115200, 230400, 460800, 921600];
const DEFAULT_SETTINGS: SerialSettings = {baudRate: 115200, dataBits: 8, stopBits: 1, parity: "none", flowControl: "none"};
const LINE_ENDING_BYTES: Record<LineEnding, string> = {none: "", lf: "\n", cr: "\r", crlf: "\r\n"};
const MAX_LOG_ENTRIES = 2000;
const LOG_FLUSH_INTERVAL_MS = 50;

const TERMINAL_SIZE_PRESETS: {id: TerminalSizePreset; cols?: number; rows?: number}[] = [
    {id: "fit"},
    {id: "80x24", cols: 80, rows: 24},
    {id: "100x30", cols: 100, rows: 30},
    {id: "120x30", cols: 120, rows: 30},
    {id: "132x24", cols: 132, rows: 24},
    {id: "custom"}
];
const MIN_TERMINAL_COLS = 20;
const MAX_TERMINAL_COLS = 300;
const MIN_TERMINAL_ROWS = 5;
const MAX_TERMINAL_ROWS = 100;
const DEFAULT_CUSTOM_COLS = 80;
const DEFAULT_CUSTOM_ROWS = 24;

const FONT_OPTIONS: FontOption[] = [
    {id: "system", label: "System Monospace", stack: "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace"},
    {id: "jetbrains-mono", label: "JetBrains Mono", stack: '"JetBrains Mono", monospace', loader: () => import("@fontsource/jetbrains-mono/400.css")},
    {id: "fira-code", label: "Fira Code", stack: '"Fira Code", monospace', loader: () => import("@fontsource/fira-code/400.css")},
    {id: "source-code-pro", label: "Source Code Pro", stack: '"Source Code Pro", monospace', loader: () => import("@fontsource/source-code-pro/400.css")},
    {id: "ibm-plex-mono", label: "IBM Plex Mono", stack: '"IBM Plex Mono", monospace', loader: () => import("@fontsource/ibm-plex-mono/400.css")},
    {id: "space-mono", label: "Space Mono", stack: '"Space Mono", monospace', loader: () => import("@fontsource/space-mono/400.css")},
    {id: "roboto-mono", label: "Roboto Mono", stack: '"Roboto Mono", monospace', loader: () => import("@fontsource/roboto-mono/400.css")}
];
const FONT_SIZE_OPTIONS = [11, 12, 13, 14, 16, 18, 20, 24];
const DEFAULT_FONT_SIZE = 13;

// The widest inline row (font + terminal size + custom cols/rows) needs ~756px to avoid
// wrapping to a second line; below this, switch to the compact/dialog-based layout instead
// of letting controls wrap awkwardly.
const COMPACT_LAYOUT_BREAKPOINT_PX = 800;
const MIN_FIT_TERMINAL_HEIGHT_PX = 300;

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

const formatTimestamp = (timestamp: number) => {
    const date = new Date(timestamp);
    const pad = (value: number, size = 2) => value.toString().padStart(size, "0");
    return `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}.${pad(date.getMilliseconds(), 3)}`;
};

let nextLogId = 0;

const SerialTool = () => {
    const {t} = useTranslation();
    const theme = useTheme();
    const isSmallScreen = useMediaQuery(theme.breakpoints.down(COMPACT_LAYOUT_BREAKPOINT_PX));
    const [supportState, setSupportState] = React.useState<SupportState>("checking");
    const [connected, setConnected] = React.useState(false);
    const [connecting, setConnecting] = React.useState(false);
    const [error, setError] = React.useState<string | null>(null);
    const [settings, setSettings] = useLocalStorageState<SerialSettings>("serial.settings", DEFAULT_SETTINGS);
    const [mode, setMode] = useLocalStorageState<Mode>("serial.mode", "terminal");
    const [lineEnding, setLineEnding] = useLocalStorageState<LineEnding>("serial.lineEnding", "lf");
    const [log, setLog] = React.useState<LogEntry[]>([]);
    const [inputValue, setInputValue] = React.useState("");
    const [terminalSizePreset, setTerminalSizePreset] = useLocalStorageState<TerminalSizePreset>("serial.terminalSizePreset", "fit");
    const [customCols, setCustomCols] = useLocalStorageState<number>("serial.terminalCustomCols", DEFAULT_CUSTOM_COLS);
    const [customRows, setCustomRows] = useLocalStorageState<number>("serial.terminalCustomRows", DEFAULT_CUSTOM_ROWS);
    const [fontFamilyId, setFontFamilyId] = useLocalStorageState<FontOptionId>("serial.fontFamily", "system");
    const [fontSize, setFontSize] = useLocalStorageState<number>("serial.fontSize", DEFAULT_FONT_SIZE);
    const [terminalReady, setTerminalReady] = React.useState(false);
    const [settingsOpen, setSettingsOpen] = React.useState(false);
    const [settingsTab, setSettingsTab] = React.useState<SettingsTab>("serial");

    const portRef = React.useRef<SerialPort | null>(null);
    const readerRef = React.useRef<ReadableStreamDefaultReader<Uint8Array> | null>(null);
    const decoderRef = React.useRef(new TextDecoder());
    const pendingLineRef = React.useRef("");
    const pendingLogRef = React.useRef<LogEntry[]>([]);
    const flushTimerRef = React.useRef<number | null>(null);
    const terminalContainerRef = React.useRef<HTMLDivElement | null>(null);
    const terminalRef = React.useRef<Terminal | null>(null);
    const fitAddonRef = React.useRef<FitAddon | null>(null);
    const logScrollRef = React.useRef<HTMLDivElement | null>(null);
    const terminalSizePresetRef = React.useRef(terminalSizePreset);

    React.useEffect(() => {
        terminalSizePresetRef.current = terminalSizePreset;
    }, [terminalSizePreset]);

    React.useEffect(() => {
        if (!window.isSecureContext) {
            setSupportState("insecure");
        } else if (!navigator.serial) {
            setSupportState("unsupported");
        } else {
            setSupportState("ready");
        }
    }, []);

    const flushLog = React.useCallback(() => {
        if (pendingLogRef.current.length === 0) return;
        const pending = pendingLogRef.current;
        pendingLogRef.current = [];
        setLog(current => {
            const next = [...current, ...pending];
            return next.length > MAX_LOG_ENTRIES ? next.slice(next.length - MAX_LOG_ENTRIES) : next;
        });
    }, []);

    const queueLog = React.useCallback((type: LogType, text: string) => {
        pendingLogRef.current.push({id: nextLogId++, type, text, timestamp: Date.now()});
        if (flushTimerRef.current === null) {
            flushTimerRef.current = window.setTimeout(() => {
                flushTimerRef.current = null;
                flushLog();
            }, LOG_FLUSH_INTERVAL_MS);
        }
    }, [flushLog]);

    React.useEffect(() => () => {
        if (flushTimerRef.current !== null) window.clearTimeout(flushTimerRef.current);
    }, []);

    React.useEffect(() => {
        if (!logScrollRef.current) return;
        logScrollRef.current.scrollTop = logScrollRef.current.scrollHeight;
    }, [log]);

    const writeToPort = React.useCallback(async (text: string) => {
        const writable = portRef.current?.writable;
        if (!writable) return;
        const writer = writable.getWriter();
        try {
            await writer.write(new TextEncoder().encode(text));
        } finally {
            writer.releaseLock();
        }
    }, []);

    React.useEffect(() => {
        if (!terminalContainerRef.current) return;
        const initialFont = FONT_OPTIONS.find(option => option.id === fontFamilyId) ?? FONT_OPTIONS[0];
        const terminal = new Terminal({cursorBlink: true, convertEol: true, fontSize, fontFamily: initialFont.stack});
        const fitAddon = new FitAddon();
        terminal.loadAddon(fitAddon);
        terminal.open(terminalContainerRef.current);
        fitAddon.fit();
        terminal.onData(data => {
            void writeToPort(data);
        });
        terminalRef.current = terminal;
        fitAddonRef.current = fitAddon;
        setTerminalReady(true);

        const resizeObserver = new ResizeObserver(() => {
            if (terminalSizePresetRef.current === "fit") fitAddon.fit();
        });
        resizeObserver.observe(terminalContainerRef.current);

        return () => {
            resizeObserver.disconnect();
            terminal.dispose();
            terminalRef.current = null;
            fitAddonRef.current = null;
            setTerminalReady(false);
        };
    }, [writeToPort, supportState]);

    React.useEffect(() => {
        if (!terminalReady) return;
        const terminal = terminalRef.current;
        const fitAddon = fitAddonRef.current;
        if (!terminal || !fitAddon) return;
        if (terminalSizePreset === "fit") {
            fitAddon.fit();
            return;
        }
        const preset = TERMINAL_SIZE_PRESETS.find(item => item.id === terminalSizePreset);
        const cols = terminalSizePreset === "custom" ? customCols : preset?.cols;
        const rows = terminalSizePreset === "custom" ? customRows : preset?.rows;
        if (cols && rows) terminal.resize(cols, rows);
    }, [terminalReady, terminalSizePreset, customCols, customRows]);

    React.useEffect(() => {
        if (!terminalReady) return;
        const terminal = terminalRef.current;
        if (!terminal) return;
        const option = FONT_OPTIONS.find(item => item.id === fontFamilyId) ?? FONT_OPTIONS[0];
        let cancelled = false;

        const applyFont = async () => {
            if (option.loader) {
                await option.loader();
                try {
                    await document.fonts.load(`${fontSize}px ${option.stack}`);
                } catch {
                    // best-effort font preload; xterm still renders with fallback if this fails
                }
            }
            if (cancelled) return;
            terminal.options.fontFamily = option.stack;
            terminal.options.fontSize = fontSize;
            if (terminalSizePresetRef.current === "fit") fitAddonRef.current?.fit();
        };
        void applyFont();

        return () => {
            cancelled = true;
        };
    }, [terminalReady, fontFamilyId, fontSize]);

    React.useEffect(() => {
        if (mode === "terminal" && terminalSizePreset === "fit" && fitAddonRef.current) {
            requestAnimationFrame(() => fitAddonRef.current?.fit());
        }
    }, [mode, terminalSizePreset]);

    const handleIncomingData = React.useCallback((bytes: Uint8Array) => {
        terminalRef.current?.write(bytes);

        const text = decoderRef.current.decode(bytes, {stream: true});
        const combined = pendingLineRef.current + text;
        const lines = combined.split("\n");
        pendingLineRef.current = lines.pop() ?? "";
        for (const line of lines) {
            queueLog("rx", line.replace(/\r$/, ""));
        }
    }, [queueLog]);

    const disconnect = React.useCallback(async () => {
        try {
            await readerRef.current?.cancel();
        } catch {
            // reader may already be closed
        }
        readerRef.current = null;

        try {
            await portRef.current?.close();
        } catch {
            // port may already be closed
        }
        portRef.current = null;
        setConnected(false);
    }, []);

    const readLoop = React.useCallback(async (port: SerialPort) => {
        const readable = port.readable;
        if (!readable) return;
        const reader = readable.getReader();
        readerRef.current = reader;
        try {
            for (; ;) {
                const {value, done} = await reader.read();
                if (done) break;
                if (value) handleIncomingData(value);
            }
        } catch {
            queueLog("info", t("serial.readError"));
        } finally {
            try {
                reader.releaseLock();
            } catch {
                // ignore
            }
            if (portRef.current === port) await disconnect();
        }
    }, [disconnect, handleIncomingData, queueLog, t]);

    const connect = async () => {
        setError(null);
        setConnecting(true);
        try {
            const port = await navigator.serial!.requestPort();
            await port.open({
                baudRate: settings.baudRate,
                dataBits: settings.dataBits,
                stopBits: settings.stopBits,
                parity: settings.parity,
                flowControl: settings.flowControl
            });
            portRef.current = port;
            setConnected(true);
            pendingLineRef.current = "";
            decoderRef.current = new TextDecoder();
            queueLog("info", t("serial.connected"));
            void readLoop(port);
        } catch (err) {
            if (!(err instanceof Error) || err.name !== "NotFoundError") {
                setError(err instanceof Error ? err.message : String(err));
            }
        } finally {
            setConnecting(false);
        }
    };

    React.useEffect(() => {
        const serial = navigator.serial;
        if (!serial) return;
        const handleDisconnect = (event: Event) => {
            if (event.target !== portRef.current) return;
            queueLog("info", t("serial.deviceDisconnected"));
            void disconnect();
        };
        serial.addEventListener("disconnect", handleDisconnect);
        return () => serial.removeEventListener("disconnect", handleDisconnect);
    }, [disconnect, queueLog, t]);

    React.useEffect(() => () => {
        void disconnect();
    }, [disconnect]);

    const sendCommand = async () => {
        if (!inputValue || !connected) return;
        const ending = LINE_ENDING_BYTES[lineEnding];
        queueLog("tx", inputValue);
        flushLog();
        await writeToPort(inputValue + ending);
        setInputValue("");
    };

    const clearLog = () => {
        setLog([]);
        pendingLogRef.current = [];
        terminalRef.current?.clear();
    };

    const logColor = (type: LogType) => (type === "tx" ? "info.main" : type === "info" ? "text.disabled" : "text.primary");

    if (supportState === "checking") return null;

    const isFitMode = terminalSizePreset === "fit";

    const connectionFields = (
        <>
            <TextField
                select
                size="small"
                label={t("serial.baudRate")}
                value={settings.baudRate}
                disabled={connected}
                onChange={event => setSettings(current => ({...current, baudRate: Number(event.target.value)}))}
                fullWidth={isSmallScreen}
                sx={isSmallScreen ? undefined : {minWidth: 120}}
            >
                {BAUD_RATE_PRESETS.map(rate => <MenuItem key={rate} value={rate}>{rate}</MenuItem>)}
            </TextField>
            <TextField
                select
                size="small"
                label={t("serial.dataBits")}
                value={settings.dataBits}
                disabled={connected}
                onChange={event => setSettings(current => ({...current, dataBits: Number(event.target.value) as 7 | 8}))}
                fullWidth={isSmallScreen}
                sx={isSmallScreen ? undefined : {minWidth: 90}}
            >
                <MenuItem value={8}>8</MenuItem>
                <MenuItem value={7}>7</MenuItem>
            </TextField>
            <TextField
                select
                size="small"
                label={t("serial.parity")}
                value={settings.parity}
                disabled={connected}
                onChange={event => setSettings(current => ({...current, parity: event.target.value as SerialSettings["parity"]}))}
                fullWidth={isSmallScreen}
                sx={isSmallScreen ? undefined : {minWidth: 110}}
            >
                <MenuItem value="none">{t("serial.parityNone")}</MenuItem>
                <MenuItem value="even">{t("serial.parityEven")}</MenuItem>
                <MenuItem value="odd">{t("serial.parityOdd")}</MenuItem>
            </TextField>
            <TextField
                select
                size="small"
                label={t("serial.stopBits")}
                value={settings.stopBits}
                disabled={connected}
                onChange={event => setSettings(current => ({...current, stopBits: Number(event.target.value) as 1 | 2}))}
                fullWidth={isSmallScreen}
                sx={isSmallScreen ? undefined : {minWidth: 90}}
            >
                <MenuItem value={1}>1</MenuItem>
                <MenuItem value={2}>2</MenuItem>
            </TextField>
            <TextField
                select
                size="small"
                label={t("serial.flowControl")}
                value={settings.flowControl}
                disabled={connected}
                onChange={event => setSettings(current => ({...current, flowControl: event.target.value as SerialSettings["flowControl"]}))}
                fullWidth={isSmallScreen}
                sx={isSmallScreen ? undefined : {minWidth: 130}}
            >
                <MenuItem value="none">{t("serial.flowControlNone")}</MenuItem>
                <MenuItem value="hardware">{t("serial.flowControlHardware")}</MenuItem>
            </TextField>
        </>
    );

    const currentFontOption = FONT_OPTIONS.find(option => option.id === fontFamilyId) ?? FONT_OPTIONS[0];

    const fontFields = (
        <>
            <TextField
                select
                size="small"
                label={t("serial.fontFamily")}
                value={fontFamilyId}
                onChange={event => setFontFamilyId(event.target.value as FontOptionId)}
                fullWidth={isSmallScreen}
                sx={isSmallScreen ? undefined : {minWidth: 170}}
            >
                {FONT_OPTIONS.map(option => <MenuItem key={option.id} value={option.id}>{option.label}</MenuItem>)}
            </TextField>
            <TextField
                select
                size="small"
                label={t("serial.fontSize")}
                value={fontSize}
                onChange={event => setFontSize(Number(event.target.value))}
                fullWidth={isSmallScreen}
                sx={isSmallScreen ? undefined : {minWidth: 90}}
            >
                {FONT_SIZE_OPTIONS.map(size => <MenuItem key={size} value={size}>{size}</MenuItem>)}
            </TextField>
        </>
    );

    const terminalSizeFields = (
        <>
            <TextField
                select
                size="small"
                label={t("serial.terminalSize")}
                value={terminalSizePreset}
                onChange={event => setTerminalSizePreset(event.target.value as TerminalSizePreset)}
                fullWidth={isSmallScreen}
                sx={isSmallScreen ? undefined : {minWidth: 150}}
            >
                <MenuItem value="fit">{t("serial.terminalSizeFit")}</MenuItem>
                <MenuItem value="80x24">80 × 24</MenuItem>
                <MenuItem value="100x30">100 × 30</MenuItem>
                <MenuItem value="120x30">120 × 30</MenuItem>
                <MenuItem value="132x24">132 × 24</MenuItem>
                <MenuItem value="custom">{t("serial.terminalSizeCustom")}</MenuItem>
            </TextField>
            {terminalSizePreset === "custom" && (
                <>
                    <TextField
                        size="small"
                        type="number"
                        label={t("serial.cols")}
                        value={customCols}
                        onChange={event => setCustomCols(clamp(Number(event.target.value) || DEFAULT_CUSTOM_COLS, MIN_TERMINAL_COLS, MAX_TERMINAL_COLS))}
                        fullWidth={isSmallScreen}
                        sx={isSmallScreen ? undefined : {width: 90}}
                    />
                    <TextField
                        size="small"
                        type="number"
                        label={t("serial.rows")}
                        value={customRows}
                        onChange={event => setCustomRows(clamp(Number(event.target.value) || DEFAULT_CUSTOM_ROWS, MIN_TERMINAL_ROWS, MAX_TERMINAL_ROWS))}
                        fullWidth={isSmallScreen}
                        sx={isSmallScreen ? undefined : {width: 90}}
                    />
                </>
            )}
        </>
    );

    const shrinkWrapCard = !isSmallScreen && !isFitMode;
    const fillViewport = mode === "terminal" && isFitMode;

    const body = (
        <>
            <ToolHeader title={t("tools.serial.title")} description={t("tools.serial.description")}/>

            {supportState === "insecure" && <Alert severity="warning">{t("serial.insecureContext")}</Alert>}
            {supportState === "unsupported" && <Alert severity="warning">{t("serial.unsupported")}</Alert>}

            {supportState === "ready" && (
                <Stack spacing={2} sx={fillViewport ? {flex: 1, minHeight: 0} : undefined}>
                    {error && <Alert severity="error" onClose={() => setError(null)}>{error}</Alert>}

                    {!isSmallScreen && (
                        <Stack direction="row" spacing={1} useFlexGap sx={{flexWrap: "wrap", alignItems: "center"}}>
                            {connectionFields}
                        </Stack>
                    )}

                    {!isSmallScreen && (
                        <Stack direction="row" spacing={1.5} useFlexGap sx={{flexWrap: "wrap", alignItems: "center"}}>
                            {fontFields}
                            {mode === "terminal" && terminalSizeFields}
                        </Stack>
                    )}

                    <Stack direction="row" spacing={1} useFlexGap sx={{flexWrap: "wrap", alignItems: "center", justifyContent: "space-between"}}>
                        <Stack direction="row" spacing={1} sx={{alignItems: "center"}}>
                            {connected ? (
                                <Button variant="outlined" color="error" startIcon={<LinkOffIcon/>} onClick={() => void disconnect()}>
                                    {t("serial.disconnect")}
                                </Button>
                            ) : (
                                <Button variant="contained" startIcon={<CableIcon/>} onClick={() => void connect()} disabled={connecting}>
                                    {t("serial.connect")}
                                </Button>
                            )}
                            <Chip
                                size="small"
                                label={connected ? t("serial.statusConnected") : t("serial.statusDisconnected")}
                                color={connected ? "success" : "default"}
                                variant="outlined"
                            />
                            {isSmallScreen && (
                                <Tooltip title={t("serial.settings")}>
                                    <IconButton onClick={() => setSettingsOpen(true)}>
                                        <SettingsIcon/>
                                    </IconButton>
                                </Tooltip>
                            )}
                        </Stack>
                        <Stack direction="row" spacing={1} sx={{alignItems: "center"}}>
                            {isSmallScreen ? (
                                <Tooltip title={t("serial.clear")}>
                                    <IconButton color="warning" onClick={clearLog}>
                                        <DeleteOutlineIcon/>
                                    </IconButton>
                                </Tooltip>
                            ) : (
                                <Button variant="outlined" color="warning" startIcon={<DeleteOutlineIcon/>} onClick={clearLog}>
                                    {t("serial.clear")}
                                </Button>
                            )}
                            <ToggleButtonGroup size="small" exclusive value={mode} onChange={(_event, value: Mode | null) => value && setMode(value)}>
                                <ToggleButton value="terminal">{t("serial.modeTerminal")}</ToggleButton>
                                <ToggleButton value="command">{t("serial.modeCommand")}</ToggleButton>
                            </ToggleButtonGroup>
                        </Stack>
                    </Stack>

                    <Box
                        sx={{
                            display: mode === "terminal" ? (fillViewport ? "flex" : "block") : "none",
                            ...(fillViewport ? {flexDirection: "column", flex: 1, minHeight: 0} : {})
                        }}
                    >
                        <Box
                            sx={{
                                ...(isFitMode
                                    ? {width: "100%", ...(fillViewport ? {flex: 1, minHeight: MIN_FIT_TERMINAL_HEIGHT_PX} : {height: 420})}
                                    : {width: "fit-content", maxWidth: "100%", maxHeight: "70vh"}),
                                bgcolor: "#000",
                                borderRadius: 1,
                                p: 1,
                                overflow: "auto"
                            }}
                        >
                            <Box
                                ref={terminalContainerRef}
                                sx={isFitMode ? {height: "100%", "& .xterm": {height: "100%"}} : undefined}
                            />
                        </Box>
                    </Box>

                    <Box sx={{display: mode === "command" ? "block" : "none"}}>
                        <Box
                            ref={logScrollRef}
                            sx={{
                                height: 360,
                                overflowY: "auto",
                                bgcolor: "background.default",
                                border: 1,
                                borderColor: "divider",
                                borderRadius: 1,
                                p: 1,
                                fontFamily: currentFontOption.stack,
                                fontSize
                            }}
                        >
                            {log.length === 0 && (
                                <Typography variant="body2" color="text.disabled">{t("serial.logEmpty")}</Typography>
                            )}
                            {log.map(entry => (
                                <Box key={entry.id} sx={{color: logColor(entry.type), whiteSpace: "pre-wrap", wordBreak: "break-all"}}>
                                    <Box component="span" sx={{color: "text.disabled", mr: 1}}>{formatTimestamp(entry.timestamp)}</Box>
                                    <Box component="span" sx={{color: "text.disabled", mr: 0.5}}>
                                        {entry.type === "tx" ? ">" : entry.type === "rx" ? "<" : "·"}
                                    </Box>
                                    {entry.text}
                                </Box>
                            ))}
                        </Box>
                        <Stack direction="row" spacing={1} sx={{mt: 1, alignItems: "center"}}>
                            <TextField
                                select
                                size="small"
                                label={t("serial.lineEnding")}
                                value={lineEnding}
                                onChange={event => setLineEnding(event.target.value as LineEnding)}
                                sx={{minWidth: 110}}
                            >
                                <MenuItem value="none">{t("serial.lineEndingNone")}</MenuItem>
                                <MenuItem value="lf">LF</MenuItem>
                                <MenuItem value="cr">CR</MenuItem>
                                <MenuItem value="crlf">CRLF</MenuItem>
                            </TextField>
                            <TextField
                                fullWidth
                                size="small"
                                placeholder={t("serial.commandPlaceholder")}
                                value={inputValue}
                                disabled={!connected}
                                onChange={event => setInputValue(event.target.value)}
                                onKeyDown={event => {
                                    if (event.key === "Enter") void sendCommand();
                                }}
                            />
                            <Button variant="contained" startIcon={<SendIcon/>} onClick={() => void sendCommand()} disabled={!connected || !inputValue}>
                                {t("serial.send")}
                            </Button>
                        </Stack>
                    </Box>
                </Stack>
            )}

            {isSmallScreen && (
                <Dialog open={settingsOpen} onClose={() => setSettingsOpen(false)} fullWidth maxWidth="xs">
                    <DialogTitle>{t("serial.settingsTitle")}</DialogTitle>
                    <Tabs value={settingsTab} onChange={(_event, value: SettingsTab) => setSettingsTab(value)} variant="fullWidth">
                        <Tab label={t("serial.settingsTabSerial")} value="serial"/>
                        <Tab label={t("serial.settingsTabFont")} value="font"/>
                    </Tabs>
                    <DialogContent sx={{display: "flex", flexDirection: "column", gap: 2, pt: 2}}>
                        {settingsTab === "serial" ? connectionFields : (
                            <>
                                {fontFields}
                                {mode === "terminal" && terminalSizeFields}
                            </>
                        )}
                    </DialogContent>
                    <DialogActions>
                        <Button onClick={() => setSettingsOpen(false)}>{t("serial.close")}</Button>
                    </DialogActions>
                </Dialog>
            )}
        </>
    );

    return (
        <Container
            maxWidth={false}
            sx={{
                py: isSmallScreen ? 2 : 4,
                ...(fillViewport ? {display: "flex", flexDirection: "column", flex: 1, minHeight: 0} : {})
            }}
        >
            <Paper
                variant={isSmallScreen ? "elevation" : "outlined"}
                elevation={isSmallScreen ? 0 : undefined}
                sx={{
                    p: isSmallScreen ? 0 : {xs: 2, sm: 3},
                    borderRadius: isSmallScreen ? 0 : 3,
                    border: isSmallScreen ? "none" : undefined,
                    bgcolor: isSmallScreen ? "transparent" : undefined,
                    width: shrinkWrapCard ? "fit-content" : undefined,
                    maxWidth: "100%",
                    mx: shrinkWrapCard ? "auto" : undefined,
                    ...(fillViewport ? {display: "flex", flexDirection: "column", flex: 1, minHeight: 0} : {})
                }}
            >
                {body}
            </Paper>
        </Container>
    );
};

export default SerialTool;
