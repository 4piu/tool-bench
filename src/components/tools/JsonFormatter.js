import React from "react";
import {withStyles} from "@material-ui/core/styles";
import PropTypes from "prop-types";
import MyAppBar from "../MyAppBar";
import AppBar from "@material-ui/core/AppBar";
import Tabs from "@material-ui/core/Tabs";
import Tab from "@material-ui/core/Tab";
import AddIcon from '@material-ui/icons/Add';
import IconButton from "@material-ui/core/IconButton";
import CloseIcon from '@material-ui/icons/Close';
import {v4 as uuidV4} from "uuid";
import Grid from "@material-ui/core/Grid";
import TextField from "@material-ui/core/TextField";
import Button from "@material-ui/core/Button";
import DoneIcon from "@material-ui/icons/Done";
import FileCopyIcon from "@material-ui/icons/FileCopy";
import GetAppIcon from "@material-ui/icons/GetApp";
import {downloadText} from "../../utils/DownloadService";
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

class AppTab {
    constructor() {
        this.id = uuidV4();
        this.original = "";
        this.output = "";
        this.name = "New tab";
        this.mode = "beautify";
        this.indent = 4
    }
}

const styles = theme => ({
    Container: {
        padding: theme.spacing(3),
        '& > *': {
            marginBottom: theme.spacing(2),
        }
    },
    TabsBar: {
        width: "100%",
        backgroundColor: theme.palette.background.paper
    },
    Tab: {
        borderRight: "1px solid #ddd"
    },
    TabLabel: {
        textOverflow: "ellipsis",
        overflow: "hidden",
        whiteSpace: "nowrap"
    },
    NewTabButton: {
        minWidth: 0
    },
    CustomTabLabel: {
        width: "100%",
        display: "flex"
    },
    CloseTabButton: {
        marginLeft: "auto",
        padding: 0
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
            tabIndex: "",
            tabs: [],
            copied: false
        }
    }

    componentDidMount() {
        this.loadState()
    }

    componentDidUpdate(prevProps, prevState, snapshot) {
        this.saveState();
    };

    loadState = () => {
        let savedInstance;
        try {
            savedInstance = JSON.parse(localStorage.getItem('json-formatter'));
        } catch (e) {
            console.error('Failed to load saved instance');
        }
        if (savedInstance) {
            this.setState(savedInstance);
        } else {
            this.newTab();
        }
    };

    saveState = () => {
        localStorage.setItem('json-formatter', JSON.stringify(this.state));
    };

    changeTab = (event, newValue) => {
        this.setState({tabIndex: newValue})
    };

    newTab = () => {
        const newTab = new AppTab();
        this.setState(prevState => ({
            tabs: [...prevState.tabs, newTab],
            tabIndex: newTab.id
        }));
    };

    closeThisTab = event => {
        event.stopPropagation();    // Don't bother changeTab
        const indexToRemove = event.currentTarget.getAttribute('data-index');
        this.setState(prevState => {
            let newTabIndex = prevState.tabIndex;  // Default no tab switch
            if (prevState.tabIndex === indexToRemove) {
                const indexOfElement = prevState.tabs.findIndex(({id}) => id === indexToRemove);
                if (indexOfElement < prevState.tabs.length - 1) {  // Switch to right tab
                    newTabIndex = prevState.tabs[indexOfElement + 1].id;
                } else if (indexOfElement > 0) {    // Switch to left tab
                    newTabIndex = prevState.tabs[indexOfElement - 1].id;
                } else {    // No index
                    newTabIndex = 0
                }
            }
            return {
                tabs: prevState.tabs.filter(({id}) => (id !== indexToRemove)),
                tabIndex: newTabIndex
            }
        });
    };

    closeAllTab = () => {
        this.setState({
            tabs: [new AppTab()]
        })
    };

    beautifyInput = (event, tab) => {
        const input = event ? event.currentTarget.value : tab.original;
        let beautified;
        try {
            beautified = JSON.stringify(JSON.parse(input), null, tab.indent);
        } catch (e) {
            beautified = e.message;
        }
        tab.original = input;
        tab.output = beautified;
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
        tab.original = input;
        tab.output = uglified;
        this.setState(this.state);
    };

    buttonCopyHandler = async (tab) => {
        const text = tab.output;
        await navigator.clipboard.writeText(text);
        this.setState({
            copied: true
        });
        setTimeout(() => {
            this.setState({
                copied: false
            })
        }, 3000);
    };

    buttonDownloadHandler = async (tab) => {
        const text = tab.output;
        downloadText(`${tab.mode}.txt`, text);
    };

    selectModeHandler = (event, newValue, tab) => {
        tab.mode = newValue;
        if (tab.mode === 'beautify') {
            this.beautifyInput(null, tab);
        } else {
            this.uglifyInput(null, tab);
        }
    };

    selectIndentHandler = (event, tab) => {
        switch (event.target.value) {
            case "2":
                tab.indent = 2;
                break;
            case "3":
                tab.indent = 3;
                break;
            case "4":
                tab.indent = 4;
                break;
            default:
                tab.indent = "\t";
        }
        if (tab.mode === 'beautify') {
            this.beautifyInput(null, tab);
        } else {
            this.uglifyInput(null, tab);
        }
    };

    render() {
        const {classes} = this.props;
        return (
            <>
                <div>
                    {/** App bar */}
                    <MyAppBar title={this.props.title}/>
                    {/** Tabs */}
                    <AppBar className={classes.TabsBar} position="static" color="default">
                        <Tabs
                            value={this.state.tabIndex || 0}
                            onChange={this.changeTab}
                            indicatorColor="primary"
                            textColor="primary"
                            variant="scrollable"
                            scrollButtons="auto"
                            aria-label="opened working tabs"
                        >
                            {this.state.tabs.map((tab) => (
                                <Tab key={tab.id} value={tab.id}
                                     className={classes.Tab}
                                     component={"div"}
                                     label={
                                         <div className={classes.CustomTabLabel}>
                                             <div className={classes.TabLabel}>
                                                 {tab.name}
                                             </div>
                                             <IconButton className={classes.CloseTabButton} size={"small"}
                                                         onClick={this.closeThisTab} data-index={tab.id}>
                                                 <CloseIcon/>
                                             </IconButton>
                                         </div>
                                     }
                                />
                            ))}
                            <Tab className={classes.NewTabButton}
                                 component={"div"}
                                 label={
                                     <IconButton size={"small"}>
                                         <AddIcon/>
                                     </IconButton>
                                 } onClick={this.newTab}/>
                        </Tabs>
                    </AppBar>
                    {/** Main view */}
                </div>
                <>
                    {this.state.tabs
                        .filter(({id}) => id === this.state.tabIndex)
                        .map(tab => (
                            <Grid className={classes.Container} container spacing={2} key={`grid-container-${tab.id}`}>
                                <Grid item xs={12}>
                                    <FormControl component="fieldset">
                                        <FormLabel component="legend">Operation</FormLabel>
                                        <RadioGroup aria-label="operation" name="operation" value={tab.mode}
                                                    onChange={(e, v) => this.selectModeHandler(e, v, tab)}>
                                            <FormControlLabel value="beautify" control={<Radio/>} label="Beautify"/>
                                            <FormControlLabel value="uglify" control={<Radio/>} label="Uglify"/>
                                        </RadioGroup>
                                    </FormControl>
                                    {tab.mode === "beautify" &&
                                    <>
                                        <br/>
                                        <FormControl className={classes.SelectIndent}>
                                            <InputLabel id="label-select-indent">Indent</InputLabel>
                                            <Select
                                                labelId="label-select-indent"
                                                id="select-indent"
                                                value={String(tab.indent)}
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
                                        value={tab.original}
                                        inputProps={{
                                            spellCheck: false
                                        }}
                                        rows={16}
                                        rowsMax={16}
                                        onChange={tab.mode === 'beautify' ? e => this.beautifyInput(e, tab) : e => this.uglifyInput(e, tab)}
                                    />
                                </Grid>
                                <Grid item xs={12} md={6}>
                                    <TextField
                                        id="textarea-after"
                                        label="Output"
                                        multiline
                                        fullWidth={true}
                                        variant="outlined"
                                        value={tab.output}
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
                                            'Copied' :
                                            'Copy'
                                        }</Button>
                                    </div>
                                    <div className={classes.ButtonWrapper}>
                                        <Button variant="contained"
                                                onClick={() => this.buttonDownloadHandler(tab)}
                                                fullWidth={true}
                                                startIcon={<GetAppIcon/>}
                                        >{'Download'}</Button>
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