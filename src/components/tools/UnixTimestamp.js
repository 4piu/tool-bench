import React from "react";
import {withStyles} from "@material-ui/core/styles";
import PropTypes from "prop-types";
import MyAppBar from "../MyAppBar";
import Container from "@material-ui/core/Container";
import {DateTimePicker} from "@material-ui/pickers";
import {MuiPickersUtilsProvider} from "@material-ui/pickers";
import DateFnsUtils from '@date-io/date-fns';
import FormControl from "@material-ui/core/FormControl";
import InputLabel from "@material-ui/core/InputLabel";
import Select from "@material-ui/core/Select";
import MenuItem from "@material-ui/core/MenuItem";
import Typography from "@material-ui/core/Typography";
import Button from "@material-ui/core/Button";
import DoneIcon from "@material-ui/icons/Done";
import FileCopyIcon from "@material-ui/icons/FileCopy";
import TextField from "@material-ui/core/TextField";
import Paper from "@material-ui/core/Paper";

const styles = theme => ({
    root: {
        padding: theme.spacing(3),
        '& > *': {
            marginBottom: theme.spacing(2),
            padding: theme.spacing(2),
        }
    },
    Select: {
        marginTop: theme.spacing(2),
        marginBottom: theme.spacing(1),
        minWidth: 100,
    },
    InputGroup: {
        '& > *': {
            margin: theme.spacing(1)
        }
    },
    OutputTimestamp: {
        margin: theme.spacing(1)
    }
});

class UnixTimestamp extends React.Component {
    static propTypes = {
        title: PropTypes.string.isRequired
    };

    secondsMenuItem = [];

    timezoneMenuItem = [];

    constructor(props) {
        super(props);
        for (let i = 0; i < 60; i++) {
            this.secondsMenuItem.push(<MenuItem key={i} value={i}>{i}</MenuItem>);
        }
        for (let i = -12; i < 13; i++) {
            this.timezoneMenuItem.push(<MenuItem key={i} value={i * (-60)}>{i > 0 ? `+${i}` : String(i)}</MenuItem>);
        }
        const currentDate = new Date();
        this.state = {
            selectedDate: currentDate,
            selectedTimezone: currentDate.getTimezoneOffset(),
            timestampCopied: false,
            inputTimestamp: Math.floor(currentDate.getTime() / 1000),
            selectedFormat: "Locale",
            timeStringCopied: false
        };
    }

    getTimestamp = () => {
        return Math.floor((new Date(this.state.selectedDate.getTime() -
            (this.state.selectedTimezone - this.state.selectedDate.getTimezoneOffset()) * 60000))
            .getTime() / 1000);
    };

    selectDateHandler = value => {
        this.setState({
            selectedDate: value
        })
    };

    selectSecondsHandler = event => {
        const value = event.target.value;
        this.setState(prevState => {
            const nextDate = prevState.selectedDate;
            nextDate.setSeconds(parseInt(value));
            return {
                selectedDate: nextDate
            }
        })
    };

    selectTimezoneHandler = event => {
        this.setState({
            selectedTimezone: event.target.value
        })
    };

    inputTimestampHandler = event => {
        this.setState({
            inputTimestamp: event.currentTarget.value
        })
    };

    selectFormatHandler = event => {
        this.setState({
            selectedFormat: event.target.value
        })
    };

    buttonCopyTimestampHandler = () => {
        navigator.clipboard.writeText(String(this.getTimestamp()));
        this.setState({
            timestampCopied: true
        });
        setTimeout(() => {
            this.setState({
                timestampCopied: false
            })
        }, 3000);
    };

    getTimeString = () => {
        switch (this.state.selectedFormat) {
            case "ISO-8601":
                return new Date(parseInt(this.state.inputTimestamp) * 1000).toISOString();
            case "RFC-1123":
                return new Date(parseInt(this.state.inputTimestamp) * 1000).toUTCString();
            case "Locale":
                return new Date(parseInt(this.state.inputTimestamp) * 1000).toLocaleString();
        }
    };

    buttonCopyTimeStrHandler = () => {
        navigator.clipboard.writeText(this.getTimeString());
        this.setState({
            timeStringCopied: true
        });
        setTimeout(() => {
            this.setState({
                timeStringCopied: false
            })
        }, 3000);
    };

    render() {
        const {classes} = this.props;
        return (
            <>
                {/** App bar */}
                <MyAppBar title={this.props.title}/>
                {/** Main view */}
                <Container maxWidth={"sm"} className={classes.root}>
                    <Paper>
                        <MuiPickersUtilsProvider utils={DateFnsUtils}>
                            <div className={classes.InputGroup}>
                                <DateTimePicker
                                    margin="normal"
                                    id="date-picker-dialog"
                                    label="Date and time"
                                    value={this.state.selectedDate}
                                    onChange={this.selectDateHandler}
                                    format={"yyyy-MM-dd HH:mm"}
                                    ampm={false}
                                    showTodayButton
                                />
                                <FormControl className={classes.Select}>
                                    <InputLabel id="label-select-second">Seconds</InputLabel>
                                    <Select
                                        labelId="label-select-second"
                                        id="select-second"
                                        value={this.state.selectedDate.getSeconds()}
                                        onChange={this.selectSecondsHandler}
                                    >
                                        {this.secondsMenuItem}
                                    </Select>
                                </FormControl>
                                <FormControl className={classes.Select}>
                                    <InputLabel id="label-select-tz">Offset</InputLabel>
                                    <Select
                                        labelId="label-select-tz"
                                        id="select-tz"
                                        value={this.state.selectedTimezone}
                                        onChange={this.selectTimezoneHandler}
                                    >
                                        {this.timezoneMenuItem}
                                    </Select>
                                </FormControl>
                            </div>
                        </MuiPickersUtilsProvider>
                        <Typography variant={"h5"} className={classes.OutputTimestamp}>
                            {this.getTimestamp()}
                        </Typography>
                        <Button variant="contained"
                                onClick={this.buttonCopyTimestampHandler}
                                fullWidth={true}
                                startIcon={this.state.timestampCopied ? <DoneIcon/> : <FileCopyIcon/>}
                        >{this.state.timestampCopied ?
                            'Copied' :
                            'Copy'
                        }</Button>
                    </Paper>
                    <Paper>
                        <div className={classes.InputGroup}>
                            <TextField
                                id="input-timestamp"
                                label="Timestamp"
                                type="number"
                                value={this.state.inputTimestamp}
                                onChange={this.inputTimestampHandler}
                                InputLabelProps={{
                                    shrink: true,
                                }}
                            />
                            <FormControl className={classes.Select}>
                                <InputLabel id="label-select-format">Format</InputLabel>
                                <Select
                                    labelId="label-select-format"
                                    id="select-format"
                                    value={this.state.selectedFormat}
                                    onChange={this.selectFormatHandler}
                                >
                                    <MenuItem value={"ISO-8601"}>ISO-8601</MenuItem>
                                    <MenuItem value={"RFC-1123"}>RFC-1123</MenuItem>
                                    <MenuItem value={"Locale"}>Locale</MenuItem>
                                </Select>
                            </FormControl>
                        </div>
                        <Typography variant={"h5"} className={classes.OutputTimestamp}>
                            {this.getTimeString()}
                        </Typography>
                        <Button variant="contained"
                                onClick={this.buttonCopyTimeStrHandler}
                                fullWidth={true}
                                startIcon={this.state.timeStringCopied ? <DoneIcon/> : <FileCopyIcon/>}
                        >{this.state.timeStringCopied ?
                            'Copied' :
                            'Copy'
                        }</Button>
                    </Paper>
                </Container>
            </>
        );
    }
}

export default withStyles(styles)(UnixTimestamp);