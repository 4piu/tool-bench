import React from "react";
import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import StopIcon from "@mui/icons-material/Stop";
import {Box, Button, FormControl, FormControlLabel, InputLabel, MenuItem, Select, Slider, Stack, Switch, TextField, Typography} from "@mui/material";
import type {SelectChangeEvent} from "@mui/material/Select";
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
    const canvasRef = React.useRef<HTMLCanvasElement | null>(null);

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
        oscillatorRef.current = null;
        gainRef.current = null;
        panRef.current = null;
        setPlaying(false);
    };

    const play = async () => {
        stop();
        const context = audioRef.current ?? new AudioContext();
        audioRef.current = context;
        const oscillator = context.createOscillator();
        const gain = context.createGain();
        const panner = context.createStereoPanner();
        const now = context.currentTime;
        oscillator.type = waveform;
        oscillator.frequency.value = frequency;
        panner.pan.value = pan;
        gain.gain.setValueAtTime(0, now);
        gain.gain.linearRampToValueAtTime(volume, now + attack);
        gain.gain.linearRampToValueAtTime(volume * sustain, now + attack + decay);
        oscillator.connect(gain).connect(panner).connect(context.destination);
        oscillator.start(now);
        oscillatorRef.current = oscillator;
        gainRef.current = gain;
        panRef.current = panner;
        setPlaying(true);
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
    }, [volume, waveform]);

    React.useEffect(() => stop, []);

    return (
        <ToolSurface>
            <ToolHeader title="Sound Wave" description="Generate simple oscillator tones."/>
            <Stack spacing={3}>
                <FormControl>
                    <InputLabel>Waveform</InputLabel>
                    <Select value={waveform} label="Waveform" onChange={(event: SelectChangeEvent) => setWaveform(event.target.value as OscillatorWaveform)}>
                        <MenuItem value="sine">Sine</MenuItem>
                        <MenuItem value="square">Square</MenuItem>
                        <MenuItem value="triangle">Triangle</MenuItem>
                        <MenuItem value="sawtooth">Sawtooth</MenuItem>
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
                    label="Frequency (Hz)"
                    type="number"
                    value={frequency}
                    slotProps={{htmlInput: {min: minFrequency, max: maxFrequency}}}
                    onChange={event => setFrequency(Math.max(minFrequency, Math.min(maxFrequency, Number(event.target.value) || 440)))}
                />
                <Box>
                    <Typography gutterBottom>Frequency: {frequency} Hz</Typography>
                    <Slider
                        value={linearScale ? frequency : toLogSlider(frequency)}
                        min={linearScale ? minFrequency : 0}
                        max={linearScale ? maxFrequency : 100}
                        onChange={(_, value) => setFrequency(linearScale ? value as number : fromLogSlider(value as number))}
                    />
                </Box>
                <FormControlLabel control={<Switch checked={linearScale} onChange={event => setLinearScale(event.target.checked)}/>} label="Linear frequency slider"/>
                <Box>
                    <Typography gutterBottom>Volume: {Math.round(volume * 100)}%</Typography>
                    <Slider value={volume} min={0} max={1} step={0.01} onChange={(_, value) => setVolume(value as number)}/>
                </Box>
                <Box>
                    <Typography gutterBottom>Pan: {pan === 0 ? "Center" : pan < 0 ? `${Math.round(Math.abs(pan) * 100)}% left` : `${Math.round(pan * 100)}% right`}</Typography>
                    <Slider value={pan} min={-1} max={1} step={0.01} onChange={(_, value) => setPan(value as number)}/>
                </Box>
                <Stack direction={{xs: "column", sm: "row"}} spacing={2}>
                    <Box sx={{flex: 1}}>
                        <Typography gutterBottom>Attack: {attack.toFixed(2)}s</Typography>
                        <Slider value={attack} min={0} max={2} step={0.01} onChange={(_, value) => setAttack(value as number)}/>
                    </Box>
                    <Box sx={{flex: 1}}>
                        <Typography gutterBottom>Decay: {decay.toFixed(2)}s</Typography>
                        <Slider value={decay} min={0} max={2} step={0.01} onChange={(_, value) => setDecay(value as number)}/>
                    </Box>
                </Stack>
                <Stack direction={{xs: "column", sm: "row"}} spacing={2}>
                    <Box sx={{flex: 1}}>
                        <Typography gutterBottom>Sustain: {Math.round(sustain * 100)}%</Typography>
                        <Slider value={sustain} min={0} max={1} step={0.01} onChange={(_, value) => setSustain(value as number)}/>
                    </Box>
                    <Box sx={{flex: 1}}>
                        <Typography gutterBottom>Release: {release.toFixed(2)}s</Typography>
                        <Slider value={release} min={0} max={2} step={0.01} onChange={(_, value) => setRelease(value as number)}/>
                    </Box>
                </Stack>
                <Box component="canvas" ref={canvasRef} width={720} height={160} sx={{width: "100%", bgcolor: "grey.950", borderRadius: 2}}/>
                <Button variant="contained" startIcon={playing ? <StopIcon/> : <PlayArrowIcon/>} onClick={playing ? stop : play}>
                    {playing ? "Stop" : "Play"}
                </Button>
            </Stack>
        </ToolSurface>
    );
};

export default SoundTool;
