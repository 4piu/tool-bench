import React from "react";
import {withStyles} from "@material-ui/core/styles";
import PropTypes from "prop-types";
import MyAppBar from "../../MyAppBar";
import Container from "@material-ui/core/Container";
import Tabs from "@material-ui/core/Tabs";
import Tab from "@material-ui/core/Tab";
import AppBar from "@material-ui/core/AppBar";
import SwipeableViews from "react-swipeable-views";
import Paper from "@material-ui/core/Paper";
import TableContainer from "@material-ui/core/TableContainer";
import Table from "@material-ui/core/Table";
import TableHead from "@material-ui/core/TableHead";
import TableRow from "@material-ui/core/TableRow";
import TableCell from "@material-ui/core/TableCell";
import TableBody from "@material-ui/core/TableBody";
import Typography from "@material-ui/core/Typography";
import Toolbar from "@material-ui/core/Toolbar";

const styles = theme => ({
    Container: {
        paddingTop: 104,
        paddingBottom: theme.spacing(3),
        "& > *": {
            marginTop: theme.spacing(3),
            marginBottom: theme.spacing(3)
        }
    },
    PaperText: {
        padding: theme.spacing(2)
    }
});

class UserAgent extends React.PureComponent {
    static propTypes = {
        title: PropTypes.string.isRequired
    };

    constructor(props) {
        super(props);
        this.state = {
            tabIndex: 0
        };
    }

    onTabChange = (ev, val) => {
        this.setState({
            tabIndex: val
        });
    };

    onTabPanelSwipe = val => {
        this.setState({
            tabIndex: val
        });
    };

    getDeviceInfo = () => ([
        ["Platform", String(navigator.platform)],
        ["CPU cores", String(navigator.hardwareConcurrency)],
        ["Device memory", `${navigator.deviceMemory} GB`],
        ["Screen resolution", `${window.screen.width}x${window.screen.height}`],
        ["Max touch point", String(navigator.maxTouchPoints)],
    ]);

    getBrowserInfo = () => ([
        ["Vendor", String(navigator.vendor)],
        ["Language", String(navigator.language)],
        ["Timezone", `GMT ${new Date().getTimezoneOffset() / -60}`],
        ["Window size", `${
            window.innerWidth ||
            document.documentElement.clientWidth ||
            document.body.clientWidth}x${
            window.innerHeight ||
            document.documentElement.clientHeight ||
            document.body.clientHeight}`],
        ["Cookies enabled", String(navigator.cookieEnabled)],
        ["Do not track", String(navigator.doNotTrack)]
    ]);

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
                    <AppBar position="static" color="default">
                        <Tabs
                            value={this.state.tabIndex}
                            onChange={this.onTabChange}
                            indicatorColor="primary"
                            textColor="primary"
                            centered
                        >
                            <Tab label="My UA" id={"tab-0"} value={0} aria-controls={"tab-panel-0"}/>
                            <Tab label="UA List" id={"tab-1"} value={1} aria-controls={"tab-panel-1"}/>
                        </Tabs>
                    </AppBar>
                </div>

                {/** Main view */}
                <SwipeableViews
                    index={this.state.tabIndex}
                    onChangeIndex={this.onTabPanelSwipe}
                    resistance
                    animateHeight
                >
                    <Container className={classes.Container} id={"tab-panel-0"} aria-labelledby={"tab-0"} value={0}
                               maxWidth={"md"}>
                        <div>
                            <Typography variant={"h6"}>{"User-Agent"}</Typography>
                            <Paper className={classes.PaperText}>
                                {navigator.userAgent}
                            </Paper>
                        </div>
                        <div>
                            <Typography variant={"h6"}>{"Browser info"}</Typography>
                            <TableContainer component={Paper}>
                                <Table>
                                    <TableHead>
                                        <TableRow>
                                            <TableCell>{"Field"}</TableCell>
                                            <TableCell align={"right"}>Value</TableCell>
                                        </TableRow>
                                    </TableHead>
                                    <TableBody>
                                        {this.getBrowserInfo().map((row, index) => (
                                            <TableRow key={`info-row-${index}`}>
                                                <TableCell>{row[0]}</TableCell>
                                                <TableCell align={"right"}>{row[1]}</TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </TableContainer>
                        </div>
                        <div>
                            <Typography variant={"h6"}>{"Device info"}</Typography>
                            <TableContainer component={Paper}>
                                <Table>
                                    <TableHead>
                                        <TableRow>
                                            <TableCell>{"Field"}</TableCell>
                                            <TableCell align={"right"}>Value</TableCell>
                                        </TableRow>
                                    </TableHead>
                                    <TableBody>
                                        {this.getDeviceInfo().map((row, index) => (
                                            <TableRow key={`info-row-${index}`}>
                                                <TableCell>{row[0]}</TableCell>
                                                <TableCell align={"right"}>{row[1]}</TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </TableContainer>
                        </div>
                    </Container>
                    <Container className={classes.Container} id={"tab-panel-1"} aria-labelledby={"tab-1"} value={1}
                               maxWidth={"md"}>
                        <div>panel 2</div>
                        <div>panel 2</div>
                        <div>panel 2</div>
                        <div>panel 2</div>
                        <div>panel 2</div>
                    </Container>
                </SwipeableViews>
            </>
        );
    }
}

export default withStyles(styles)(UserAgent);