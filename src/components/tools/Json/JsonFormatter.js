import React from "react";
import {withStyles} from "@material-ui/core/styles";
import PropTypes from "prop-types";
import MyAppBar from "../../MyAppBar";
import AppBar from "@material-ui/core/AppBar";
import Tabs from "@material-ui/core/Tabs";
import Tab from "@material-ui/core/Tab";
import AddIcon from "@material-ui/icons/Add";
import IconButton from "@material-ui/core/IconButton";
import CloseIcon from "@material-ui/icons/Close";
import {v4 as uuidV4} from "uuid";
import Grid from "@material-ui/core/Grid";
import TextField from "@material-ui/core/TextField";
import Button from "@material-ui/core/Button";
import DoneIcon from "@material-ui/icons/Done";
import FileCopyIcon from "@material-ui/icons/FileCopy";
import GetAppIcon from "@material-ui/icons/GetApp";
import {downloadText} from "../../../utils/DownloadService";
// noinspection ES6UnusedImports
import regeneratorRuntime from "regenerator-runtime";
import FormControl from "@material-ui/core/FormControl";
import FormLabel from "@material-ui/core/FormLabel";
import FormControlLabel from "@material-ui/core/FormControlLabel";
import Radio from "@material-ui/core/Radio";
import RadioGroup from "@material-ui/core/RadioGroup";
import InputLabel from "@material-ui/core/InputLabel";
import MenuItem from "@material-ui/core/MenuItem";
import Select from "@material-ui/core/Select";
import Toolbar from "@material-ui/core/Toolbar";
import MyDynamicTab from "../../MyDynamicTab";

class JsonTab extends MyDynamicTab.DataTab {
    constructor(active) {
        super(active);
        this.data = {
            original: "",
            output: "",
            mode: "beautify",
            indent: 4
        };
    }
}

const styles = theme => ({
    Container: {
        padding: theme.spacing(3),
        "& > *": {
            marginBottom: theme.spacing(2),
        }
    },
    ButtonContainer: {
        "& > *": {
            marginRight: theme.spacing(1),
            marginBottom: theme.spacing(2)
        }
    },
    ButtonWrapper: {
        position: "relative",
        display: "inline-flex",
        [theme.breakpoints.down("xs")]: {
            width: "100%"
        }
    },
    SelectIndent: {
        margin: theme.spacing(1),
        minWidth: 120
    }
});

class JsonFormatter extends React.Component {
    static propTypes = {
        title: PropTypes.string
    };

    constructor(props) {
        super(props);
        this.state = {
            tabs: [new JsonTab(true)],
            copied: false
        };
    }

    componentDidMount() {
        this.loadState();
    }

    componentDidUpdate(prevProps, state, snapshot) {
        this.saveState();
    };

    loadState = () => {
        let savedInstance;
        try {
            savedInstance = JSON.parse(localStorage.getItem("json-formatter"));
        } catch (e) {
            console.error("Failed to load saved instance");
        }
        if (savedInstance) {
            this.setState(savedInstance);
        }
    };

    saveState = () => {
        localStorage.setItem("json-formatter", JSON.stringify(this.state));
    };

    closeAllTab = () => {
        this.setState({
            tabs: [new JsonTab()]
        });
    };

    beautifyInput = (event, tab) => {
        const input = event ? event.currentTarget.value : tab.original;
        let beautified;
        try {
            beautified = JSON.stringify(JSON.parse(input), null, tab.data.indent);
        } catch (e) {
            beautified = e.message;
        }
        tab.data.original = input;
        tab.data.output = beautified;
        this.setState(this.state);
    };

    uglifyInput = (event, tab) => {
        const input = event ? event.currentTarget.value : tab.original;
        let uglified;
        try {
            uglified = JSON.stringify(JSON.parse(input));
        } catch (e) {
            uglified = e.message;
        }
        tab.data.original = input;
        tab.data.output = uglified;
        this.setState(this.state);
    };

    buttonCopyHandler = async (tab) => {
        const text = tab.data.output;
        await navigator.clipboard.writeText(text);
        this.setState({
            copied: true
        });
        setTimeout(() => {
            this.setState({
                copied: false
            });
        }, 3000);
    };

    buttonDownloadHandler = async (tab) => {
        const text = tab.data.output;
        downloadText(`${tab.data.mode}.txt`, text);
    };

    selectModeHandler = (event, newValue, tab) => {
        tab.data.mode = newValue;
        if (tab.data.mode === "beautify") {
            this.beautifyInput(null, tab);
        } else {
            this.uglifyInput(null, tab);
        }
    };

    selectIndentHandler = (event, tab) => {
        switch (event.target.value) {
            case "2":
                tab.data.indent = 2;
                break;
            case "3":
                tab.data.indent = 3;
                break;
            case "4":
                tab.data.indent = 4;
                break;
            default:
                tab.data.indent = "\t";
        }
        if (tab.data.mode === "beautify") {
            this.beautifyInput(null, tab);
        } else {
            this.uglifyInput(null, tab);
        }
    };

    onTabChange = tabs => {
        this.setState({
            tabs: tabs
        });
    };

    render() {
        const {classes} = this.props;
        return (
            <>
                <div style={{
                    position: "fixed",
                    top: 0,
                    left: 0,
                    right: 0,
                    zIndex: 2
                }}>
                    {/** App bar */}
                    <MyAppBar position={"static"} title={this.props.title}/>
                    {/** Tabs */}
                    <MyDynamicTab tabClass={JsonTab} tabs={this.state.tabs} onTabChange={this.onTabChange}/>
                    {/** Main view */}
                </div>
                <Toolbar/>
                <Toolbar/>
                <>
                    {this.state.tabs
                        .filter(x => x.active)
                        .map(tab => (
                            <Grid className={classes.Container} container key={`grid-container-${tab.id}`}>
                                <Grid item xs={12}>
                                    <FormControl component="fieldset">
                                        <FormLabel component="legend">Operation</FormLabel>
                                        <RadioGroup aria-label="operation" name="operation" value={tab.data.mode}
                                                    onChange={(e, v) => this.selectModeHandler(e, v, tab)}>
                                            <FormControlLabel value="beautify" control={<Radio/>} label="Beautify"/>
                                            <FormControlLabel value="uglify" control={<Radio/>} label="Uglify"/>
                                        </RadioGroup>
                                    </FormControl>
                                    {tab.data.mode === "beautify" &&
                                    <>
                                        <br/>
                                        <FormControl className={classes.SelectIndent}>
                                            <InputLabel id="label-select-indent">Indent</InputLabel>
                                            <Select
                                                labelId="label-select-indent"
                                                id="select-indent"
                                                value={String(tab.data.indent)}
                                                onChange={(e) => this.selectIndentHandler(e, tab)}
                                            >
                                                <MenuItem value={"2"}>2 Spaces</MenuItem>
                                                <MenuItem value={"3"}>3 Spaces</MenuItem>
                                                <MenuItem value={"4"}>4 Spaces</MenuItem>
                                                <MenuItem value={"\t"}>Tab</MenuItem>
                                            </Select>
                                        </FormControl>
                                    </>
                                    }
                                </Grid>
                                <Grid item xs={12} md={6}>
                                    <TextField
                                        id="textarea-before"
                                        label="Original JSON"
                                        multiline
                                        fullWidth={true}
                                        variant="outlined"
                                        value={tab.data.original}
                                        inputProps={{
                                            spellCheck: false
                                        }}
                                        rows={16}
                                        rowsMax={16}
                                        onChange={tab.mode === "beautify" ? e => this.beautifyInput(e, tab) : e => this.uglifyInput(e, tab)}
                                    />
                                </Grid>
                                <Grid item xs={12} md={6}>
                                    <TextField
                                        id="textarea-after"
                                        label="Output"
                                        multiline
                                        fullWidth={true}
                                        variant="outlined"
                                        value={tab.data.output}
                                        inputProps={{
                                            spellCheck: false
                                        }}
                                        rows={16}
                                        rowsMax={16}
                                    />
                                </Grid>
                                <Grid item xs={12} className={classes.ButtonContainer}>
                                    <div className={classes.ButtonWrapper}>
                                        <Button variant="contained"
                                                onClick={() => this.buttonCopyHandler(tab)}
                                                fullWidth={true}
                                                startIcon={this.state.copied ? <DoneIcon/> : <FileCopyIcon/>}
                                        >{this.state.copied ?
                                            "Copied" :
                                            "Copy"
                                        }</Button>
                                    </div>
                                    <div className={classes.ButtonWrapper}>
                                        <Button variant="contained"
                                                onClick={() => this.buttonDownloadHandler(tab)}
                                                fullWidth={true}
                                                startIcon={<GetAppIcon/>}
                                        >{"Download"}</Button>
                                    </div>
                                </Grid>
                            </Grid>
                        ))}
                </>
            </>
        );
    }
}

export default withStyles(styles)(JsonFormatter);