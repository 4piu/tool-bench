import React from "react";
import ExploreIcon from "@mui/icons-material/Explore";
import FullscreenIcon from "@mui/icons-material/Fullscreen";
import FullscreenExitIcon from "@mui/icons-material/FullscreenExit";
import HelpOutlineIcon from "@mui/icons-material/HelpOutlineOutlined";
import RestartAltIcon from "@mui/icons-material/RestartAlt";
import UnfoldLessIcon from "@mui/icons-material/UnfoldLess";
import {
    Box,
    Fab,
    FormControl,
    FormControlLabel,
    Grow,
    IconButton,
    InputLabel,
    MenuItem,
    Paper,
    Popover,
    Select,
    Stack,
    Switch,
    Tooltip,
    Typography,
    Zoom
} from "@mui/material";
import type {SelectChangeEvent} from "@mui/material/Select";
import {useTheme} from "@mui/material/styles";
import {useTranslation} from "react-i18next";
import {useLocalStorageState} from "../shared/hooks";

type Point = { x: number; y: number };
type LineId = "a" | "b";
type DragTarget = { type: LineId | "vertex"; pointerId: number; pendingAngle?: number };
type PanState = { pointerIds: number[]; startAvg: Point; startVertex: Point };
type SnapStep = 0 | 1 | 5 | 10 | 15 | 30 | 45;

const RING_MARGIN = 64;
const MIN_RING_RADIUS = 60;
const HANDLE_HIT_RADIUS = 20;
const VERTEX_HIT_RADIUS = 24;
const SNAP_STEPS: SnapStep[] = [0, 1, 5, 10, 15, 30, 45];

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));
const mod = (n: number, m: number) => ((n % m) + m) % m;

const directionFor = (compassDeg: number) => {
    const rad = (compassDeg * Math.PI) / 180;
    return {dx: Math.sin(rad), dy: -Math.cos(rad)};
};

const angleFromVertex = (vertex: Point, point: Point) => {
    const dx = point.x - vertex.x;
    const dy = point.y - vertex.y;
    const mathDeg = (Math.atan2(dy, dx) * 180) / Math.PI;
    return mod(mathDeg + 90, 360);
};

const distance = (a: Point, b: Point) => Math.hypot(a.x - b.x, a.y - b.y);

const AngleTool = () => {
    const {t} = useTranslation();
    const theme = useTheme();

    const [showReflex, setShowReflex] = useLocalStorageState("angle.showReflex", false);
    const [snapStep, setSnapStep] = useLocalStorageState<SnapStep>("angle.snapStep", 0);
    const [panelCollapsed, setPanelCollapsed] = useLocalStorageState("angle.panelCollapsed", false);

    const containerRef = React.useRef<HTMLDivElement | null>(null);
    const canvasRef = React.useRef<HTMLCanvasElement | null>(null);
    const initializedRef = React.useRef(false);
    const pointersRef = React.useRef(new Map<number, Point>());
    const dragRef = React.useRef<DragTarget | null>(null);
    const panStateRef = React.useRef<PanState | null>(null);

    const [containerSize, setContainerSize] = React.useState({width: 0, height: 0});
    const [isFullscreen, setIsFullscreen] = React.useState(false);
    const [vertex, setVertex] = React.useState<Point>({x: 0, y: 0});
    const [angleA, setAngleA] = React.useState(0);
    const [angleB, setAngleB] = React.useState(90);
    const [helpAnchor, setHelpAnchor] = React.useState<HTMLElement | null>(null);

    const ringRadius = Math.max(MIN_RING_RADIUS, Math.min(containerSize.width, containerSize.height) / 2 - RING_MARGIN);

    const applySnap = React.useCallback((deg: number) => snapStep === 0 ? deg : mod(Math.round(deg / snapStep) * snapStep, 360), [snapStep]);

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
        if (containerSize.width <= 0 || containerSize.height <= 0 || initializedRef.current) return;
        initializedRef.current = true;
        setVertex({x: containerSize.width / 2, y: containerSize.height / 2});
    }, [containerSize]);

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

    const resetView = () => {
        setVertex({x: containerSize.width / 2, y: containerSize.height / 2});
        setAngleA(0);
        setAngleB(90);
    };

    const diff = mod(angleB - angleA, 360);
    const includedIsAtoB = diff <= 180;
    const included = includedIsAtoB ? diff : 360 - diff;
    const reflex = 360 - included;
    const displayed = showReflex ? reflex : included;
    const other = showReflex ? included : reflex;

    const draw = React.useCallback(() => {
        const canvas = canvasRef.current;
        if (!canvas || containerSize.width <= 0 || containerSize.height <= 0) return;
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
        const ringColor = theme.palette.text.secondary;
        const majorTickColor = theme.palette.text.primary;
        const minorTickColor = theme.palette.text.secondary;
        const highlightColor = theme.palette.mode === "dark" ? "rgba(144, 202, 249, 0.22)" : "rgba(25, 118, 210, 0.14)";
        const lineAColor = theme.palette.primary.main;
        const lineBColor = theme.palette.error.main;
        const vertexColor = theme.palette.text.primary;

        context.clearRect(0, 0, cssWidth, cssHeight);
        context.fillStyle = bgColor;
        context.fillRect(0, 0, cssWidth, cssHeight);

        if (ringRadius <= 0) return;
        const cx = vertex.x;
        const cy = vertex.y;

        context.strokeStyle = ringColor;
        context.lineWidth = 1;
        context.beginPath();
        context.arc(cx, cy, ringRadius, 0, Math.PI * 2);
        context.stroke();

        for (let deg = 0; deg < 360; deg += 10) {
            const major = mod(deg, 30) === 0;
            const dir = directionFor(deg);
            const inner = ringRadius - (major ? 14 : 8);
            context.strokeStyle = major ? majorTickColor : minorTickColor;
            context.lineWidth = major ? 1.5 : 1;
            context.beginPath();
            context.moveTo(cx + dir.dx * inner, cy + dir.dy * inner);
            context.lineTo(cx + dir.dx * ringRadius, cy + dir.dy * ringRadius);
            context.stroke();

            if (major) {
                const labelDir = directionFor(deg);
                const labelPos = {x: cx + labelDir.dx * (ringRadius + 16), y: cy + labelDir.dy * (ringRadius + 16)};
                context.fillStyle = majorTickColor;
                context.font = "12px sans-serif";
                context.textAlign = "center";
                context.textBaseline = "middle";
                context.fillText(String(deg), labelPos.x, labelPos.y);
            }
        }

        const wedgeStart = showReflex ? (includedIsAtoB ? angleB : angleA) : (includedIsAtoB ? angleA : angleB);
        const wedgeSweep = showReflex ? reflex : included;
        const wedgeStartRad = ((wedgeStart - 90) * Math.PI) / 180;
        const wedgeEndRad = ((wedgeStart + wedgeSweep - 90) * Math.PI) / 180;
        context.fillStyle = highlightColor;
        context.beginPath();
        context.moveTo(cx, cy);
        context.arc(cx, cy, ringRadius * 0.62, wedgeStartRad, wedgeEndRad, false);
        context.closePath();
        context.fill();

        const midDeg = wedgeStart + wedgeSweep / 2;
        const midDir = directionFor(midDeg);
        const labelRadius = ringRadius * 0.4;
        context.fillStyle = majorTickColor;
        context.font = "bold 14px sans-serif";
        context.textAlign = "center";
        context.textBaseline = "middle";
        context.fillText(`${displayed.toFixed(1)}°`, cx + midDir.dx * labelRadius, cy + midDir.dy * labelRadius);

        const rayLength = Math.hypot(cssWidth, cssHeight);
        const drawLine = (angleDeg: number, color: string) => {
            const dir = directionFor(angleDeg);
            const endX = cx + dir.dx * rayLength;
            const endY = cy + dir.dy * rayLength;
            context.strokeStyle = color;
            context.lineWidth = 2.5;
            context.beginPath();
            context.moveTo(cx, cy);
            context.lineTo(endX, endY);
            context.stroke();

            const handleX = cx + dir.dx * ringRadius;
            const handleY = cy + dir.dy * ringRadius;
            context.fillStyle = color;
            context.beginPath();
            context.arc(handleX, handleY, 7, 0, Math.PI * 2);
            context.fill();
        };
        drawLine(angleA, lineAColor);
        drawLine(angleB, lineBColor);

        context.fillStyle = vertexColor;
        context.beginPath();
        context.arc(cx, cy, 5, 0, Math.PI * 2);
        context.fill();
    }, [containerSize, ringRadius, vertex, angleA, angleB, showReflex, included, reflex, includedIsAtoB, displayed, theme]);

    React.useEffect(() => {
        draw();
    }, [draw]);

    const getCanvasPoint = (event: { clientX: number; clientY: number }): Point => {
        const canvas = canvasRef.current;
        if (!canvas) return {x: 0, y: 0};
        const rect = canvas.getBoundingClientRect();
        return {x: event.clientX - rect.left, y: event.clientY - rect.top};
    };

    const averagePoint = (pointerIds: number[]): Point => {
        const points = pointerIds.map(id => pointersRef.current.get(id)).filter((value): value is Point => value !== undefined);
        if (!points.length) return {x: 0, y: 0};
        return {
            x: points.reduce((sum, point) => sum + point.x, 0) / points.length,
            y: points.reduce((sum, point) => sum + point.y, 0) / points.length
        };
    };

    const handlePointerDown = (event: React.PointerEvent<HTMLCanvasElement>) => {
        const point = getCanvasPoint(event);
        pointersRef.current.set(event.pointerId, point);
        event.currentTarget.setPointerCapture(event.pointerId);

        if (event.pointerType === "touch" && pointersRef.current.size >= 2) {
            dragRef.current = null;
            const pointerIds = Array.from(pointersRef.current.keys()).slice(-2);
            panStateRef.current = {pointerIds, startAvg: averagePoint(pointerIds), startVertex: vertex};
            return;
        }

        if (event.pointerType !== "touch" && (event.button === 1 || event.button === 2)) {
            panStateRef.current = {pointerIds: [event.pointerId], startAvg: point, startVertex: vertex};
            return;
        }

        if (event.pointerType !== "touch" && event.button !== 0) return;

        const dirA = directionFor(angleA);
        const dirB = directionFor(angleB);
        const handleA = {x: vertex.x + dirA.dx * ringRadius, y: vertex.y + dirA.dy * ringRadius};
        const handleB = {x: vertex.x + dirB.dx * ringRadius, y: vertex.y + dirB.dy * ringRadius};
        const distA = distance(point, handleA);
        const distB = distance(point, handleB);
        const distVertex = distance(point, vertex);

        if (distA <= HANDLE_HIT_RADIUS && distA <= distB && distA <= distVertex) {
            dragRef.current = {type: "a", pointerId: event.pointerId};
        } else if (distB <= HANDLE_HIT_RADIUS && distB <= distVertex) {
            dragRef.current = {type: "b", pointerId: event.pointerId};
        } else if (distVertex <= VERTEX_HIT_RADIUS) {
            dragRef.current = {type: "vertex", pointerId: event.pointerId};
            panStateRef.current = {pointerIds: [event.pointerId], startAvg: point, startVertex: vertex};
        } else if (event.pointerType === "touch") {
            // Don't commit the snap yet -- a second finger may land right after this one to start
            // a pan gesture. Apply it lazily on the first move (confirms a real single-finger drag)
            // or on pointer-up if it turns out to just be a tap.
            const clickAngle = applySnap(angleFromVertex(vertex, point));
            dragRef.current = {type: distA <= distB ? "a" : "b", pointerId: event.pointerId, pendingAngle: clickAngle};
        } else {
            const clickAngle = applySnap(angleFromVertex(vertex, point));
            if (distA <= distB) {
                setAngleA(clickAngle);
                dragRef.current = {type: "a", pointerId: event.pointerId};
            } else {
                setAngleB(clickAngle);
                dragRef.current = {type: "b", pointerId: event.pointerId};
            }
        }
    };

    const handlePointerMove = (event: React.PointerEvent<HTMLCanvasElement>) => {
        const point = getCanvasPoint(event);
        if (pointersRef.current.has(event.pointerId)) pointersRef.current.set(event.pointerId, point);

        if (panStateRef.current) {
            const {pointerIds, startAvg, startVertex} = panStateRef.current;
            const avg = averagePoint(pointerIds);
            setVertex({
                x: clamp(startVertex.x + (avg.x - startAvg.x), 0, containerSize.width),
                y: clamp(startVertex.y + (avg.y - startAvg.y), 0, containerSize.height)
            });
            return;
        }

        if (!dragRef.current || dragRef.current.pointerId !== event.pointerId) return;
        if (dragRef.current.type === "vertex") return;

        if (dragRef.current.pendingAngle !== undefined) dragRef.current = {type: dragRef.current.type, pointerId: dragRef.current.pointerId};

        const angle = applySnap(angleFromVertex(vertex, point));
        if (dragRef.current.type === "a") setAngleA(angle);
        else setAngleB(angle);
    };

    const handlePointerUp = (event: React.PointerEvent<HTMLCanvasElement>) => {
        pointersRef.current.delete(event.pointerId);
        if (panStateRef.current?.pointerIds.includes(event.pointerId)) panStateRef.current = null;
        if (dragRef.current?.pointerId === event.pointerId) {
            if (dragRef.current.pendingAngle !== undefined) {
                if (dragRef.current.type === "a") setAngleA(dragRef.current.pendingAngle);
                else if (dragRef.current.type === "b") setAngleB(dragRef.current.pendingAngle);
            }
            dragRef.current = null;
        }
    };

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
                    style={{touchAction: "none", cursor: "pointer", display: "block"}}
                />

                <Zoom in={panelCollapsed} unmountOnExit>
                    <Tooltip title={t("angle.expand")}>
                        <Fab
                            color="primary"
                            onClick={() => setPanelCollapsed(false)}
                            sx={{position: "absolute", zIndex: 1, top: 16, right: 16}}
                        >
                            <ExploreIcon/>
                        </Fab>
                    </Tooltip>
                </Zoom>

                <Grow in={!panelCollapsed} unmountOnExit>
                    <Paper
                        elevation={6}
                        sx={{
                            position: "absolute",
                            zIndex: 1,
                            top: 16,
                            left: {xs: 16, sm: "auto"},
                            right: 16,
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
                            <Typography variant="subtitle2" sx={{flex: 1}}>{t("angle.title")}</Typography>
                            <Tooltip title={t("angle.collapse")}>
                                <IconButton size="small" onClick={() => setPanelCollapsed(true)}>
                                    <UnfoldLessIcon fontSize="small"/>
                                </IconButton>
                            </Tooltip>
                        </Stack>

                        <Typography variant="h5">{displayed.toFixed(1)}°</Typography>
                        <Typography variant="caption" color="text.secondary">
                            {t(showReflex ? "angle.includedLabel" : "angle.reflexLabel")}: {other.toFixed(1)}°
                        </Typography>

                        <FormControlLabel
                            control={<Switch size="small" checked={showReflex} onChange={event => setShowReflex(event.target.checked)}/>}
                            label={t("angle.reflex")}
                        />

                        <FormControl size="small" fullWidth>
                            <InputLabel>{t("angle.snap")}</InputLabel>
                            <Select
                                value={String(snapStep)}
                                label={t("angle.snap")}
                                onChange={(event: SelectChangeEvent) => setSnapStep(Number(event.target.value) as SnapStep)}
                            >
                                {SNAP_STEPS.map(step => (
                                    <MenuItem key={step} value={String(step)}>
                                        {step === 0 ? t("angle.snapOption.off") : `${step}°`}
                                    </MenuItem>
                                ))}
                            </Select>
                        </FormControl>

                        <Stack direction="row" spacing={1} sx={{alignItems: "center"}}>
                            <Tooltip title={t("angle.resetView")}>
                                <IconButton onClick={resetView}>
                                    <RestartAltIcon/>
                                </IconButton>
                            </Tooltip>
                            <Tooltip title={isFullscreen ? t("angle.exitFullscreen") : t("angle.fullscreen")}>
                                <IconButton onClick={toggleFullscreen}>
                                    {isFullscreen ? <FullscreenExitIcon/> : <FullscreenIcon/>}
                                </IconButton>
                            </Tooltip>
                            <Tooltip title={t("angle.help.label")}>
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
                        <Typography variant="body2">{t("angle.help.text")}</Typography>
                    </Box>
                </Popover>
            </Box>
        </Box>
    );
};

export default AngleTool;
