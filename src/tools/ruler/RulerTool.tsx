import React from "react";
import FullscreenIcon from "@mui/icons-material/Fullscreen";
import FullscreenExitIcon from "@mui/icons-material/FullscreenExit";
import HelpOutlineIcon from "@mui/icons-material/HelpOutlineOutlined";
import RestartAltIcon from "@mui/icons-material/RestartAlt";
import ScreenRotationIcon from "@mui/icons-material/ScreenRotation";
import StraightenIcon from "@mui/icons-material/Straighten";
import UnfoldLessIcon from "@mui/icons-material/UnfoldLess";
import {
    Box,
    Dialog,
    DialogActions,
    DialogContent,
    DialogContentText,
    DialogTitle,
    Fab,
    FormControl,
    Grow,
    IconButton,
    InputLabel,
    MenuItem,
    Paper,
    Popover,
    Select,
    Slider,
    Stack,
    Button,
    Tab,
    Tabs,
    ToggleButton,
    ToggleButtonGroup,
    Tooltip,
    Typography,
    useMediaQuery,
    Zoom
} from "@mui/material";
import type {SelectChangeEvent} from "@mui/material/Select";
import {useTheme} from "@mui/material/styles";
import {useTranslation} from "react-i18next";
import {useLocalStorageState} from "../shared/hooks";

type UnitSystem = "metric" | "imperial" | "px";
type Rotation = 0 | 90 | 180 | 270;
type CalibrationMode = "card" | "ruler";
type RulerUnit = "cm" | "in";
type PointerInfo = { axisCoord: number; crossCoord: number };
type PanState = { pointerIds: number[]; startAxisAvg: number; startPanOffset: number; startCrossAvg: number; startCrossOffset: number };

const CARD_WIDTH_MM = 85.6;
const CARD_HEIGHT_MM = 53.98;
const MM_PER_INCH = 25.4;
const DEFAULT_PIXELS_PER_MM = 96 / MM_PER_INCH;
const MARKER_HIT_RADIUS = 16;
const ROTATE_DRAG_THRESHOLD = 0.9;
const CALIBRATION_MIN_PX = 60;
const CALIBRATION_MAX_PX = 1400;
const CALIBRATION_MIN_PPMM = CALIBRATION_MIN_PX / CARD_WIDTH_MM;
const CALIBRATION_MAX_PPMM = CALIBRATION_MAX_PX / CARD_WIDTH_MM;
const RULER_REFERENCE_CM_MM = 100;
const RULER_REFERENCE_IN_MM = 4 * MM_PER_INCH;
const EDGE_MARGIN = 34;
const NEXT_ROTATION: Record<Rotation, Rotation> = {0: 90, 90: 180, 180: 270, 270: 0};
const FLIP_EDGE: Record<Rotation, Rotation> = {0: 180, 90: 270, 180: 0, 270: 90};
const MOUSE_BUTTON_MIDDLE = 1;
const MOUSE_BUTTON_RIGHT = 2;

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));
const mod = (n: number, m: number) => ((n % m) + m) % m;
const rulerReferenceMm = (unit: RulerUnit) => unit === "in" ? RULER_REFERENCE_IN_MM : RULER_REFERENCE_CM_MM;

const buildRulerTicks = (unit: RulerUnit): { frac: number; major: boolean; label?: string }[] => {
    const steps = unit === "in" ? 8 : 20;
    return Array.from({length: steps + 1}, (_, i) => {
        const isMajor = i % 2 === 0;
        return {frac: i / steps, major: isMajor, label: isMajor ? String(i / 2) : undefined};
    });
};

const RulerTool = () => {
    const {t} = useTranslation();
    const theme = useTheme();
    const [pixelsPerMm, setPixelsPerMm] = useLocalStorageState("ruler.pixelsPerMm", DEFAULT_PIXELS_PER_MM);
    const [calibrated, setCalibrated] = useLocalStorageState("ruler.calibrated", false);
    const [unitSystem, setUnitSystem] = useLocalStorageState<UnitSystem>("ruler.unitSystem", "metric");
    const [rotation, setRotation] = useLocalStorageState<Rotation>("ruler.rotation", 0);

    const containerRef = React.useRef<HTMLDivElement | null>(null);
    const canvasRef = React.useRef<HTMLCanvasElement | null>(null);
    const initializedMarkersRef = React.useRef(false);
    const pointersRef = React.useRef(new Map<number, PointerInfo>());
    const markerDragRef = React.useRef<{ marker: "a" | "b"; pointerId: number } | null>(null);
    const panStateRef = React.useRef<PanState | null>(null);

    const [containerSize, setContainerSize] = React.useState({width: 0, height: 0});
    const [isFullscreen, setIsFullscreen] = React.useState(false);
    const [markerA, setMarkerA] = React.useState(0);
    const [markerB, setMarkerB] = React.useState(0);
    const [panOffset, setPanOffset] = React.useState(0);
    const [crossDragOffset, setCrossDragOffset] = React.useState(0);
    const [calibrationOpen, setCalibrationOpen] = React.useState(false);
    const [calibrationMode, setCalibrationMode] = React.useState<CalibrationMode>("card");
    const [calibrationLongEdgePx, setCalibrationLongEdgePx] = React.useState(CARD_WIDTH_MM * DEFAULT_PIXELS_PER_MM);
    const [calibrationRulerUnit, setCalibrationRulerUnit] = React.useState<RulerUnit>(unitSystem === "imperial" ? "in" : "cm");
    const [calibrationRulerWidthPx, setCalibrationRulerWidthPx] = React.useState(RULER_REFERENCE_CM_MM * DEFAULT_PIXELS_PER_MM);
    const [helpAnchor, setHelpAnchor] = React.useState<HTMLElement | null>(null);
    const [panelCollapsed, setPanelCollapsed] = React.useState(false);
    const fullScreenCalibration = useMediaQuery(theme.breakpoints.down("md"));

    const orientation: "horizontal" | "vertical" = rotation === 90 || rotation === 270 ? "vertical" : "horizontal";
    const mirrored = rotation === 180 || rotation === 270;
    const axisLength = orientation === "vertical" ? containerSize.height : containerSize.width;
    const crossLength = orientation === "vertical" ? containerSize.width : containerSize.height;
    const edgeOffset = mirrored ? crossLength : 0;
    const tickDir = mirrored ? -1 : 1;

    const screenToLogical = React.useCallback(
        (screenPx: number) => (mirrored ? axisLength - screenPx : screenPx) + panOffset,
        [mirrored, axisLength, panOffset]
    );
    const logicalToScreen = React.useCallback(
        (logical: number) => {
            const raw = logical - panOffset;
            return mirrored ? axisLength - raw : raw;
        },
        [mirrored, axisLength, panOffset]
    );

    React.useEffect(() => {
        const element = containerRef.current;
        if (!element) return;
        const observer = new ResizeObserver(entries => {
            const entry = entries[0];
            if (entry) setContainerSize({width: entry.contentRect.width, height: entry.contentRect.height});
        });
        observer.observe(element);
        return () => observer.disconnect();
    }, []);

    React.useEffect(() => {
        if (axisLength <= 0 || initializedMarkersRef.current) return;
        initializedMarkersRef.current = true;
        const defaultSpan = clamp(pixelsPerMm * 50, 40, axisLength - 40);
        setMarkerA(20);
        setMarkerB(20 + defaultSpan);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [axisLength]);

    React.useEffect(() => {
        setPanOffset(0);
        setCrossDragOffset(0);
    }, [rotation]);

    React.useEffect(() => {
        const handleFullscreenChange = () => setIsFullscreen(document.fullscreenElement === containerRef.current);
        document.addEventListener("fullscreenchange", handleFullscreenChange);
        return () => document.removeEventListener("fullscreenchange", handleFullscreenChange);
    }, []);

    const toggleFullscreen = () => {
        if (document.fullscreenElement) {
            void document.exitFullscreen();
        } else {
            void containerRef.current?.requestFullscreen();
        }
    };

    const cycleRotation = () => setRotation(current => NEXT_ROTATION[current]);
    const resetView = () => {
        setPanOffset(0);
        setCrossDragOffset(0);
    };

    const draw = React.useCallback(() => {
        const canvas = canvasRef.current;
        if (!canvas || axisLength <= 0 || crossLength <= 0) return;
        const context = canvas.getContext("2d");
        if (!context) return;

        const cssWidth = containerSize.width;
        const cssHeight = containerSize.height;
        const dpr = window.devicePixelRatio || 1;
        canvas.width = cssWidth * dpr;
        canvas.height = cssHeight * dpr;
        canvas.style.width = `${cssWidth}px`;
        canvas.style.height = `${cssHeight}px`;
        context.setTransform(dpr, 0, 0, dpr, 0, 0);

        const bgColor = theme.palette.background.paper;
        const tickColor = theme.palette.text.secondary;
        const majorTickColor = theme.palette.text.primary;
        const gridMinorColor = theme.palette.mode === "dark" ? "rgba(255, 255, 255, 0.05)" : "rgba(0, 0, 0, 0.05)";
        const gridMajorColor = theme.palette.mode === "dark" ? "rgba(255, 255, 255, 0.12)" : "rgba(0, 0, 0, 0.12)";
        const zeroLineColor = theme.palette.mode === "dark" ? "rgba(144, 202, 249, 0.6)" : "rgba(25, 118, 210, 0.5)";
        const highlightColor = theme.palette.mode === "dark" ? "rgba(144, 202, 249, 0.18)" : "rgba(25, 118, 210, 0.12)";
        const markerAColor = theme.palette.primary.main;
        const markerBColor = theme.palette.error.main;

        context.clearRect(0, 0, cssWidth, cssHeight);
        context.fillStyle = bgColor;
        context.fillRect(0, 0, cssWidth, cssHeight);

        const effectiveEdgeOffset = clamp(edgeOffset + crossDragOffset, 0, crossLength);

        const drawGridLine = (pos: number, level: "minor" | "major" | "zero") => {
            const coord = logicalToScreen(pos);
            context.beginPath();
            if (orientation === "horizontal") {
                context.moveTo(coord, 0);
                context.lineTo(coord, crossLength);
            } else {
                context.moveTo(0, coord);
                context.lineTo(crossLength, coord);
            }
            context.strokeStyle = level === "zero" ? zeroLineColor : level === "major" ? gridMajorColor : gridMinorColor;
            context.lineWidth = level === "zero" ? 1.5 : 1;
            context.stroke();
        };

        const drawTick = (pos: number, tickHeight: number, bold: boolean) => {
            const coord = logicalToScreen(pos);
            const from = effectiveEdgeOffset;
            const to = effectiveEdgeOffset + tickDir * tickHeight;
            context.beginPath();
            if (orientation === "horizontal") {
                context.moveTo(coord, from);
                context.lineTo(coord, to);
            } else {
                context.moveTo(from, coord);
                context.lineTo(to, coord);
            }
            context.strokeStyle = bold ? majorTickColor : tickColor;
            context.lineWidth = bold ? 1.5 : 1;
            context.stroke();
        };

        const drawLabel = (pos: number, label: string) => {
            const coord = logicalToScreen(pos);
            const labelCoord = effectiveEdgeOffset + tickDir * EDGE_MARGIN;
            context.fillStyle = majorTickColor;
            context.font = "12px sans-serif";
            context.textAlign = "center";
            context.textBaseline = tickDir === 1 ? "hanging" : "alphabetic";
            if (orientation === "horizontal") {
                context.fillText(label, coord, labelCoord);
            } else {
                context.save();
                context.translate(labelCoord, coord);
                context.rotate(mirrored ? Math.PI / 2 : -Math.PI / 2);
                context.fillText(label, 0, 0);
                context.restore();
            }
        };

        const visibleStart = panOffset;
        const visibleEnd = panOffset + axisLength;

        if (unitSystem === "px") {
            const step = 10;
            const first = Math.floor(visibleStart / step) * step;
            for (let x = first; x <= visibleEnd; x += step) {
                const isMajor = mod(x, 100) === 0;
                const isMedium = mod(x, 50) === 0;
                if (isMajor) drawGridLine(x, x === 0 ? "zero" : "major");
                else if (isMedium) drawGridLine(x, "minor");
                drawTick(x, isMajor ? 28 : isMedium ? 18 : 10, isMajor);
                if (isMajor) drawLabel(x, String(x));
            }
        } else if (unitSystem === "imperial") {
            const pixelsPerInch = pixelsPerMm * MM_PER_INCH;
            const sixteenthPx = pixelsPerInch / 16;
            const firstI = Math.floor(visibleStart / sixteenthPx) - 1;
            const lastI = Math.ceil(visibleEnd / sixteenthPx) + 1;
            for (let i = firstI; i <= lastI; i++) {
                const x = i * sixteenthPx;
                const isInch = mod(i, 16) === 0;
                const isHalf = mod(i, 8) === 0;
                const isQuarter = mod(i, 4) === 0;
                const isEighth = mod(i, 2) === 0;
                if (!isEighth && sixteenthPx < 4) continue;
                if (!isQuarter && pixelsPerInch / 8 < 4) continue;
                const tickHeight = isInch ? 28 : isHalf ? 20 : isQuarter ? 16 : isEighth ? 12 : 8;
                if (isInch) drawGridLine(x, i === 0 ? "zero" : "major");
                else if (isHalf) drawGridLine(x, "minor");
                drawTick(x, tickHeight, isInch);
                if (isInch) drawLabel(x, String(i / 16));
            }
        } else {
            const skipMm = pixelsPerMm < 2;
            const firstMm = Math.floor(visibleStart / pixelsPerMm) - 1;
            const lastMm = Math.ceil(visibleEnd / pixelsPerMm) + 1;
            for (let mm = firstMm; mm <= lastMm; mm++) {
                const x = mm * pixelsPerMm;
                const isCm = mod(mm, 10) === 0;
                const isHalfCm = mod(mm, 5) === 0;
                if (!isCm && skipMm) continue;
                if (isCm) drawGridLine(x, mm === 0 ? "zero" : "major");
                else if (isHalfCm) drawGridLine(x, "minor");
                drawTick(x, isCm ? 28 : isHalfCm ? 18 : 10, isCm);
                if (isCm) drawLabel(x, String(mm / 10));
            }
        }

        const markerAScreen = logicalToScreen(markerA);
        const markerBScreen = logicalToScreen(markerB);
        const left = Math.min(markerAScreen, markerBScreen);
        const right = Math.max(markerAScreen, markerBScreen);
        context.fillStyle = highlightColor;
        if (orientation === "horizontal") context.fillRect(left, 0, right - left, crossLength);
        else context.fillRect(0, left, crossLength, right - left);

        const drawMarker = (logicalPos: number, color: string) => {
            const coord = logicalToScreen(logicalPos);
            context.strokeStyle = color;
            context.lineWidth = 2;
            context.beginPath();
            if (orientation === "horizontal") {
                context.moveTo(coord, 0);
                context.lineTo(coord, crossLength);
            } else {
                context.moveTo(0, coord);
                context.lineTo(crossLength, coord);
            }
            context.stroke();

            const tipCoord = effectiveEdgeOffset + tickDir * 12;
            context.fillStyle = color;
            context.beginPath();
            if (orientation === "horizontal") {
                context.moveTo(coord - 7, effectiveEdgeOffset);
                context.lineTo(coord + 7, effectiveEdgeOffset);
                context.lineTo(coord, tipCoord);
            } else {
                context.moveTo(effectiveEdgeOffset, coord - 7);
                context.lineTo(effectiveEdgeOffset, coord + 7);
                context.lineTo(tipCoord, coord);
            }
            context.closePath();
            context.fill();
        };
        drawMarker(markerA, markerAColor);
        drawMarker(markerB, markerBColor);
    }, [axisLength, crossLength, containerSize, orientation, mirrored, edgeOffset, tickDir, pixelsPerMm, unitSystem, markerA, markerB, panOffset, crossDragOffset, logicalToScreen, theme]);

    React.useEffect(() => {
        draw();
    }, [draw]);

    const getAxisPos = (clientX: number, clientY: number) => {
        const canvas = canvasRef.current;
        if (!canvas) return 0;
        const rect = canvas.getBoundingClientRect();
        const raw = orientation === "horizontal" ? clientX - rect.left : clientY - rect.top;
        return clamp(raw, 0, axisLength);
    };

    const axisClientCoord = (clientX: number, clientY: number) => orientation === "horizontal" ? clientX : clientY;
    const crossClientCoord = (clientX: number, clientY: number) => orientation === "horizontal" ? clientY : clientX;

    const averageAxisCoord = (pointerIds: number[]) => {
        const coords = pointerIds.map(id => pointersRef.current.get(id)?.axisCoord).filter((value): value is number => value !== undefined);
        if (!coords.length) return 0;
        return coords.reduce((sum, value) => sum + value, 0) / coords.length;
    };

    const averageCrossCoord = (pointerIds: number[]) => {
        const coords = pointerIds.map(id => pointersRef.current.get(id)?.crossCoord).filter((value): value is number => value !== undefined);
        if (!coords.length) return 0;
        return coords.reduce((sum, value) => sum + value, 0) / coords.length;
    };

    const startPan = (pointerIds: number[]) => {
        panStateRef.current = {
            pointerIds,
            startAxisAvg: averageAxisCoord(pointerIds),
            startPanOffset: panOffset,
            startCrossAvg: averageCrossCoord(pointerIds),
            startCrossOffset: crossDragOffset
        };
    };

    const handlePointerDown = (event: React.PointerEvent<HTMLCanvasElement>) => {
        pointersRef.current.set(event.pointerId, {axisCoord: axisClientCoord(event.clientX, event.clientY), crossCoord: crossClientCoord(event.clientX, event.clientY)});
        event.currentTarget.setPointerCapture(event.pointerId);

        if (event.pointerType === "touch" && pointersRef.current.size >= 2) {
            markerDragRef.current = null;
            startPan(Array.from(pointersRef.current.keys()).slice(-2));
            return;
        }

        if (event.pointerType !== "touch" && (event.button === MOUSE_BUTTON_MIDDLE || event.button === MOUSE_BUTTON_RIGHT)) {
            startPan([event.pointerId]);
            return;
        }

        if (event.pointerType !== "touch" && event.button !== 0) return;

        const screenX = getAxisPos(event.clientX, event.clientY);
        const markerAScreen = logicalToScreen(markerA);
        const markerBScreen = logicalToScreen(markerB);
        const distanceToA = Math.abs(screenX - markerAScreen);
        const distanceToB = Math.abs(screenX - markerBScreen);
        if (distanceToA <= MARKER_HIT_RADIUS && distanceToA <= distanceToB) {
            markerDragRef.current = {marker: "a", pointerId: event.pointerId};
        } else if (distanceToB <= MARKER_HIT_RADIUS) {
            markerDragRef.current = {marker: "b", pointerId: event.pointerId};
        } else if (distanceToA < distanceToB) {
            markerDragRef.current = {marker: "a", pointerId: event.pointerId};
            setMarkerA(screenToLogical(screenX));
        } else {
            markerDragRef.current = {marker: "b", pointerId: event.pointerId};
            setMarkerB(screenToLogical(screenX));
        }
    };

    const handlePointerMove = (event: React.PointerEvent<HTMLCanvasElement>) => {
        if (pointersRef.current.has(event.pointerId)) {
            pointersRef.current.set(event.pointerId, {axisCoord: axisClientCoord(event.clientX, event.clientY), crossCoord: crossClientCoord(event.clientX, event.clientY)});
        }

        if (panStateRef.current) {
            const {pointerIds, startAxisAvg, startPanOffset, startCrossAvg, startCrossOffset} = panStateRef.current;
            const axisDelta = averageAxisCoord(pointerIds) - startAxisAvg;
            setPanOffset(startPanOffset + (mirrored ? axisDelta : -axisDelta));
            const crossDelta = averageCrossCoord(pointerIds) - startCrossAvg;
            setCrossDragOffset(startCrossOffset + crossDelta);
            return;
        }

        if (!markerDragRef.current || markerDragRef.current.pointerId !== event.pointerId) return;
        const screenX = getAxisPos(event.clientX, event.clientY);
        const logical = screenToLogical(screenX);
        if (markerDragRef.current.marker === "a") setMarkerA(logical);
        else setMarkerB(logical);
    };

    const handlePointerUp = (event: React.PointerEvent<HTMLCanvasElement>) => {
        pointersRef.current.delete(event.pointerId);
        if (panStateRef.current?.pointerIds.includes(event.pointerId)) {
            if (crossLength > 0) {
                const liveEdgeCoord = clamp(edgeOffset + crossDragOffset, 0, crossLength);
                const pastThreshold = edgeOffset === 0
                    ? liveEdgeCoord > crossLength * ROTATE_DRAG_THRESHOLD
                    : liveEdgeCoord < crossLength * (1 - ROTATE_DRAG_THRESHOLD);
                // Only snap when the ruler is dragged almost all the way to the opposite edge (rotation
                // flips, which itself resets crossDragOffset via the rotation effect below). Otherwise
                // leave the ruler wherever it was released -- e.g. resting in the middle of the screen
                // is a valid position, and a moderate drag shouldn't accidentally trigger a flip.
                if (pastThreshold) setRotation(current => FLIP_EDGE[current]);
            }
            panStateRef.current = null;
        }
        if (markerDragRef.current?.pointerId === event.pointerId) markerDragRef.current = null;
    };

    const distancePx = Math.abs(markerB - markerA);
    const measurementText = unitSystem === "px"
        ? t("ruler.measurementPx", {pixels: Math.round(distancePx)})
        : unitSystem === "imperial"
            ? t("ruler.measurement", {value: `${(distancePx / (pixelsPerMm * MM_PER_INCH)).toFixed(2)} in`, pixels: Math.round(distancePx)})
            : t("ruler.measurement", {value: `${(distancePx / pixelsPerMm / 10).toFixed(2)} cm`, pixels: Math.round(distancePx)});

    const openCalibration = () => {
        setCalibrationLongEdgePx(clamp(CARD_WIDTH_MM * pixelsPerMm, CALIBRATION_MIN_PX, CALIBRATION_MAX_PX));
        const refMm = rulerReferenceMm(calibrationRulerUnit);
        setCalibrationRulerWidthPx(clamp(refMm * pixelsPerMm, refMm * CALIBRATION_MIN_PPMM, refMm * CALIBRATION_MAX_PPMM));
        setCalibrationOpen(true);
    };

    const changeRulerUnit = (unit: RulerUnit) => {
        const currentPpmm = calibrationRulerWidthPx / rulerReferenceMm(calibrationRulerUnit);
        const newRefMm = rulerReferenceMm(unit);
        setCalibrationRulerUnit(unit);
        setCalibrationRulerWidthPx(clamp(currentPpmm * newRefMm, newRefMm * CALIBRATION_MIN_PPMM, newRefMm * CALIBRATION_MAX_PPMM));
    };

    const saveCalibration = () => {
        if (calibrationMode === "card") {
            setPixelsPerMm(calibrationLongEdgePx / CARD_WIDTH_MM);
        } else {
            setPixelsPerMm(calibrationRulerWidthPx / rulerReferenceMm(calibrationRulerUnit));
        }
        setCalibrated(true);
        setCalibrationOpen(false);
    };

    const resetCalibration = () => {
        if (calibrationMode === "card") {
            setCalibrationLongEdgePx(CARD_WIDTH_MM * DEFAULT_PIXELS_PER_MM);
        } else {
            setCalibrationRulerWidthPx(rulerReferenceMm(calibrationRulerUnit) * DEFAULT_PIXELS_PER_MM);
        }
    };

    const currentPpi = Math.round(pixelsPerMm * MM_PER_INCH);
    const calibrationShortEdgePx = calibrationLongEdgePx * (CARD_HEIGHT_MM / CARD_WIDTH_MM);
    const calibrationPreviewPpi = calibrationMode === "card"
        ? Math.round((calibrationLongEdgePx / CARD_WIDTH_MM) * MM_PER_INCH)
        : Math.round((calibrationRulerWidthPx / rulerReferenceMm(calibrationRulerUnit)) * MM_PER_INCH);
    const rulerTicks = buildRulerTicks(calibrationRulerUnit);

    const panelVerticalAnchor: "top" | "bottom" = orientation === "horizontal" ? (mirrored ? "top" : "bottom") : "top";
    const panelHorizontalAnchor: "left" | "right" = orientation === "vertical" ? (mirrored ? "left" : "right") : "left";

    return (
        <Box sx={{position: "relative", width: "100%", flex: 1, minHeight: 480}}>
            <Box
                ref={containerRef}
                dir="ltr"
                sx={{
                    position: "absolute",
                    inset: 0,
                    bgcolor: "background.paper",
                    overflow: "hidden"
                }}
            >
                <canvas
                    ref={canvasRef}
                    onPointerDown={handlePointerDown}
                    onPointerMove={handlePointerMove}
                    onPointerUp={handlePointerUp}
                    onPointerCancel={handlePointerUp}
                    onContextMenu={event => event.preventDefault()}
                    style={{touchAction: "none", cursor: orientation === "horizontal" ? "ew-resize" : "ns-resize", display: "block"}}
                />

                <Zoom in={panelCollapsed} unmountOnExit>
                    <Tooltip title={t("ruler.expand")}>
                        <Fab
                            color="primary"
                            onClick={() => setPanelCollapsed(false)}
                            sx={{
                                position: "absolute",
                                zIndex: 1,
                                top: panelVerticalAnchor === "top" ? 16 : "auto",
                                bottom: panelVerticalAnchor === "bottom" ? 16 : "auto",
                                left: panelHorizontalAnchor === "left" ? 16 : "auto",
                                right: panelHorizontalAnchor === "right" ? 16 : "auto"
                            }}
                        >
                            <StraightenIcon/>
                        </Fab>
                    </Tooltip>
                </Zoom>

                <Grow in={!panelCollapsed} unmountOnExit>
                <Paper
                    elevation={6}
                    sx={{
                        position: "absolute",
                        zIndex: 1,
                        top: panelVerticalAnchor === "top" ? 16 : "auto",
                        bottom: panelVerticalAnchor === "bottom" ? 16 : "auto",
                        left: panelHorizontalAnchor === "left" ? 16 : {xs: 16, sm: "auto"},
                        right: panelHorizontalAnchor === "right" ? 16 : {xs: 16, sm: "auto"},
                        width: {xs: "auto", sm: 300},
                        maxWidth: 340,
                        maxHeight: "calc(100% - 32px)",
                        overflow: "auto",
                        p: 2,
                        display: "flex",
                        flexDirection: "column",
                        gap: 1.5
                    }}
                >
                    <Stack direction="row" sx={{alignItems: "center"}}>
                        <Typography variant="subtitle2" sx={{flex: 1}}>{t("ruler.title")}</Typography>
                        <Tooltip title={t("ruler.collapse")}>
                            <IconButton size="small" onClick={() => setPanelCollapsed(true)}>
                                <UnfoldLessIcon fontSize="small"/>
                            </IconButton>
                        </Tooltip>
                    </Stack>
                    <Typography variant="h5">{measurementText}</Typography>
                    <Typography variant="caption" color={calibrated ? "success.main" : "warning.main"}>
                        {calibrated ? t("ruler.calibratedStatus", {ppi: currentPpi}) : t("ruler.notCalibrated")}
                    </Typography>

                    <FormControl size="small" fullWidth>
                        <InputLabel>{t("ruler.unitSystem")}</InputLabel>
                        <Select value={unitSystem} label={t("ruler.unitSystem")} onChange={(event: SelectChangeEvent) => setUnitSystem(event.target.value as UnitSystem)}>
                            <MenuItem value="metric">{t("ruler.unitOption.metric")}</MenuItem>
                            <MenuItem value="imperial">{t("ruler.unitOption.imperial")}</MenuItem>
                            <MenuItem value="px">{t("ruler.unitOption.px")}</MenuItem>
                        </Select>
                    </FormControl>

                    <Stack direction="row" spacing={1} sx={{alignItems: "center"}}>
                        <Tooltip title={t("ruler.calibrate")}>
                            <IconButton onClick={openCalibration}>
                                <StraightenIcon/>
                            </IconButton>
                        </Tooltip>
                        <Tooltip title={t("ruler.rotate")}>
                            <IconButton onClick={cycleRotation}>
                                <ScreenRotationIcon/>
                            </IconButton>
                        </Tooltip>
                        <Tooltip title={t("ruler.resetView")}>
                            <IconButton onClick={resetView}>
                                <RestartAltIcon/>
                            </IconButton>
                        </Tooltip>
                        <Tooltip title={isFullscreen ? t("ruler.exitFullscreen") : t("ruler.fullscreen")}>
                            <IconButton onClick={toggleFullscreen}>
                                {isFullscreen ? <FullscreenExitIcon/> : <FullscreenIcon/>}
                            </IconButton>
                        </Tooltip>
                        <Tooltip title={t("ruler.help.label")}>
                            <IconButton sx={{ml: "auto"}} onClick={event => setHelpAnchor(event.currentTarget)}>
                                <HelpOutlineIcon/>
                            </IconButton>
                        </Tooltip>
                    </Stack>
                </Paper>
                </Grow>

                <Popover
                    open={Boolean(helpAnchor)}
                    anchorEl={helpAnchor}
                    onClose={() => setHelpAnchor(null)}
                    anchorOrigin={{vertical: "bottom", horizontal: "right"}}
                    transformOrigin={{vertical: "top", horizontal: "right"}}
                    container={() => containerRef.current}
                >
                    <Box sx={{p: 2, maxWidth: 280}}>
                        <Typography variant="body2">{t("ruler.help.text")}</Typography>
                    </Box>
                </Popover>
            </Box>

            <Dialog
                open={calibrationOpen}
                onClose={() => setCalibrationOpen(false)}
                maxWidth="md"
                fullWidth
                fullScreen={fullScreenCalibration}
                container={() => containerRef.current}
            >
                <DialogTitle>{t("ruler.calibration.title")}</DialogTitle>
                <Tabs value={calibrationMode} onChange={(_, value) => setCalibrationMode(value)} variant="fullWidth" sx={{borderBottom: 1, borderColor: "divider"}}>
                    <Tab value="card" label={t("ruler.calibration.modeCard")}/>
                    <Tab value="ruler" label={t("ruler.calibration.modeRuler")}/>
                </Tabs>
                <DialogContent sx={{display: "flex", flexDirection: "column", flex: 1}}>
                    {calibrationMode === "card" ? (
                        <>
                            <DialogContentText sx={{mb: 2}}>{t("ruler.calibration.instructions")}</DialogContentText>
                            <Box sx={{flex: 1, display: "flex", alignItems: "center", justifyContent: "center", py: 3, minHeight: 0}}>
                                <Box
                                    sx={{
                                        width: calibrationShortEdgePx,
                                        height: calibrationLongEdgePx,
                                        border: 2,
                                        borderColor: "primary.main",
                                        borderRadius: 1.5,
                                        bgcolor: "action.hover",
                                        flexShrink: 0
                                    }}
                                />
                            </Box>
                            <Slider
                                value={calibrationLongEdgePx}
                                min={CALIBRATION_MIN_PX}
                                max={CALIBRATION_MAX_PX}
                                step={0.5}
                                onChange={(_, value) => setCalibrationLongEdgePx(value as number)}
                            />
                        </>
                    ) : (
                        <>
                            <DialogContentText sx={{mb: 2}}>{t("ruler.calibration.rulerInstructions")}</DialogContentText>
                            <ToggleButtonGroup
                                value={calibrationRulerUnit}
                                exclusive
                                size="small"
                                onChange={(_, value: RulerUnit | null) => value && changeRulerUnit(value)}
                                sx={{alignSelf: "center", mb: 2}}
                            >
                                <ToggleButton value="cm">{t("ruler.calibration.unitCm")}</ToggleButton>
                                <ToggleButton value="in">{t("ruler.calibration.unitIn")}</ToggleButton>
                            </ToggleButtonGroup>
                            <Box sx={{flex: 1, display: "flex", alignItems: "center", justifyContent: "center", overflowX: "auto", py: 3, minHeight: 0}}>
                                <Box sx={{position: "relative", width: calibrationRulerWidthPx, height: 56, flexShrink: 0}}>
                                    <Box sx={{position: "absolute", left: 0, right: 0, bottom: 18, height: 2, bgcolor: "text.primary"}}/>
                                    {rulerTicks.map((tick, index) => (
                                        <Box
                                            key={index}
                                            sx={{
                                                position: "absolute",
                                                left: `${tick.frac * 100}%`,
                                                bottom: 18,
                                                width: "1px",
                                                height: tick.major ? 18 : 10,
                                                bgcolor: "text.primary"
                                            }}
                                        />
                                    ))}
                                    {rulerTicks.filter(tick => tick.label !== undefined).map((tick, index) => (
                                        <Typography
                                            key={index}
                                            variant="caption"
                                            color="text.secondary"
                                            sx={{position: "absolute", left: `${tick.frac * 100}%`, bottom: 0, transform: "translateX(-50%)"}}
                                        >
                                            {tick.label}
                                        </Typography>
                                    ))}
                                </Box>
                            </Box>
                            <Slider
                                value={calibrationRulerWidthPx}
                                min={rulerReferenceMm(calibrationRulerUnit) * CALIBRATION_MIN_PPMM}
                                max={rulerReferenceMm(calibrationRulerUnit) * CALIBRATION_MAX_PPMM}
                                step={0.5}
                                onChange={(_, value) => setCalibrationRulerWidthPx(value as number)}
                            />
                        </>
                    )}
                    <Typography variant="body2" color="text.secondary" sx={{textAlign: "center"}}>
                        {t("ruler.calibration.currentPpi", {ppi: calibrationPreviewPpi})}
                    </Typography>
                </DialogContent>
                <DialogActions sx={{justifyContent: "space-between", px: 3}}>
                    <Tooltip title={t("ruler.calibration.resetTooltip")}>
                        <Button onClick={resetCalibration}>{t("ruler.calibration.reset")}</Button>
                    </Tooltip>
                    <Stack direction="row" spacing={1}>
                        <Button onClick={() => setCalibrationOpen(false)}>{t("ruler.calibration.cancel")}</Button>
                        <Button variant="contained" onClick={saveCalibration}>{t("ruler.calibration.save")}</Button>
                    </Stack>
                </DialogActions>
            </Dialog>
        </Box>
    );
};

export default RulerTool;
