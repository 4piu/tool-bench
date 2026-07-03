import React from "react";
import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import StopIcon from "@mui/icons-material/Stop";
import {Box, Button, FormControl, FormControlLabel, InputLabel, MenuItem, Select, Slider, Stack, Switch, TextField, Typography} from "@mui/material";
import type {SelectChangeEvent} from "@mui/material/Select";
import {useTranslation} from "react-i18next";
import {useLocalStorageState} from "../shared/hooks";
import {ToolHeader, ToolSurface} from "../shared/ToolScaffold";

type OscillatorWaveform = "sine" | "square" | "triangle" | "sawtooth";

const minFrequency = 20;
const maxFrequency = 20000;
const toLogSlider = (frequency: number) => Math.log(frequency / minFrequency) / Math.log(maxFrequency / minFrequency) * 100;
const fromLogSlider = (value: number) => Math.round(minFrequency * ((maxFrequency / minFrequency) ** (value / 100)));
const notePresets = [
    ["C4", 261.63],
    ["D4", 293.66],
    ["E4", 329.63],
    ["F4", 349.23],
    ["G4", 392],
    ["A4", 440],
    ["B4", 493.88],
    ["C5", 523.25]
] as const;

const SoundTool = () => {
    const {t} = useTranslation();
    const [frequency, setFrequency] = useLocalStorageState("sound.frequency", 440);
    const [waveform, setWaveform] = useLocalStorageState<OscillatorWaveform>("sound.waveform", "sine");
    const [volume, setVolume] = useLocalStorageState("sound.volume", 0.25);
    const [pan, setPan] = useLocalStorageState("sound.pan", 0);
    const [attack, setAttack] = useLocalStorageState("sound.attack", 0.01);
    const [decay, setDecay] = useLocalStorageState("sound.decay", 0.08);
    const [sustain, setSustain] = useLocalStorageState("sound.sustain", 0.75);
    const [release, setRelease] = useLocalStorageState("sound.release", 0.08);
    const [linearScale, setLinearScale] = useLocalStorageState("sound.linearScale", false);
    const [playing, setPlaying] = React.useState(false);
    const audioRef = React.useRef<AudioContext | null>(null);
    const oscillatorRef = React.useRef<OscillatorNode | null>(null);
    const gainRef = React.useRef<GainNode | null>(null);
    const panRef = React.useRef<StereoPannerNode | null>(null);
    const analyserRef = React.useRef<AnalyserNode | null>(null);
    const animationRef = React.useRef<number | null>(null);
    const canvasRef = React.useRef<HTMLCanvasElement | null>(null);

    const drawStaticPreview = () => {
        const canvas = canvasRef.current;
        const context = canvas?.getContext("2d");
        if (!canvas || !context) return;
        const width = canvas.width;
        const height = canvas.height;
        context.clearRect(0, 0, width, height);
        context.strokeStyle = "#90caf9";
        context.lineWidth = 3;
        context.beginPath();
        Array.from({length: width}).forEach((_, x) => {
            const phase = x / width * Math.PI * 4;
            const normalized = waveform === "sine"
                ? Math.sin(phase)
                : waveform === "square"
                    ? Math.sign(Math.sin(phase))
                    : waveform === "triangle"
                        ? 2 * Math.abs(2 * (phase / (Math.PI * 2) - Math.floor(phase / (Math.PI * 2) + 0.5))) - 1
                        : 2 * (phase / (Math.PI * 2) - Math.floor(0.5 + phase / (Math.PI * 2)));
            const y = height / 2 - normalized * height * 0.35 * volume;
            if (x === 0) context.moveTo(x, y);
            else context.lineTo(x, y);
        });
        context.stroke();
    };

    const drawLiveWaveform = () => {
        const canvas = canvasRef.current;
        const analyser = analyserRef.current;
        const context = canvas?.getContext("2d");
        if (!canvas || !analyser || !context) return;
        const bufferLength = analyser.fftSize;
        const dataArray = new Uint8Array(bufferLength);
        analyser.getByteTimeDomainData(dataArray);
        const width = canvas.width;
        const height = canvas.height;
        context.clearRect(0, 0, width, height);
        context.strokeStyle = "#66bb6a";
        context.lineWidth = 3;
        context.beginPath();
        dataArray.forEach((value, index) => {
            const x = (index / bufferLength) * width;
            const y = (value / 255) * height;
            if (index === 0) context.moveTo(x, y);
            else context.lineTo(x, y);
        });
        context.stroke();
        animationRef.current = requestAnimationFrame(drawLiveWaveform);
    };

    const stop = () => {
        const context = audioRef.current;
        const oscillator = oscillatorRef.current;
        const gain = gainRef.current;
        if (context && oscillator && gain) {
            const now = context.currentTime;
            gain.gain.cancelScheduledValues(now);
            gain.gain.setValueAtTime(gain.gain.value, now);
            gain.gain.linearRampToValueAtTime(0, now + release);
            oscillator.stop(now + release);
        }
        if (animationRef.current !== null) {
            cancelAnimationFrame(animationRef.current);
            animationRef.current = null;
        }
        oscillatorRef.current = null;
        gainRef.current = null;
        panRef.current = null;
        analyserRef.current = null;
        setPlaying(false);
        drawStaticPreview();
    };

    const play = async () => {
        stop();
        const context = audioRef.current ?? new AudioContext();
        audioRef.current = context;
        const oscillator = context.createOscillator();
        const gain = context.createGain();
        const panner = context.createStereoPanner();
        const analyser = context.createAnalyser();
        analyser.fftSize = 2048;
        const now = context.currentTime;
        oscillator.type = waveform;
        oscillator.frequency.value = frequency;
        panner.pan.value = pan;
        gain.gain.setValueAtTime(0, now);
        gain.gain.linearRampToValueAtTime(volume, now + attack);
        gain.gain.linearRampToValueAtTime(volume * sustain, now + attack + decay);
        oscillator.connect(gain).connect(panner).connect(context.destination);
        panner.connect(analyser);
        oscillator.start(now);
        oscillatorRef.current = oscillator;
        gainRef.current = gain;
        panRef.current = panner;
        analyserRef.current = analyser;
        setPlaying(true);
        animationRef.current = requestAnimationFrame(drawLiveWaveform);
    };

    React.useEffect(() => {
        if (oscillatorRef.current) {
            oscillatorRef.current.frequency.value = frequency;
            oscillatorRef.current.type = waveform;
        }
        if (gainRef.current && audioRef.current) {
            gainRef.current.gain.setTargetAtTime(volume * sustain, audioRef.current.currentTime, 0.02);
        }
        if (panRef.current) panRef.current.pan.value = pan;
    }, [frequency, pan, sustain, volume, waveform]);

    React.useEffect(() => {
        if (!playing) drawStaticPreview();
    }, [playing, volume, waveform]);

    React.useEffect(() => stop, []);

    return (
        <ToolSurface>
            <ToolHeader title={t("sound.title")} description={t("sound.description")}/>
            <Stack spacing={3}>
                <FormControl>
                    <InputLabel>{t("sound.waveform")}</InputLabel>
                    <Select value={waveform} label={t("sound.waveform")} onChange={(event: SelectChangeEvent) => setWaveform(event.target.value as OscillatorWaveform)}>
                        <MenuItem value="sine">{t("sound.waveformOption.sine")}</MenuItem>
                        <MenuItem value="square">{t("sound.waveformOption.square")}</MenuItem>
                        <MenuItem value="triangle">{t("sound.waveformOption.triangle")}</MenuItem>
                        <MenuItem value="sawtooth">{t("sound.waveformOption.sawtooth")}</MenuItem>
                    </Select>
                </FormControl>
                <Stack direction={{xs: "column", sm: "row"}} spacing={1}>
                    {notePresets.map(([label, value]) => (
                        <Button key={label} variant={frequency === value ? "contained" : "outlined"} onClick={() => setFrequency(value)}>
                            {label}
                        </Button>
                    ))}
                </Stack>
                <TextField
                    label={t("sound.frequencyHz")}
                    type="number"
                    value={frequency}
                    slotProps={{htmlInput: {min: minFrequency, max: maxFrequency}}}
                    onChange={event => setFrequency(Math.max(minFrequency, Math.min(maxFrequency, Number(event.target.value) || 440)))}
                />
                <Box>
                    <Typography gutterBottom>{t("sound.frequency", {frequency})}</Typography>
                    <Slider
                        value={linearScale ? frequency : toLogSlider(frequency)}
                        min={linearScale ? minFrequency : 0}
                        max={linearScale ? maxFrequency : 100}
                        onChange={(_, value) => setFrequency(linearScale ? value as number : fromLogSlider(value as number))}
                    />
                </Box>
                <FormControlLabel control={<Switch checked={linearScale} onChange={event => setLinearScale(event.target.checked)}/>} label={t("sound.linearScale")}/>
                <Box>
                    <Typography gutterBottom>{t("sound.volume", {percent: Math.round(volume * 100)})}</Typography>
                    <Slider value={volume} min={0} max={1} step={0.01} onChange={(_, value) => setVolume(value as number)}/>
                </Box>
                <Box>
                    <Typography gutterBottom>
                        {t("sound.pan", {
                            direction: pan === 0
                                ? t("sound.panCenter")
                                : pan < 0
                                    ? t("sound.panLeft", {percent: Math.round(Math.abs(pan) * 100)})
                                    : t("sound.panRight", {percent: Math.round(pan * 100)})
                        })}
                    </Typography>
                    <Slider value={pan} min={-1} max={1} step={0.01} onChange={(_, value) => setPan(value as number)}/>
                </Box>
                <Stack direction={{xs: "column", sm: "row"}} spacing={2}>
                    <Box sx={{flex: 1}}>
                        <Typography gutterBottom>{t("sound.attack", {value: attack.toFixed(2)})}</Typography>
                        <Slider value={attack} min={0} max={2} step={0.01} onChange={(_, value) => setAttack(value as number)}/>
                    </Box>
                    <Box sx={{flex: 1}}>
                        <Typography gutterBottom>{t("sound.decay", {value: decay.toFixed(2)})}</Typography>
                        <Slider value={decay} min={0} max={2} step={0.01} onChange={(_, value) => setDecay(value as number)}/>
                    </Box>
                </Stack>
                <Stack direction={{xs: "column", sm: "row"}} spacing={2}>
                    <Box sx={{flex: 1}}>
                        <Typography gutterBottom>{t("sound.sustain", {percent: Math.round(sustain * 100)})}</Typography>
                        <Slider value={sustain} min={0} max={1} step={0.01} onChange={(_, value) => setSustain(value as number)}/>
                    </Box>
                    <Box sx={{flex: 1}}>
                        <Typography gutterBottom>{t("sound.release", {value: release.toFixed(2)})}</Typography>
                        <Slider value={release} min={0} max={2} step={0.01} onChange={(_, value) => setRelease(value as number)}/>
                    </Box>
                </Stack>
                <Box>
                    <Box component="canvas" ref={canvasRef} width={720} height={160} sx={{width: "100%", bgcolor: "grey.950", borderRadius: 2}}/>
                    <Typography variant="caption" color="text.secondary">
                        {playing ? t("sound.liveAnalyser") : t("sound.waveformPreview")}
                    </Typography>
                </Box>
                <Button variant="contained" startIcon={playing ? <StopIcon/> : <PlayArrowIcon/>} onClick={playing ? stop : play}>
                    {playing ? t("sound.stop") : t("sound.play")}
                </Button>
            </Stack>
        </ToolSurface>
    );
};

export default SoundTool;
