import React from "react";
import CloseIcon from "@mui/icons-material/Close";
import MicIcon from "@mui/icons-material/Mic";
import PauseIcon from "@mui/icons-material/Pause";
import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import RestartAltIcon from "@mui/icons-material/RestartAlt";
import SettingsIcon from "@mui/icons-material/Settings";
import ShowChartIcon from "@mui/icons-material/ShowChart";
import WaterfallChartIcon from "@mui/icons-material/WaterfallChart";
import {
    Alert,
    Box,
    Button,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    FormControl,
    IconButton,
    InputLabel,
    MenuItem,
    Paper,
    Select,
    Slider,
    Stack,
    ToggleButton,
    ToggleButtonGroup,
    Tooltip,
    Typography
} from "@mui/material";
import type {SelectChangeEvent} from "@mui/material/Select";
import type {Theme} from "@mui/material/styles";
import {useTheme} from "@mui/material/styles";
import {useTranslation} from "react-i18next";
import {useLocalStorageState} from "../shared/hooks";

type PermissionState = "idle" | "granted" | "denied" | "unsupported" | "insecure" | "error";
type DisplayMode = "spectrum" | "spectrogram";
type ScaleType = "log" | "linear";
type Size = { width: number; height: number; dpr: number };

const FFT_SIZES = [512, 1024, 2048, 4096, 8192, 16384, 32768] as const;
const LOG_MIN_FREQ = 20;
const LOG_TICK_FREQS = [20, 50, 100, 200, 500, 1000, 2000, 5000, 10000, 20000];
const MAX_HOLD_DECAY_OPTIONS = [0, 1, 3, 10, 30] as const;
const SPECTROGRAM_ROW_HEIGHT_CSS = 2;
const DB_RANGE_MIN = -140;
const DB_RANGE_MAX = 0;
const DB_RANGE_MIN_GAP = 10;
const CHART_TOP_MARGIN = 76;
const CHART_BOTTOM_MARGIN = 28;

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));
const createFloatArray = (length: number) => new Float32Array(length) as Float32Array<ArrayBuffer>;

const freqToFrac = (freq: number, nyquist: number, scale: ScaleType) => {
    if (scale === "linear") return clamp(freq / nyquist, 0, 1);
    const maxFreq = Math.max(nyquist, LOG_MIN_FREQ * 2);
    return clamp(Math.log(freq / LOG_MIN_FREQ) / Math.log(maxFreq / LOG_MIN_FREQ), 0, 1);
};

const fracToFreq = (frac: number, nyquist: number, scale: ScaleType) => {
    const clamped = clamp(frac, 0, 1);
    if (scale === "linear") return clamped * nyquist;
    const maxFreq = Math.max(nyquist, LOG_MIN_FREQ * 2);
    return LOG_MIN_FREQ * Math.pow(maxFreq / LOG_MIN_FREQ, clamped);
};

const formatFrequency = (freq: number) => freq >= 1000 ? `${(freq / 1000).toFixed(freq >= 10000 ? 1 : 2)} kHz` : `${Math.round(freq)} Hz`;
const formatDb = (db: number) => Number.isFinite(db) ? `${db.toFixed(1)} dB` : "—";

const COLOR_STOPS: [number, [number, number, number]][] = [
    [0, [8, 8, 30]],
    [0.35, [30, 60, 200]],
    [0.6, [20, 200, 130]],
    [0.8, [250, 230, 30]],
    [1, [230, 30, 20]]
];

const dbToColor = (t: number): [number, number, number] => {
    const clamped = clamp(t, 0, 1);
    for (let i = 1; i < COLOR_STOPS.length; i++) {
        const [stopT, stopColor] = COLOR_STOPS[i];
        if (clamped <= stopT) {
            const [prevT, prevColor] = COLOR_STOPS[i - 1];
            const localT = stopT === prevT ? 0 : (clamped - prevT) / (stopT - prevT);
            return [
                Math.round(prevColor[0] + (stopColor[0] - prevColor[0]) * localT),
                Math.round(prevColor[1] + (stopColor[1] - prevColor[1]) * localT),
                Math.round(prevColor[2] + (stopColor[2] - prevColor[2]) * localT)
            ];
        }
    }
    return COLOR_STOPS[COLOR_STOPS.length - 1][1];
};

const drawAxes = (
    ctx: CanvasRenderingContext2D,
    width: number,
    plotTop: number,
    plotBottom: number,
    nyquist: number,
    scale: ScaleType,
    minDb: number,
    maxDb: number,
    mode: DisplayMode,
    theme: Theme
) => {
    const gridColor = theme.palette.mode === "dark" ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)";
    const textColor = theme.palette.text.secondary;
    const plotHeight = plotBottom - plotTop;

    ctx.font = "11px sans-serif";
    const freqTicks = scale === "log"
        ? LOG_TICK_FREQS.filter(f => f <= nyquist)
        : Array.from({length: 9}, (_, i) => Math.round((i / 8) * nyquist));

    freqTicks.forEach(freq => {
        const x = freqToFrac(freq, nyquist, scale) * width;
        ctx.strokeStyle = gridColor;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(x, plotTop);
        ctx.lineTo(x, plotBottom);
        ctx.stroke();
        ctx.fillStyle = textColor;
        ctx.textAlign = x < 24 ? "left" : x > width - 24 ? "right" : "center";
        ctx.textBaseline = "top";
        ctx.fillText(formatFrequency(freq), clamp(x, 22, width - 22), plotBottom + 8);
    });

    if (mode === "spectrum") {
        const dbStep = 10;
        for (let db = Math.ceil(minDb / dbStep) * dbStep; db <= maxDb; db += dbStep) {
            const t = clamp((db - minDb) / (maxDb - minDb), 0, 1);
            const y = plotBottom - t * plotHeight;
            ctx.strokeStyle = gridColor;
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(width, y);
            ctx.stroke();
            ctx.fillStyle = textColor;
            ctx.textAlign = "left";
            ctx.textBaseline = "bottom";
            ctx.fillText(`${db} dB`, 4, y - 2);
        }
    }
};

const SpectrumTool = () => {
    const {t} = useTranslation();
    const theme = useTheme();

    const [permissionState, setPermissionState] = React.useState<PermissionState>("idle");
    const [errorMessage, setErrorMessage] = React.useState("");

    const [displayMode, setDisplayMode] = useLocalStorageState<DisplayMode>("spectrum.displayMode", "spectrum");
    const [scaleType, setScaleType] = useLocalStorageState<ScaleType>("spectrum.scaleType", "log");
    const [fftSize, setFftSize] = useLocalStorageState<number>("spectrum.fftSize", 4096);
    const [smoothing, setSmoothing] = useLocalStorageState("spectrum.smoothing", 0.5);
    const [minDb, setMinDb] = useLocalStorageState("spectrum.minDb", -100);
    const [maxDb, setMaxDb] = useLocalStorageState("spectrum.maxDb", -30);
    const [maxHoldDecay, setMaxHoldDecay] = useLocalStorageState<number>("spectrum.maxHoldDecay", 3);

    const [frozen, setFrozen] = React.useState(false);
    const [pinnedFreq, setPinnedFreq] = React.useState<number | null>(null);
    const [settingsOpen, setSettingsOpen] = React.useState(false);

    const containerRef = React.useRef<HTMLDivElement | null>(null);
    const spectrumCanvasRef = React.useRef<HTMLCanvasElement | null>(null);
    const spectrogramCanvasRef = React.useRef<HTMLCanvasElement | null>(null);
    const overlayCanvasRef = React.useRef<HTMLCanvasElement | null>(null);

    const audioContextRef = React.useRef<AudioContext | null>(null);
    const analyserRef = React.useRef<AnalyserNode | null>(null);
    const streamRef = React.useRef<MediaStream | null>(null);
    const freqDataRef = React.useRef<Float32Array<ArrayBuffer>>(createFloatArray(0));
    const maxHoldRef = React.useRef<Float32Array<ArrayBuffer>>(createFloatArray(0));
    const rafRef = React.useRef<number | null>(null);
    const frozenRef = React.useRef(false);
    const nyquistRef = React.useRef(22050);
    const sizeRef = React.useRef<Size>({width: 0, height: 0, dpr: 1});
    const pinDraggingRef = React.useRef(false);
    const lastFrameTimeRef = React.useRef<number | null>(null);

    const displayModeRef = React.useRef(displayMode);
    const scaleTypeRef = React.useRef(scaleType);
    const minDbRef = React.useRef(minDb);
    const maxDbRef = React.useRef(maxDb);
    const pinnedFreqRef = React.useRef(pinnedFreq);
    const maxHoldDecayRef = React.useRef(maxHoldDecay);

    React.useEffect(() => { frozenRef.current = frozen; }, [frozen]);
    React.useEffect(() => { displayModeRef.current = displayMode; }, [displayMode]);
    React.useEffect(() => { scaleTypeRef.current = scaleType; }, [scaleType]);
    React.useEffect(() => { minDbRef.current = minDb; }, [minDb]);
    React.useEffect(() => { maxDbRef.current = maxDb; }, [maxDb]);
    React.useEffect(() => { pinnedFreqRef.current = pinnedFreq; }, [pinnedFreq]);
    React.useEffect(() => { maxHoldDecayRef.current = maxHoldDecay; }, [maxHoldDecay]);

    React.useEffect(() => {
        const element = containerRef.current;
        if (!element) return;
        const observer = new ResizeObserver(entries => {
            const entry = entries[0];
            if (!entry) return;
            const width = entry.contentRect.width;
            const height = entry.contentRect.height;
            const dpr = window.devicePixelRatio || 1;
            sizeRef.current = {width, height, dpr};
            [spectrumCanvasRef.current, overlayCanvasRef.current].forEach(canvas => {
                if (!canvas) return;
                canvas.width = Math.round(width * dpr);
                canvas.height = Math.round(height * dpr);
                canvas.style.width = `${width}px`;
                canvas.style.height = `${height}px`;
                canvas.getContext("2d")?.setTransform(dpr, 0, 0, dpr, 0, 0);
            });
            const spectrogramCanvas = spectrogramCanvasRef.current;
            if (spectrogramCanvas) {
                spectrogramCanvas.width = Math.round(width * dpr);
                spectrogramCanvas.height = Math.round(height * dpr);
                spectrogramCanvas.style.width = `${width}px`;
                spectrogramCanvas.style.height = `${height}px`;
            }
        });
        observer.observe(element);
        return () => observer.disconnect();
    }, []);

    const stopAudio = React.useCallback(() => {
        if (rafRef.current !== null) {
            cancelAnimationFrame(rafRef.current);
            rafRef.current = null;
        }
        streamRef.current?.getTracks().forEach(track => track.stop());
        streamRef.current = null;
        analyserRef.current?.disconnect();
        analyserRef.current = null;
        if (audioContextRef.current && audioContextRef.current.state !== "closed") void audioContextRef.current.close();
        audioContextRef.current = null;
    }, []);

    React.useEffect(() => stopAudio, [stopAudio]);

    const drawFrame = React.useCallback(() => {
        const analyser = analyserRef.current;
        const overlayCanvas = overlayCanvasRef.current;
        const {width, height, dpr} = sizeRef.current;

        if (!analyser || !overlayCanvas || width <= 0 || height <= 0) {
            rafRef.current = requestAnimationFrame(drawFrame);
            return;
        }

        const nyquist = nyquistRef.current;
        const scale = scaleTypeRef.current;
        const mode = displayModeRef.current;
        const minDbNow = minDbRef.current;
        const maxDbNow = maxDbRef.current;
        const plotTop = CHART_TOP_MARGIN;
        const plotBottom = Math.max(plotTop + 1, height - CHART_BOTTOM_MARGIN);
        const plotHeight = plotBottom - plotTop;

        if (!frozenRef.current) {
            analyser.getFloatFrequencyData(freqDataRef.current);
            const freqData = freqDataRef.current;
            const maxHold = maxHoldRef.current;
            const now = performance.now();
            const deltaSeconds = lastFrameTimeRef.current !== null ? clamp((now - lastFrameTimeRef.current) / 1000, 0, 1) : 0;
            lastFrameTimeRef.current = now;
            const decayRate = maxHoldDecayRef.current;
            const decayAmount = decayRate * deltaSeconds;
            for (let i = 0; i < freqData.length; i++) {
                const value = freqData[i];
                if (value > maxHold[i]) maxHold[i] = value;
                else if (decayRate > 0) maxHold[i] = Math.max(value, maxHold[i] - decayAmount);
            }
        }

        const freqData = freqDataRef.current;
        const maxHold = maxHoldRef.current;
        const binCount = freqData.length;

        const freqToBin = (freq: number) => clamp(Math.round((freq / nyquist) * (binCount - 1)), 0, binCount - 1);
        const xToBin = (xFrac: number) => freqToBin(fracToFreq(xFrac, nyquist, scale));
        const dbToY = (db: number) => {
            const t = clamp((db - minDbNow) / (maxDbNow - minDbNow), 0, 1);
            return plotBottom - t * plotHeight;
        };

        if (mode === "spectrum") {
            const ctx = spectrumCanvasRef.current?.getContext("2d");
            if (ctx) {
                ctx.clearRect(0, 0, width, height);
                ctx.fillStyle = theme.palette.background.paper;
                ctx.fillRect(0, 0, width, height);

                ctx.beginPath();
                ctx.strokeStyle = theme.palette.warning.main;
                ctx.lineWidth = 1;
                for (let x = 0; x <= width; x++) {
                    const y = dbToY(maxHold[xToBin(x / width)]);
                    if (x === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
                }
                ctx.stroke();

                ctx.beginPath();
                ctx.moveTo(0, height);
                for (let x = 0; x <= width; x++) ctx.lineTo(x, dbToY(freqData[xToBin(x / width)]));
                ctx.lineTo(width, height);
                ctx.closePath();
                const gradient = ctx.createLinearGradient(0, 0, 0, height);
                gradient.addColorStop(0, theme.palette.mode === "dark" ? "rgba(144,202,249,0.35)" : "rgba(25,118,210,0.25)");
                gradient.addColorStop(1, "rgba(0,0,0,0)");
                ctx.fillStyle = gradient;
                ctx.fill();

                ctx.beginPath();
                ctx.strokeStyle = theme.palette.primary.main;
                ctx.lineWidth = 1.5;
                for (let x = 0; x <= width; x++) {
                    const y = dbToY(freqData[xToBin(x / width)]);
                    if (x === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
                }
                ctx.stroke();
            }
        } else if (!frozenRef.current) {
            const canvas = spectrogramCanvasRef.current;
            const ctx = canvas?.getContext("2d");
            if (canvas && ctx) {
                const pixelWidth = canvas.width;
                const plotTopPx = Math.round(plotTop * dpr);
                const plotBottomPx = Math.round(plotBottom * dpr);
                const plotHeightPx = plotBottomPx - plotTopPx;
                const rowHeightPx = Math.max(1, Math.round(SPECTROGRAM_ROW_HEIGHT_CSS * dpr));
                if (pixelWidth > 0 && plotHeightPx > rowHeightPx) {
                    ctx.drawImage(canvas, 0, plotTopPx, pixelWidth, plotHeightPx - rowHeightPx, 0, plotTopPx + rowHeightPx, pixelWidth, plotHeightPx - rowHeightPx);
                    const rowImage = ctx.createImageData(pixelWidth, rowHeightPx);
                    for (let x = 0; x < pixelWidth; x++) {
                        const t = clamp((freqData[xToBin(x / pixelWidth)] - minDbNow) / (maxDbNow - minDbNow), 0, 1);
                        const [r, g, b] = dbToColor(t);
                        for (let row = 0; row < rowHeightPx; row++) {
                            const idx = (row * pixelWidth + x) * 4;
                            rowImage.data[idx] = r;
                            rowImage.data[idx + 1] = g;
                            rowImage.data[idx + 2] = b;
                            rowImage.data[idx + 3] = 255;
                        }
                    }
                    ctx.putImageData(rowImage, 0, plotTopPx);
                }
            }
        }

        const overlayCtx = overlayCanvas.getContext("2d");
        if (overlayCtx) {
            overlayCtx.clearRect(0, 0, width, height);
            drawAxes(overlayCtx, width, plotTop, plotBottom, nyquist, scale, minDbNow, maxDbNow, mode, theme);

            const pinned = pinnedFreqRef.current;
            if (pinned !== null) {
                const x = freqToFrac(pinned, nyquist, scale) * width;
                const db = freqData[freqToBin(pinned)];
                overlayCtx.strokeStyle = theme.palette.error.main;
                overlayCtx.lineWidth = 1.5;
                overlayCtx.beginPath();
                overlayCtx.moveTo(x, plotTop);
                overlayCtx.lineTo(x, plotBottom);
                overlayCtx.stroke();

                const label = `${formatFrequency(pinned)}   ${formatDb(db)}`;
                overlayCtx.font = "bold 12px sans-serif";
                const textWidth = overlayCtx.measureText(label).width;
                const boxPadding = 6;
                const boxWidth = textWidth + boxPadding * 2;
                const boxHeight = 22;
                const boxX = clamp(x + 8, 4, Math.max(4, width - boxWidth - 4));
                const boxY = plotTop + 8;
                overlayCtx.fillStyle = theme.palette.mode === "dark" ? "rgba(30,30,30,0.85)" : "rgba(255,255,255,0.92)";
                overlayCtx.fillRect(boxX, boxY, boxWidth, boxHeight);
                overlayCtx.strokeStyle = theme.palette.error.main;
                overlayCtx.lineWidth = 1;
                overlayCtx.strokeRect(boxX, boxY, boxWidth, boxHeight);
                overlayCtx.fillStyle = theme.palette.text.primary;
                overlayCtx.textAlign = "left";
                overlayCtx.textBaseline = "middle";
                overlayCtx.fillText(label, boxX + boxPadding, boxY + boxHeight / 2);
            }
        }

        rafRef.current = requestAnimationFrame(drawFrame);
    }, [theme]);

    const requestMicAccess = async () => {
        setErrorMessage("");
        if (!window.isSecureContext) {
            setPermissionState("insecure");
            return;
        }
        if (!navigator.mediaDevices?.getUserMedia) {
            setPermissionState("unsupported");
            return;
        }
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                audio: {echoCancellation: false, noiseSuppression: false, autoGainControl: false}
            });
            streamRef.current = stream;
            const audioContext = new AudioContext();
            audioContextRef.current = audioContext;
            if (audioContext.state === "suspended") await audioContext.resume();
            const source = audioContext.createMediaStreamSource(stream);
            const analyser = audioContext.createAnalyser();
            analyser.fftSize = fftSize;
            analyser.smoothingTimeConstant = smoothing;
            analyser.minDecibels = minDb;
            analyser.maxDecibels = maxDb;
            source.connect(analyser);
            analyserRef.current = analyser;
            nyquistRef.current = audioContext.sampleRate / 2;
            freqDataRef.current = createFloatArray(analyser.frequencyBinCount);
            maxHoldRef.current = createFloatArray(analyser.frequencyBinCount).fill(-Infinity);
            setPermissionState("granted");
            rafRef.current = requestAnimationFrame(drawFrame);
        } catch (error) {
            const name = error instanceof Error ? error.name : "";
            if (name === "NotAllowedError" || name === "SecurityError") {
                setPermissionState("denied");
            } else if (name === "NotFoundError" || name === "OverconstrainedError") {
                setPermissionState("error");
                setErrorMessage(t("spectrum.noMicFound"));
            } else {
                setPermissionState("error");
                setErrorMessage(error instanceof Error ? error.message : String(error));
            }
        }
    };

    React.useEffect(() => {
        const analyser = analyserRef.current;
        if (!analyser) return;
        analyser.fftSize = fftSize;
        freqDataRef.current = createFloatArray(analyser.frequencyBinCount);
        maxHoldRef.current = createFloatArray(analyser.frequencyBinCount).fill(-Infinity);
        const spectrogramCanvas = spectrogramCanvasRef.current;
        const ctx = spectrogramCanvas?.getContext("2d");
        if (spectrogramCanvas && ctx) ctx.clearRect(0, 0, spectrogramCanvas.width, spectrogramCanvas.height);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [fftSize]);

    React.useEffect(() => {
        if (analyserRef.current) analyserRef.current.smoothingTimeConstant = smoothing;
    }, [smoothing]);

    React.useEffect(() => {
        const analyser = analyserRef.current;
        if (!analyser) return;
        analyser.minDecibels = minDb;
        analyser.maxDecibels = maxDb;
    }, [minDb, maxDb]);

    const resetMaxHold = () => maxHoldRef.current.fill(-Infinity);

    const toggleFrozen = () => {
        setFrozen(current => {
            const next = !current;
            if (!next) lastFrameTimeRef.current = null;
            return next;
        });
    };

    const updatePinFromEvent = (event: React.PointerEvent<HTMLCanvasElement>) => {
        const canvas = overlayCanvasRef.current;
        if (!canvas) return;
        const rect = canvas.getBoundingClientRect();
        const xFrac = clamp((event.clientX - rect.left) / rect.width, 0, 1);
        setPinnedFreq(fracToFreq(xFrac, nyquistRef.current, scaleTypeRef.current));
    };

    const handlePinPointerDown = (event: React.PointerEvent<HTMLCanvasElement>) => {
        pinDraggingRef.current = true;
        event.currentTarget.setPointerCapture(event.pointerId);
        updatePinFromEvent(event);
    };
    const handlePinPointerMove = (event: React.PointerEvent<HTMLCanvasElement>) => {
        if (pinDraggingRef.current) updatePinFromEvent(event);
    };
    const handlePinPointerUp = () => {
        pinDraggingRef.current = false;
    };

    const handleDbRangeChange = (_: Event, value: number | number[]) => {
        if (!Array.isArray(value)) return;
        let [newMin, newMax] = value;
        if (newMax - newMin < DB_RANGE_MIN_GAP) {
            if (newMin !== minDb) newMax = newMin + DB_RANGE_MIN_GAP;
            else newMin = newMax - DB_RANGE_MIN_GAP;
        }
        setMinDb(newMin);
        setMaxDb(newMax);
    };

    return (
        <Box sx={{position: "relative", width: "100%", flex: 1, minHeight: 480}}>
            <Box ref={containerRef} dir="ltr" sx={{position: "absolute", inset: 0, bgcolor: "background.paper", overflow: "hidden"}}>
                <canvas ref={spectrumCanvasRef} style={{position: "absolute", inset: 0, display: displayMode === "spectrum" ? "block" : "none"}}/>
                <canvas ref={spectrogramCanvasRef} style={{position: "absolute", inset: 0, display: displayMode === "spectrogram" ? "block" : "none"}}/>
                <canvas
                    ref={overlayCanvasRef}
                    onPointerDown={handlePinPointerDown}
                    onPointerMove={handlePinPointerMove}
                    onPointerUp={handlePinPointerUp}
                    onPointerCancel={handlePinPointerUp}
                    style={{position: "absolute", inset: 0, display: "block", touchAction: "none", cursor: "crosshair"}}
                />

                {permissionState === "granted" ? (
                    <Paper elevation={6} sx={{position: "absolute", top: 16, left: 16, right: 16, zIndex: 1, p: 1, display: "flex", flexWrap: "wrap", gap: 1, alignItems: "center"}}>
                            <ToggleButtonGroup size="small" exclusive value={displayMode} onChange={(_, value: DisplayMode | null) => value && setDisplayMode(value)}>
                                <ToggleButton value="spectrum">
                                    <Tooltip title={t("spectrum.modeSpectrum")}><ShowChartIcon fontSize="small"/></Tooltip>
                                </ToggleButton>
                                <ToggleButton value="spectrogram">
                                    <Tooltip title={t("spectrum.modeSpectrogram")}><WaterfallChartIcon fontSize="small"/></Tooltip>
                                </ToggleButton>
                            </ToggleButtonGroup>

                            <Tooltip title={frozen ? t("spectrum.resume") : t("spectrum.freeze")}>
                                <IconButton onClick={toggleFrozen} color={frozen ? "primary" : "default"}>
                                    {frozen ? <PlayArrowIcon/> : <PauseIcon/>}
                                </IconButton>
                            </Tooltip>

                            {displayMode === "spectrum" && (
                                <Tooltip title={t("spectrum.resetMaxHold")}>
                                    <IconButton onClick={resetMaxHold}><RestartAltIcon/></IconButton>
                                </Tooltip>
                            )}

                            {pinnedFreq !== null && (
                                <Tooltip title={t("spectrum.unpin")}>
                                    <IconButton onClick={() => setPinnedFreq(null)}><CloseIcon/></IconButton>
                                </Tooltip>
                            )}

                            <Box sx={{flex: 1}}/>

                            <Tooltip title={t("spectrum.settings")}>
                                <IconButton onClick={() => setSettingsOpen(true)}><SettingsIcon/></IconButton>
                            </Tooltip>
                        </Paper>
                ) : (
                    <Stack spacing={2} sx={{position: "absolute", inset: 0, zIndex: 1, alignItems: "center", justifyContent: "center", p: 3, textAlign: "center", bgcolor: "background.paper"}}>
                        <MicIcon sx={{fontSize: 48, color: "text.secondary"}}/>
                        <Typography variant="h6">{t("spectrum.title")}</Typography>
                        {permissionState === "idle" && (
                            <>
                                <Typography color="text.secondary" sx={{maxWidth: 420}}>{t("spectrum.enableHelp")}</Typography>
                                <Button variant="contained" startIcon={<MicIcon/>} onClick={() => void requestMicAccess()}>{t("spectrum.enable")}</Button>
                            </>
                        )}
                        {permissionState === "denied" && (
                            <>
                                <Alert severity="warning" sx={{maxWidth: 420}}>{t("spectrum.deniedHelp")}</Alert>
                                <Button variant="outlined" onClick={() => void requestMicAccess()}>{t("spectrum.retry")}</Button>
                            </>
                        )}
                        {permissionState === "unsupported" && <Alert severity="error" sx={{maxWidth: 420}}>{t("spectrum.unsupported")}</Alert>}
                        {permissionState === "insecure" && <Alert severity="error" sx={{maxWidth: 420}}>{t("spectrum.insecureContext")}</Alert>}
                        {permissionState === "error" && (
                            <>
                                <Alert severity="error" sx={{maxWidth: 420}}>{errorMessage || t("spectrum.genericError")}</Alert>
                                <Button variant="outlined" onClick={() => void requestMicAccess()}>{t("spectrum.retry")}</Button>
                            </>
                        )}
                    </Stack>
                )}
            </Box>

            <Dialog open={settingsOpen} onClose={() => setSettingsOpen(false)} maxWidth="xs" fullWidth container={() => containerRef.current}>
                <DialogTitle>{t("spectrum.settingsTitle")}</DialogTitle>
                <DialogContent sx={{display: "flex", flexDirection: "column", gap: 3, pt: 1}}>
                    <Box>
                        <Typography variant="subtitle2" gutterBottom>{t("spectrum.xAxisScale")}</Typography>
                        <ToggleButtonGroup exclusive size="small" value={scaleType} onChange={(_, value: ScaleType | null) => value && setScaleType(value)}>
                            <ToggleButton value="linear">{t("spectrum.scaleLinear")}</ToggleButton>
                            <ToggleButton value="log">{t("spectrum.scaleLog")}</ToggleButton>
                        </ToggleButtonGroup>
                    </Box>

                    <FormControl size="small" fullWidth>
                        <InputLabel>{t("spectrum.fftSize")}</InputLabel>
                        <Select value={String(fftSize)} label={t("spectrum.fftSize")} onChange={(event: SelectChangeEvent) => setFftSize(Number(event.target.value))}>
                            {FFT_SIZES.map(size => <MenuItem key={size} value={String(size)}>{size}</MenuItem>)}
                        </Select>
                    </FormControl>

                    <FormControl size="small" fullWidth>
                        <InputLabel>{t("spectrum.maxHoldDecay")}</InputLabel>
                        <Select value={String(maxHoldDecay)} label={t("spectrum.maxHoldDecay")} onChange={(event: SelectChangeEvent) => setMaxHoldDecay(Number(event.target.value))}>
                            {MAX_HOLD_DECAY_OPTIONS.map(option => (
                                <MenuItem key={option} value={String(option)}>
                                    {option === 0 ? t("spectrum.maxHoldDecayOff") : t("spectrum.maxHoldDecayRate", {value: option})}
                                </MenuItem>
                            ))}
                        </Select>
                    </FormControl>

                    <Box>
                        <Typography variant="subtitle2" gutterBottom>{t("spectrum.smoothing", {value: smoothing.toFixed(2)})}</Typography>
                        <Slider value={smoothing} min={0} max={0.95} step={0.05} onChange={(_, value) => setSmoothing(value as number)}/>
                    </Box>

                    <Box>
                        <Typography variant="subtitle2" gutterBottom>{t("spectrum.dbRange", {min: minDb, max: maxDb})}</Typography>
                        <Slider value={[minDb, maxDb]} min={DB_RANGE_MIN} max={DB_RANGE_MAX} step={5} disableSwap onChange={handleDbRangeChange}/>
                    </Box>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setSettingsOpen(false)}>{t("spectrum.close")}</Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
};

export default SpectrumTool;
