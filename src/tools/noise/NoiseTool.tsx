import React from "react";
import {v4 as uuidV4} from "uuid";
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
    IconButton,
    Paper,
    Slider,
    Stack,
    TextField,
    Tooltip,
    Typography
} from "@mui/material";
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
    id: string;
    name: string;
    gains: number[];
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
    const [playing, setPlaying] = React.useState(false);
    const [nameDialog, setNameDialog] = React.useState<{ mode: "new" | "rename"; targetId?: string; value: string } | null>(null);

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

    const applyPreset = (presetGains: readonly number[]) => {
        setGains([...presetGains]);
        filtersRef.current.forEach((filter, index) => {
            filter.gain.value = presetGains[index];
        });
    };

    const openSaveDialog = () => setNameDialog({mode: "new", value: ""});
    const openRenameDialog = (preset: CustomPreset) => setNameDialog({mode: "rename", targetId: preset.id, value: preset.name});
    const closeDialog = () => setNameDialog(null);

    const submitDialog = () => {
        if (!nameDialog) return;
        const name = nameDialog.value.trim();
        if (!name) return;
        if (nameDialog.mode === "new") {
            setCustomPresets(current => current.concat({id: uuidV4(), name, gains: [...gains]}));
        } else {
            setCustomPresets(current => current.map(preset => preset.id === nameDialog.targetId ? {...preset, name} : preset));
        }
        closeDialog();
    };

    const deletePreset = (id: string) => {
        setCustomPresets(current => current.filter(preset => preset.id !== id));
    };

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
                    <Stack direction="row" spacing={1} sx={{alignItems: "center", justifyContent: "space-between"}}>
                        <Typography variant="subtitle2">{t("noise.customPresets")}</Typography>
                        <Button size="small" startIcon={<SaveIcon/>} onClick={openSaveDialog}>{t("noise.savePreset")}</Button>
                    </Stack>
                    {customPresets.length === 0 ? (
                        <Typography variant="body2" color="text.secondary">{t("noise.noCustomPresets")}</Typography>
                    ) : (
                        <Stack direction="row" spacing={1} sx={{flexWrap: "wrap"}} useFlexGap>
                            {customPresets.map(preset => (
                                <Paper key={preset.id} variant="outlined" sx={{pl: 1.5, pr: 0.5, py: 0.5, display: "flex", alignItems: "center", gap: 0.5}}>
                                    <Button size="small" variant={gainsEqual(gains, preset.gains) ? "contained" : "text"} onClick={() => applyPreset(preset.gains)} sx={{minWidth: 0}}>
                                        {preset.name}
                                    </Button>
                                    <Tooltip title={t("noise.rename")}>
                                        <IconButton size="small" onClick={() => openRenameDialog(preset)}>
                                            <EditIcon fontSize="small"/>
                                        </IconButton>
                                    </Tooltip>
                                    <Tooltip title={t("noise.delete")}>
                                        <IconButton size="small" onClick={() => deletePreset(preset.id)}>
                                            <DeleteIcon fontSize="small"/>
                                        </IconButton>
                                    </Tooltip>
                                </Paper>
                            ))}
                        </Stack>
                    )}
                </Stack>

                <Stack spacing={1}>
                    <Typography variant="subtitle2">{t("noise.equalizer")}</Typography>
                    <Stack direction="row" spacing={1} sx={{justifyContent: "space-between", height: 220, px: {xs: 0, sm: 2}}}>
                        {bands.map((frequency, index) => (
                            <Stack key={frequency} spacing={1} sx={{alignItems: "center", flex: 1}}>
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
                    <Button variant="contained" onClick={submitDialog} disabled={!nameDialog?.value.trim()}>{t("noise.dialog.save")}</Button>
                </DialogActions>
            </Dialog>
        </ToolSurface>
    );
};

export default NoiseTool;
