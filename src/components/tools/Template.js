import React from "react";
import {withStyles} from "@material-ui/core/styles";
import PropTypes from "prop-types";
import MyAppBar from "../MyAppBar";
import Grid from "@material-ui/core/Grid";

const styles = theme => ({});

class ToolClass extends React.Component {
    static propTypes = {
        title: PropTypes.string.isRequired,
        changeActivity: PropTypes.func.isRequired
    };

    render() {
        return (
            <>
                {/** App bar */}
                <MyAppBar
                    title={this.props.title}
                    showBackButton={true}
                    changeActivity={this.props.changeActivity}/>
                {/** Main view */}
                <Grid container>

                </Grid>
            </>
        );
    }
}

export default withStyles(styles)(ToolClass);