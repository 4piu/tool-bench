import React from "react";
import {withStyles} from "@material-ui/core/styles";
import PropTypes from "prop-types";
import MyAppBar from "../MyAppBar";
import Container from "@material-ui/core/Container";
import {KeyboardDatePicker} from "@material-ui/pickers";
import {KeyboardTimePicker} from "@material-ui/pickers";
import {MuiPickersUtilsProvider} from "@material-ui/pickers";
import DateFnsUtils from '@date-io/date-fns';
import Grid from "@material-ui/core/Grid";
import FormControl from "@material-ui/core/FormControl";
import InputLabel from "@material-ui/core/InputLabel";
import Select from "@material-ui/core/Select";
import MenuItem from "@material-ui/core/MenuItem";

const styles = theme => ({
    TimezoneSelect: {
        marginTop: theme.spacing(2),
        marginBottom: theme.spacing(1),
        minWidth: 120,
    }
});

class UnixTimestamp extends React.Component {
    static propTypes = {
        title: PropTypes.string.isRequired
    };

    constructor(props) {
        super(props);
        this.state = {
            selectedDate: new Date(),
            inputTimestamp: new Date()
        }
    }

    selectDateHandler = value => {
        this.setState({
            selectedDate: value
        })
    };

    selectTimezoneHandler = event => {
        this.setState(prevState => {
            // TODO
        })
    };

    render() {
        console.debug(this.state.selectedDate)
        const {classes} = this.props;
        return (
            <>
                {/** App bar */}
                <MyAppBar title={this.props.title}/>
                {/** Main view */}
                <Container maxWidth={"md"}>
                    <MuiPickersUtilsProvider utils={DateFnsUtils}>
                        <Grid container justify="space-around">
                            <KeyboardDatePicker
                                margin="normal"
                                id="date-picker-dialog"
                                label="Date"
                                format="yyyy-MM-dd"
                                value={this.state.selectedDate}
                                onChange={this.selectDateHandler}
                                KeyboardButtonProps={{
                                    'aria-label': 'change date',
                                }}
                            />
                            <KeyboardTimePicker
                                margin="normal"
                                id="time-picker"
                                label="Time"
                                value={this.state.selectedDate}
                                onChange={this.selectDateHandler}
                                KeyboardButtonProps={{
                                    'aria-label': 'change time',
                                }}
                            />
                            <FormControl className={classes.TimezoneSelect}>
                                <InputLabel id="label-select-tz">Timezone</InputLabel>
                                <Select
                                    labelId="label-select-tz"
                                    id="select-tz"
                                    value={this.state.selectedDate.getTimezoneOffset()}
                                    onChange={void(0)}
                                >
                                    <MenuItem value={720}>-12</MenuItem>
                                    <MenuItem value={660}>-11</MenuItem>
                                    <MenuItem value={600}>-10</MenuItem>
                                    <MenuItem value={540}>-9</MenuItem>
                                    <MenuItem value={480}>-8</MenuItem>
                                    <MenuItem value={420}>-7</MenuItem>
                                    <MenuItem value={360}>-6</MenuItem>
                                    <MenuItem value={300}>-5</MenuItem>
                                    <MenuItem value={240}>-4</MenuItem>
                                    <MenuItem value={180}>-3</MenuItem>
                                    <MenuItem value={120}>-2</MenuItem>
                                    <MenuItem value={60}>-1</MenuItem>
                                    <MenuItem value={0}>0</MenuItem>
                                    <MenuItem value={-60}>+1</MenuItem>
                                    <MenuItem value={-120}>+2</MenuItem>
                                    <MenuItem value={-180}>+3</MenuItem>
                                    <MenuItem value={-240}>+4</MenuItem>
                                    <MenuItem value={-300}>+5</MenuItem>
                                    <MenuItem value={-360}>+6</MenuItem>
                                    <MenuItem value={-420}>+7</MenuItem>
                                    <MenuItem value={-480}>+8</MenuItem>
                                    <MenuItem value={-540}>+9</MenuItem>
                                    <MenuItem value={-600}>+10</MenuItem>
                                    <MenuItem value={-660}>+11</MenuItem>
                                    <MenuItem value={-720}>+12</MenuItem>
                                </Select>
                            </FormControl>
                        </Grid>
                    </MuiPickersUtilsProvider>
                </Container>
            </>
        );
    }
}

export default withStyles(styles)(UnixTimestamp);