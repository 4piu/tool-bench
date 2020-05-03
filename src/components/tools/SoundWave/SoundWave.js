import React from "react";
import {withStyles} from "@material-ui/core/styles";
import PropTypes from "prop-types";
import MyAppBar from "../../MyAppBar";
import Container from "@material-ui/core/Container";
import FormControl from "@material-ui/core/FormControl";
import Select from "@material-ui/core/Select";
import MenuItem from "@material-ui/core/MenuItem";
import VolumeUpIcon from "@material-ui/icons/VolumeUp";
import VolumeOffIcon from "@material-ui/icons/VolumeOff";
import Grid from "@material-ui/core/Grid";
import Slider from "@material-ui/core/Slider";
import Typography from "@material-ui/core/Typography";
import Input from "@material-ui/core/Input";
import InputAdornment from "@material-ui/core/InputAdornment";
import IconButton from "@material-ui/core/IconButton";
import DialogTitle from "@material-ui/core/DialogTitle";
import {DialogContent} from "@material-ui/core";
import FormControlLabel from "@material-ui/core/FormControlLabel";
import DialogActions from "@material-ui/core/DialogActions";
import Button from "@material-ui/core/Button";
import Dialog from "@material-ui/core/Dialog";
import Switch from "@material-ui/core/Switch";
import SettingsIcon from "@material-ui/icons/Settings";
import {shallowCompare} from "../../../utils/ObjectCompare";

const FREQ_MIN = 20;
const FREQ_MAX = 20000;
const FREQ_MARK = [
    {
        value: 60,
        label: "60"
    },
    {
        value: 250,
        label: "250"
    },
    {
        value: 500,
        label: "500"
    },
    {
        value: 2000,
        label: "2k"
    },
    {
        value: 4000,
        label: "4k"
    },
    {
        value: 6000,
        label: "6k"
    }
];
// const scaleFunc = x => Math.floor((FREQ_MAX - FREQ_MIN + 1) ** (x / 100)) + FREQ_MIN - 1;
// const scaleFuncInverse = x => Math.floor(Math.log(x + 1 - FREQ_MIN) / Math.log(FREQ_MAX - FREQ_MIN + 1) * 100);
const scaleFunc = x => Math.floor((FREQ_MAX - FREQ_MIN) / (100 ** 3) * x ** 3 + FREQ_MIN);
const scaleFuncInverse = x => Math.floor(((x - FREQ_MIN) * (100 ** 3) / (FREQ_MAX - FREQ_MIN)) ** (1 / 3));

const styles = theme => ({
    Container: {
        padding: theme.spacing(3),
        "& > *": {
            marginBottom: theme.spacing(2)
        }
    },
    WaveformSelect: {
        width: 100
    },
    FreqInput: {
        width: 100
    },
    MuteBtn: {
        padding: theme.spacing(1)
    }
});

class SoundWave extends React.PureComponent {
    static propTypes = {
        title: PropTypes.string.isRequired
    };

    constructor(props) {
        super(props);
        this.state = {
            waveform: "sine",
            frequency: 440,
            volume: 0,
            linearSlider: false,
            showSettings: false
        };
    }

    componentDidMount() {
        this.loadState();
        this.audioCtx = new (window.AudioContext || window.webkitAudioContext)();

        this.oscillator = this.audioCtx.createOscillator();
        this.oscillator.type = this.state.waveform;
        this.oscillator.frequency.value = this.state.frequency;
        this.oscillator.start();

        this.gainNode = this.audioCtx.createGain();
        this.gainNode.gain.value = 0;
        this.oscillator.connect(this.gainNode).connect(this.audioCtx.destination);
    }

    componentDidUpdate(prevProps, prevState, snapshot) {
        if (!shallowCompare(prevState, this.state, ["showSettings", "volume"])) this.saveState();
    }

    componentWillUnmount() {
        this.audioCtx.close();
    }

    saveState = () => {
        const saveData = Object.assign({}, this.state);
        delete saveData.showSettings;
        delete saveData.volume;
        localStorage.setItem("wave-generator", JSON.stringify(saveData));
    };

    loadState = () => {
        let savedInstance;
        try {
            savedInstance = JSON.parse(localStorage.getItem("wave-generator"));
        } catch (e) {
            console.error("Failed to load saved instance");
        }
        if (savedInstance) this.setState(savedInstance);
    };

    onWaveformChange = ev => {
        const newVal = ev.target.value;
        this.oscillator.type = newVal;
        this.setState({
            waveform: newVal
        });
    };

    onFreqSliderChange = (ev, val) => {
        this.oscillator.frequency.value = this.state.linearSlider ?
            val :
            scaleFunc(val);
        this.setState({
            frequency: this.oscillator.frequency.value
        });
    };

    onFreqInputChange = ev => {
        let newVal = Number(ev.target.value);
        if (isNaN(newVal)) return;
        if (newVal >= FREQ_MIN && newVal <= FREQ_MAX) {
            this.oscillator.frequency.value = newVal;
            this.setState({
                frequency: this.oscillator.frequency.value
            });
        } else {
            this.setState({
                frequency: newVal
            });
        }
    };

    formatFreqLabel = () => {
        const val = this.state.frequency;
        return val < 1000 ? val.toString() : (val / 1000).toFixed(1) + "k";
    };

    onVolumeChange = (ev, val) => {
        this.gainNode.gain.value = val;
        if (this.audioCtx.state === "suspended") this.audioCtx.resume();
        this.setState({
            volume: this.gainNode.gain.value
        });
    };

    onMuteToggle = () => {
        if (this.state.volume === 0) {
            this.gainNode.gain.value = 0.2;
            if (this.audioCtx.state === "suspended") this.audioCtx.resume();
        } else {
            this.gainNode.gain.value = 0;
        }
        this.setState({
            volume: this.gainNode.gain.value
        });
    };

    onSettingsClose = () => {
        this.setState({
            showSettings: false
        });
    };

    onSettingsOpen = () => {
        this.setState({
            showSettings: true
        });
    };

    onLinearSliderToggle = (ev, val) => {
        this.setState({
            linearSlider: val
        });
    };

    render() {
        const {classes} = this.props;
        return (
            <>
                {/** App bar */}
                <MyAppBar title={this.props.title}
                          menuItems={
                              <IconButton onClick={this.onSettingsOpen} color={"inherit"}>
                                  <SettingsIcon/>
                              </IconButton>
                          }
                />
                {/** Main view */}
                <Container maxWidth={"sm"} className={classes.Container}>
                    <div>
                        <Typography id="label-select-waveform" gutterBottom>
                            {"Waveform"}
                        </Typography>
                        <FormControl>
                            <Select
                                className={classes.WaveformSelect}
                                labelId="label-select-waveform"
                                id="select-waveform"
                                value={this.state.waveform}
                                onChange={this.onWaveformChange}
                            >
                                <MenuItem value={"sine"}>{"Sine"}</MenuItem>
                                <MenuItem value={"square"}>{"Square"}</MenuItem>
                                <MenuItem value={"triangle"}>{"Triangle"}</MenuItem>
                                <MenuItem value={"sawtooth"}>{"Sawtooth"}</MenuItem>
                            </Select>
                        </FormControl>
                    </div>

                    <div>
                        <Typography id="label-slider-frequency" gutterBottom>
                            {"Frequency"}
                        </Typography>
                        <Grid container spacing={2} alignItems="center">
                            <Grid item xs>
                                {this.state.linearSlider &&
                                <Slider
                                    value={this.state.frequency}
                                    onChange={this.onFreqSliderChange}
                                    step={1}
                                    min={FREQ_MIN}
                                    max={FREQ_MAX}
                                    track={false}
                                    valueLabelDisplay="auto"
                                    valueLabelFormat={this.formatFreqLabel}
                                    aria-labelledby="label-slider-frequency"
                                />}
                                {!this.state.linearSlider &&
                                <Slider
                                    value={scaleFuncInverse(this.state.frequency)}
                                    onChange={this.onFreqSliderChange}
                                    step={1}
                                    min={0}
                                    max={100}
                                    scale={scaleFunc}
                                    track={false}
                                    valueLabelDisplay="auto"
                                    valueLabelFormat={this.formatFreqLabel}
                                    aria-labelledby="label-slider-frequency"
                                />}
                            </Grid>
                            <Grid item>
                                <Input
                                    className={classes.FreqInput}
                                    value={this.state.frequency}
                                    margin="dense"
                                    onChange={this.onFreqInputChange}
                                    endAdornment={<InputAdornment position="end">Hz</InputAdornment>}
                                    inputProps={{
                                        step: 1,
                                        min: FREQ_MIN,
                                        max: FREQ_MAX,
                                        type: "number",
                                        "aria-labelledby": "label-slider-frequency",
                                    }}
                                />
                            </Grid>
                        </Grid>
                    </div>

                    <div>
                        <Typography id="label-slider-volume" gutterBottom>
                            Volume
                        </Typography>
                        <Grid container spacing={2}>
                            <Grid item>
                                <IconButton className={classes.MuteBtn} onClick={this.onMuteToggle}>
                                    {this.state.volume > 0 && <VolumeUpIcon fontSize={"small"}/>}
                                    {this.state.volume === 0 && <VolumeOffIcon fontSize={"small"}/>}
                                </IconButton>
                            </Grid>
                            <Grid item xs>
                                <Slider value={this.state.volume}
                                        onChange={this.onVolumeChange}
                                        min={0}
                                        max={1}
                                        step={0.01}
                                        aria-labelledby={"label-slider-volume"}/>
                            </Grid>
                        </Grid>
                    </div>
                </Container>
                <Dialog
                    fullWidth={true}
                    maxWidth={"sm"}
                    open={this.state.showSettings}
                    onClose={this.onSettingsClose}
                    aria-labelledby="settings-label"
                >
                    <DialogTitle id="settings-label">{"Settings"}</DialogTitle>
                    <DialogContent>
                        <FormControlLabel
                            control={
                                <Switch
                                    checked={this.state.linearSlider}
                                    onChange={this.onLinearSliderToggle}
                                    name="switch-linear-slider"
                                />
                            }
                            label="Linear slider"
                        />
                    </DialogContent>
                    <DialogActions>
                        <Button onClick={this.onSettingsClose} color="primary">
                            {"OK"}
                        </Button>
                    </DialogActions>
                </Dialog>
            </>
        );
    }
}

export default withStyles(styles)(SoundWave);