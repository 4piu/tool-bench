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
import Grid from "@material-ui/core/Grid";
import Button from "@material-ui/core/Button";
import InputLabel from "@material-ui/core/InputLabel";
import Input from "@material-ui/core/Input";
import FormHelperText from "@material-ui/core/FormHelperText";
import {v1 as uuidV1, v3 as uuidV3, v4 as uuidV4, v5 as uuidV5} from "uuid";
// noinspection ES6UnusedImports
import regeneratorRuntime from "regenerator-runtime";
import CircularProgress from "@material-ui/core/CircularProgress";
import PlayArrowIcon from '@material-ui/icons/PlayArrow';
import FileCopyIcon from '@material-ui/icons/FileCopy';
import GetAppIcon from '@material-ui/icons/GetApp';
import DoneIcon from '@material-ui/icons/Done';

const NUMBER_THRESHOLD = 1000;
const DEFAULT_NUMBER = 1;
const DEFAULT_UUID_VERSION = 4;

const styles = theme => ({
    GridContainer: {
        padding: theme.spacing(3)
    },
    GridItem: {
        '& > *': {
            marginBottom: theme.spacing(3)
        }
    },
    GridItemButtonContainer: {
        '& > *': {
            marginRight: theme.spacing(1),
            marginBottom: theme.spacing(2)
        }
    },
    ButtonGenerateWrapper: {
        position: 'relative',
        display: 'inline-flex'
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

class UuidGenerator extends React.Component {

    static propTypes = {
        title: PropTypes.string.isRequired,
        changeActivity: PropTypes.func.isRequired
    };

    constructor(props) {
        super(props);
        this.state = {
            inputVersion: DEFAULT_UUID_VERSION,
            inputNumberInvalid: false,
            inputNumber: DEFAULT_NUMBER,
            inputNamespaceInvalid: false,
            inputNamespace: null,
            inputName: "",
            generating: false,
            copied: false,
            uuidList: []
        };
    }

    async componentDidMount() {
        // TODO read saved instance
        this.setState({
            uuidList: await this.randomUuid(DEFAULT_UUID_VERSION, DEFAULT_NUMBER),
            inputNamespace: (await this.randomUuid(4, 1))[0]
        });
    }

    componentWillUnmount() {
        // TODO save instance
    }

    shouldComponentUpdate(nextProps, nextState, nextContext) {
        return (
            (this.state.inputNumberInvalid !== nextState.inputNumberInvalid) ||
            (this.state.uuidList !== nextState.uuidList) ||
            (this.state.generating !== nextState.generating) ||
            (this.state.copied !== nextState.copied) ||
            (this.state.inputVersion !== nextState.inputVersion) ||
            (this.state.inputNamespaceInvalid !== nextState.inputNamespaceInvalid)
        );
    }

    isInvalidInput = () => {
        if (this.state.inputVersion === 1 || this.state.inputVersion === 4) return this.state.inputNumberInvalid;
        if (this.state.inputVersion === 3 || this.state.inputVersion === 5) return this.state.inputNamespaceInvalid;
    };

    randomUuid = async (version, number, name, namespace) => {
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

    buttonGenerateHandler = async () => {
        if (this.isInvalidInput()) return;
        const execJob = async () => {
            const uuidList = await this.randomUuid(this.state.inputVersion, this.state.inputNumber, this.state.inputName, this.state.inputNamespace);
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
        const download = (filename, text) => {
            const element = document.createElement('a');
            element.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(text));
            element.setAttribute('download', filename);
            element.style.display = 'none';
            document.body.appendChild(element);
            element.click();
            document.body.removeChild(element);
        };
        download(`UUID-${this.state.uuidList.length}.txt`, this.state.uuidList.join('\n'));
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
        this.setState({
            inputNumberInvalid: !isValid,
            inputNumber: isValid ? parseInt(inputValue) : null
        });
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
        // console.debug('rendered');
        // console.debug(this.state.inputNumber);
        const {classes} = this.props;
        return (
            <>
                {/** App bar */}
                <MyAppBar
                    title={this.props.title}
                    isHome={false}
                    changeActivity={this.props.changeActivity}/>
                {/** Main view */}
                <Grid container className={classes.GridContainer}>
                    {/** UUID version radio input */}
                    <Grid item xs={12} className={classes.GridItem}>
                        <FormControl component="fieldset">
                            <FormLabel component="legend">UUID version</FormLabel>
                            <RadioGroup
                                aria-label="uuid-version"
                                name="uuid-version"
                                defaultValue={`${DEFAULT_UUID_VERSION}`}
                                onChange={this.inputVersionHandler}
                            >
                                <FormControlLabel value="1" control={<Radio/>} label="UUID v1"/>
                                <FormControlLabel value="4" control={<Radio/>} label="UUID v4"/>
                                <FormControlLabel value="3" control={<Radio/>} label="UUID v3"/>
                                <FormControlLabel value="5" control={<Radio/>} label="UUID v5"/>
                            </RadioGroup>
                        </FormControl>
                    </Grid>
                    {/** Option inputs and output*/}
                    <Grid item xs={12} sm={8} md={6} lg={4} xl={3} className={classes.GridItem}>
                        <>
                            {(this.state.inputVersion === 1 || this.state.inputVersion === 4) &&
                            <FormControl error={this.isInvalidInput()}>
                                <InputLabel htmlFor="input-amount">Number</InputLabel>
                                <Input
                                    id="input-amount"
                                    aria-describedby={this.isInvalidInput() ? "input-number-error" : null}
                                    onChange={this.inputNumberHandler}
                                    defaultValue={this.state.inputNumber}
                                    inputProps={{
                                        type: 'number',
                                        min: '1',
                                        step: '1'
                                    }}
                                />
                                {this.isInvalidInput() &&
                                <FormHelperText id="input-number-error">Must be a positive integer</FormHelperText>}
                            </FormControl>}
                            {(this.state.inputVersion === 3 || this.state.inputVersion === 5) &&
                            <>
                                <FormControl fullWidth={true} error={this.state.inputNamespaceInvalid}>
                                    <InputLabel htmlFor="input-namespace">Namespace</InputLabel>
                                    <Input
                                        id={"input-namespace"}
                                        name={"namespace"}
                                        aria-describedby={this.state.inputNamespaceInvalid ? "input-namespace-error" : ""}
                                        onChange={this.inputNamespaceHandler}
                                        defaultValue={this.state.inputNamespace}
                                        autoComplete={"off"}   // autocomplete="off" may not working https://bugs.chromium.org/p/chromium/issues/detail?id=914451
                                        fullWidth={true}
                                    />
                                    {this.state.inputNamespaceInvalid &&
                                    <FormHelperText id="input-namespace-error">Must be UUID</FormHelperText>}
                                </FormControl>
                                <FormControl fullWidth={true}>
                                    <InputLabel htmlFor="input-name">Name</InputLabel>
                                    <Input
                                        id="input-name"
                                        name={"name"}
                                        onChange={this.inputNameHandler}
                                        fullWidth={true}
                                        multiline={true}
                                        autoComplete={"off"}   // autocomplete="off" may not working https://bugs.chromium.org/p/chromium/issues/detail?id=914451
                                        rowsMax={10}
                                    />
                                </FormControl>
                            </>
                            }
                        </>
                        <>
                            <TextField
                                id="textfield-uuid-output"
                                label="UUID"
                                disabled={this.state.uuidList.length > NUMBER_THRESHOLD}
                                multiline
                                rowsMax={20}
                                fullWidth={true}
                                variant="outlined"
                                value={(this.state.uuidList.length > NUMBER_THRESHOLD) ? "Please download instead" : this.state.uuidList.join('\n')}
                            />
                        </>
                    </Grid>
                    {/** Buttons */}
                    <Grid className={classes.GridItemButtonContainer} item xs={12}>
                        <div className={classes.ButtonGenerateWrapper}>
                            <Button variant="contained" color={"primary"}
                                    disabled={this.isInvalidInput() || this.state.generating}
                                    onClick={this.buttonGenerateHandler}
                                    startIcon={<PlayArrowIcon/>}
                            >Generate</Button>
                            {this.state.generating &&
                            <CircularProgress size={24} className={classes.ButtonGenerateProgress}/>}
                        </div>
                        <div className={classes.ButtonGenerateWrapper}>
                        <Button variant="contained"
                                disabled={this.isInvalidInput() || this.state.uuidList.length > NUMBER_THRESHOLD}
                                onClick={this.buttonCopyHandler}
                                startIcon={this.state.copied ? <DoneIcon/> : <FileCopyIcon/>}
                        >{this.state.copied ? 'Copied' : 'Copy'}</Button>
                        </div>
                        <div className={classes.ButtonGenerateWrapper}>
                        <Button variant="contained"
                                disabled={this.isInvalidInput()}
                                onClick={this.buttonDownloadHandler}
                                startIcon={<GetAppIcon/>}
                        >Download</Button>
                        </div>
                    </Grid>
                </Grid>
            </>
        );
    }
}

export default withStyles(styles)(UuidGenerator);