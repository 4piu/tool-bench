import React from "react";
import {withStyles} from "@material-ui/core/styles";
import PropTypes from "prop-types";
import MyAppBar from "../MyAppBar";
import Container from "@material-ui/core/Container";
import Fab from "@material-ui/core/Fab";
import AddIcon from "@material-ui/icons/Add";
import Button from "@material-ui/core/Button";
import FormControl from "@material-ui/core/FormControl";
import InputLabel from "@material-ui/core/InputLabel";
import Select from "@material-ui/core/Select";
import MenuItem from "@material-ui/core/MenuItem";
import Paper from "@material-ui/core/Paper";
import CircularProgress from "@material-ui/core/CircularProgress";
import IconButton from "@material-ui/core/IconButton";
import {v4 as uuidV4} from "uuid";
import Divider from "@material-ui/core/Divider";
import Typography from "@material-ui/core/Typography";
import CloseIcon from '@material-ui/icons/Close';
import PlayArrowIcon from '@material-ui/icons/PlayArrow';
import StopIcon from '@material-ui/icons/Stop';
import DoneIcon from '@material-ui/icons/Done';

const styles = theme => ({
    root: {
        padding: theme.spacing(3),
        marginBottom: 80
    },
    Divider: {
        marginTop: theme.spacing(2),
        marginBottom: theme.spacing(2),
    },
    Fab: {
        position: 'fixed',
        bottom: theme.spacing(3),
        right: theme.spacing(3)
    },
    Select: {
        marginLeft: "auto",
        minWidth: "auto"
    },
    MenuSelect: {
        marginRight: theme.spacing(2),
        marginBottom: theme.spacing(2),
        minWidth: 120
    },
    IconButtonWrapper: {
        position: "relative"
    },
    StatusButton: {
        [theme.breakpoints.down("xs")]: {
            padding: 0,
            fontSize: "small"
        }
    },
    Progress: {
        position: "absolute",
        left: 0,
        top: 0,
        [theme.breakpoints.down("xs")]: {
            width: "24px !important",
            height: "24px !important"
        }
    },
    FileName: {
        textOverflow: "ellipsis",
        overflow: "hidden",
        whiteSpace: "nowrap",
        padding: theme.spacing(1)
    },
    ListItem: {
        marginTop: theme.spacing(1),
        marginBottom: theme.spacing(1),
        padding: theme.spacing(2),
        paddingRight: theme.spacing(1)
    },
    ListItemJob: {
        display: "flex",
        alignItems: "center",
    },
    ChecksumText: {
        fontSize: "small",
        wordBreak: "break-all",
        paddingLeft: theme.spacing(1),
        paddingRight: theme.spacing(1),
    }
});

const fileHashWorker = (file) => {
    console.debug(`processing ${file.name}`);
    self.onmessage = m => {
        // TODO hash file
        console.debug(`received ${m.data}`);
        file.resultMd5 = "foo";
        postMessage(file)
    }
};

class FileHash extends React.Component {
    static propTypes = {
        title: PropTypes.string.isRequired
    };

    hashAlgorithm = ["MD5", "SHA-1", "SHA-256", "SHA-512"];

    menuItemHashAlgorithm;

    constructor(props) {
        super(props);
        this.menuItemHashAlgorithm = this.hashAlgorithm.map(o => (
            <MenuItem key={o} value={o}>{o}</MenuItem>
        ));
        this.state = {
            defaultAlgorithm: "MD5",
            files: [],
            poolSize: ([1, 2, 4, 8, 16, 32, 64].includes(navigator.hardwareConcurrency))? navigator.hardwareConcurrency : 1
        }
    }

    workerMessageHandler = m => {
        this.setState(prevState => {
            const index = prevState.files.findIndex(({taskId}) => taskId === m.taskId);
            if (index !== -1) prevState.files[index] = m;
            return {
                files: prevState.files
            }
        })
    };

    fileAddHandler = event => {
        const newFiles = Array.from(event.target.files);
        this.setState(prevState => {
            newFiles.forEach(o => {
                o.taskId = uuidV4();
                o.hashAlgorithm = prevState.defaultAlgorithm;
                o.status = "pending"
            });
            return {
                files: prevState.files.concat(newFiles)
            }
        })
    };

    selectDefaultAlgorithmHandler = event => {
        this.setState(prevState => {
            if (prevState.files.length > 0) {
                prevState.files.forEach(file => {
                    if (file.hashAlgorithm !== event.target.value) {
                        file.hashAlgorithm = event.target.value;
                        if (file.status !== "processing") file.status = "pending";  // reset status
                    }
                });
            }
            return {
                defaultAlgorithm: event.target.value,
                files: prevState.files
            }
        });
    };

    selectAlgorithmHandler = (event, id) => {
        this.setState(prevState => {
            const file = prevState.files.find(({taskId}) => taskId === id);
            if (file.hashAlgorithm !== event.target.value) {
                file.hashAlgorithm = event.target.value;
                if (file.status !== "processing") file.status = "pending";  // reset status
            }
            return {
                files: prevState.files
            };
        });
    };

    selectPoolSizeHandler = event => {
        this.setState({
            poolSize: event.target.value
        })
    };

    removeItemHandler = id => {
        this.setState(prevState => {
            const nextFiles = prevState.files.filter(({taskId}) => taskId !== id);
            return {
                files: nextFiles
            }
        });
    };

    render() {
        console.debug(this.state.files);
        const {classes} = this.props;
        return (
            <>
                {/** App bar */}
                <MyAppBar title={this.props.title}/>
                {/** Main view */}
                <Container className={classes.root} maxWidth={"md"}>
                    <FormControl className={classes.MenuSelect}>
                        <InputLabel id="select-algorithm-label">Algorithm</InputLabel>
                        <Select
                            labelId="select-algorithm-label"
                            id="select-algorithm"
                            value={this.state.defaultAlgorithm}
                            onChange={this.selectDefaultAlgorithmHandler}
                            autoWidth={true}
                        >
                            {this.menuItemHashAlgorithm}
                        </Select>
                    </FormControl>
                    <FormControl className={classes.MenuSelect}>
                        <InputLabel id="select-worker-label">Concurrent</InputLabel>
                        <Select
                            labelId="select-worker-label"
                            id="select-worker"
                            value={this.state.poolSize}
                            onChange={this.selectPoolSizeHandler}
                            disabled={this.state.files.findIndex(({status}) => status === "processing") !== -1}
                            autoWidth={true}
                        >
                            <MenuItem value={1}>🚲 &nbsp; 1</MenuItem>
                            <MenuItem value={2}>🏍 &nbsp; 2</MenuItem>
                            <MenuItem value={4}>🚗 &nbsp; 4</MenuItem>
                            <MenuItem value={8}>🏎 &nbsp; 8</MenuItem>
                            <MenuItem value={16}>🚄 &nbsp; 16</MenuItem>
                            <MenuItem value={32}>✈ &nbsp; 32</MenuItem>
                            <MenuItem value={64}>🚀 &nbsp; 64</MenuItem>
                            <MenuItem value={-1}>☢ &nbsp; ∞</MenuItem>
                        </Select>
                    </FormControl>
                    <Divider className={classes.Divider}/>
                    {this.state.files.map(file => (
                        <Paper key={file.taskId} className={classes.ListItem}>
                            <div className={classes.ListItemJob}>
                                <div className={classes.IconButtonWrapper}>
                                    <IconButton className={classes.StatusButton}>
                                        {file.status === "pending" &&
                                        <PlayArrowIcon/>}
                                        {file.status === "processing" &&
                                        <StopIcon/>}
                                        {file.status === "done" &&
                                        <DoneIcon/>}
                                    </IconButton>
                                    {file.status === "processing" &&
                                    <CircularProgress size={48} className={classes.Progress}/>}
                                </div>
                                <Typography className={classes.FileName}>{file.name}</Typography>
                                <FormControl className={classes.Select}>
                                    <Select
                                        id="select-algorithm"
                                        value={file.hashAlgorithm}
                                        onChange={e => this.selectAlgorithmHandler(e, file.taskId)}
                                        disabled={file.status === "processing"}
                                        autoWidth={true}
                                    >
                                        {this.menuItemHashAlgorithm}
                                    </Select>
                                </FormControl>
                                <IconButton size={"small"} onClick={e => this.removeItemHandler(file.taskId)}>
                                    <CloseIcon/>
                                </IconButton>
                            </div>
                            <div className={classes.ChecksumText}>
                                {file.resultMd5 &&
                                <div>
                                    MD5: {file.resultMd5}}
                                </div>}
                                {file.resultSha1 &&
                                <div>
                                    SHA-1: {file.resultSha1}
                                </div>}
                                {file.resultSha256 &&
                                <div>
                                    SHA-256: {file.resultSha256}
                                </div>}
                            </div>
                        </Paper>
                    ))}
                </Container>
                <label htmlFor="button-add-file">
                    <input
                        style={{
                            display: "none"
                        }}
                        id="button-add-file"
                        name="button-add-file"
                        multiple
                        type="file"
                        onChange={this.fileAddHandler}
                    />
                    <Fab className={classes.Fab} component="span" color="secondary" aria-label="add-file">
                        <AddIcon/>
                    </Fab>
                </label>
            </>
        );
    }
}

export default withStyles(styles)(FileHash);