import React from "react";
import RestartAltIcon from "@mui/icons-material/RestartAlt";
import TuneIcon from "@mui/icons-material/Tune";
import {Alert, Box, Button, Chip, Stack, Typography} from "@mui/material";
import {useTranslation} from "react-i18next";
import {useLocalStorageState} from "../shared/hooks";
import {ToolHeader, ToolSurface} from "../shared/ToolScaffold";

type PermissionState = "idle" | "granted" | "denied" | "unsupported" | "insecure";
type Vector3 = { x: number; y: number; z: number };
type Calibration = { roll: number; pitch: number; vial: number };
type MotionEventCtor = typeof DeviceMotionEvent & { requestPermission?: () => Promise<"granted" | "denied"> };

const SMOOTHING = 0.85;
const LEVEL_THRESHOLD_DEG = 0.5;
const BUBBLE_MAX_DEG = 25;
const VIAL_MAX_DEG = 15;
const BUBBLE_TRAVEL_PX = 84;
const VIAL_TRAVEL_PX = 112;
const NO_DATA_TIMEOUT_MS = 2500;

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));
const formatSigned = (deg: number) => `${deg >= 0 ? "+" : ""}${deg.toFixed(1)}°`;

const LevelTool = () => {
    const {t} = useTranslation();
    const [permissionState, setPermissionState] = React.useState<PermissionState>("idle");
    const [calibration, setCalibration] = useLocalStorageState<Calibration>("level.calibration", {roll: 0, pitch: 0, vial: 0});
    const [reading, setReading] = React.useState<Vector3>({x: 0, y: 0, z: -9.81});
    const [hasData, setHasData] = React.useState(false);
    const [noDataWarning, setNoDataWarning] = React.useState(false);

    const rawRef = React.useRef<Vector3>({x: 0, y: 0, z: -9.81});
    const smoothedRef = React.useRef<Vector3>({x: 0, y: 0, z: -9.81});
    const hasReadingRef = React.useRef(false);
    const rafRef = React.useRef<number | null>(null);
    const listenerRef = React.useRef<((event: DeviceMotionEvent) => void) | null>(null);

    const stopListening = React.useCallback(() => {
        if (listenerRef.current) {
            window.removeEventListener("devicemotion", listenerRef.current);
            listenerRef.current = null;
        }
        if (rafRef.current !== null) {
            cancelAnimationFrame(rafRef.current);
            rafRef.current = null;
        }
    }, []);

    const startListening = React.useCallback(() => {
        const handleMotion = (event: DeviceMotionEvent) => {
            const gravity = event.accelerationIncludingGravity;
            if (!gravity || gravity.x === null || gravity.y === null || gravity.z === null) return;
            rawRef.current = {x: gravity.x, y: gravity.y, z: gravity.z};
            if (!hasReadingRef.current) {
                hasReadingRef.current = true;
                setHasData(true);
            }
        };
        window.addEventListener("devicemotion", handleMotion);
        listenerRef.current = handleMotion;

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

    const requestAccess = async () => {
        if (!window.isSecureContext) {
            setPermissionState("insecure");
            return;
        }
        const motionEventCtor = typeof DeviceMotionEvent !== "undefined" ? (DeviceMotionEvent as MotionEventCtor) : undefined;
        if (typeof motionEventCtor?.requestPermission === "function") {
            try {
                const result = await motionEventCtor.requestPermission();
                if (result === "granted") {
                    setPermissionState("granted");
                    startListening();
                } else {
                    setPermissionState("denied");
                }
            } catch {
                setPermissionState("denied");
            }
            return;
        }
        if (typeof DeviceMotionEvent !== "undefined") {
            setPermissionState("granted");
            startListening();
            return;
        }
        setPermissionState("unsupported");
    };

    const {x, y, z} = reading;
    const flatMode = Math.abs(z) >= Math.abs(x) && Math.abs(z) >= Math.abs(y);
    const roll = (Math.atan2(x, Math.sqrt(y * y + z * z)) * 180) / Math.PI;
    const pitch = (Math.atan2(y, Math.sqrt(x * x + z * z)) * 180) / Math.PI;
    const vial = (Math.atan2(x, y) * 180) / Math.PI;

    const calibratedRoll = roll - calibration.roll;
    const calibratedPitch = pitch - calibration.pitch;
    const calibratedVial = vial - calibration.vial;

    const isLevel = flatMode
        ? Math.abs(calibratedRoll) < LEVEL_THRESHOLD_DEG && Math.abs(calibratedPitch) < LEVEL_THRESHOLD_DEG
        : Math.abs(calibratedVial) < LEVEL_THRESHOLD_DEG;

    const bubbleOffsetX = clamp(calibratedRoll / BUBBLE_MAX_DEG, -1, 1) * BUBBLE_TRAVEL_PX;
    const bubbleOffsetY = clamp(calibratedPitch / BUBBLE_MAX_DEG, -1, 1) * BUBBLE_TRAVEL_PX;
    const vialOffsetX = clamp(calibratedVial / VIAL_MAX_DEG, -1, 1) * VIAL_TRAVEL_PX;

    const calibrateNow = () => setCalibration({roll, pitch, vial});
    const resetCalibration = () => setCalibration({roll: 0, pitch: 0, vial: 0});

    const bubbleColor = isLevel ? "success.light" : "info.light";
    const bubbleBorderColor = isLevel ? "success.main" : "info.main";

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
                <Stack spacing={3} sx={{alignItems: "center"}}>
                    {noDataWarning && <Alert severity="warning" sx={{alignSelf: "stretch"}}>{t("level.noData")}</Alert>}

                    <Chip label={t(flatMode ? "level.modeFlat" : "level.modeVertical")} color={isLevel ? "success" : "default"} variant={isLevel ? "filled" : "outlined"}/>

                    {flatMode ? (
                        <Box sx={{position: "relative", width: 240, height: 240, flexShrink: 0}}>
                            <Box sx={{position: "absolute", inset: 0, borderRadius: "50%", border: "2px solid", borderColor: "divider", bgcolor: "action.hover"}}/>
                            <Box sx={{
                                position: "absolute", top: "50%", left: "50%", width: 44, height: 44, ml: "-22px", mt: "-22px",
                                borderRadius: "50%", border: "1.5px dashed", borderColor: isLevel ? "success.main" : "text.secondary"
                            }}/>
                            <Box sx={{
                                position: "absolute", width: 36, height: 36, borderRadius: "50%",
                                bgcolor: bubbleColor, border: "2px solid", borderColor: bubbleBorderColor,
                                top: `calc(50% + ${bubbleOffsetY}px - 18px)`,
                                left: `calc(50% + ${bubbleOffsetX}px - 18px)`,
                                transition: "background-color 0.2s, border-color 0.2s"
                            }}/>
                        </Box>
                    ) : (
                        <Box sx={{position: "relative", width: 280, height: 48, flexShrink: 0}}>
                            <Box sx={{position: "absolute", inset: 0, borderRadius: 24, border: "2px solid", borderColor: "divider", bgcolor: "action.hover"}}/>
                            <Box sx={{position: "absolute", top: 0, bottom: 0, left: "50%", width: 2, bgcolor: isLevel ? "success.main" : "text.secondary"}}/>
                            <Box sx={{
                                position: "absolute", top: 6, width: 36, height: 36, borderRadius: "50%",
                                bgcolor: bubbleColor, border: "2px solid", borderColor: bubbleBorderColor,
                                left: `calc(50% + ${vialOffsetX}px - 18px)`,
                                transition: "background-color 0.2s, border-color 0.2s"
                            }}/>
                        </Box>
                    )}

                    <Typography variant="h5">
                        {flatMode
                            ? `${t("level.axisX")}: ${formatSigned(calibratedRoll)}   ${t("level.axisY")}: ${formatSigned(calibratedPitch)}`
                            : formatSigned(calibratedVial)}
                    </Typography>

                    <Stack direction="row" spacing={1}>
                        <Button startIcon={<TuneIcon/>} onClick={calibrateNow}>{t("level.calibrate")}</Button>
                        <Button startIcon={<RestartAltIcon/>} onClick={resetCalibration}>{t("level.resetCalibration")}</Button>
                    </Stack>
                </Stack>
            )}
        </ToolSurface>
    );
};

export default LevelTool;
