import React from "react";
import {withStyles} from "@material-ui/core/styles";
import PropTypes from "prop-types";
import MyAppBar from "../../MyAppBar";
import Container from "@material-ui/core/Container";
import IconButton from "@material-ui/core/IconButton";
import SettingsIcon from "@material-ui/icons/Settings";
import DeleteIcon from "@material-ui/icons/Delete";
import Dialog from "@material-ui/core/Dialog";
import DialogTitle from "@material-ui/core/DialogTitle";
import {DialogContent} from "@material-ui/core";
import Button from "@material-ui/core/Button";
import DialogActions from "@material-ui/core/DialogActions";
import FormControlLabel from "@material-ui/core/FormControlLabel";
import RadioGroup from "@material-ui/core/RadioGroup";
import FormControl from "@material-ui/core/FormControl";
import FormLabel from "@material-ui/core/FormLabel";
import Radio from "@material-ui/core/Radio";
import TextField from "@material-ui/core/TextField";
import Autocomplete from "@material-ui/lab/Autocomplete";
import MenuItem from "@material-ui/core/MenuItem";
import Select from "@material-ui/core/Select";
import InputLabel from "@material-ui/core/InputLabel";
import Divider from "@material-ui/core/Divider";
import Fab from "@material-ui/core/Fab";
import SearchIcon from "@material-ui/icons/Search";
import * as doh from "./DnsOverHttps";
import Table from "@material-ui/core/Table";
import TableBody from "@material-ui/core/TableBody";
import TableCell from "@material-ui/core/TableCell";
import TableContainer from "@material-ui/core/TableContainer";
import TableHead from "@material-ui/core/TableHead";
import TableRow from "@material-ui/core/TableRow";
import Paper from "@material-ui/core/Paper";
// noinspection ES6UnusedImports
import regeneratorRuntime from "regenerator-runtime";

const styles = theme => ({
    root: {
        padding: theme.spacing(3),
        marginBottom: 80,
        "& > *": {
            marginBottom: theme.spacing(2)
        }
    },
    menuItem: {
        color: "inherit"
    },
    Select: {
        minWidth: 120
    },
    SelectContainer: {
        "& > *": {
            marginRight: theme.spacing(2),
            marginBottom: theme.spacing(2),
        }
    },
    PaperText: {
        padding: theme.spacing(2)
    },
    ForceBreak: {
        lineBreak: "anywhere"
    },
    Fab: {
        position: "fixed",
        bottom: theme.spacing(3),
        right: theme.spacing(3)
    },
});

const dnsServer = [
    // https://github.com/curl/curl/wiki/DNS-over-HTTPS
    "https://cloudflare-dns.com/dns-query",
    "https://dns.google/dns-query",
    "https://dns.quad9.net/dns-query",
    "https://dns.adguard.com/dns-query",
    "https://doh.opendns.com/dns-query",
    "https://doh.cleanbrowsing.org/doh/family-filter/",
    "https://doh.xfinity.com/dns-query",
    "https://dohdot.coxlab.net/dns-query",
    "https://odvr.nic.cz/doh",
    "https://doh.dnslify.com/dns-query",
    "https://dns.dnsoverhttps.net/dns-query",
    "https://doh.crypto.sx/dns-query",
    "https://doh.powerdns.org/",
    "https://doh-fi.blahdns.com/dns-query",
    "https://doh-jp.blahdns.com/dns-query",
    "https://doh-de.blahdns.com/dns-query",
    "https://doh.ffmuc.net/dns-query",
    "https://dns.dns-over-https.com/dns-query",
    "https://doh.securedns.eu/dns-query",
    "https://dns.containerpi.com/dns-query",
    "https://dns.containerpi.com/doh/family-filter/",
    "https://dns.containerpi.com/doh/secure-filter/",
    "https://doh-2.seby.io/dns-query",
    "https://doh.seby.io:8443/dns-query",
    "https://doh.dnswarden.com/adblock",
    "https://doh.dnswarden.com/uncensored",
    "https://doh.dnswarden.com/adult-filter",
    "https://dns-nyc.aaflalo.me/dns-query",
    "https://dns.aaflalo.me/dns-query",
    "https://doh.applied-privacy.net/query",
    "https://doh.captnemo.in/dns-query",
    "https://doh.tiar.app/dns-query",
    "https://doh.tiarap.org/dns-query",
    "https://doh.dns.sb/dns-query",
    "https://rdns.faelix.net/",
    "https://doh.li/dns-query",
    "https://doh.armadillodns.net/dns-query",
    "https://jp.tiar.app/dns-query",
    "https://jp.tiarap.org/dns-query",
    "https://doh.42l.fr/dns-query",
    "https://dns.hostux.net/dns-query",
    "https://dns.hostux.net/ads",
    "https://dns.aa.net.uk/dns-query",
    "https://adblock.mydns.network/dns-query",
    "https://ibksturm.synology.me/dns-query",
    "https://jcdns.fun/dns-query",
    "https://ibuki.cgnat.net/dns-query",
    "https://dns.twnic.tw/dns-query",
    "https://example.doh.blockerdns.com/dns-query",
    "https://dns.digitale-gesellschaft.ch/dns-query",
    "https://doh.libredns.gr/dns-query",
    "https://doh.centraleu.pi-dns.com/dns-query",
    "https://doh.northeu.pi-dns.com/dns-query",
    "https://doh.westus.pi-dns.com/dns-query",
    "https://doh.eastus.pi-dns.com/dns-query",
    "https://dns.flatuslifir.is/dns-query"
];

const dnsCommonType = [
    "A",
    "AAAA",
    "CNAME",
    "MX",
    "NS",
    "TXT"
];

const dnsUncommonType = [
    "CAA",
    "DNAME",
    "DNSKEY",
    "DS",
    "HINFO",
    "NSEC",
    "NSEC3",
    "NULL",
    "OPT",
    "PTR",
    "RP",
    "RRSIG",
    "SOA",
    "SRV",
];

const dnsClass = [
    "IN", "CS", "CH", "HS", "ANY"
];

class DnsLookup extends React.PureComponent {
    static propTypes = {
        title: PropTypes.string.isRequired
    };

    constructor(props) {
        super(props);
        this.state = {
            showSettings: false,
            qMethod: "GET",
            qMethodTmp: null,
            serverUrl: dnsServer[0],
            serverUrlTmp: null,
            isValidServerUrl: true,
            qName: "example.com",
            isValidDomain: true,
            qType: "A",
            qClass: "IN",
            processing: false,
            answers: null
        };
    }

    componentDidMount() {
        this.loadState();
    }

    componentDidUpdate(prevProps, prevState, snapshot) {
        if (prevState.qMethod !== this.state.qMethod || prevState.serverUrl !== this.state.serverUrl) {
            this.saveState();
        }
    }

    loadState = () => {
        let savedInstance;
        try {
            savedInstance = JSON.parse(localStorage.getItem("dns"));
        } catch (e) {
            console.error("Failed to load saved instance");
        }
        if (savedInstance) {
            this.setState(savedInstance);
        }
    };

    saveState = () => {
        console.log(this.state);
        localStorage.setItem("dns", JSON.stringify({
            qMethod: this.state.qMethod,
            serverUrl: this.state.serverUrl
        }));
    };

    showSettings = () => {
        this.setState({showSettings: true});
    };

    closeSettings = () => {
        this.setState({
            showSettings: false,
            isValidServerUrl: true
        });
    };

    saveAndCloseSettings = () => {
        if (!this.state.isValidServerUrl) return;
        this.setState(state => ({
            qMethod: state.qMethodTmp,
            serverUrl: state.serverUrlTmp,
            showSettings: false
        }));
    };

    autocompleteChangeHandler = (event, value, reason) => {
        if (reason === "select-option") this.setState({isValidServerUrl: true});
    };

    methodChangeHandler = (event, value) => {
        this.setState({
            qMethodTmp: value
        });
    };

    urlInputChangeHandler = (event, value) => {
        this.setState({
            serverUrlTmp: value,
            isValidServerUrl: /^(?:(?:https?:)?\/\/)?(?:(?!(?:10|127)(?:\.\d{1,3}){3})(?!(?:169\.254|192\.168)(?:\.\d{1,3}){2})(?!172\.(?:1[6-9]|2\d|3[0-1])(?:\.\d{1,3}){2})(?:[1-9]\d?|1\d\d|2[01]\d|22[0-3])(?:\.(?:1?\d{1,2}|2[0-4]\d|25[0-5])){2}(?:\.(?:[1-9]\d?|1\d\d|2[0-4]\d|25[0-4]))|(?:(?:[a-z\u00a1-\uffff0-9]-*)*[a-z\u00a1-\uffff0-9]+)(?:\.(?:[a-z\u00a1-\uffff0-9]-*)*[a-z\u00a1-\uffff0-9]+)*(?:\.(?:[a-z\u00a1-\uffff]{2,})))(?::\d{2,5})?(?:\/\S*)?$/i.test(value)
        });
    };

    typeChangeHandler = event => {
        this.setState({
            qType: event.target.value
        });
    };

    classChangeHandler = event => {
        this.setState({
            qClass: event.target.value
        });
    };

    domainInputChangeHandler = event => {
        const value = event.currentTarget.value;
        this.setState({
            qName: value,
            isValidDomain: value.length < 254 && value.length > 0
        });
    };

    resetInput = () => {
        this.setState({
            qName: "example.com",
            isValidDomain: true,
            qType: "A",
            qClass: "IN",
            answers: null
        });
    };

    lookupDns = async () => {
        const execJob = async () => {
            try {
                const res = await doh.query(this.state.qName, this.state.qType, this.state.qClass, this.state.serverUrl, this.state.qMethod);
                console.debug(res.answers);
                this.setState({
                    answers: res.answers,
                    processing: false
                });
            } catch (e) {
                this.setState({
                    answers: [{error: e.message}],
                    processing: false
                });
            }
        };
        this.setState({
            processing: true
        });
        setTimeout(execJob, 1000);
    };

    onEnterPressed = async (ev, cb) => {
        if (!this.state.processing && ev.key === "Enter") {
            cb();
            ev.preventDefault();
        }
    };

    render() {
        const {classes} = this.props;
        return (
            <>
                {/** App bar */}
                <MyAppBar
                    title={this.props.title}
                    menuItems={[
                        <IconButton
                            className={classes.menuItem}
                            onClick={this.resetInput}>
                            <DeleteIcon/>
                        </IconButton>,
                        <IconButton
                            className={classes.menuItem}
                            onClick={this.showSettings}>
                            <SettingsIcon/>
                        </IconButton>
                    ]}/>
                {/** Main view */}
                <Container maxWidth={"sm"} className={classes.root}>
                    <div className={classes.SelectContainer}>
                        <FormControl className={classes.Select}>
                            <InputLabel id="input-type-label">Type</InputLabel>
                            <Select
                                labelId="input-type-label"
                                id="input-type"
                                value={this.state.qType}
                                onChange={this.typeChangeHandler}
                            >
                                {dnsCommonType.map(item => (
                                    <MenuItem key={"type-" + item.toLowerCase()} value={item}>{item}</MenuItem>
                                ))}
                                <Divider/>
                                {dnsUncommonType.map(item => (
                                    <MenuItem key={"type-" + item.toLowerCase()} value={item}>{item}</MenuItem>
                                ))}
                            </Select>
                        </FormControl>
                        <FormControl className={classes.Select}>
                            <InputLabel id="input-class-label">Class</InputLabel>
                            <Select
                                labelId="input-class-label"
                                id="input-class"
                                value={this.state.qClass}
                                onChange={this.classChangeHandler}
                            >
                                {dnsClass.map(item => (
                                    <MenuItem key={"class-" + item} value={item}>{item}</MenuItem>
                                ))}
                            </Select>
                        </FormControl>
                    </div>
                    <TextField
                        error={!this.state.isValidDomain}
                        id="input-domain"
                        label="Domain"
                        fullWidth={true}
                        value={this.state.qName}
                        onChange={this.domainInputChangeHandler}
                        helperText={!this.state.isValidDomain && "Invalid domain"}
                        onKeyPress={this.state.processing ? null : (ev => this.onEnterPressed(ev, this.lookupDns))}
                    />
                    {this.state.processing &&
                    <Paper className={classes.PaperText}>Waiting for response</Paper>
                    }
                    {!this.state.processing && !this.state.answers &&
                    <Paper className={classes.PaperText}>Send a query first</Paper>
                    }
                    {!this.state.processing && this.state.answers && this.state.answers.length === 0 &&
                    <Paper className={classes.PaperText}>Empty result</Paper>
                    }
                    {!this.state.processing && this.state.answers && this.state.answers.length > 0 &&
                    this.state.answers.map((answer, index) => (
                        <TableContainer component={Paper} key={`answer-${index}`}>
                            <Table size={"small"}>
                                <TableHead>
                                    <TableRow>
                                        <TableCell>Field</TableCell>
                                        <TableCell align="right">Value</TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    <TableRow>
                                        <TableCell>{"type"}</TableCell>
                                        <TableCell align="right">{answer.type}</TableCell>
                                    </TableRow>
                                    <TableRow>
                                        <TableCell>{"class"}</TableCell>
                                        <TableCell align="right">{answer.class}</TableCell>
                                    </TableRow>
                                    {(answer.type === "A" ||
                                        answer.type === "AAAA" ||
                                        answer.type === "CNAME" ||
                                        answer.type === "DNAME" ||
                                        answer.type === "NS" ||
                                        answer.type === "PTR") &&
                                    <TableRow>
                                        <TableCell>{"data"}</TableCell>
                                        <TableCell align="right">{answer.data}</TableCell>
                                    </TableRow>
                                    }
                                    {answer.type === "CAA" &&
                                    <>
                                        <TableRow>
                                            <TableCell>{"flags"}</TableCell>
                                            <TableCell align="right">{answer.data.flags}</TableCell>
                                        </TableRow>
                                        <TableRow>
                                            <TableCell>{"tag"}</TableCell>
                                            <TableCell align="right">{answer.data.tag}</TableCell>
                                        </TableRow>
                                        <TableRow>
                                            <TableCell>{"value"}</TableCell>
                                            <TableCell align="right">{answer.data.value}</TableCell>
                                        </TableRow>
                                        <TableRow>
                                            <TableCell>{"issuer critical"}</TableCell>
                                            <TableCell align="right">{answer.data.issuerCritical}</TableCell>
                                        </TableRow>
                                    </>
                                    }
                                    {answer.type === "DNSKEY" &&
                                    <>
                                        <TableRow>
                                            <TableCell>{"flags"}</TableCell>
                                            <TableCell align="right">{answer.data.flags}</TableCell>
                                        </TableRow>
                                        <TableRow>
                                            <TableCell>{"algorithm"}</TableCell>
                                            <TableCell align="right">{answer.data.algorithm}</TableCell>
                                        </TableRow>
                                        <TableRow>
                                            <TableCell>{"key"}</TableCell>
                                            <TableCell align="right" className={classes.ForceBreak}>{answer.data.key.toString("hex")}</TableCell>
                                        </TableRow>
                                    </>
                                    }
                                    {answer.type === "DS" &&
                                    <>
                                        <TableRow>
                                            <TableCell>{"key tag"}</TableCell>
                                            <TableCell align="right">{answer.data.keyTag}</TableCell>
                                        </TableRow>
                                        <TableRow>
                                            <TableCell>{"algorithm"}</TableCell>
                                            <TableCell align="right">{answer.data.algorithm}</TableCell>
                                        </TableRow>
                                        <TableRow>
                                            <TableCell>{"digest type"}</TableCell>
                                            <TableCell align="right">{answer.data.digestType}</TableCell>
                                        </TableRow>
                                        <TableRow>
                                            <TableCell>{"digest"}</TableCell>
                                            <TableCell align="right" className={classes.ForceBreak}>{answer.data.digest.toString("hex")}</TableCell>
                                        </TableRow>
                                    </>
                                    }
                                    {answer.type === "HINFO" &&
                                    <>
                                        <TableRow>
                                            <TableCell>{"CPU"}</TableCell>
                                            <TableCell align="right">{answer.data.cpu}</TableCell>
                                        </TableRow>
                                        <TableRow>
                                            <TableCell>{"OS"}</TableCell>
                                            <TableCell align="right">{answer.data.os}</TableCell>
                                        </TableRow>
                                    </>
                                    }
                                    {answer.type === "MX" &&
                                    <>
                                        <TableRow>
                                            <TableCell>{"preference"}</TableCell>
                                            <TableCell align="right">{answer.data.preference}</TableCell>
                                        </TableRow>
                                        <TableRow>
                                            <TableCell>{"exchange"}</TableCell>
                                            <TableCell align="right">{answer.data.exchange}</TableCell>
                                        </TableRow>
                                    </>
                                    }
                                    {answer.type === "NSEC" &&
                                    <>
                                        <TableRow>
                                            <TableCell>{"next domain"}</TableCell>
                                            <TableCell align="right">{answer.data.nextDomain}</TableCell>
                                        </TableRow>
                                        <TableRow>
                                            <TableCell>{"RR types"}</TableCell>
                                            <TableCell align="right">{answer.data.rrtypes}</TableCell>
                                        </TableRow>
                                    </>
                                    }
                                    {answer.type === "NSEC3" &&
                                    <>
                                        <TableRow>
                                            <TableCell>{"algorithm"}</TableCell>
                                            <TableCell align="right">{answer.data.algorithm}</TableCell>
                                        </TableRow>
                                        <TableRow>
                                            <TableCell>{"flags"}</TableCell>
                                            <TableCell align="right">{answer.data.flags}</TableCell>
                                        </TableRow>
                                        <TableRow>
                                            <TableCell>{"iterations"}</TableCell>
                                            <TableCell align="right">{answer.data.iterations}</TableCell>
                                        </TableRow>
                                        <TableRow>
                                            <TableCell>{"salt"}</TableCell>
                                            <TableCell align="right" className={classes.ForceBreak}>{answer.data.salt.toString("hex")}</TableCell>
                                        </TableRow>
                                        <TableRow>
                                            <TableCell>{"next domain"}</TableCell>
                                            <TableCell align="right">{answer.data.nextDomain}</TableCell>
                                        </TableRow>
                                        <TableRow>
                                            <TableCell>{"RR types"}</TableCell>
                                            <TableCell align="right">{answer.data.rrtypes}</TableCell>
                                        </TableRow>
                                    </>
                                    }
                                    {answer.type === "NULL" &&
                                    <TableRow>
                                        <TableCell>{"data"}</TableCell>
                                        <TableCell align="right" className={classes.ForceBreak}>{answer.data.toString("hex")}</TableCell>
                                    </TableRow>
                                    }
                                    {answer.type === "RP" &&
                                    <>
                                        <TableRow>
                                            <TableCell>{"mbox"}</TableCell>
                                            <TableCell align="right">{answer.data.mbox}</TableCell>
                                        </TableRow>
                                        <TableRow>
                                            <TableCell>{"txt"}</TableCell>
                                            <TableCell align="right">{answer.data.txt}</TableCell>
                                        </TableRow>
                                    </>
                                    }
                                    {answer.type === "RRSIG" &&
                                    <>
                                        <TableRow>
                                            <TableCell>{"type covered"}</TableCell>
                                            <TableCell align="right">{answer.data.typeCovered}</TableCell>
                                        </TableRow>
                                        <TableRow>
                                            <TableCell>{"algorithm"}</TableCell>
                                            <TableCell align="right">{answer.data.algorithm}</TableCell>
                                        </TableRow>
                                        <TableRow>
                                            <TableCell>{"labels"}</TableCell>
                                            <TableCell align="right">{answer.data.labels}</TableCell>
                                        </TableRow>
                                        <TableRow>
                                            <TableCell>{"original TTL"}</TableCell>
                                            <TableCell align="right">{answer.data.originalTTL}</TableCell>
                                        </TableRow>
                                        <TableRow>
                                            <TableCell>{"expiration"}</TableCell>
                                            <TableCell align="right">{answer.data.expiration}</TableCell>
                                        </TableRow>
                                        <TableRow>
                                            <TableCell>{"inception"}</TableCell>
                                            <TableCell align="right">{answer.data.inception}</TableCell>
                                        </TableRow>
                                        <TableRow>
                                            <TableCell>{"key tag"}</TableCell>
                                            <TableCell align="right">{answer.data.keyTag}</TableCell>
                                        </TableRow>
                                        <TableRow>
                                            <TableCell>{"signer's name"}</TableCell>
                                            <TableCell align="right">{answer.data.signersName}</TableCell>
                                        </TableRow>
                                        <TableRow>
                                            <TableCell>{"signature"}</TableCell>
                                            <TableCell align="right">{answer.data.signature}</TableCell>
                                        </TableRow>
                                    </>
                                    }
                                    {answer.type === "SOA" &&
                                    <>
                                        <TableRow>
                                            <TableCell>{"domain name"}</TableCell>
                                            <TableCell align="right">{answer.data.mname}</TableCell>
                                        </TableRow>
                                        <TableRow>
                                            <TableCell>{"mailbox"}</TableCell>
                                            <TableCell align="right">{answer.data.rname}</TableCell>
                                        </TableRow>
                                        <TableRow>
                                            <TableCell>{"zone serial"}</TableCell>
                                            <TableCell align="right">{answer.data.serial}</TableCell>
                                        </TableRow>
                                        <TableRow>
                                            <TableCell>{"refresh interval"}</TableCell>
                                            <TableCell align="right">{answer.data.refresh}</TableCell>
                                        </TableRow>
                                        <TableRow>
                                            <TableCell>{"retry interval"}</TableCell>
                                            <TableCell align="right">{answer.data.retry}</TableCell>
                                        </TableRow>
                                        <TableRow>
                                            <TableCell>{"expire interval"}</TableCell>
                                            <TableCell align="right">{answer.data.expire}</TableCell>
                                        </TableRow>
                                        <TableRow>
                                            <TableCell>{"minimum TTL"}</TableCell>
                                            <TableCell align="right">{answer.data.minimum}</TableCell>
                                        </TableRow>
                                    </>
                                    }
                                    {answer.type === "SRV" &&
                                    <>
                                        <TableRow>
                                            <TableCell>{"service port"}</TableCell>
                                            <TableCell align="right">{answer.data.port}</TableCell>
                                        </TableRow>
                                        <TableRow>
                                            <TableCell>{"service hostname"}</TableCell>
                                            <TableCell align="right">{answer.data.target}</TableCell>
                                        </TableRow>
                                        <TableRow>
                                            <TableCell>{"optional service priority"}</TableCell>
                                            <TableCell align="right">{answer.data.priority}</TableCell>
                                        </TableRow>
                                        <TableRow>
                                            <TableCell>{"optional service weight"}</TableCell>
                                            <TableCell align="right">{answer.data.weight}</TableCell>
                                        </TableRow>
                                    </>
                                    }
                                    {answer.type === "TXT" &&
                                    answer.data.map((rec, index) => (
                                        <TableRow key={`txt-${index}`}>
                                            <TableCell>{"data"}</TableCell>
                                            <TableCell align="right" className={classes.ForceBreak}>{rec.toString("utf8")}</TableCell>
                                        </TableRow>
                                    ))
                                    }
                                    {// TODO: OPT
                                    }
                                    <TableRow>
                                        <TableCell>TTL</TableCell>
                                        <TableCell align="right">{answer.ttl}</TableCell>
                                    </TableRow>
                                </TableBody>
                            </Table>
                        </TableContainer>
                    ))
                    }
                </Container>
                <Fab className={classes.Fab} color="secondary" aria-label="add-file"
                     onClick={this.state.processing ? null : this.lookupDns}>
                    <SearchIcon/>
                </Fab>
                <Dialog
                    fullWidth={true}
                    maxWidth={"sm"}
                    open={this.state.showSettings}
                    onClose={this.closeSettings}
                    aria-labelledby="server-settings-label"
                >
                    <DialogTitle id="server-settings-label">DNS Server</DialogTitle>
                    <DialogContent>
                        <FormControl component="fieldset">
                            <FormLabel component="legend">Method</FormLabel>
                            <RadioGroup
                                aria-label="method"
                                name="method"
                                onChange={this.methodChangeHandler}
                                value={this.state.qMethodTmp || this.state.qMethod}>
                                <FormControlLabel value="GET" control={<Radio/>}
                                                  label="GET"/>
                                <FormControlLabel value="POST"
                                                  control={<Radio/>}
                                                  label="POST"/>
                            </RadioGroup>
                        </FormControl>
                        <br/>
                        <Autocomplete
                            id="server-url"
                            freeSolo={true}
                            options={dnsServer}
                            value={this.state.serverUrlTmp || this.state.serverUrl}
                            onChange={this.autocompleteChangeHandler}
                            onInputChange={this.urlInputChangeHandler}
                            renderInput={params => (
                                <TextField
                                    {...params}
                                    label="Server URL"
                                    fullWidth={true}
                                    id="input-server-url"
                                    error={!this.state.isValidServerUrl}
                                    helperText={!this.state.isValidServerUrl && "Invalid URL"}
                                />
                            )}
                        />
                    </DialogContent>
                    <DialogActions>
                        <Button onClick={this.closeSettings} color="primary">
                            Cancel
                        </Button>
                        <Button onClick={this.saveAndCloseSettings} color="primary">
                            Save
                        </Button>
                    </DialogActions>
                </Dialog>
            </>
        );
    }
}

export default withStyles(styles)(DnsLookup);