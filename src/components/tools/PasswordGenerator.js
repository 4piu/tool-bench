import React from "react";
import {withStyles} from "@material-ui/core/styles";
import PropTypes from "prop-types";
import MyAppBar from "../MyAppBar";
import FormControl from "@material-ui/core/FormControl";
import FormLabel from "@material-ui/core/FormLabel";
import FormControlLabel from "@material-ui/core/FormControlLabel";
import InputLabel from "@material-ui/core/InputLabel";
import Input from "@material-ui/core/Input";
import FormHelperText from "@material-ui/core/FormHelperText";
import TextField from "@material-ui/core/TextField";
import Button from "@material-ui/core/Button";
import FormGroup from "@material-ui/core/FormGroup";
import Checkbox from "@material-ui/core/Checkbox";
import FileCopyIcon from '@material-ui/icons/FileCopy';
import GetAppIcon from '@material-ui/icons/GetApp';
import DoneIcon from '@material-ui/icons/Done';
import RefreshIcon from '@material-ui/icons/Refresh';
import {downloadText} from "../../utils/DownloadService";
import csprng from "random-number-csprng";
// noinspection ES6UnusedImports
import regeneratorRuntime from "regenerator-runtime";
import {Tooltip} from "@material-ui/core";
import Switch from "@material-ui/core/Switch";
import Container from "@material-ui/core/Container";

const charSet = {
    upperCase: [..."ABCDEFGHIJKLMNOPQRSTUVWXYZ"],
    lowerCase: [..."abcdefghijklmnopqrstuvwxyz"],
    digit: [..."0123456789"],
    symbol: [..."`~!@#$%^&*()-_=+\\|;:'\",<.>/?"],
    confusingChar: [..."1iIl|0oOQ`':;,."]
};

const styles = theme => ({
    Container: {
        padding: theme.spacing(3),
        '& > *': {
            marginBottom: theme.spacing(3)
        }
    },
    ButtonContainer: {
        '& > *': {
            marginRight: theme.spacing(1),
            marginBottom: theme.spacing(2)
        }
    }
});

const randomNumber = async (min, max, useCsprng) => {
    return useCsprng ? (await csprng(min, max)) :
        (Math.floor(Math.random() * (max - min + 1)) + min)
};

const randomCharacter = async (type, allowConfusing, useCsprng) => {
    switch (type) {
        case 'upperCase': {
            for (; ;) {
                const char = charSet.upperCase[await randomNumber(0, charSet.upperCase.length - 1, useCsprng)];
                if (allowConfusing || !charSet.confusingChar.includes(char)) return char;
            }
        }
        case 'lowerCase': {
            for (; ;) {
                const char = charSet.lowerCase[await randomNumber(0, charSet.lowerCase.length - 1, useCsprng)];
                if (allowConfusing || !charSet.confusingChar.includes(char)) return char;
            }
        }
        case 'digit': {
            for (; ;) {
                const char = charSet.digit[await randomNumber(0, charSet.digit.length - 1, useCsprng)];
                if (allowConfusing || !charSet.confusingChar.includes(char)) return char;
            }
        }
        case 'symbol': {
            for (; ;) {
                const char = charSet.symbol[await randomNumber(0, charSet.symbol.length - 1, useCsprng)];
                if (allowConfusing || !charSet.confusingChar.includes(char)) return char;
            }
        }
    }
};

class PasswordGenerator extends React.Component {
    static propTypes = {
        title: PropTypes.string.isRequired,
        changeActivity: PropTypes.func.isRequired
    };

    constructor(props) {
        super(props);
        this.state = {
            upperCaseChecked: true,
            lowerCaseChecked: true,
            digitChecked: true,
            symbolChecked: false,
            confusingCharChecked: true,
            useCsprngChecked: true,
            checkboxInvalid: false,
            inputPasswordLength: "16",
            inputPasswordLengthInvalid: false,
            password: "",
            copied: false
        }
    }

    componentDidMount() {
        let savedInstance;
        try {
            savedInstance = JSON.parse(localStorage.getItem('password-generator'));
        } catch (e) {
            console.error('Failed to load saved instance');
        }
        if (savedInstance) this.setState(savedInstance);
    }

    componentWillUnmount() {
        const saveData = this.state;
        saveData.password = "";
        localStorage.setItem('password-generator', JSON.stringify(saveData));
    }

    checkboxCharactersHandler = name => event => {
        const state = {
            upperCaseChecked: this.state.upperCaseChecked,
            lowerCaseChecked: this.state.lowerCaseChecked,
            digitChecked: this.state.digitChecked,
            symbolChecked: this.state.symbolChecked
        };
        state[name] = event.currentTarget.checked;
        state.checkboxInvalid = !(state.upperCaseChecked || state.lowerCaseChecked || state.digitChecked || state.symbolChecked);
        this.setState(state);
    };

    inputNumberHandler = event => {
        const isValidLength = (str) => {
            str = str.trim();
            if (!str) {
                return false;
            }
            str = str.replace(/^0+/, "") || "0";
            const n = Math.floor(Number(str));
            return n !== Infinity && String(n) === str && n > 5;
        };
        const inputValue = event.currentTarget.value;
        const isValid = isValidLength(inputValue);
        const nextState = {
            inputPasswordLengthInvalid: !isValid,
            inputPasswordLength: inputValue
        };
        this.setState(nextState);
    };

    buttonGenerateHandler = async () => {
        if (this.state.checkboxInvalid || this.state.inputPasswordLengthInvalid) return;
        const tmp = [], allowedTypes = [];
        if (this.state.upperCaseChecked) allowedTypes.push('upperCase');
        if (this.state.lowerCaseChecked) allowedTypes.push('lowerCase');
        if (this.state.digitChecked) allowedTypes.push('digit');
        if (this.state.symbolChecked) allowedTypes.push('symbol');
        for (let i = 0; i < this.state.inputPasswordLength; i++) {
            const randomType = allowedTypes[allowedTypes.length > 1 ? await randomNumber(0, allowedTypes.length - 1, this.state.useCsprngChecked) : 0];
            tmp.push(await randomCharacter(randomType, this.state.confusingCharChecked, this.state.useCsprngChecked));
        }
        this.setState({
            password: tmp.join('')
        });
    };

    buttonCopyHandler = async () => {
        await navigator.clipboard.writeText(this.state.password);
        this.setState({
            copied: true
        });
        setTimeout(() => {
            this.setState({
                copied: false
            })
        }, 3000);
    };

    buttonDownloadHandler = () => {
        downloadText('password.txt', this.state.password);
    };

    render() {
        const {classes} = this.props;
        return (
            <>
                {/** App bar */}
                <MyAppBar
                    title={this.props.title}
                    isHome={false}
                    changeActivity={this.props.changeActivity}/>
                {/** Main view */}
                <Container className={classes.Container} maxWidth={"sm"}>
                    <FormControl error={this.state.checkboxInvalid} component="fieldset">
                        <FormLabel component="legend">Characters</FormLabel>
                        <FormGroup>
                            <Tooltip title={charSet.upperCase.join('')}
                                     placement={"right"} arrow>
                                <FormControlLabel
                                    control={<Checkbox
                                        checked={this.state.upperCaseChecked}
                                        onChange={this.checkboxCharactersHandler('upperCaseChecked')}/>}
                                    label="Upper case letters"
                                />
                            </Tooltip>
                            <Tooltip title={charSet.lowerCase.join('')}
                                     placement={"right"} arrow>
                                <FormControlLabel
                                    control={<Checkbox
                                        checked={this.state.lowerCaseChecked}
                                        onChange={this.checkboxCharactersHandler('lowerCaseChecked')}/>}
                                    label="Lower case letters"
                                />
                            </Tooltip>
                            <Tooltip title={charSet.digit.join('')}
                                     placement={"right"} arrow>
                                <FormControlLabel
                                    control={<Checkbox
                                        checked={this.state.digitChecked}
                                        onChange={this.checkboxCharactersHandler('digitChecked')}/>}
                                    label="Digits"
                                />
                            </Tooltip>
                            <Tooltip title={charSet.symbol.join('')}
                                     placement={"right"} arrow>
                                <FormControlLabel
                                    control={<Checkbox
                                        checked={this.state.symbolChecked}
                                        onChange={this.checkboxCharactersHandler('symbolChecked')}/>}
                                    label="Symbols"
                                />
                            </Tooltip>
                        </FormGroup>
                        {this.state.checkboxInvalid &&
                        <FormHelperText>Must select at least one character type</FormHelperText>}
                    </FormControl>
                    <br/>
                    <FormControl component="fieldset">
                        <FormLabel component="legend">Options</FormLabel>
                        <FormGroup>
                            <Tooltip title={charSet.confusingChar.join('')}
                                     placement={"right"} arrow>
                                <FormControlLabel
                                    control={<Switch
                                        checked={this.state.confusingCharChecked}
                                        onChange={this.checkboxCharactersHandler('confusingCharChecked')}/>}
                                    label="Allow confusing characters"
                                />
                            </Tooltip>
                            <Tooltip title={"Secure but much slower"} placement={"right"} arrow>
                                <FormControlLabel control={<Switch
                                    checked={this.state.useCsprngChecked}
                                    onChange={this.checkboxCharactersHandler('useCsprngChecked')}/>}
                                                  label="Use CSPRNG"
                                />
                            </Tooltip>
                        </FormGroup>
                    </FormControl>
                    <br/>
                    <FormControl error={this.state.inputPasswordLengthInvalid}>
                        <InputLabel htmlFor="input-length">Password length</InputLabel>
                        <Input
                            id="input-length"
                            aria-describedby={this.state.inputPasswordLengthInvalid ? "input-number-error" : null}
                            onChange={this.inputNumberHandler}
                            value={String(this.state.inputPasswordLength)}
                            inputProps={{
                                type: 'number',
                                min: '6',
                                step: '1'
                            }}
                        />
                        {this.state.inputPasswordLengthInvalid &&
                        <FormHelperText id="input-number-error">Must be a integer not small than 6</FormHelperText>}
                    </FormControl>
                    <br/>
                    <TextField
                        id="textarea-password-output"
                        label="Password"
                        multiline
                        rowsMax={10}
                        fullWidth={true}
                        variant="outlined"
                        value={this.state.password}
                        inputProps={{
                            spellCheck: false
                        }}
                    />
                    <br/>
                    <div className={classes.ButtonContainer}>
                        <Button variant="contained" color={"primary"}
                                disabled={this.state.inputPasswordLengthInvalid || this.state.checkboxInvalid}
                                onClick={this.buttonGenerateHandler}
                                startIcon={<RefreshIcon/>}
                        >Generate</Button>
                        <Button variant="contained"
                                disabled={this.state.inputPasswordLengthInvalid || this.state.checkboxInvalid}
                                onClick={this.buttonCopyHandler}
                                startIcon={this.state.copied ? <DoneIcon/> : <FileCopyIcon/>}
                        >{this.state.copied ? 'Copied' : 'Copy'}</Button>
                        <Button variant="contained"
                                disabled={this.state.inputPasswordLengthInvalid || this.state.checkboxInvalid}
                                onClick={this.buttonDownloadHandler}
                                startIcon={<GetAppIcon/>}
                        >Download</Button>
                    </div>
                </Container>
            </>
        );
    }
}

export default withStyles(styles)(PasswordGenerator);