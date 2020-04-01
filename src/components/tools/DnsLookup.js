import React from "react";
import {withStyles} from "@material-ui/core/styles";
import PropTypes from "prop-types";
import MyAppBar from "../MyAppBar";
import Container from "@material-ui/core/Container";
import IconButton from "@material-ui/core/IconButton";
import SettingsIcon from "@material-ui/icons/Settings";
import DeleteIcon from "@material-ui/icons/Delete";
import Dialog from "@material-ui/core/Dialog";
import DialogTitle from "@material-ui/core/DialogTitle";

const styles = theme => ({
    root: {
        padding: theme.spacing(3),
        marginBottom: 80
    },
    menuItem: {
        color: "inherit"
    }
});

class ToolClass extends React.PureComponent {
    static propTypes = {
        title: PropTypes.string.isRequired
    };

    constructor(props) {
        super(props);
        this.state = {
            showSettings: false,
            qMethod: "GET",
            serverUrl: "https://cloudflare-dns.com/dns-query",
            qName: "",
            qType: "A",
            qClass: "IN",
            output: ""
        };
    }

    showSettings = () => {
        this.setState({showSettings: true});
    };

    closeSettings = () => {
        this.setState({showSettings: false});
    };

    resetInput = () => {

    };

    lookupDns = () => {

    };

    render() {
        const {classes} = this.props;
        return (
            <>
                {/** App bar */}
                <MyAppBar
                    title={this.props.title}
                    menuItems={[
                        <IconButton className={classes.menuItem}>
                            <DeleteIcon/>
                        </IconButton>,
                        <IconButton
                            className={classes.menuItem}
                            onClick={this.showSettings}>
                            <SettingsIcon/>
                        </IconButton>
                    ]}/>
                {/** Main view */}
                <Container maxWidth={"md"} className={classes.root}>
                    <Dialog
                        fullWidth={true}
                        maxWidth={"sm"}
                        open={this.state.showSettings}
                        onClose={this.closeSettings}
                        aria-labelledby="server-settings-label"
                    >
                        <DialogTitle id="server-settings-label">DNS Server</DialogTitle>
                    </Dialog>
                </Container>
            </>
        );
    }
}

export default withStyles(styles)(ToolClass);