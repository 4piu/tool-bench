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

class AppTab {
    constructor() {
        this.id = uuidV4();
        this.encoded = "";
        this.decoded = "";
        this.name = "New tab";
        this.focus = "decoded";
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
});

class Base64Codec extends React.Component {
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
            savedInstance = JSON.parse(localStorage.getItem('base64-codec'));
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
        localStorage.setItem('base64-codec', JSON.stringify(this.state));
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
        let newTabIndex = this.state.tabIndex;  // Default no tab switch
        if (this.state.tabIndex === indexToRemove) {
            const indexOfElement = this.state.tabs.findIndex(({id}) => id === indexToRemove);
            if (indexOfElement < this.state.tabs.length - 1) {  // Switch to right tab
                newTabIndex = this.state.tabs[indexOfElement + 1].id;
            } else if (indexOfElement > 0) {    // Switch to left tab
                newTabIndex = this.state.tabs[indexOfElement - 1].id;
            } else {    // No index
                newTabIndex = 0
            }
        }
        this.setState(prevState => {
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

    decodeInput = (event, tab) => {
        const input = event.currentTarget.value;
        tab.encoded = input;
        tab.decoded = Buffer.from(input, 'base64').toString('base64') === input ?
            Buffer.from(input, 'base64').toString('utf-8') : 'Malformed input';
        tab.focus = "decoded";
        this.setState(this.state);
    };

    encodeInput = (event, tab) => {
        const input = event.currentTarget.value;
        tab.encoded = Buffer.from(input, 'utf-8').toString('base64');
        tab.decoded = input;
        tab.focus = "encoded";
        this.setState(this.state);
    };

    buttonCopyHandler = async (tab) => {
        const text = tab[tab.focus];
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
        const text = tab[tab.focus];
        downloadText(`${tab.focus}.txt`, text);
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
                                <Grid item xs={12} md={6}>
                                    <TextField
                                        id="textarea-encoded"
                                        label="Base64 Encoded"
                                        multiline
                                        fullWidth={true}
                                        variant="outlined"
                                        value={tab.encoded}
                                        inputProps={{
                                            spellCheck: false
                                        }}
                                        rows={16}
                                        rowsMax={16}
                                        onChange={e => this.decodeInput(e, tab)}
                                    />
                                </Grid>
                                <Grid item xs={12} md={6}>
                                    <TextField
                                        id="textarea-decoded"
                                        label="Plain Text"
                                        multiline
                                        fullWidth={true}
                                        variant="outlined"
                                        value={tab.decoded}
                                        inputProps={{
                                            spellCheck: false
                                        }}
                                        rows={16}
                                        rowsMax={16}
                                        onChange={e => this.encodeInput(e, tab)}
                                    />
                                </Grid>
                                <Grid item xs={12} className={classes.ButtonContainer}>
                                    <div className={classes.ButtonWrapper}>
                                        <Button variant="contained"
                                                onClick={e => this.buttonCopyHandler(tab)}
                                                fullWidth={true}
                                                startIcon={this.state.copied ? <DoneIcon/> : <FileCopyIcon/>}
                                        >{this.state.copied ?
                                            'Copied' :
                                            `Copy ${tab.focus}`
                                        }</Button>
                                    </div>
                                    <div className={classes.ButtonWrapper}>
                                        <Button variant="contained"
                                                onClick={e => this.buttonDownloadHandler(tab)}
                                                fullWidth={true}
                                                startIcon={<GetAppIcon/>}
                                        >{`Download ${tab.focus}`}</Button>
                                    </div>
                                </Grid>
                            </Grid>
                        ))}
                </>
            </>
        );
    }
}

export default withStyles(styles)(Base64Codec);