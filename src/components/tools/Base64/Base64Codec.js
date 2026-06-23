import React from "react";
import {withStyles} from "@material-ui/core/styles";
import PropTypes from "prop-types";
import MyAppBar from "../../MyAppBar";
import Grid from "@material-ui/core/Grid";
import TextField from "@material-ui/core/TextField";
import Button from "@material-ui/core/Button";
import DoneIcon from "@material-ui/icons/Done";
import FileCopyIcon from "@material-ui/icons/FileCopy";
import GetAppIcon from "@material-ui/icons/GetApp";
import {downloadText} from "../../../utils/DownloadService";
// noinspection ES6UnusedImports
import regeneratorRuntime from "regenerator-runtime";
import Toolbar from "@material-ui/core/Toolbar";
import MyDynamicTab from "../../MyDynamicTab";

const bytesToBase64 = bytes => {
    let binary = "";
    for (const byte of bytes) binary += String.fromCharCode(byte);
    return btoa(binary);
};

const base64ToBytes = base64 => {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return bytes;
};

const normalizeBase64 = base64 => base64.replace(/\s/g, "").replace(/=+$/g, "");

class Base64Tab extends MyDynamicTab.DataTab {
    constructor(active) {
        super(active);
        this.data = {
            encoded: "",
            decoded: "",
            focus: "decoded"
        };
    }
}

const styles = theme => ({
    Container: {
        padding: theme.spacing(3),
        "& > *": {
            margin: theme.spacing(1),
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
    TextField: {
        margin: 0,
        padding: theme.spacing(1)
    }
});

class Base64Codec extends React.Component {
    static propTypes = {
        title: PropTypes.string
    };

    constructor(props) {
        super(props);
        this.state = {
            tabs: [new Base64Tab(true)],
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
            savedInstance = JSON.parse(localStorage.getItem("base64-codec"));
        } catch (e) {
            console.error("Failed to load saved instance");
        }
        if (savedInstance) {
            this.setState(savedInstance);
        }
    };

    saveState = () => {
        localStorage.setItem("base64-codec", JSON.stringify(this.state));
    };

    closeAllTab = () => {
        this.setState({
            tabs: [new Base64Tab(true)]
        });
    };

    decodeInput = (event, tab) => {
        const input = event.currentTarget.value;
        tab.data.encoded = input;
        try {
            const bytes = base64ToBytes(input);
            tab.data.decoded = normalizeBase64(bytesToBase64(bytes)) === normalizeBase64(input) ?
                new TextDecoder().decode(bytes) : "Malformed input";
        } catch (e) {
            tab.data.decoded = "Malformed input";
        }
        tab.data.focus = "decoded";
        this.setState(this.state);
    };

    encodeInput = (event, tab) => {
        const input = event.currentTarget.value;
        tab.data.encoded = bytesToBase64(new TextEncoder().encode(input));
        tab.data.decoded = input;
        tab.data.focus = "encoded";
        this.setState(this.state);
    };

    buttonCopyHandler = async (tab) => {
        const text = tab.data[tab.data.focus];
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
        const text = tab.data[tab.data.focus];
        downloadText(`${tab.data.focus}.txt`, text);
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
                    <MyDynamicTab tabClass={Base64Tab} tabs={this.state.tabs} onTabChange={this.onTabChange}/>
                </div>
                <Toolbar/>
                <Toolbar/>
                {/** Main view */}
                {this.state.tabs.filter(x => x.active).map(tab => (
                    <Grid className={classes.Container} container key={`grid-container-${tab.id}`}>
                        <Grid item xs={12} md={6} className={classes.TextField}>
                            <TextField
                                id="textarea-encoded"
                                label="Base64 Encoded"
                                multiline
                                fullWidth={true}
                                variant="outlined"
                                value={tab.data.encoded}
                                inputProps={{
                                    spellCheck: false
                                }}
                                rows={16}
                                rowsMax={16}
                                onChange={e => this.decodeInput(e, tab)}
                            />
                        </Grid>
                        <Grid item xs={12} md={6} className={classes.TextField}>
                            <TextField
                                id="textarea-decoded"
                                label="Plain Text"
                                multiline
                                fullWidth={true}
                                variant="outlined"
                                value={tab.data.decoded}
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
                                    "Copied" :
                                    `Copy ${tab.data.focus}`
                                }</Button>
                            </div>
                            <div className={classes.ButtonWrapper}>
                                <Button variant="contained"
                                        onClick={e => this.buttonDownloadHandler(tab)}
                                        fullWidth={true}
                                        startIcon={<GetAppIcon/>}
                                >{`Download ${tab.data.focus}`}</Button>
                            </div>
                        </Grid>
                    </Grid>
                ))}
            </>
        );
    }
}

export default withStyles(styles)(Base64Codec);
