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
        padding: theme.spacing(3),
        '& > *': {
            marginBottom: theme.spacing(3)
        }
    },
    ButtonContainer: {
        '& > *': {
            marginRight: theme.spacing(1)
        }
    },
    ButtonGenerateWrapper: {
        margin: theme.spacing(1),
        position: 'relative',
        display: 'inline'
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
            inputNumberInvalid: false,
            inputNumber: DEFAULT_NUMBER,
            inputVersion: DEFAULT_UUID_VERSION,
            generating: false,
            copied: false,
            uuidList: []
        };
    }

    async componentDidMount() {
        this.setState({
            uuidList: [await this.randomUuid(DEFAULT_UUID_VERSION, DEFAULT_NUMBER)]
        });
    }

    shouldComponentUpdate(nextProps, nextState, nextContext) {
        return (
            (this.state.inputNumberInvalid !== nextState.inputNumberInvalid) ||
            (this.state.uuidList !== nextState.uuidList) ||
            (this.state.generating !== nextState.generating) ||
            (this.state.copied !== nextState.copied) ||
            (this.state.inputVersion !== nextState.inputVersion)
        );
    }

    randomUuid = async (version = 1, number = 1) => {
        const ret = [];
        switch (version) {
            case 1:
                for (let i = 0; i < number; i++) ret.push(uuidV1());
                break;
            case 3:
                for (let i = 0; i < number; i++) ret.push(uuidV3());
                break;
            case 4:
                for (let i = 0; i < number; i++) ret.push(uuidV4());
                break;
            case 5:
                for (let i = 0; i < number; i++) ret.push(uuidV5());
                break;
        }
        return ret;
    };

    buttonGenerateHandler = async () => {
        if (this.state.inputNumberInvalid) return;
        const execJob = async () => {
            const uuidList = await this.randomUuid(this.state.inputVersion, this.state.inputNumber);
            this.setState({
                uuidList: uuidList,
                generating: false
            });
        };
        if (this.state.inputNumber > NUMBER_THRESHOLD) {
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
            inputNumber: isValid ? parseInt(inputValue) : 0
        });
    };

    inputVersionHandler = event => {
        this.setState({
            inputVersion: parseInt(event.currentTarget.value)
        });
    };

    render() {
        console.debug('rendered');
        const {classes} = this.props;
        return (
            <React.Fragment>
                <MyAppBar
                    title={this.props.title}
                    isHome={false}
                    changeActivity={this.props.changeActivity}/>
                <Grid container className={classes.GridContainer}>
                    <Grid item xs={12}>
                        <div>
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
                                    <FormControlLabel value="3" control={<Radio/>} label="UUID v3" disabled={true}/>
                                    <FormControlLabel value="5" control={<Radio/>} label="UUID v5" disabled={true}/>
                                </RadioGroup>
                            </FormControl>
                        </div>
                        <div>
                            <FormControl error={this.state.inputNumberInvalid}>
                                <InputLabel htmlFor="input-amount">Number</InputLabel>
                                <Input
                                    id="input-amount"
                                    aria-describedby={this.state.inputNumberInvalid ? "input-number-error" : ""}
                                    onChange={this.inputNumberHandler}
                                    defaultValue={1}
                                    inputProps={{
                                        type: 'number',
                                        min: '1',
                                        step: '1'
                                    }}
                                />
                                {this.state.inputNumberInvalid &&
                                <FormHelperText id="input-number-error">Must be a positive integer</FormHelperText>}
                            </FormControl>
                        </div>
                    </Grid>
                    <Grid item xs={12} sm={8} md={6} lg={4} xl={3}>
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
                    </Grid>
                    <Grid className={classes.ButtonContainer} item xs={12}>
                        <div className={classes.ButtonGenerateWrapper}>
                            <Button variant="contained" color={"primary"}
                                    disabled={this.state.inputNumberInvalid || this.state.generating}
                                    onClick={this.buttonGenerateHandler}
                                    startIcon={<PlayArrowIcon/>}
                            >Generate</Button>
                            {this.state.generating &&
                            <CircularProgress size={24} className={classes.ButtonGenerateProgress}/>}
                        </div>
                        <Button variant="contained"
                                disabled={this.state.inputNumberInvalid || this.state.uuidList.length > NUMBER_THRESHOLD}
                                onClick={this.buttonCopyHandler}
                                startIcon={this.state.copied ? <DoneIcon/> : <FileCopyIcon/>}
                        >{this.state.copied ? 'Copied' : 'Copy'}</Button>
                        <Button variant="contained"
                                disabled={this.state.inputNumberInvalid}
                                onClick={this.buttonDownloadHandler}
                                startIcon={<GetAppIcon/>}
                        >Download</Button>
                    </Grid>
                </Grid>
            </React.Fragment>
        );
    }
}

export default withStyles(styles)(UuidGenerator);