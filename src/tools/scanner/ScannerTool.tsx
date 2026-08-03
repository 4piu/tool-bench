import React from "react";
import CameraAltIcon from "@mui/icons-material/CameraAlt";
import ImageIcon from "@mui/icons-material/Image";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import StopIcon from "@mui/icons-material/Stop";
import UploadFileIcon from "@mui/icons-material/UploadFile";
import {
    Alert,
    Box,
    Button,
    Card,
    CardContent,
    Chip,
    CircularProgress,
    Divider,
    Stack,
    Tab,
    Tabs,
    TextField,
    Typography
} from "@mui/material";
import {useTranslation} from "react-i18next";
import CodeScannerWorker from "../../workers/codeScanner.worker.ts?worker";
import type {CodeScannerResponse, CodeScannerResult} from "../../workers/codeScanner.worker";
import {copyText} from "../shared/browser";
import {CopyButton, ToolHeader, ToolSurface} from "../shared/ToolScaffold";

type ScannerMode = "camera" | "image";

const CAMERA_SCAN_INTERVAL_MS = 450;
const CAMERA_MAX_WIDTH = 1280;
const IMAGE_MAX_DIMENSION = 2048;
const MAX_FILE_SIZE = 20 * 1024 * 1024;

const safeWebUrl = (value: string) => {
    try {
        const url = new URL(value);
        return url.protocol === "http:" || url.protocol === "https:" ? url.href : null;
    } catch {
        return null;
    }
};

const imageDataFromFile = async (file: File) => {
    const bitmap = await createImageBitmap(file);
    try {
        const scale = Math.min(1, IMAGE_MAX_DIMENSION / Math.max(bitmap.width, bitmap.height));
        const width = Math.max(1, Math.round(bitmap.width * scale));
        const height = Math.max(1, Math.round(bitmap.height * scale));
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const context = canvas.getContext("2d", {willReadFrequently: true});
        if (!context) throw new Error("Canvas unavailable");
        context.drawImage(bitmap, 0, 0, width, height);
        const imageData = context.getImageData(0, 0, width, height);
        canvas.width = 0;
        canvas.height = 0;
        return imageData;
    } finally {
        bitmap.close();
    }
};

const ResultList = ({results}: { results: CodeScannerResult[] }) => {
    const {t} = useTranslation();

    return (
        <Stack spacing={1.5}>
            <Typography variant="h6">{t("scanner.results", {count: results.length})}</Typography>
            {results.map((result, index) => {
                const url = safeWebUrl(result.text);
                return (
                    <Card key={`${result.format}-${result.text}-${index}`} variant="outlined">
                        <CardContent>
                            <Stack spacing={1.5}>
                                <Stack direction="row" spacing={1} sx={{alignItems: "center", flexWrap: "wrap"}}>
                                    <Chip size="small" color="primary" label={result.format}/>
                                    {result.contentType && <Chip size="small" variant="outlined" label={result.contentType}/>}
                                    {result.orientation !== 0 && (
                                        <Typography variant="caption" color="text.secondary">
                                            {t("scanner.orientation", {degrees: result.orientation})}
                                        </Typography>
                                    )}
                                </Stack>
                                <TextField
                                    value={result.text}
                                    label={t("scanner.decodedValue")}
                                    multiline
                                    minRows={2}
                                    fullWidth
                                    slotProps={{input: {readOnly: true}}}
                                />
                                <Stack direction={{xs: "column", sm: "row"}} spacing={1}>
                                    <CopyButton onCopy={() => copyText(result.text)} disabled={!result.text}/>
                                    {url && (
                                        <Button
                                            component="a"
                                            href={url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            startIcon={<OpenInNewIcon/>}
                                        >
                                            {t("scanner.openLink")}
                                        </Button>
                                    )}
                                </Stack>
                            </Stack>
                        </CardContent>
                    </Card>
                );
            })}
        </Stack>
    );
};

const ScannerTool = () => {
    const {t} = useTranslation();
    const [mode, setMode] = React.useState<ScannerMode>("camera");
    const [cameraActive, setCameraActive] = React.useState(false);
    const [cameraStarting, setCameraStarting] = React.useState(false);
    const [imageBusy, setImageBusy] = React.useState(false);
    const [imageScanned, setImageScanned] = React.useState(false);
    const [fileName, setFileName] = React.useState("");
    const [results, setResults] = React.useState<CodeScannerResult[]>([]);
    const [error, setError] = React.useState("");
    const [dragging, setDragging] = React.useState(false);
    const videoRef = React.useRef<HTMLVideoElement | null>(null);
    const canvasRef = React.useRef<HTMLCanvasElement | null>(null);
    const streamRef = React.useRef<MediaStream | null>(null);
    const scanTimerRef = React.useRef<number | null>(null);
    const cameraSessionRef = React.useRef(0);
    const workerRef = React.useRef<Worker | null>(null);
    const requestIdRef = React.useRef(0);
    const imageBusyRef = React.useRef(false);
    const pendingRef = React.useRef(new Map<number, {
        resolve: (results: CodeScannerResult[]) => void;
        reject: (error: Error) => void;
    }>());

    const ensureWorker = React.useCallback(() => {
        if (workerRef.current) return workerRef.current;
        const worker = new CodeScannerWorker();
        worker.addEventListener("message", (event: MessageEvent<CodeScannerResponse>) => {
            const pending = pendingRef.current.get(event.data.id);
            if (!pending) return;
            pendingRef.current.delete(event.data.id);
            if (event.data.error) pending.reject(new Error(event.data.error));
            else pending.resolve(event.data.results ?? []);
        });
        worker.addEventListener("error", event => {
            const workerError = new Error(event.message || "Scanner worker failed");
            pendingRef.current.forEach(pending => pending.reject(workerError));
            pendingRef.current.clear();
            worker.terminate();
            workerRef.current = null;
        });
        workerRef.current = worker;
        return worker;
    }, []);

    const scan = React.useCallback((input: Blob | ImageData, tryHarder: boolean) => {
        const id = ++requestIdRef.current;
        return new Promise<CodeScannerResult[]>((resolve, reject) => {
            pendingRef.current.set(id, {resolve, reject});
            const worker = ensureWorker();
            if (input instanceof ImageData) {
                worker.postMessage({id, input, tryHarder}, [input.data.buffer as ArrayBuffer]);
            } else {
                worker.postMessage({id, input, tryHarder});
            }
        });
    }, [ensureWorker]);

    const releaseCamera = React.useCallback((updateState = true) => {
        cameraSessionRef.current += 1;
        if (scanTimerRef.current !== null) window.clearTimeout(scanTimerRef.current);
        scanTimerRef.current = null;
        streamRef.current?.getTracks().forEach(track => track.stop());
        streamRef.current = null;
        if (videoRef.current) videoRef.current.srcObject = null;
        if (updateState) {
            setCameraActive(false);
            setCameraStarting(false);
        }
    }, []);

    const scanCameraFrame = React.useCallback(async (session: number): Promise<void> => {
        const stream = streamRef.current;
        const video = videoRef.current;
        const canvas = canvasRef.current;
        if (!stream || !video || !canvas || session !== cameraSessionRef.current) return;

        if (document.visibilityState === "visible" && video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) {
            const scale = Math.min(1, CAMERA_MAX_WIDTH / video.videoWidth);
            const width = Math.max(1, Math.round(video.videoWidth * scale));
            const height = Math.max(1, Math.round(video.videoHeight * scale));
            canvas.width = width;
            canvas.height = height;
            const context = canvas.getContext("2d", {willReadFrequently: true});
            if (context) {
                context.drawImage(video, 0, 0, width, height);
                try {
                    const decoded = await scan(context.getImageData(0, 0, width, height), false);
                    if (decoded.length && session === cameraSessionRef.current) {
                        setResults(decoded);
                        setError("");
                    }
                } catch (scanError) {
                    if (session === cameraSessionRef.current) {
                        setError(scanError instanceof Error ? scanError.message : String(scanError));
                    }
                }
            }
        }

        if (streamRef.current && session === cameraSessionRef.current) {
            scanTimerRef.current = window.setTimeout(
                () => void scanCameraFrame(session),
                CAMERA_SCAN_INTERVAL_MS
            );
        }
    }, [scan]);

    const startCamera = async () => {
        if (cameraStarting || cameraActive) return;
        setError("");
        setResults([]);
        if (!window.isSecureContext) {
            setError(t("scanner.insecureContext"));
            return;
        }
        if (!navigator.mediaDevices?.getUserMedia) {
            setError(t("scanner.cameraUnsupported"));
            return;
        }
        releaseCamera();
        const session = cameraSessionRef.current;
        setCameraStarting(true);
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                audio: false,
                video: {
                    facingMode: {ideal: "environment"},
                    width: {ideal: 1280, max: 1920},
                    height: {ideal: 720, max: 1080},
                    frameRate: {ideal: 24, max: 30}
                }
            });
            if (session !== cameraSessionRef.current || document.hidden) {
                stream.getTracks().forEach(track => track.stop());
                return;
            }
            streamRef.current = stream;
            const video = videoRef.current;
            if (!video) {
                stream.getTracks().forEach(track => track.stop());
                return;
            }
            video.srcObject = stream;
            await video.play();
            setCameraActive(true);
            void scanCameraFrame(session);
        } catch (cameraError) {
            if (session !== cameraSessionRef.current) return;
            const name = cameraError instanceof Error ? cameraError.name : "";
            if (name === "NotAllowedError" || name === "SecurityError") setError(t("scanner.cameraDenied"));
            else if (name === "NotFoundError" || name === "OverconstrainedError") setError(t("scanner.noCamera"));
            else setError(cameraError instanceof Error ? cameraError.message : t("scanner.cameraFailed"));
            releaseCamera();
        } finally {
            if (session === cameraSessionRef.current) setCameraStarting(false);
        }
    };

    const scanFile = async (file: File | undefined) => {
        if (!file || imageBusyRef.current) return;
        setDragging(false);
        setImageScanned(false);
        setResults([]);
        setError("");
        setFileName(file.name);
        if (!file.type.startsWith("image/")) {
            setError(t("scanner.imageOnly"));
            return;
        }
        if (file.size > MAX_FILE_SIZE) {
            setError(t("scanner.fileTooLarge"));
            return;
        }
        imageBusyRef.current = true;
        setImageBusy(true);
        try {
            const imageData = await imageDataFromFile(file);
            setResults(await scan(imageData, true));
            setImageScanned(true);
        } catch (scanError) {
            setError(scanError instanceof Error ? scanError.message : t("scanner.scanFailed"));
        } finally {
            imageBusyRef.current = false;
            setImageBusy(false);
        }
    };

    React.useEffect(() => {
        const handleVisibilityChange = () => {
            if (document.hidden && streamRef.current) releaseCamera();
        };
        document.addEventListener("visibilitychange", handleVisibilityChange);
        return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
    }, [releaseCamera]);

    React.useEffect(() => () => {
        releaseCamera(false);
        const workerError = new Error("Scanner closed");
        pendingRef.current.forEach(pending => pending.reject(workerError));
        pendingRef.current.clear();
        workerRef.current?.terminate();
        workerRef.current = null;
    }, [releaseCamera]);

    const changeMode = (_: React.SyntheticEvent, nextMode: ScannerMode) => {
        if (nextMode === "image") {
            releaseCamera();
            setCameraStarting(false);
        }
        setMode(nextMode);
        setResults([]);
        setError("");
    };

    return (
        <ToolSurface>
            <ToolHeader title={t("scanner.title")} description={t("scanner.description")}/>
            <Stack spacing={3}>
                <Alert severity="info">{t("scanner.privacy")}</Alert>
                <Tabs value={mode} onChange={changeMode} variant="fullWidth">
                    <Tab value="camera" icon={<CameraAltIcon/>} iconPosition="start" label={t("scanner.cameraTab")}/>
                    <Tab value="image" icon={<ImageIcon/>} iconPosition="start" label={t("scanner.imageTab")}/>
                </Tabs>

                {mode === "camera" && (
                    <Stack spacing={2}>
                        <Box
                            sx={{
                                position: "relative",
                                overflow: "hidden",
                                bgcolor: "common.black",
                                borderRadius: 2,
                                aspectRatio: "16 / 9"
                            }}
                        >
                            <Box
                                component="video"
                                ref={videoRef}
                                muted
                                playsInline
                                sx={{width: "100%", height: "100%", objectFit: "cover", display: "block"}}
                            />
                            {!cameraActive && (
                                <Stack
                                    spacing={1}
                                    sx={{position: "absolute", inset: 0, alignItems: "center", justifyContent: "center", color: "common.white", p: 2}}
                                >
                                    {cameraStarting ? <CircularProgress color="inherit"/> : <CameraAltIcon fontSize="large"/>}
                                    <Typography sx={{textAlign: "center"}}>
                                        {cameraStarting ? t("scanner.startingCamera") : t("scanner.cameraPrompt")}
                                    </Typography>
                                </Stack>
                            )}
                        </Box>
                        <canvas ref={canvasRef} hidden/>
                        <Stack direction={{xs: "column", sm: "row"}} spacing={1}>
                            {!cameraActive ? (
                                <Button variant="contained" startIcon={<CameraAltIcon/>} disabled={cameraStarting} onClick={() => void startCamera()}>
                                    {t("scanner.startCamera")}
                                </Button>
                            ) : (
                                <Button variant="outlined" color="error" startIcon={<StopIcon/>} onClick={() => releaseCamera()}>
                                    {t("scanner.stopCamera")}
                                </Button>
                            )}
                        </Stack>
                        <Typography variant="caption" color="text.secondary">{t("scanner.resourceNote")}</Typography>
                    </Stack>
                )}

                {mode === "image" && (
                    <Box
                        tabIndex={0}
                        onPaste={event => {
                            const file = Array.from(event.clipboardData.files).find(item => item.type.startsWith("image/"));
                            if (file) void scanFile(file);
                        }}
                        onDragEnter={event => {
                            event.preventDefault();
                            setDragging(true);
                        }}
                        onDragOver={event => event.preventDefault()}
                        onDragLeave={event => {
                            if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setDragging(false);
                        }}
                        onDrop={event => {
                            event.preventDefault();
                            void scanFile(event.dataTransfer.files[0]);
                        }}
                        sx={{
                            border: 2,
                            borderStyle: "dashed",
                            borderColor: dragging ? "primary.main" : "divider",
                            bgcolor: dragging ? "action.hover" : "transparent",
                            borderRadius: 2,
                            p: {xs: 3, sm: 5},
                            textAlign: "center",
                            outline: "none",
                            "&:focus-visible": {borderColor: "primary.main"}
                        }}
                    >
                        <Stack spacing={1.5} sx={{alignItems: "center"}}>
                            {imageBusy ? <CircularProgress/> : <UploadFileIcon fontSize="large" color="primary"/>}
                            <Typography>{imageBusy ? t("scanner.scanning") : t("scanner.dropPrompt")}</Typography>
                            {fileName && <Typography variant="body2" color="text.secondary">{fileName}</Typography>}
                            <Button component="label" variant="contained" disabled={imageBusy} startIcon={<UploadFileIcon/>}>
                                {t("scanner.chooseImage")}
                                <input
                                    hidden
                                    type="file"
                                    accept="image/*"
                                    onChange={event => {
                                        void scanFile(event.target.files?.[0]);
                                        event.target.value = "";
                                    }}
                                />
                            </Button>
                            <Typography variant="caption" color="text.secondary">{t("scanner.imageLimits")}</Typography>
                        </Stack>
                    </Box>
                )}

                {error && <Alert severity="error">{error}</Alert>}
                {mode === "image" && imageScanned && !imageBusy && !results.length && !error && (
                    <Alert severity="warning">{t("scanner.noCodes")}</Alert>
                )}
                {results.length > 0 && (
                    <>
                        <Divider/>
                        <ResultList results={results}/>
                    </>
                )}
            </Stack>
        </ToolSurface>
    );
};

export default ScannerTool;
