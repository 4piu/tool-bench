import React from "react";
import Grid from "@material-ui/core/Grid";
import Backdrop from "@material-ui/core/Backdrop";
import MyCard from "./MyCard";
import {withStyles} from "@material-ui/core/styles";
import PropTypes from "prop-types";
import Loadable from "react-loadable";
import CircularProgress from "@material-ui/core/CircularProgress";
import path from "path";

const styles = theme => ({
    root: {
        padding: theme.spacing(3)
    }
});

class Layout extends React.Component {
    static propTypes = {
        activityList: PropTypes.arrayOf(PropTypes.object).isRequired,
        activity: PropTypes.string.isRequired,
        changeActivity: PropTypes.func.isRequired
    };

    handleCardClick = (e) => {
        // console.debug(e.currentTarget.getAttribute('data-id'));
        this.props.changeActivity(e.currentTarget.getAttribute('data-id'));
    };

    render() {
        const {classes} = this.props;

        if (this.props.activity === 'home') return (
            <Grid container spacing={2} className={classes.root}>
                {this.props.activityList.map(item => (
                    <Grid key={item.name}
                          data-id={item.name}
                          onClick={this.handleCardClick}
                          item xs={12} sm={6} md={4} lg={3} xl={2}>
                        <MyCard
                            title={item.title}
                            description={item.description}
                            image={item.icon}
                            backgroundColor={item.color}
                        />
                    </Grid>
                ))}
            </Grid>
        );

        const Loading = (props) => {
            if (props.error) {
                console.error(props.error);
                return <div>failed to load</div>
            } else if (props.pastDelay) {
                return <Backdrop open={true}><CircularProgress color="inherit"/></Backdrop>;
            } else if (props.timedOut) {
                console.error(props.timedOut);
                return <div>failed to load</div>
            } else {
                return null;
            }
        };
        const LoadableComponent = Loadable({
            loader: this.props.activityList.filter(x => (x.name === this.props.activity))[0].file,
            loading: Loading,
            delay: 500,
            timeout: 10000
        });
        return <LoadableComponent/>
    }
}

export default withStyles(styles)(Layout);