import React from "react";
import RestartAltIcon from "@mui/icons-material/RestartAlt";
import TuneIcon from "@mui/icons-material/Tune";
import VibrationIcon from "@mui/icons-material/Vibration";
import VolumeOffIcon from "@mui/icons-material/VolumeOff";
import VolumeUpIcon from "@mui/icons-material/VolumeUp";
import {Alert, Box, Button, Stack, Typography} from "@mui/material";
import {useTranslation} from "react-i18next";
import {useLocalStorageState} from "../shared/hooks";
import {ToolHeader, ToolSurface} from "../shared/ToolScaffold";

type PermissionState = "idle" | "granted" | "denied" | "unsupported" | "insecure";
type Vector3 = { x: number; y: number; z: number };
type Calibration = { roll: number; pitch: number; vial: number };
type MotionEventCtor = typeof DeviceMotionEvent & { requestPermission?: () => Promise<"granted" | "denied"> };
type OrientationEventCtor = typeof DeviceOrientationEvent & { requestPermission?: () => Promise<"granted" | "denied"> };

const SMOOTHING = 0.85;
const LEVEL_THRESHOLD_DEG = 0.5;
const BUBBLE_MAX_DEG = 25;
const BUBBLE_TRAVEL_PX = 76;
const NO_DATA_TIMEOUT_MS = 2500;

const CONTAINER_SIZE = 280;
const RING_THICKNESS = 18;
const RING_GAP = 10;
const RING_BUBBLE_SIZE = 24;
const BULLSEYE_INSET = RING_THICKNESS + RING_GAP;
const RING_RADIUS = CONTAINER_SIZE / 2 - RING_THICKNESS / 2;

const TUBE_THICKNESS = 40;
const TUBE_BUBBLE_SIZE = 30;
const TUBE_TRAVEL_PX = 110;

const GRID_GAP_PX = 16;
const WIDGET_SIZE = TUBE_THICKNESS + GRID_GAP_PX + CONTAINER_SIZE;
const MIN_WIDGET_SCALE = 0.35;
const WIDGET_SIZE_EXPR = `min(${WIDGET_SIZE}px, calc(100vw - 48px), 55vh)`;

const BEEP_FREQUENCY_HZ = 880;
const BEEP_DURATION_SEC = 0.15;
const VIBRATE_DURATION_MS = 150;

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));
const formatSigned = (deg: number) => `${deg >= 0 ? "+" : ""}${deg.toFixed(1)}°`;

const LevelTool = () => {
    const {t} = useTranslation();
    const [permissionState, setPermissionState] = React.useState<PermissionState>("idle");
    const [calibration, setCalibration] = useLocalStorageState<Calibration>("level.calibration", {roll: 0, pitch: 0, vial: 0});
    const [reading, setReading] = React.useState<Vector3>({x: 0, y: 0, z: -9.81});
    const [hasData, setHasData] = React.useState(false);
    const [noDataWarning, setNoDataWarning] = React.useState(false);
    const [soundEnabled, setSoundEnabled] = useLocalStorageState<boolean>("level.soundEnabled", true);
    const [vibrationEnabled, setVibrationEnabled] = useLocalStorageState<boolean>("level.vibrationEnabled", true);
    const [widgetScale, setWidgetScale] = React.useState(1);

    const rawRef = React.useRef<Vector3>({x: 0, y: 0, z: -9.81});
    const smoothedRef = React.useRef<Vector3>({x: 0, y: 0, z: -9.81});
    const hasReadingRef = React.useRef(false);
    const rafRef = React.useRef<number | null>(null);
    const motionListenerRef = React.useRef<((event: DeviceMotionEvent) => void) | null>(null);
    const orientationListenerRef = React.useRef<((event: DeviceOrientationEvent) => void) | null>(null);
    const motionActiveRef = React.useRef(false);
    const audioContextRef = React.useRef<AudioContext | null>(null);
    const soundEnabledRef = React.useRef(soundEnabled);
    const vibrationEnabledRef = React.useRef(vibrationEnabled);
    const prevBullseyeLevelRef = React.useRef(false);
    const prevRingLevelRef = React.useRef(false);
    const widgetWrapperRef = React.useRef<HTMLDivElement | null>(null);

    React.useEffect(() => {
        soundEnabledRef.current = soundEnabled;
    }, [soundEnabled]);

    React.useEffect(() => {
        vibrationEnabledRef.current = vibrationEnabled;
    }, [vibrationEnabled]);

    React.useEffect(() => () => {
        void audioContextRef.current?.close();
    }, []);

    const stopListening = React.useCallback(() => {
        if (motionListenerRef.current) {
            window.removeEventListener("devicemotion", motionListenerRef.current);
            motionListenerRef.current = null;
        }
        if (orientationListenerRef.current) {
            window.removeEventListener("deviceorientation", orientationListenerRef.current);
            orientationListenerRef.current = null;
        }
        if (rafRef.current !== null) {
            cancelAnimationFrame(rafRef.current);
            rafRef.current = null;
        }
    }, []);

    const startListening = React.useCallback(() => {
        motionActiveRef.current = false;

        const handleMotion = (event: DeviceMotionEvent) => {
            const gravity = event.accelerationIncludingGravity;
            if (!gravity || gravity.x === null || gravity.y === null || gravity.z === null) return;
            motionActiveRef.current = true;
            rawRef.current = {x: gravity.x, y: gravity.y, z: gravity.z};
            if (!hasReadingRef.current) {
                hasReadingRef.current = true;
                setHasData(true);
            }
        };
        window.addEventListener("devicemotion", handleMotion);
        motionListenerRef.current = handleMotion;

        // Fallback for environments that only emit orientation events (no real accelerometer) —
        // e.g. Chrome/Edge DevTools' Sensors panel only synthesizes deviceorientation, not devicemotion.
        const handleOrientation = (event: DeviceOrientationEvent) => {
            if (motionActiveRef.current) return;
            if (event.beta === null || event.gamma === null) return;
            const beta = (event.beta * Math.PI) / 180;
            const gamma = (event.gamma * Math.PI) / 180;
            rawRef.current = {
                x: Math.sin(gamma) * Math.cos(beta),
                y: -Math.sin(beta),
                z: -Math.cos(beta) * Math.cos(gamma)
            };
            if (!hasReadingRef.current) {
                hasReadingRef.current = true;
                setHasData(true);
            }
        };
        window.addEventListener("deviceorientation", handleOrientation);
        orientationListenerRef.current = handleOrientation;

        const tick = () => {
            if (hasReadingRef.current) {
                const raw = rawRef.current;
                const prev = smoothedRef.current;
                const next = {
                    x: prev.x + (raw.x - prev.x) * (1 - SMOOTHING),
                    y: prev.y + (raw.y - prev.y) * (1 - SMOOTHING),
                    z: prev.z + (raw.z - prev.z) * (1 - SMOOTHING)
                };
                smoothedRef.current = next;
                setReading(next);
            }
            rafRef.current = requestAnimationFrame(tick);
        };
        rafRef.current = requestAnimationFrame(tick);
    }, []);

    React.useEffect(() => stopListening, [stopListening]);

    React.useEffect(() => {
        if (permissionState !== "granted" || hasData) {
            setNoDataWarning(false);
            return;
        }
        const timeout = window.setTimeout(() => setNoDataWarning(true), NO_DATA_TIMEOUT_MS);
        return () => window.clearTimeout(timeout);
    }, [permissionState, hasData]);

    React.useEffect(() => {
        if (permissionState !== "granted") return;
        const el = widgetWrapperRef.current;
        if (!el) return;
        const observer = new ResizeObserver(entries => {
            const entry = entries[0];
            if (!entry) return;
            const size = Math.min(entry.contentRect.width, entry.contentRect.height);
            setWidgetScale(clamp(size / WIDGET_SIZE, MIN_WIDGET_SCALE, 1));
        });
        observer.observe(el);
        return () => observer.disconnect();
    }, [permissionState]);

    const triggerLevelFeedback = React.useCallback(() => {
        if (soundEnabledRef.current) {
            let audioContext = audioContextRef.current;
            if (!audioContext) {
                audioContext = new AudioContext();
                audioContextRef.current = audioContext;
            }
            if (audioContext.state === "suspended") void audioContext.resume();
            const oscillator = audioContext.createOscillator();
            const gain = audioContext.createGain();
            oscillator.type = "sine";
            oscillator.frequency.value = BEEP_FREQUENCY_HZ;
            gain.gain.setValueAtTime(0.2, audioContext.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.0001, audioContext.currentTime + BEEP_DURATION_SEC);
            oscillator.connect(gain);
            gain.connect(audioContext.destination);
            oscillator.start();
            oscillator.stop(audioContext.currentTime + BEEP_DURATION_SEC);
        }
        if (vibrationEnabledRef.current) navigator.vibrate?.(VIBRATE_DURATION_MS);
    }, []);

    const requestAccess = async () => {
        if (!window.isSecureContext) {
            setPermissionState("insecure");
            return;
        }
        const motionEventCtor = typeof DeviceMotionEvent !== "undefined" ? (DeviceMotionEvent as MotionEventCtor) : undefined;
        const orientationEventCtor = typeof DeviceOrientationEvent !== "undefined" ? (DeviceOrientationEvent as OrientationEventCtor) : undefined;

        if (!motionEventCtor && !orientationEventCtor) {
            setPermissionState("unsupported");
            return;
        }

        try {
            if (typeof motionEventCtor?.requestPermission === "function") {
                const result = await motionEventCtor.requestPermission();
                if (result !== "granted") {
                    setPermissionState("denied");
                    return;
                }
            }
            if (typeof orientationEventCtor?.requestPermission === "function") {
                const result = await orientationEventCtor.requestPermission();
                if (result !== "granted") {
                    setPermissionState("denied");
                    return;
                }
            }
        } catch {
            setPermissionState("denied");
            return;
        }

        setPermissionState("granted");
        startListening();
    };

    const {x, y, z} = reading;
    const roll = (Math.atan2(x, Math.sqrt(y * y + z * z)) * 180) / Math.PI;
    const pitch = (Math.atan2(y, Math.sqrt(x * x + z * z)) * 180) / Math.PI;
    const vial = (Math.atan2(x, y) * 180) / Math.PI;

    const calibratedRoll = roll - calibration.roll;
    const calibratedPitch = pitch - calibration.pitch;
    const calibratedVial = vial - calibration.vial;

    // The rotation vial is level whenever the phone is aligned to any cardinal orientation
    // (portrait up/down or landscape left/right), which happens every 90° of rotation — so
    // report the signed offset from whichever multiple of 90° is closest.
    const vialMod90 = ((calibratedVial % 90) + 90) % 90;
    const vialOffset = vialMod90 > 45 ? vialMod90 - 90 : vialMod90;

    const isRollLevel = Math.abs(calibratedRoll) < LEVEL_THRESHOLD_DEG;
    const isPitchLevel = Math.abs(calibratedPitch) < LEVEL_THRESHOLD_DEG;
    const isBullseyeLevel = isRollLevel && isPitchLevel;
    const isRingLevel = Math.abs(vialOffset) < LEVEL_THRESHOLD_DEG;

    React.useEffect(() => {
        if (!hasData) return;
        if (isBullseyeLevel && !prevBullseyeLevelRef.current) triggerLevelFeedback();
        prevBullseyeLevelRef.current = isBullseyeLevel;
    }, [hasData, isBullseyeLevel]);

    React.useEffect(() => {
        if (!hasData) return;
        if (isRingLevel && !prevRingLevelRef.current) triggerLevelFeedback();
        prevRingLevelRef.current = isRingLevel;
    }, [hasData, isRingLevel]);

    const rollRatio = clamp(calibratedRoll / BUBBLE_MAX_DEG, -1, 1);
    const pitchRatio = clamp(calibratedPitch / BUBBLE_MAX_DEG, -1, 1);
    const bubbleOffsetX = rollRatio * BUBBLE_TRAVEL_PX;
    const bubbleOffsetY = pitchRatio * BUBBLE_TRAVEL_PX;
    const horizontalTubeOffsetX = rollRatio * TUBE_TRAVEL_PX;
    const verticalTubeOffsetY = pitchRatio * TUBE_TRAVEL_PX;

    const vialAngleRad = (calibratedVial * Math.PI) / 180;
    const ringBubbleX = Math.sin(vialAngleRad) * RING_RADIUS;
    const ringBubbleY = -Math.cos(vialAngleRad) * RING_RADIUS;

    const calibrateNow = () => setCalibration({roll, pitch, vial});
    const resetCalibration = () => setCalibration({roll: 0, pitch: 0, vial: 0});

    const bubbleColor = isBullseyeLevel ? "success.light" : "info.light";
    const bubbleBorderColor = isBullseyeLevel ? "success.main" : "info.main";
    const ringBubbleColor = isRingLevel ? "success.light" : "info.light";
    const ringBubbleBorderColor = isRingLevel ? "success.main" : "info.main";
    const horizontalBubbleColor = isRollLevel ? "success.light" : "info.light";
    const horizontalBubbleBorderColor = isRollLevel ? "success.main" : "info.main";
    const verticalBubbleColor = isPitchLevel ? "success.light" : "info.light";
    const verticalBubbleBorderColor = isPitchLevel ? "success.main" : "info.main";

    return (
        <ToolSurface>
            <ToolHeader title={t("level.title")} description={t("tools.level.description")}/>

            {permissionState !== "granted" && (
                <Stack spacing={2} sx={{alignItems: "flex-start"}}>
                    {permissionState === "idle" && (
                        <>
                            <Typography color="text.secondary">{t("level.enableHelp")}</Typography>
                            <Button variant="contained" onClick={() => void requestAccess()}>{t("level.enable")}</Button>
                        </>
                    )}
                    {permissionState === "denied" && (
                        <>
                            <Alert severity="warning">{t("level.deniedHelp")}</Alert>
                            <Button variant="outlined" onClick={() => void requestAccess()}>{t("level.retry")}</Button>
                        </>
                    )}
                    {permissionState === "unsupported" && (
                        <Alert severity="error">{t("level.unsupported")}</Alert>
                    )}
                    {permissionState === "insecure" && (
                        <Alert severity="error">{t("level.insecureContext")}</Alert>
                    )}
                </Stack>
            )}

            {permissionState === "granted" && (
                <Stack spacing={3} sx={{alignItems: "center", justifyContent: "center", minHeight: "65vh"}}>
                    {noDataWarning && <Alert severity="warning" sx={{alignSelf: "stretch"}}>{t("level.noData")}</Alert>}

                    <Box
                        ref={widgetWrapperRef}
                        sx={{width: WIDGET_SIZE_EXPR, height: WIDGET_SIZE_EXPR, display: "flex", alignItems: "center", justifyContent: "center"}}
                    >
                    <Box sx={{
                        width: WIDGET_SIZE,
                        height: WIDGET_SIZE,
                        flexShrink: 0,
                        transform: `scale(${widgetScale})`,
                        display: "grid",
                        gridTemplateAreas: `". horizontal" "vertical main"`,
                        gap: 2,
                        alignItems: "center",
                        justifyItems: "center"
                    }}>
                        <Box sx={{gridArea: "horizontal", position: "relative", width: CONTAINER_SIZE, height: TUBE_THICKNESS}}>
                            <Box sx={{position: "absolute", inset: 0, borderRadius: TUBE_THICKNESS / 2, border: "2px solid", borderColor: "divider", bgcolor: "action.hover"}}/>
                            <Box sx={{position: "absolute", top: 0, bottom: 0, left: "50%", width: 2, bgcolor: isRollLevel ? "success.main" : "text.secondary"}}/>
                            <Box sx={{
                                position: "absolute", top: "50%", width: TUBE_BUBBLE_SIZE, height: TUBE_BUBBLE_SIZE, mt: `-${TUBE_BUBBLE_SIZE / 2}px`,
                                borderRadius: "50%", bgcolor: horizontalBubbleColor, border: "2px solid", borderColor: horizontalBubbleBorderColor,
                                left: `calc(50% + ${horizontalTubeOffsetX}px - ${TUBE_BUBBLE_SIZE / 2}px)`,
                                transition: "background-color 0.2s, border-color 0.2s"
                            }}/>
                        </Box>

                        <Box sx={{gridArea: "vertical", position: "relative", width: TUBE_THICKNESS, height: CONTAINER_SIZE}}>
                            <Box sx={{position: "absolute", inset: 0, borderRadius: TUBE_THICKNESS / 2, border: "2px solid", borderColor: "divider", bgcolor: "action.hover"}}/>
                            <Box sx={{position: "absolute", left: 0, right: 0, top: "50%", height: 2, bgcolor: isPitchLevel ? "success.main" : "text.secondary"}}/>
                            <Box sx={{
                                position: "absolute", left: "50%", width: TUBE_BUBBLE_SIZE, height: TUBE_BUBBLE_SIZE, ml: `-${TUBE_BUBBLE_SIZE / 2}px`,
                                borderRadius: "50%", bgcolor: verticalBubbleColor, border: "2px solid", borderColor: verticalBubbleBorderColor,
                                top: `calc(50% + ${verticalTubeOffsetY}px - ${TUBE_BUBBLE_SIZE / 2}px)`,
                                transition: "background-color 0.2s, border-color 0.2s"
                            }}/>
                        </Box>

                        <Box sx={{gridArea: "main", position: "relative", width: CONTAINER_SIZE, height: CONTAINER_SIZE, flexShrink: 0}}>
                            <Box sx={{
                                position: "absolute", inset: 0, borderRadius: "50%",
                                border: `${RING_THICKNESS}px solid`, borderColor: "divider"
                            }}/>
                            <Box sx={{position: "absolute", top: 2, left: "50%", width: 3, height: RING_THICKNESS - 4, ml: "-1.5px", bgcolor: "text.secondary", borderRadius: 1}}/>
                            <Box sx={{position: "absolute", bottom: 2, left: "50%", width: 3, height: RING_THICKNESS - 4, ml: "-1.5px", bgcolor: "text.secondary", borderRadius: 1}}/>
                            <Box sx={{position: "absolute", left: 2, top: "50%", height: 3, width: RING_THICKNESS - 4, mt: "-1.5px", bgcolor: "text.secondary", borderRadius: 1}}/>
                            <Box sx={{position: "absolute", right: 2, top: "50%", height: 3, width: RING_THICKNESS - 4, mt: "-1.5px", bgcolor: "text.secondary", borderRadius: 1}}/>
                            <Box sx={{
                                position: "absolute", width: RING_BUBBLE_SIZE, height: RING_BUBBLE_SIZE, borderRadius: "50%",
                                bgcolor: ringBubbleColor, border: "2px solid", borderColor: ringBubbleBorderColor,
                                top: `calc(50% + ${ringBubbleY}px - ${RING_BUBBLE_SIZE / 2}px)`,
                                left: `calc(50% + ${ringBubbleX}px - ${RING_BUBBLE_SIZE / 2}px)`,
                                transition: "background-color 0.2s, border-color 0.2s"
                            }}/>

                            <Box sx={{position: "absolute", inset: BULLSEYE_INSET, borderRadius: "50%", border: "2px solid", borderColor: "divider", bgcolor: "action.hover"}}/>
                            <Box sx={{
                                position: "absolute", top: "50%", left: "50%", width: 44, height: 44, ml: "-22px", mt: "-22px",
                                borderRadius: "50%", border: "1.5px dashed", borderColor: isBullseyeLevel ? "success.main" : "text.secondary"
                            }}/>
                            <Box sx={{
                                position: "absolute", width: 36, height: 36, borderRadius: "50%",
                                bgcolor: bubbleColor, border: "2px solid", borderColor: bubbleBorderColor,
                                top: `calc(50% + ${bubbleOffsetY}px - 18px)`,
                                left: `calc(50% + ${bubbleOffsetX}px - 18px)`,
                                transition: "background-color 0.2s, border-color 0.2s"
                            }}/>
                        </Box>
                    </Box>
                    </Box>

                    <Stack spacing={0.5} sx={{alignItems: "center"}}>
                        <Typography variant="h5">
                            {`${t("level.axisX")}: ${formatSigned(calibratedRoll)}   ${t("level.axisY")}: ${formatSigned(calibratedPitch)}`}
                        </Typography>
                        <Typography variant="body1" color="text.secondary">
                            {`${t("level.rotation")}: ${formatSigned(vialOffset)}`}
                        </Typography>
                    </Stack>

                    <Stack spacing={1} sx={{alignItems: "center"}}>
                        <Stack direction="row" spacing={1} sx={{flexWrap: "wrap", justifyContent: "center"}}>
                            <Button startIcon={<TuneIcon/>} onClick={calibrateNow}>{t("level.calibrate")}</Button>
                            <Button startIcon={<RestartAltIcon/>} onClick={resetCalibration}>{t("level.resetCalibration")}</Button>
                        </Stack>
                        <Stack direction="row" spacing={1} sx={{flexWrap: "wrap", justifyContent: "center"}}>
                            <Button startIcon={soundEnabled ? <VolumeUpIcon/> : <VolumeOffIcon/>} color={soundEnabled ? "primary" : "inherit"} onClick={() => setSoundEnabled(current => !current)}>
                                {soundEnabled ? t("level.mute") : t("level.unmute")}
                            </Button>
                            <Button startIcon={<VibrationIcon/>} color={vibrationEnabled ? "primary" : "inherit"} onClick={() => setVibrationEnabled(current => !current)}>
                                {vibrationEnabled ? t("level.disableVibration") : t("level.enableVibration")}
                            </Button>
                        </Stack>
                    </Stack>
                </Stack>
            )}
        </ToolSurface>
    );
};

export default LevelTool;
