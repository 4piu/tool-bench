import React from "react";
import {withStyles} from "@material-ui/core/styles";
import PropTypes from "prop-types";
import MyAppBar from "../MyAppBar";
import Container from "@material-ui/core/Container";

const styles = theme => ({
    Container: {
        padding: theme.spacing(3),
        '& > *': {
            marginBottom: theme.spacing(3)
        }
    }
});

class Base64Codec extends React.PureComponent {
    static propTypes = {
        title: PropTypes.string.isRequired,
        changeActivity: PropTypes.func.isRequired
    };

    render() {
        const {classes} = this.props;
        return (
            <>
                {/** App bar */}
                <MyAppBar
                    title={this.props.title}
                    showBackButton={true}
                    changeActivity={this.props.changeActivity}/>
                {/** Main view */}
                <Container className={classes.Container} maxWidth={"md"}>
                    <br/>
                </Container>
            </>
        );
    }
}

export default withStyles(styles)(Base64Codec);