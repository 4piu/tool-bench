import React from "react";
import DeleteIcon from "@mui/icons-material/Delete";
import EditIcon from "@mui/icons-material/Edit";
import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import SaveIcon from "@mui/icons-material/Save";
import StopIcon from "@mui/icons-material/Stop";
import {
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
    Select,
    Slider,
    Stack,
    TextField,
    Tooltip,
    Typography
} from "@mui/material";
import type {SelectChangeEvent} from "@mui/material/Select";
import {useTranslation} from "react-i18next";
import {useLocalStorageState} from "../shared/hooks";
import {ToolHeader, ToolSurface} from "../shared/ToolScaffold";

const bands = [31, 62, 125, 250, 500, 1000, 2000, 4000, 8000, 16000];
const MIN_GAIN_DB = -24;
const MAX_GAIN_DB = 24;
const NOISE_DURATION_SECONDS = 6;

const formatFrequency = (hz: number) => hz >= 1000 ? `${hz / 1000}k` : `${hz}`;
const formatGain = (db: number) => db > 0 ? `+${db}` : `${db}`;

const builtinPresets = [
    {key: "white", gains: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0]},
    {key: "pink", gains: [0, -1, -3, -5, -7, -9, -11, -13, -15, -17]},
    {key: "brown", gains: [0, -3, -7, -11, -15, -19, -22, -24, -24, -24]},
    {key: "grey", gains: [16, 10, 6, 3, 1, 0, -2, -4, 0, 8]}
] as const;

type CustomPreset = {
    name: string;
    gains: number[];
};

type NameDialogState = {
    mode: "new" | "rename";
    targetName?: string;
    value: string;
};

const gainsEqual = (a: number[], b: number[]) => a.length === b.length && a.every((value, index) => value === b[index]);

const createNoiseBuffer = (context: AudioContext) => {
    const length = Math.floor(context.sampleRate * NOISE_DURATION_SECONDS);
    const buffer = context.createBuffer(2, length, context.sampleRate);
    for (let channel = 0; channel < buffer.numberOfChannels; channel++) {
        const data = buffer.getChannelData(channel);
        for (let i = 0; i < length; i++) {
            data[i] = Math.random() * 2 - 1;
        }
    }
    return buffer;
};

const NoiseTool = () => {
    const {t} = useTranslation();
    const [gains, setGains] = useLocalStorageState<number[]>("noise.gains", [...builtinPresets[0].gains]);
    const [volume, setVolume] = useLocalStorageState("noise.volume", 0.5);
    const [customPresets, setCustomPresets] = useLocalStorageState<CustomPreset[]>("noise.customPresets", []);
    const [selectedCustomPresetName, setSelectedCustomPresetName] = useLocalStorageState<string | null>("noise.activeCustomPreset", null);
    const [playing, setPlaying] = React.useState(false);
    const [nameDialog, setNameDialog] = React.useState<NameDialogState | null>(null);

    const audioContextRef = React.useRef<AudioContext | null>(null);
    const noiseBufferRef = React.useRef<AudioBuffer | null>(null);
    const sourceRef = React.useRef<AudioBufferSourceNode | null>(null);
    const filtersRef = React.useRef<BiquadFilterNode[]>([]);
    const masterGainRef = React.useRef<GainNode | null>(null);

    const stop = () => {
        sourceRef.current?.stop();
        sourceRef.current?.disconnect();
        filtersRef.current.forEach(filter => filter.disconnect());
        masterGainRef.current?.disconnect();
        sourceRef.current = null;
        filtersRef.current = [];
        masterGainRef.current = null;
        setPlaying(false);
    };

    const play = () => {
        stop();
        const context = audioContextRef.current ?? new AudioContext();
        audioContextRef.current = context;
        void context.resume();
        if (!noiseBufferRef.current) noiseBufferRef.current = createNoiseBuffer(context);

        const source = context.createBufferSource();
        source.buffer = noiseBufferRef.current;
        source.loop = true;

        const filters = bands.map((frequency, index) => {
            const filter = context.createBiquadFilter();
            filter.type = "peaking";
            filter.frequency.value = frequency;
            filter.Q.value = 1.41;
            filter.gain.value = gains[index];
            return filter;
        });

        const masterGain = context.createGain();
        masterGain.gain.value = volume;

        let node: AudioNode = source;
        filters.forEach(filter => {
            node.connect(filter);
            node = filter;
        });
        node.connect(masterGain).connect(context.destination);
        source.start();

        sourceRef.current = source;
        filtersRef.current = filters;
        masterGainRef.current = masterGain;
        setPlaying(true);
    };

    React.useEffect(() => stop, []);

    const updateGain = (index: number, value: number) => {
        setGains(current => current.map((gain, gainIndex) => gainIndex === index ? value : gain));
        if (filtersRef.current[index]) filtersRef.current[index].gain.value = value;
    };

    const updateVolume = (value: number) => {
        setVolume(value);
        if (masterGainRef.current) masterGainRef.current.gain.value = value;
    };

    const applyPreset = (presetGains: readonly number[], customName: string | null = null) => {
        setGains([...presetGains]);
        filtersRef.current.forEach((filter, index) => {
            filter.gain.value = presetGains[index];
        });
        setSelectedCustomPresetName(customName);
    };

    const openSaveDialog = () => setNameDialog({mode: "new", value: selectedCustomPresetName ?? ""});
    const openRenameDialog = (preset: CustomPreset) => setNameDialog({mode: "rename", targetName: preset.name, value: preset.name});
    const closeDialog = () => setNameDialog(null);

    const submitDialog = () => {
        if (!nameDialog) return;
        const name = nameDialog.value.trim();
        if (!name) return;
        if (nameDialog.mode === "new") {
            setCustomPresets(current => current.filter(preset => preset.name !== name).concat({name, gains: [...gains]}));
            setSelectedCustomPresetName(name);
        } else {
            const targetName = nameDialog.targetName;
            setCustomPresets(current => {
                const target = current.find(preset => preset.name === targetName);
                if (!target) return current;
                return current
                    .filter(preset => preset.name !== targetName && preset.name !== name)
                    .concat({...target, name});
            });
            if (selectedCustomPresetName === targetName) setSelectedCustomPresetName(name);
        }
        closeDialog();
    };

    const deletePreset = (name: string) => {
        setCustomPresets(current => current.filter(preset => preset.name !== name));
        if (selectedCustomPresetName === name) setSelectedCustomPresetName(null);
    };

    const trimmedDialogName = nameDialog?.value.trim() ?? "";
    const dialogWillOverwrite = trimmedDialogName.length > 0 && customPresets.some(
        preset => preset.name === trimmedDialogName && (nameDialog?.mode !== "rename" || preset.name !== nameDialog.targetName)
    );

    return (
        <ToolSurface>
            <ToolHeader title={t("noise.title")} description={t("noise.description")}/>
            <Stack spacing={3}>
                <Stack direction={{xs: "column", sm: "row"}} spacing={2} sx={{alignItems: {sm: "center"}}}>
                    <Button variant="contained" startIcon={playing ? <StopIcon/> : <PlayArrowIcon/>} onClick={playing ? stop : play}>
                        {playing ? t("noise.stop") : t("noise.play")}
                    </Button>
                    <Box sx={{flex: 1, minWidth: 200}}>
                        <Typography gutterBottom variant="body2" color="text.secondary">{t("noise.volume", {percent: Math.round(volume * 100)})}</Typography>
                        <Slider value={volume} min={0} max={1} step={0.01} onChange={(_, value) => updateVolume(value as number)}/>
                    </Box>
                </Stack>

                <Stack spacing={1}>
                    <Typography variant="subtitle2">{t("noise.presets")}</Typography>
                    <Stack direction="row" spacing={1} sx={{flexWrap: "wrap"}} useFlexGap>
                        {builtinPresets.map(preset => (
                            <Button
                                key={preset.key}
                                variant={gainsEqual(gains, [...preset.gains]) ? "contained" : "outlined"}
                                onClick={() => applyPreset(preset.gains)}
                            >
                                {t(`noise.preset.${preset.key}`)}
                            </Button>
                        ))}
                    </Stack>
                </Stack>

                <Stack spacing={1}>
                    <Stack direction="row" spacing={1} sx={{alignItems: "center"}}>
                        {customPresets.length === 0 ? (
                            <Typography variant="body2" color="text.secondary" sx={{flex: 1}}>{t("noise.noCustomPresets")}</Typography>
                        ) : (
                        <FormControl size="small" fullWidth sx={{flex: 1}}>
                            <InputLabel shrink>{t("noise.customPresets")}</InputLabel>
                            <Select
                                label={t("noise.customPresets")}
                                notched
                                value={selectedCustomPresetName ?? ""}
                                displayEmpty
                                onChange={(event: SelectChangeEvent) => {
                                    const preset = customPresets.find(candidate => candidate.name === event.target.value);
                                    if (preset) applyPreset(preset.gains, preset.name);
                                }}
                                renderValue={value => {
                                    if (!value) return <Typography component="span" color="text.secondary">{t("noise.selectPreset")}</Typography>;
                                    const preset = customPresets.find(candidate => candidate.name === value);
                                    if (!preset) return value;
                                    const modified = !gainsEqual(gains, preset.gains);
                                    return (
                                        <Tooltip title={modified ? t("noise.unsavedChanges") : ""}>
                                            <Typography component="span" sx={{color: modified ? "warning.main" : "inherit"}}>
                                                {preset.name}{modified ? " *" : ""}
                                            </Typography>
                                        </Tooltip>
                                    );
                                }}
                            >
                                {customPresets.map(preset => {
                                    const isActive = preset.name === selectedCustomPresetName;
                                    const modified = isActive && !gainsEqual(gains, preset.gains);
                                    return (
                                        <MenuItem key={preset.name} value={preset.name} sx={{display: "flex", alignItems: "center", gap: 0.5}}>
                                            <Typography sx={{flex: 1, color: modified ? "warning.main" : "inherit"}} noWrap>
                                                {preset.name}{modified ? " *" : ""}
                                            </Typography>
                                            <Tooltip title={t("noise.rename")}>
                                                <IconButton size="small" onClick={event => {
                                                    event.stopPropagation();
                                                    openRenameDialog(preset);
                                                }}>
                                                    <EditIcon fontSize="small"/>
                                                </IconButton>
                                            </Tooltip>
                                            <Tooltip title={t("noise.delete")}>
                                                <IconButton size="small" onClick={event => {
                                                    event.stopPropagation();
                                                    deletePreset(preset.name);
                                                }}>
                                                    <DeleteIcon fontSize="small"/>
                                                </IconButton>
                                            </Tooltip>
                                        </MenuItem>
                                    );
                                })}
                            </Select>
                        </FormControl>
                        )}
                        <Button size="small" startIcon={<SaveIcon/>} onClick={openSaveDialog}>{t("noise.savePreset")}</Button>
                    </Stack>
                </Stack>

                <Stack spacing={1}>
                    <Typography variant="subtitle2">{t("noise.equalizer")}</Typography>
                    <Box
                        sx={{
                            overflowX: "auto",
                            pb: 1,
                            "&::-webkit-scrollbar": {height: 8},
                            "&::-webkit-scrollbar-track": {backgroundColor: "action.hover", borderRadius: 4},
                            "&::-webkit-scrollbar-thumb": {backgroundColor: "action.disabled", borderRadius: 4},
                            scrollbarWidth: "thin"
                        }}
                    >
                    <Stack direction="row" spacing={1} sx={{justifyContent: "space-between", height: 220, px: {xs: 0, sm: 2}, py: {xs: 2, sm: 0}}}>
                        {bands.map((frequency, index) => (
                            <Stack key={frequency} spacing={1} sx={{alignItems: "center", flex: 1, minWidth: 56}}>
                                <Typography variant="caption" color="text.secondary">{formatGain(gains[index])}</Typography>
                                <Slider
                                    orientation="vertical"
                                    min={MIN_GAIN_DB}
                                    max={MAX_GAIN_DB}
                                    step={1}
                                    value={gains[index]}
                                    onChange={(_, value) => updateGain(index, value as number)}
                                    sx={{height: "100%"}}
                                />
                                <Typography variant="caption" color="text.secondary">{formatFrequency(frequency)}</Typography>
                            </Stack>
                        ))}
                    </Stack>
                    </Box>
                </Stack>
            </Stack>

            <Dialog open={nameDialog !== null} onClose={closeDialog} fullWidth maxWidth="xs">
                <DialogTitle>{nameDialog?.mode === "rename" ? t("noise.dialog.renameTitle") : t("noise.dialog.newTitle")}</DialogTitle>
                <DialogContent>
                    <TextField
                        autoFocus
                        fullWidth
                        margin="dense"
                        label={t("noise.dialog.nameLabel")}
                        value={nameDialog?.value ?? ""}
                        onChange={event => setNameDialog(current => current ? {...current, value: event.target.value} : current)}
                        onKeyDown={event => {
                            if (event.key === "Enter") submitDialog();
                        }}
                    />
                </DialogContent>
                <DialogActions>
                    <Button onClick={closeDialog}>{t("noise.dialog.cancel")}</Button>
                    <Button variant="contained" onClick={submitDialog} disabled={!nameDialog?.value.trim()}>
                        {dialogWillOverwrite ? t("noise.dialog.overwrite") : t("noise.dialog.save")}
                    </Button>
                </DialogActions>
            </Dialog>
        </ToolSurface>
    );
};

export default NoiseTool;
