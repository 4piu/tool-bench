import React from "react";
import {withStyles} from "@material-ui/core/styles";
import PropTypes from "prop-types";
import MyAppBar from "../../MyAppBar";
import Container from "@material-ui/core/Container";
import QrCode from "qrcode";
import FormControl from "@material-ui/core/FormControl";
import InputLabel from "@material-ui/core/InputLabel";
import Select from "@material-ui/core/Select";
import MenuItem from "@material-ui/core/MenuItem";
import Typography from "@material-ui/core/Typography";
import Slider from "@material-ui/core/Slider";
import Input from "@material-ui/core/Input";
import InputAdornment from "@material-ui/core/InputAdornment";
import {ChromePicker} from "react-color";
import {ClickAwayListener} from "@material-ui/core";
import Popper from "@material-ui/core/Popper";
import FormHelperText from "@material-ui/core/FormHelperText";
import Loadable from "react-loadable";
// noinspection ES6UnusedImports
import regeneratorRuntime from "regenerator-runtime";
import Grid from "@material-ui/core/Grid";
import TextField from "@material-ui/core/TextField";
import {downloadBase64} from "../../../utils/DownloadService";

const isValidHexColor = str => {
    return /^#([0-9A-F]{3}){1,2}$/i.test(str);
};

const QrCodeImage = async (text, options) => {
    const onImgClick = event => {
        const imgSrc = event.currentTarget.src;
        downloadBase64("qr", imgSrc);
    };
    try {
        if (options.type === "svg") {
            const base64Img = (new Buffer(await QrCode.toString(text, options))).toString("base64");
            const imgSrc = `data:image/svg+xml;base64,${base64Img}`;
            return <img alt="qr-code" title="Click to download" src={imgSrc} onClick={onImgClick}/>;
        } else {
            const imgSrc = await QrCode.toDataURL(text, options);
            return <img alt="qr-code" title="Click to download" src={imgSrc} onClick={onImgClick}/>;
        }
    } catch (e) {
        console.error(e.message);
        return <div>{e.message}</div>;
    }
};

const styles = theme => ({
    root: {
        padding: theme.spacing(3),
        marginBottom: 80
    },
    Select: {
        marginRight: theme.spacing(2),
        marginBottom: theme.spacing(2),
        minWidth: 120
    },
    Slider: {
        maxWidth: 225,
        marginBottom: theme.spacing(1)
    },
    ColorBlock: {
        width: 24,
        height: 24,
        border: "1px solid #aaa",
        borderRadius: 4,
        cursor: "pointer"
    },
    InputForm: {
        maxWidth: 225,
        marginBottom: theme.spacing(2),
    },
    ColorInputBase: {
        fontFamily: "monospace"
    },
    ColorPickerPopper: {
        zIndex: theme.zIndex.drawer + 1,
        marginTop: theme.spacing(1)
    },
    ImageWrapper: {
        textAlign: "center",
        "& > img": {
            width: "100%",
            maxWidth: 300,
            cursor: "pointer"
        }
    }
});

class QrCodeGenerator extends React.Component {
    static propTypes = {
        title: PropTypes.string.isRequired
    };

    constructor(props) {
        super(props);
        this.state = {
            text: "Lorem ipsum",
            options: {
                errorCorrectionLevel: "M",
                type: "svg",
                quality: 0.9,
                color: {
                    dark: "#000000",
                    light: "#ffffff"
                },
                margin: 4,
                scale: 4
            },
            colorPicker: "off",
            refFgInput: React.createRef(),
            refBgInput: React.createRef()
        };
    }

    componentDidMount() {
        this.loadState();
    }

    componentDidUpdate(prevProps, prevState, snapshot) {
        this.saveState();
    }

    saveState = () => {
        const state = Object.assign({}, this.state);
        delete state.refFgInput;
        delete state.refBgInput;
        delete state.colorPicker;
        localStorage.setItem("qr", JSON.stringify(state));
    };

    loadState = () => {
        let savedInstance;
        try {
            savedInstance = JSON.parse(localStorage.getItem("qr"));
        } catch (e) {
            console.error("Fail to load saved instance");
        }
        this.setState(savedInstance);
    };

    onFormatChange = event => {
        const value = event.target.value;
        this.setState(state => {
            state.options.type = value;
            return {
                options: state.options
            };
        });
    };

    onCorrectionChange = event => {
        const value = event.target.value;
        this.setState(state => {
            state.options.errorCorrectionLevel = value;
            return {
                options: state.options
            };
        });
    };

    onQualityChange = (event, value) => {
        this.setState(state => {
            state.options.quality = value;
            return {
                options: state.options
            };
        });
    };

    onColorChange = color => {
        this.setState(state => {
            if (state.colorPicker === "fg") {
                state.options.color.dark = color.hex;
            } else {
                state.options.color.light = color.hex;
            }
            return {
                options: state.options
            };
        });
    };

    onColorInput = event => {
        const name = event.currentTarget.getAttribute("name");
        const value = event.currentTarget.value;
        this.setState(state => {
            switch (name) {
                case "fgColor":
                    state.options.color.dark = value;
                    break;
                case "bgColor":
                    state.options.color.light = value;
                    break;
            }
            return {
                options: state.options
            };
        });
    };

    onColorBlockClick = event => {
        const id = event.target.getAttribute("data-id");
        this.setState({
            colorPicker: id
        });
    };

    closeColorPicker = () => {
        this.setState({
            colorPicker: "off"
        });
    };

    onMarginChange = event => {
        const val = parseInt(event.currentTarget.value);
        this.setState(state => {
            state.options.margin = val;
            return {
                options: state.options
            };
        });
    };

    onScaleChange = event => {
        const val = parseInt(event.currentTarget.value);
        this.setState(state => {
            state.options.scale = val;
            return {
                options: state.options
            };
        });
    };

    onTextInput = event => {
        const val = event.currentTarget.value;
        this.setState({
            text: val
        });
    };

    render() {
        const {classes} = this.props;
        const fgColorErr = !isValidHexColor(this.state.options.color.dark);
        const bgColorErr = !isValidHexColor(this.state.options.color.light);
        const QrCode = Loadable({
            loader: () => (QrCodeImage(this.state.text, this.state.options)),
            loading: () => (<div>Rendering...</div>),
            render: (loaded) => (loaded)
        });
        return (
            <>
                {/** App bar */}
                <MyAppBar title={this.props.title}/>
                {/** Main view */}
                <Container maxWidth={"md"} className={classes.root}>
                    <Grid container spacing={3}>
                        <Grid item xs={12} sm={6}>
                            <FormControl>
                                <InputLabel id="select-format-label">Format</InputLabel>
                                <Select
                                    className={classes.Select}
                                    labelId="select-format-label"
                                    id="select-format"
                                    value={this.state.options.type}
                                    onChange={this.onFormatChange}
                                    autoWidth={true}
                                >
                                    <MenuItem value={"svg"}>svg</MenuItem>
                                    <MenuItem value={"image/png"}>png</MenuItem>
                                    <MenuItem value={"image/jpeg"}>jpg</MenuItem>
                                    <MenuItem value={"image/webp"}>webp</MenuItem>
                                </Select>
                            </FormControl>
                            <br/>
                            <FormControl>
                                <InputLabel id="select-correction-label">Correction level</InputLabel>
                                <Select
                                    className={classes.Select}
                                    labelId="select-correction-label"
                                    id="select-correction"
                                    value={this.state.options.errorCorrectionLevel}
                                    onChange={this.onCorrectionChange}
                                    autoWidth={true}
                                >
                                    <MenuItem value={"L"}>L (~7%)</MenuItem>
                                    <MenuItem value={"M"}>M (~15%)</MenuItem>
                                    <MenuItem value={"Q"}>Q (~25%)</MenuItem>
                                    <MenuItem value={"H"}>H (~30%)</MenuItem>
                                </Select>
                            </FormControl>
                            <br/>
                            {(this.state.options.type === "image/jpeg" ||
                                this.state.options.type === "image/webp") &&
                            <div className={classes.Slider}>
                                <InputLabel id="slider-quality" shrink={true}>Quality</InputLabel>
                                <Slider
                                    aria-labelledby="slider-quality"
                                    value={this.state.options.quality}
                                    onChange={this.onQualityChange}
                                    min={0}
                                    max={1}
                                    step={0.05}
                                    valueLabelDisplay="auto"
                                />
                            </div>}
                            <FormControl
                                className={classes.InputForm}
                                ref={this.state.refFgInput}
                                error={fgColorErr}>
                                <InputLabel htmlFor="input-color-fg">Foreground color</InputLabel>
                                <Input
                                    className={classes.ColorInputBase}
                                    id="input-color-fg"
                                    value={this.state.options.color.dark}
                                    onChange={this.onColorInput}
                                    autoComplete="off"
                                    name="fgColor"
                                    inputProps={{
                                        spellCheck: false
                                    }}
                                    endAdornment={
                                        <InputAdornment position="end">
                                            <div className={classes.ColorBlock}
                                                 style={{background: this.state.options.color.dark}}
                                                 data-id={"fg"}
                                                 onClick={this.onColorBlockClick}/>
                                        </InputAdornment>
                                    }
                                />
                                {fgColorErr &&
                                <FormHelperText>Invalid hex color</FormHelperText>}
                            </FormControl>
                            <br/>
                            <FormControl
                                className={classes.InputForm}
                                ref={this.state.refBgInput}
                                error={bgColorErr}>
                                <InputLabel htmlFor="input-color-bk">Background color</InputLabel>
                                <Input
                                    className={classes.ColorInputBase}
                                    id="input-color-bk"
                                    value={this.state.options.color.light}
                                    onChange={this.onColorInput}
                                    autoComplete="off"
                                    name="bgColor"
                                    inputProps={{
                                        spellCheck: false
                                    }}
                                    endAdornment={
                                        <InputAdornment position="end">
                                            <div className={classes.ColorBlock}
                                                 style={{background: this.state.options.color.light}}
                                                 data-id={"bg"}
                                                 onClick={this.onColorBlockClick}/>
                                        </InputAdornment>
                                    }
                                />
                                {bgColorErr &&
                                <FormHelperText>Invalid hex color</FormHelperText>}
                            </FormControl>
                            <br/>
                            <FormControl
                                className={classes.InputForm}
                                error={isNaN(this.state.options.margin)}>
                                <InputLabel htmlFor="input-margin">Margin</InputLabel>
                                <Input
                                    id="input-margin"
                                    aria-describedby={isNaN(this.state.options.margin) ? "input-margin-error" : null}
                                    onChange={this.onMarginChange}
                                    value={String(this.state.options.margin)}
                                    inputProps={{
                                        type: "number",
                                        min: "0",
                                        step: "1"
                                    }}
                                />
                                {isNaN(this.state.options.margin) &&
                                <FormHelperText id="input-number-error">Must be a positive integer</FormHelperText>}
                            </FormControl>
                            <br/>
                            <FormControl
                                className={classes.InputForm}
                                error={isNaN(this.state.options.scale)}>
                                <InputLabel htmlFor="input-scale">Scale</InputLabel>
                                <Input
                                    id="input-scale"
                                    aria-describedby={isNaN(this.state.options.scale) ? "input-scale-error" : null}
                                    onChange={this.onScaleChange}
                                    value={String(this.state.options.scale)}
                                    inputProps={{
                                        type: "number",
                                        min: "1",
                                        step: "1"
                                    }}
                                />
                                {isNaN(this.state.options.scale) &&
                                <FormHelperText id="input-scale-error">Must be a positive integer</FormHelperText>}
                            </FormControl>
                            <br/>
                            <TextField
                                id="textarea-text"
                                label="Text"
                                multiline
                                fullWidth={true}
                                variant="outlined"
                                value={this.state.text}
                                rows={4}
                                rowsMax={16}
                                onChange={this.onTextInput}
                            />
                            <Popper
                                className={classes.ColorPickerPopper}
                                anchorEl={this.state.colorPicker === "fg" ?
                                    this.state.refFgInput.current :
                                    this.state.refBgInput.current}
                                open={this.state.colorPicker !== "off"}>
                                <ClickAwayListener onClickAway={this.closeColorPicker}>
                                    <ChromePicker
                                        color={this.state.colorPicker === "fg" ?
                                            this.state.options.color.dark :
                                            this.state.options.color.light}
                                        disableAlpha={true}
                                        onChange={this.onColorChange}/>
                                </ClickAwayListener>
                            </Popper>
                        </Grid>
                        <Grid item xs={12} sm={6}>
                            <div className={classes.ImageWrapper}>
                                <QrCode/>
                            </div>
                        </Grid>
                    </Grid>
                </Container>
            </>
        );
    }
}

export default withStyles(styles)(QrCodeGenerator);