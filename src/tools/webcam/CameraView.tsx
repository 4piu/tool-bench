import React from "react";
import CameraAltIcon from "@mui/icons-material/CameraAlt";
import CloseIcon from "@mui/icons-material/Close";
import FiberManualRecordIcon from "@mui/icons-material/FiberManualRecord";
import FullscreenIcon from "@mui/icons-material/Fullscreen";
import FullscreenExitIcon from "@mui/icons-material/FullscreenExit";
import SettingsIcon from "@mui/icons-material/Settings";
import StopIcon from "@mui/icons-material/Stop";
import VideocamOffIcon from "@mui/icons-material/VideocamOff";
import {
    Box,
    Button,
    Chip,
    Collapse,
    CircularProgress,
    IconButton,
    MenuItem,
    Snackbar,
    Stack,
    TextField,
    Tooltip,
    Typography
} from "@mui/material";
import {useTranslation} from "react-i18next";
import {downloadBlob} from "../shared/browser";
import {useFullscreen} from "../shared/hooks";
import {CapabilityControls} from "./CapabilityControls";
import {useCameraRecorder} from "./useCameraRecorder";
import {useCameraStream} from "./useCameraStream";

const filenameTimestamp = () => new Date().toISOString().replace(/[:.]/g, "-");
const extensionFor = (mimeType: string) => (mimeType.includes("mp4") ? "mp4" : "webm");

const formatElapsed = (ms: number) => {
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60).toString().padStart(2, "0");
    const seconds = (totalSeconds % 60).toString().padStart(2, "0");
    return `${minutes}:${seconds}`;
};

export type CameraViewProps = {
    deviceId: string | null;
    devices: MediaDeviceInfo[];
    onDeviceChange: (deviceId: string | null) => void;
    variant?: "single" | "grid";
    onRemove?: () => void;
    onActive?: () => void;
};

export const CameraView = ({deviceId, devices, onDeviceChange, variant = "single", onRemove, onActive}: CameraViewProps) => {
    const {t} = useTranslation();
    const enabled = deviceId !== null;
    const {videoRef, status, errorCode, capabilities, settings, stream, applyConstraint} = useCameraStream(deviceId || undefined, enabled);

    React.useEffect(() => {
        if (status === "active") onActive?.();
    }, [status, onActive]);

    // A generic (deviceId-unconstrained) request resolves to a specific device once granted;
    // reflect that in the picker instead of leaving it stuck on the empty-selection placeholder.
    // Only for deviceId === "" (unresolved generic request) - deviceId === null means the user
    // explicitly stopped the camera, which must NOT be immediately re-resolved back to active.
    React.useEffect(() => {
        if (status === "active" && deviceId === "" && settings?.deviceId) onDeviceChange(settings.deviceId);
    }, [status, deviceId, settings, onDeviceChange]);

    const {isRecording, elapsedMs, start: startRecording, stop: stopRecording} = useCameraRecorder(stream);
    const containerRef = React.useRef<HTMLDivElement | null>(null);
    const canvasRef = React.useRef<HTMLCanvasElement | null>(null);
    const {isFullscreen, toggle: toggleFullscreen, isSupported: fullscreenSupported, error: fullscreenError, clearError: clearFullscreenError} = useFullscreen(containerRef);
    const [settingsOpen, setSettingsOpen] = React.useState(false);

    const takeSnapshot = () => {
        const video = videoRef.current;
        const canvas = canvasRef.current;
        if (!video || !canvas || status !== "active" || !video.videoWidth) return;
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const context = canvas.getContext("2d");
        if (!context) return;
        context.drawImage(video, 0, 0);
        canvas.toBlob(blob => {
            if (blob) downloadBlob(`webcam-${filenameTimestamp()}.png`, blob);
        }, "image/png");
    };

    const toggleRecording = async () => {
        if (isRecording) {
            const result = await stopRecording();
            if (result) downloadBlob(`webcam-${filenameTimestamp()}.${extensionFor(result.mimeType)}`, result.blob);
        } else {
            startRecording();
        }
    };

    const compact = variant === "grid";
    const errorMessage = errorCode ? t(`webcam.error.${errorCode}`) : null;

    return (
        <Stack
            ref={containerRef}
            spacing={compact ? 0.75 : 1.5}
            sx={{
                width: "100%",
                bgcolor: isFullscreen ? "common.black" : "transparent",
                p: isFullscreen ? 2 : 0,
                height: isFullscreen ? "100dvh" : "auto",
                justifyContent: isFullscreen ? "center" : "flex-start"
            }}
        >
            <Box
                sx={{
                    position: "relative",
                    overflow: "hidden",
                    bgcolor: "common.black",
                    borderRadius: 2,
                    aspectRatio: isFullscreen ? "auto" : "16 / 9",
                    flex: isFullscreen ? 1 : "none",
                    minHeight: 0
                }}
            >
                {enabled && (
                    <Box
                        component="video"
                        ref={videoRef}
                        muted
                        playsInline
                        sx={{width: "100%", height: "100%", objectFit: "contain", display: "block"}}
                    />
                )}
                {(!enabled || status !== "active") && (
                    <Stack
                        spacing={1}
                        sx={{position: "absolute", inset: 0, alignItems: "center", justifyContent: "center", color: "common.white", p: 2, textAlign: "center"}}
                    >
                        {status === "starting" ? (
                            <CircularProgress color="inherit" size={compact ? 24 : 32}/>
                        ) : (
                            <VideocamOffIcon fontSize={compact ? "medium" : "large"}/>
                        )}
                        <Typography variant={compact ? "caption" : "body2"}>
                            {!enabled
                                ? t("webcam.noCameraSelected")
                                : status === "starting"
                                    ? t("webcam.startingCamera")
                                    : errorMessage ?? t("webcam.cameraPrompt")}
                        </Typography>
                        {!enabled && (
                            <Button size="small" variant="contained" onClick={() => onDeviceChange("")}>
                                {t("webcam.startCamera")}
                            </Button>
                        )}
                    </Stack>
                )}
                {isRecording && (
                    <Chip
                        size="small"
                        color="error"
                        icon={<FiberManualRecordIcon sx={{fontSize: "12px !important"}}/>}
                        label={formatElapsed(elapsedMs)}
                        sx={{position: "absolute", top: 8, left: 8}}
                    />
                )}
            </Box>
            <canvas ref={canvasRef} hidden/>

            <Stack direction="row" spacing={1} sx={{alignItems: "center", flexWrap: "wrap"}}>
                <TextField
                    select
                    size="small"
                    value={deviceId ?? ""}
                    onChange={event => onDeviceChange(event.target.value || null)}
                    sx={{minWidth: compact ? 140 : 220, flex: compact ? "1 1 auto" : "none"}}
                    label={compact ? undefined : t("webcam.selectCamera")}
                    slotProps={{
                        select: {
                            displayEmpty: true,
                            renderValue: value => {
                                if (!value) return <Typography component="span" color="text.secondary">{t("webcam.noCameraSelected")}</Typography>;
                                const index = devices.findIndex(device => device.deviceId === value);
                                if (index === -1) return t("webcam.startingCamera");
                                return devices[index].label || `${t("webcam.cameraFallbackLabel")} ${index + 1}`;
                            }
                        }
                    }}
                >
                    {devices.length === 0 && <MenuItem value="" disabled>{t("webcam.noCamerasFound")}</MenuItem>}
                    {devices.map((device, index) => (
                        <MenuItem key={device.deviceId} value={device.deviceId}>
                            {device.label || `${t("webcam.cameraFallbackLabel")} ${index + 1}`}
                        </MenuItem>
                    ))}
                </TextField>

                <Tooltip title={t("webcam.snapshot")}>
                    <span>
                        <IconButton aria-label={t("webcam.snapshot")} onClick={takeSnapshot} disabled={status !== "active"}>
                            <CameraAltIcon/>
                        </IconButton>
                    </span>
                </Tooltip>
                <Tooltip title={isRecording ? t("webcam.stopRecording") : t("webcam.startRecording")}>
                    <span>
                        <IconButton
                            aria-label={isRecording ? t("webcam.stopRecording") : t("webcam.startRecording")}
                            onClick={() => void toggleRecording()}
                            disabled={status !== "active"}
                            color={isRecording ? "error" : "default"}
                        >
                            {isRecording ? <StopIcon/> : <FiberManualRecordIcon/>}
                        </IconButton>
                    </span>
                </Tooltip>
                <Tooltip title={isFullscreen ? t("webcam.exitFullscreen") : t("webcam.fullscreen")}>
                    <span>
                        <IconButton
                            aria-label={isFullscreen ? t("webcam.exitFullscreen") : t("webcam.fullscreen")}
                            onClick={toggleFullscreen}
                            disabled={status !== "active" || !fullscreenSupported}
                        >
                            {isFullscreen ? <FullscreenExitIcon/> : <FullscreenIcon/>}
                        </IconButton>
                    </span>
                </Tooltip>
                <Tooltip title={t("webcam.settings")}>
                    <span>
                        <IconButton aria-label={t("webcam.settings")} onClick={() => setSettingsOpen(open => !open)} disabled={!capabilities}>
                            <SettingsIcon/>
                        </IconButton>
                    </span>
                </Tooltip>
                <Tooltip title={t("webcam.stopCamera")}>
                    <span>
                        <IconButton aria-label={t("webcam.stopCamera")} onClick={() => onDeviceChange(null)} disabled={!enabled}>
                            <VideocamOffIcon/>
                        </IconButton>
                    </span>
                </Tooltip>
                {onRemove && (
                    <Tooltip title={t("webcam.removeCamera")}>
                        <IconButton aria-label={t("webcam.removeCamera")} onClick={onRemove} sx={{ml: "auto"}}>
                            <CloseIcon/>
                        </IconButton>
                    </Tooltip>
                )}
            </Stack>

            <Collapse in={settingsOpen}>
                <Box sx={{p: compact ? 1 : 1.5, border: 1, borderColor: "divider", borderRadius: 2}}>
                    <CapabilityControls capabilities={capabilities} settings={settings} onApply={patch => void applyConstraint(patch)}/>
                </Box>
            </Collapse>

            <Snackbar
                open={!!fullscreenError}
                autoHideDuration={4000}
                onClose={clearFullscreenError}
                message={t("webcam.fullscreenRetryHint")}
            />
        </Stack>
    );
};
