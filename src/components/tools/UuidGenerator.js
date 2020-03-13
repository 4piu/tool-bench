import React from "react";
import PropTypes from "prop-types";
import MyAppBar from "../MyAppBar";
import FormControl from "@material-ui/core/FormControl";
import FormLabel from "@material-ui/core/FormLabel";
import RadioGroup from "@material-ui/core/RadioGroup";
import FormControlLabel from "@material-ui/core/FormControlLabel";
import Radio from "@material-ui/core/Radio";
import {withStyles} from "@material-ui/core/styles";
import TextField from "@material-ui/core/TextField";
import Button from "@material-ui/core/Button";
import InputLabel from "@material-ui/core/InputLabel";
import Input from "@material-ui/core/Input";
import FormHelperText from "@material-ui/core/FormHelperText";
import {downloadText} from "../../utils/DownloadService";
import {v1 as uuidV1, v3 as uuidV3, v4 as uuidV4, v5 as uuidV5} from "uuid";
import CircularProgress from "@material-ui/core/CircularProgress";
import PlayArrowIcon from '@material-ui/icons/PlayArrow';
import FileCopyIcon from '@material-ui/icons/FileCopy';
import GetAppIcon from '@material-ui/icons/GetApp';
import DoneIcon from '@material-ui/icons/Done';
// noinspection ES6UnusedImports
import regeneratorRuntime from "regenerator-runtime";
import Container from "@material-ui/core/Container";

const NUMBER_THRESHOLD = 1000;
const DEFAULT_NUMBER = 1;
const DEFAULT_UUID_VERSION = 4;

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
    },
    ButtonWrapper: {
        position: 'relative',
        display: 'inline-flex',
        [theme.breakpoints.down('xs')]: {
            width: '100%'
        }
    },
    ButtonGenerateProgress: {
        color: "primary",
        position: 'absolute',
        top: '50%',
        left: '50%',
        marginTop: -12,
        marginLeft: -12,
    }
});

const randomUuid = async (version, number, name, namespace) => {
    // console.debug(`${version}, ${number}, ${name}, ${namespace}`);
    switch (version) {
        case 1: {
            const ret = [];
            for (let i = 0; i < number; i++) ret.push(uuidV1());
            return ret;
        }
        case 3:
            return [uuidV3(name, namespace)];
        case 4: {
            const ret = [];
            for (let i = 0; i < number; i++) ret.push(uuidV4());
            return ret;
        }
        case 5:
            return [uuidV5(name, namespace)];
    }
};

class UuidGenerator extends React.PureComponent {

    static propTypes = {
        title: PropTypes.string
    };

    constructor(props) {
        super(props);
        this.state = {
            inputVersion: null,
            inputNumberInvalid: false,
            inputNumber: "",
            inputNamespaceInvalid: false,
            inputNamespace: "",
            inputName: "",
            generating: false,
            copied: false,
            uuidList: []
        };
        // console.debug('init')
    }

    async componentDidMount() {
        await this.loadState()
    }

    loadState = async () => {
        let savedInstance;
        try {
            savedInstance = JSON.parse(localStorage.getItem('uuid-generator'));
        } catch (e) {
            console.error('Fail to load saved instance');
        }
        this.setState(savedInstance ||
            {
                inputVersion: DEFAULT_UUID_VERSION,
                inputNumber: DEFAULT_NUMBER,
                uuidList: await randomUuid(DEFAULT_UUID_VERSION, DEFAULT_NUMBER),
                inputNamespace: (await randomUuid(4, 1))[0]
            });
    };

    saveState = () => {
        localStorage.setItem('uuid-generator', JSON.stringify(this.state));
    };

    componentDidUpdate(prevProps, state, snapshot) {
        this.saveState();
    }

    isInvalidInput = () => {
        if (this.state.inputVersion === 1 || this.state.inputVersion === 4) return this.state.inputNumberInvalid;
        if (this.state.inputVersion === 3 || this.state.inputVersion === 5) return this.state.inputNamespaceInvalid;
    };

    buttonGenerateHandler = async () => {
        if (this.isInvalidInput()) return;
        const execJob = async () => {
            const uuidList = await randomUuid(this.state.inputVersion, this.state.inputNumber, this.state.inputName, this.state.inputNamespace);
            this.setState({
                uuidList: uuidList,
                generating: false
            });
        };
        if ((this.state.inputVersion === 1 || this.state.inputVersion === 4) && this.state.inputNumber > NUMBER_THRESHOLD) {
            this.setState({
                generating: true
            });
            setTimeout(execJob, 800);
        } else {
            await execJob();
        }
    };

    buttonCopyHandler = async () => {
        await navigator.clipboard.writeText(this.state.uuidList.join('\n'));
        this.setState({
            copied: true
        });
        setTimeout(() => {
            this.setState({
                copied: false
            })
        }, 3000);
    };

    buttonDownloadHandler = async () => {
        downloadText(`UUID-${this.state.uuidList.length}.txt`, this.state.uuidList.join('\n'));
    };

    inputNumberHandler = event => {
        const isPositiveInteger = (str) => {
            str = str.trim();
            if (!str) {
                return false;
            }
            str = str.replace(/^0+/, "") || "0";
            const n = Math.floor(Number(str));
            return n !== Infinity && String(n) === str && n > 0;
        };
        const inputValue = event.currentTarget.value;
        const isValid = isPositiveInteger(inputValue);
        const nextState = {
            inputNumberInvalid: !isValid,
            inputNumber: isValid ? parseInt(inputValue) : null
        };
        this.setState(nextState);
    };

    inputNamespaceHandler = event => {
        const isValidUuid = (str) => {
            return /^[0-9a-f]{8}-*[0-9a-f]{4}-*[1-5][0-9a-f]{3}-*[89ab][0-9a-f]{3}-*[0-9a-f]{12}$/i.test(str);
        };
        const inputValue = event.currentTarget.value;
        const isValid = isValidUuid(inputValue);
        this.setState({
            inputNamespaceInvalid: !isValid,
            inputNamespace: inputValue
        });
    };

    inputNameHandler = event => {
        this.setState({
            inputName: event.currentTarget.value
        });
    };

    inputVersionHandler = event => {
        this.setState({
            inputVersion: parseInt(event.currentTarget.value)
        });
    };

    render() {
        const {classes} = this.props;
        return (
            <>
                {/** App bar */}
                <MyAppBar title={this.props.title}/>
                {/** Main view */}
                <Container className={classes.Container} maxWidth={"sm"}>
                    <>
                        <FormControl component="fieldset">
                            <FormLabel component="legend">UUID version</FormLabel>
                            <RadioGroup
                                aria-label="uuid-version"
                                name="uuid-version"
                                value={String(this.state.inputVersion)}
                                onChange={this.inputVersionHandler}
                            >
                                <FormControlLabel value="1" control={<Radio/>} label="UUID v1"/>
                                <FormControlLabel value="4" control={<Radio/>} label="UUID v4"/>
                                <FormControlLabel value="3" control={<Radio/>} label="UUID v3"/>
                                <FormControlLabel value="5" control={<Radio/>} label="UUID v5"/>
                            </RadioGroup>
                        </FormControl>
                        <br/>
                        {// Number input
                            (this.state.inputVersion === 1 || this.state.inputVersion === 4) &&
                            <FormControl error={this.isInvalidInput()}>
                                <InputLabel htmlFor="input-amount">Number</InputLabel>
                                <Input
                                    id="input-amount"
                                    aria-describedby={this.isInvalidInput() ? "input-number-error" : null}
                                    onChange={this.inputNumberHandler}
                                    value={String(this.state.inputNumber)}
                                    inputProps={{
                                        type: 'number',
                                        min: '1',
                                        step: '1'
                                    }}
                                />
                                {this.isInvalidInput() &&
                                <FormHelperText id="input-number-error">Must be a positive integer</FormHelperText>}
                            </FormControl>}
                        {// Namespace and name input
                            (this.state.inputVersion === 3 || this.state.inputVersion === 5) &&
                            <>
                                <FormControl fullWidth={true} error={this.state.inputNamespaceInvalid}>
                                    <InputLabel htmlFor="input-namespace">Namespace</InputLabel>
                                    <Input
                                        id={"input-namespace"}
                                        name={"namespace"}
                                        aria-describedby={this.state.inputNamespaceInvalid ? "input-namespace-error" : ""}
                                        onChange={this.inputNamespaceHandler}
                                        value={this.state.inputNamespace}
                                        autoComplete={"off"}   // autocomplete="off" may not working https://bugs.chromium.org/p/chromium/issues/detail?id=914451
                                        fullWidth={true}
                                        inputProps={{
                                            spellCheck: false
                                        }}
                                    />
                                    {this.state.inputNamespaceInvalid &&
                                    <FormHelperText id="input-namespace-error">Must be UUID</FormHelperText>}
                                </FormControl>
                                <br/>
                                <FormControl fullWidth={true}>
                                    <InputLabel htmlFor="input-name">Name</InputLabel>
                                    <Input
                                        id="input-name"
                                        name={"name"}
                                        onChange={this.inputNameHandler}
                                        fullWidth={true}
                                        multiline={true}
                                        value={this.state.inputName}
                                        autoComplete={"off"}   // autocomplete="off" may not working https://bugs.chromium.org/p/chromium/issues/detail?id=914451
                                        rowsMax={10}
                                        inputProps={{
                                            spellCheck: false
                                        }}
                                    />
                                </FormControl>
                            </>
                        }
                        <br/>
                        <TextField
                            id="textarea-uuid-output"
                            label="UUID"
                            disabled={this.state.uuidList.length > NUMBER_THRESHOLD}
                            multiline
                            rowsMax={10}
                            fullWidth={true}
                            variant="outlined"
                            value={(this.state.uuidList.length > NUMBER_THRESHOLD) ? "Please download instead" : this.state.uuidList.join('\n')}
                            inputProps={{
                                spellCheck: false
                            }}
                        />
                        <br/>
                        <div className={classes.ButtonContainer}>
                            <div className={classes.ButtonWrapper}>
                                <Button variant="contained" color={"primary"}
                                        disabled={this.isInvalidInput() || this.state.generating}
                                        onClick={this.buttonGenerateHandler}
                                        fullWidth={true}
                                        startIcon={<PlayArrowIcon/>}
                                >Generate</Button>
                                {this.state.generating &&
                                <CircularProgress size={24} className={classes.ButtonGenerateProgress}/>}
                            </div>
                            <div className={classes.ButtonWrapper}>
                                <Button variant="contained"
                                        disabled={this.isInvalidInput() || this.state.uuidList.length > NUMBER_THRESHOLD}
                                        onClick={this.buttonCopyHandler}
                                        fullWidth={true}
                                        startIcon={this.state.copied ? <DoneIcon/> : <FileCopyIcon/>}
                                >{this.state.copied ? 'Copied' : 'Copy'}</Button>
                            </div>
                            <div className={classes.ButtonWrapper}>
                                <Button variant="contained"
                                        disabled={this.isInvalidInput()}
                                        onClick={this.buttonDownloadHandler}
                                        fullWidth={true}
                                        startIcon={<GetAppIcon/>}
                                >Download</Button>
                            </div>
                        </div>
                    </>
                </Container>
            </>
        );
    }
}

export default withStyles(styles)(UuidGenerator);