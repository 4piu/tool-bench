import React from "react";
import {withStyles} from "@material-ui/core/styles";
import PropTypes from "prop-types";
import MyAppBar from "../MyAppBar";
import Container from "@material-ui/core/Container";

const styles = theme => ({});

class ToolClass extends React.Component {
    static propTypes = {
        title: PropTypes.string.isRequired
    };

    render() {
        const {classes} = this.props;
        return (
            <>
                {/** App bar */}
                <MyAppBar title={this.props.title}/>
                {/** Main view */}
                <Container>

                </Container>
            </>
        );
    }
}

export default withStyles(styles)(ToolClass);