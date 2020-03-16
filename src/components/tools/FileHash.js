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
import CloseIcon from "@material-ui/icons/Close";
import PlayArrowIcon from "@material-ui/icons/PlayArrow";
import StopIcon from "@material-ui/icons/Stop";
import DoneIcon from "@material-ui/icons/Done";
import FileHashWorker from "./FileHash.worker.js";
import {shallowCompare} from "../../utils/ObjectCompare";
import MyDragAndDrop from "../MyDragAndDrop";

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
        position: "fixed",
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
    DropBox: {
        [theme.breakpoints.down("sm")]: {
            display: "none!important",
        },
        height: "8rem"
    }
});

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
            jobs: [],
            poolSize: ([1, 2, 4, 8, 16, 32, 64].includes(navigator.hardwareConcurrency)) ? navigator.hardwareConcurrency : 1
        };
    }

    componentWillUnmount() {
        // Terminate all
        this.state.jobs.forEach(job => {
            if (job.hasOwnProperty("workerRef")) job.workerRef.terminate();
        });
    }

    componentDidMount() {
        this.loadState();
    }

    componentDidUpdate(prevProps, prevState, snapshot) {
        if (!shallowCompare(prevState, this.state, ["jobs", "poolSize"])) this.saveState();
    }

    saveState = () => {
        console.debug("saved");
        localStorage.setItem("file-hash", JSON.stringify({
            defaultAlgorithm: this.state.defaultAlgorithm
        }));
    };

    loadState = () => {
        let savedInstance;
        try {
            savedInstance = JSON.parse(localStorage.getItem("file-hash"));
        } catch (e) {
            console.error("Failed to load saved instance");
        }
        if (savedInstance) {
            this.setState(savedInstance);
        }
    };

    workerMessageHandler = ({data}) => {
        this.setState(state => {
            delete data.workerRef;
            data.status = "done";
            const index = state.jobs.findIndex(o => o.taskId === data.taskId);
            if (index !== -1) state.jobs[index] = data;
            this.feedPool(state);
            return {
                jobs: state.jobs
            };
        });
    };

    feedPool = state => {
        let modified = false;
        let processingCount = state.jobs.filter(({status}) => status === "processing").length;
        // Add queued job to processing
        for (const job of state.jobs) {
            if (processingCount < state.poolSize || state.poolSize === -1) {
                if (job.status === "queued") {
                    const worker = new FileHashWorker();
                    worker.addEventListener("message", this.workerMessageHandler);
                    job.status = "processing";
                    worker.postMessage(job);
                    job.workerRef = worker;
                    processingCount++;
                    modified = true;
                }
            } else {
                break;
            }
        }
        return modified;
    };

    startAllTask = () => {
        this.setState(state => {
            let modified = false;
            state.jobs.forEach(job => {
                if (job.status === "pending") {
                    job.status = "queued";
                    modified = true;
                }
            });
            modified |= this.feedPool(state);
            return modified ? {jobs: state.jobs} : null;
        });
    };

    stopAllTask = () => {
        this.setState(state => {
            let modified = false;
            for (const job of state.jobs) {
                if (job.status === "processing") {
                    job.workerRef.terminate();
                    delete job.workerRef;
                }
                if (job.status === "processing" || job.status === "queued") {
                    job.status = "pending";
                    modified = true;
                }
            }
            return modified ? {jobs: state.jobs} : null;
        });
    };

    startTask = id => {
        this.setState(state => {
            const job = state.jobs.find(({taskId}) => taskId === id);
            if (job.status === "pending") {
                job.status = "queued";
            }
            this.feedPool(state);
            return {
                jobs: state.jobs
            };
        });
    };

    stopTask = id => {
        this.setState(state => {
            const job = state.jobs.find(({taskId}) => taskId === id);
            if (job.status === "processing") {
                job.workerRef.terminate();
                delete job.workerRef;
            }
            job.status = "pending";
            this.feedPool(state);
            return {
                jobs: state.jobs
            };
        });
    };

    toggleStatus = id => {
        const job = this.state.jobs.find(({taskId}) => taskId === id);
        switch (job.status) {
            case "pending":
                this.startTask(id);
                break;
            case "queued":
            case "processing":
                this.stopTask(id);
                break;
        }
    };

    fileAddHandler = event => {
        const newFiles = Array
            .from(event.target.files || event.dataTransfer.files)
            .filter(file => (file.type || file.size % 4096 !== 0));
        console.debug(newFiles);
        this.setState(state => {
            const tmp = [];
            newFiles.forEach(o => tmp.push({
                taskId: uuidV4(),
                hashAlgorithm: state.defaultAlgorithm,
                status: "pending",
                file: o
            }));
            return {
                jobs: state.jobs.concat(tmp)
            };
        });
    };

    selectDefaultAlgorithmHandler = event => {
        this.setState(state => {
            if (state.jobs.length > 0) {
                state.jobs.forEach(job => {
                    if (job.hashAlgorithm !== event.target.value) {
                        if (job.status !== "processing") {
                            job.hashAlgorithm = event.target.value;
                            job.status = "pending";    // reset status
                        }
                    }
                });
            }
            return {
                defaultAlgorithm: event.target.value,
                jobs: state.jobs
            };
        });
    };

    selectAlgorithmHandler = (event, id) => {
        this.setState(state => {
            const file = state.jobs.find(({taskId}) => taskId === id);
            if (file.hashAlgorithm !== event.target.value) {
                if (file.status !== "processing") {
                    file.hashAlgorithm = event.target.value;
                    file.status = "pending";  // reset status
                }
            }
            return {
                jobs: state.jobs
            };
        });
    };

    selectPoolSizeHandler = event => {
        this.setState({
            poolSize: event.target.value
        });
    };

    removeItemHandler = id => {
        this.setState(state => {
            const nextFiles = state.jobs.filter(({taskId}) => taskId !== id);
            return {
                jobs: nextFiles
            };
        });
    };

    render() {
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
                            disabled={this.state.jobs.findIndex(({status}) => status === "processing") !== -1}
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
                    <div className={classes.ButtonContainer}>
                        <div className={classes.ButtonWrapper}>
                            <Button variant="contained"
                                    color={"primary"}
                                    onClick={this.startAllTask}
                                    fullWidth={true}
                                    startIcon={<PlayArrowIcon/>}
                            >Start all</Button>
                        </div>
                        <div className={classes.ButtonWrapper}>
                            <Button variant="contained"
                                    onClick={this.stopAllTask}
                                    fullWidth={true}
                                    startIcon={<StopIcon/>}
                            >Stop all</Button>
                        </div>
                    </div>
                    <Divider className={classes.Divider}/>
                    <MyDragAndDrop className={classes.DropBox} onDrop={this.fileAddHandler}/>
                    {this.state.jobs.map(job => (
                        <Paper key={job.taskId} className={classes.ListItem}>
                            <div className={classes.ListItemJob}>
                                <div className={classes.IconButtonWrapper}>
                                    {job.status === "processing" &&
                                    <CircularProgress size={48} className={classes.Progress}/>}
                                    <IconButton className={classes.StatusButton}
                                                onClick={e => this.toggleStatus(job.taskId)}
                                                disabled={job.status === "done"}>
                                        {job.status === "pending" &&
                                        <PlayArrowIcon/>}
                                        {(job.status === "processing" || job.status === "queued") &&
                                        <StopIcon/>}
                                        {job.status === "done" &&
                                        <DoneIcon/>}
                                    </IconButton>
                                </div>
                                <Typography className={classes.FileName}>{job.file.name}</Typography>
                                <FormControl className={classes.Select}>
                                    <Select
                                        id="select-algorithm"
                                        value={job.hashAlgorithm}
                                        onChange={e => this.selectAlgorithmHandler(e, job.taskId)}
                                        disabled={job.status === "processing"}
                                        autoWidth={true}
                                    >
                                        {this.menuItemHashAlgorithm}
                                    </Select>
                                </FormControl>
                                <IconButton size={"small"}
                                            disabled={job.status === "processing"}
                                            onClick={e => this.removeItemHandler(job.taskId)}>
                                    <CloseIcon/>
                                </IconButton>
                            </div>
                            <div className={classes.ChecksumText}>
                                {job.resultMd5 &&
                                <div>
                                    MD5: {job.resultMd5}
                                </div>}
                                {job.resultSha1 &&
                                <div>
                                    SHA-1: {job.resultSha1}
                                </div>}
                                {job.resultSha256 &&
                                <div>
                                    SHA-256: {job.resultSha256}
                                </div>}
                                {job.resultSha512 &&
                                <div>
                                    SHA-512: {job.resultSha512}
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