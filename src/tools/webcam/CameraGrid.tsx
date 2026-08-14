import React from "react";
import AddIcon from "@mui/icons-material/Add";
import FullscreenIcon from "@mui/icons-material/Fullscreen";
import FullscreenExitIcon from "@mui/icons-material/FullscreenExit";
import RemoveIcon from "@mui/icons-material/Remove";
import VideocamIcon from "@mui/icons-material/Videocam";
import {Box, Button, IconButton, Snackbar, Stack, Tooltip, Typography} from "@mui/material";
import {useTranslation} from "react-i18next";
import {useFullscreen, useLocalStorageState} from "../shared/hooks";
import {CameraView} from "./CameraView";

type GridCell = { id: string; deviceId: string | null };

const MIN_COLUMNS = 1;
const MAX_COLUMNS = 6;
const DEFAULT_CELLS: GridCell[] = [{id: "cell-1", deviceId: null}, {id: "cell-2", deviceId: null}];

let cellCounter = 0;
const nextCellId = () => `cell-${++cellCounter}-${Math.random().toString(36).slice(2, 7)}`;

export const CameraGrid = ({devices, onActive}: { devices: MediaDeviceInfo[]; onActive?: () => void }) => {
    const {t} = useTranslation();
    const [columns, setColumns] = useLocalStorageState("webcam.grid.columns", 2);
    const [cells, setCells] = useLocalStorageState<GridCell[]>("webcam.grid.cells", DEFAULT_CELLS);
    const containerRef = React.useRef<HTMLDivElement | null>(null);
    const {isFullscreen, toggle: toggleFullscreen, isSupported: fullscreenSupported, error: fullscreenError, clearError: clearFullscreenError} = useFullscreen(containerRef);

    const addCell = () => {
        const usedDeviceIds = new Set(cells.map(cell => cell.deviceId).filter(Boolean));
        const nextDevice = devices.find(device => !usedDeviceIds.has(device.deviceId));
        setCells(current => [...current, {id: nextCellId(), deviceId: nextDevice?.deviceId ?? null}]);
    };

    const removeCell = (id: string) => setCells(current => current.filter(cell => cell.id !== id));

    const updateCell = (id: string, deviceId: string | null) => {
        setCells(current => current.map(cell => cell.id === id ? {...cell, deviceId} : cell));
    };

    return (
        <Stack spacing={2} sx={{flex: 1, minHeight: 0}}>
            <Stack direction="row" spacing={1} sx={{alignItems: "center", flexWrap: "wrap"}}>
                <Button startIcon={<AddIcon/>} onClick={addCell} variant="outlined" size="small">
                    {t("webcam.addCamera")}
                </Button>

                <Stack direction="row" spacing={0.5} sx={{alignItems: "center"}}>
                    <Typography variant="caption" color="text.secondary">{t("webcam.columns")}</Typography>
                    <Tooltip title={t("webcam.fewerColumns")}>
                        <span>
                            <IconButton
                                aria-label={t("webcam.fewerColumns")}
                                size="small"
                                disabled={columns <= MIN_COLUMNS}
                                onClick={() => setColumns(value => Math.max(MIN_COLUMNS, value - 1))}
                            >
                                <RemoveIcon fontSize="small"/>
                            </IconButton>
                        </span>
                    </Tooltip>
                    <Typography sx={{minWidth: 16, textAlign: "center"}}>{columns}</Typography>
                    <Tooltip title={t("webcam.moreColumns")}>
                        <span>
                            <IconButton
                                aria-label={t("webcam.moreColumns")}
                                size="small"
                                disabled={columns >= MAX_COLUMNS}
                                onClick={() => setColumns(value => Math.min(MAX_COLUMNS, value + 1))}
                            >
                                <AddIcon fontSize="small"/>
                            </IconButton>
                        </span>
                    </Tooltip>
                </Stack>

                <Tooltip title={isFullscreen ? t("webcam.exitFullscreen") : t("webcam.fullscreenGrid")}>
                    <span>
                        <IconButton
                            aria-label={isFullscreen ? t("webcam.exitFullscreen") : t("webcam.fullscreenGrid")}
                            onClick={toggleFullscreen}
                            disabled={!fullscreenSupported}
                            sx={{ml: "auto"}}
                        >
                            {isFullscreen ? <FullscreenExitIcon/> : <FullscreenIcon/>}
                        </IconButton>
                    </span>
                </Tooltip>
            </Stack>

            <Box
                ref={containerRef}
                sx={{
                    flex: 1,
                    minHeight: 0,
                    overflow: "auto",
                    bgcolor: isFullscreen ? "background.default" : "transparent",
                    p: isFullscreen ? 2 : 0
                }}
            >
                {cells.length === 0 ? (
                    <Stack spacing={1} sx={{alignItems: "center", justifyContent: "center", py: 6, color: "text.secondary"}}>
                        <VideocamIcon fontSize="large"/>
                        <Typography>{t("webcam.emptyGrid")}</Typography>
                    </Stack>
                ) : (
                    <Box sx={{display: "grid", gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`, gap: 2}}>
                        {cells.map(cell => (
                            <CameraView
                                key={cell.id}
                                variant="grid"
                                deviceId={cell.deviceId}
                                devices={devices}
                                onDeviceChange={deviceId => updateCell(cell.id, deviceId)}
                                onRemove={() => removeCell(cell.id)}
                                onActive={onActive}
                            />
                        ))}
                    </Box>
                )}
            </Box>

            <Snackbar
                open={!!fullscreenError}
                autoHideDuration={4000}
                onClose={clearFullscreenError}
                message={t("webcam.fullscreenRetryHint")}
            />
        </Stack>
    );
};
