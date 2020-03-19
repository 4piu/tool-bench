import React from "react";
import {withStyles} from "@material-ui/core/styles";
import PropTypes from "prop-types";
import MyAppBar from "../MyAppBar";
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
import Divider from "@material-ui/core/Divider";
import FormHelperText from "@material-ui/core/FormHelperText";

const isValidHexColor = str => {
    return /^#([0-9A-F]{3}){1,2}$/i.test(str);
};

const styles = theme => ({
    root: {
        padding: theme.spacing(3)
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
    ColorInputForm: {
        maxWidth: 225,
        marginBottom: theme.spacing(2),
    },
    ColorInputBase: {
        fontFamily: "monospace"
    },
    ColorPickerPopper: {
        zIndex: theme.zIndex.drawer + 1,
        marginTop: theme.spacing(1)
    }
});

class QrCodeGenerator extends React.Component {
    static propTypes = {
        title: PropTypes.string.isRequired
    };

    constructor(props) {
        super(props);
        this.state = {
            text: "",
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
            refBkInput: React.createRef()
        };
    }

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

    render() {
        const {classes} = this.props;
        const fgColorErr = !isValidHexColor(this.state.options.color.dark);
        const bgColorErr = !isValidHexColor(this.state.options.color.light);
        return (
            <>
                {/** App bar */}
                <MyAppBar title={this.props.title}/>
                {/** Main view */}
                <Container className={classes.root} maxWidth={"sm"}>
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
                        className={classes.ColorInputForm}
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
                        className={classes.ColorInputForm}
                        ref={this.state.refBkInput}
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
                    <Popper
                        className={classes.ColorPickerPopper}
                        anchorEl={this.state.colorPicker === "fg" ?
                            this.state.refFgInput.current :
                            this.state.refBkInput.current}
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
                    <Divider/>
                </Container>
            </>
        );
    }
}

export default withStyles(styles)(QrCodeGenerator);