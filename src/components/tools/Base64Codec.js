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

class DefaultTab {
    constructor() {
        this.id = uuidV4();
        this.encoded = "";
        this.decoded = "";
        this.name = "New tab";
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
            copied: false,
            focus: "decoded"
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
        const newTab = new DefaultTab();
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
            tabs: [new DefaultTab()]
        })
    };

    decodeInput = event => {
        const input = event.currentTarget.value;
        const decoded = Buffer.from(input, 'base64').toString('base64') === input ?
            Buffer.from(input, 'base64').toString('utf-8') : 'Malformed input';
        this.setState(prevState => {
            const thisTab = prevState.tabs.find(({id}) => id === this.state.tabIndex);
            thisTab.encoded = input;
            thisTab.decoded = decoded;
            return {
                focus: "decoded",
                tabs: prevState.tabs
            }
        })
    };

    encodeInput = event => {
        const input = event.currentTarget.value;
        const encoded = Buffer.from(input, 'utf-8').toString('base64');
        this.setState(prevState => {
            const thisTab = prevState.tabs.find(({id}) => id === this.state.tabIndex);
            thisTab.encoded = encoded;
            thisTab.decoded = input;
            return {
                focus: "encoded",
                tabs: prevState.tabs
            }
        })
    };

    buttonCopyHandler = async () => {
        const text = this.state.tabs.filter(({id}) => id === this.state.tabIndex)[0][this.state.focus];
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

    buttonDownloadHandler = async () => {
        const text = this.state.tabs.filter(({id}) => id === this.state.tabIndex)[0][this.state.focus];
        downloadText(`${this.state.focus}.txt`, text);
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
                                        value={this.state.tabs.filter(({id}) => id === this.state.tabIndex)[0].encoded}
                                        inputProps={{
                                            spellCheck: false
                                        }}
                                        rows={16}
                                        rowsMax={16}
                                        onChange={this.decodeInput}
                                    />
                                </Grid>
                                <Grid item xs={12} md={6}>
                                    <TextField
                                        id="textarea-decoded"
                                        label="Plain Text"
                                        multiline
                                        fullWidth={true}
                                        variant="outlined"
                                        value={this.state.tabs.filter(({id}) => id === this.state.tabIndex)[0].decoded}
                                        inputProps={{
                                            spellCheck: false
                                        }}
                                        rows={16}
                                        rowsMax={16}
                                        onChange={this.encodeInput}
                                    />
                                </Grid>
                                <Grid item xs={12} className={classes.ButtonContainer}>
                                    <div className={classes.ButtonWrapper}>
                                        <Button variant="contained"
                                                onClick={this.buttonCopyHandler}
                                                fullWidth={true}
                                                startIcon={this.state.copied ? <DoneIcon/> : <FileCopyIcon/>}
                                        >{this.state.copied ?
                                            'Copied' :
                                            `Copy ${this.state.focus}`
                                        }</Button>
                                    </div>
                                    <div className={classes.ButtonWrapper}>
                                        <Button variant="contained"
                                                onClick={this.buttonDownloadHandler}
                                                fullWidth={true}
                                                startIcon={<GetAppIcon/>}
                                        >{`Download ${this.state.focus}`}</Button>
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