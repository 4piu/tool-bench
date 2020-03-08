import React from "react";
import Grid from "@material-ui/core/Grid";
import MyCard from "./MyCard";
import {withStyles} from "@material-ui/core/styles";
import PropTypes from "prop-types";
import Loadable from "react-loadable";
import MyAppBar from "./MyAppBar";
import MyAlert from "./MyAlert";

const styles = theme => ({
    GridContainer: {
        padding: theme.spacing(3),
        maxWidth: 1440,
        marginLeft: "auto",
        marginRight: "auto"
    },
    GridItem: {
        '& > *': {
            height: "100%"
        }
    }
});

class Layout extends React.PureComponent {
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
        const props = this.props;

        // Show card list
        if (props.activity === 'home') return (
            <>
                <MyAppBar
                    title={"Tool bench"}
                    showSearchBar={true}
                    changeActivity={props.changeActivity}/>
                <Grid container spacing={2} className={classes.GridContainer}>
                    {this.props.activityList.map(item => (
                        <Grid className={classes.GridItem}
                              key={item.name}
                              data-id={item.name}
                              onClick={this.handleCardClick}
                              item xs={12} sm={6} md={4} lg={3}>
                            <MyCard
                                title={item.title}
                                description={item.description}
                                image={item.icon}
                                backgroundColor={item.color}
                                changeActivity={props.changeActivity}
                            />
                        </Grid>
                    ))}
                </Grid>
            </>
        );

        // Dynamic load card content
        const alertCancelHandler = () => {
            this.props.changeActivity('home');
        };
        // Error handler
        const Loading = (props) => {
            if (props.error) {
                console.error(props.error);
                return <MyAlert
                    title={'Error'}
                    description={'Error occurred: ' + props.error.message}
                    textCancel={'Close'}
                    funcCancel={alertCancelHandler}
                />
            } else if (props.timedOut) {
                return <MyAlert
                    title={'Loading'}
                    description={'Component is still loading... But may be you should retry'}
                    textCancel={'Cancel'}
                    funcCancel={alertCancelHandler}
                    showSpinner={true}
                />;
            } else if (props.pastDelay) {
                return <MyAlert
                    title={'Loading'}
                    description={'Please wait...'}
                    textCancel={'Cancel'}
                    funcCancel={alertCancelHandler}
                    showSpinner={true}
                />;
            } else {
                return null;
            }
        };
        // Async load
        const Tool = Loadable({
            loader: props.activityList.filter(({name}) => (name === props.activity))[0].loader,
            render(loaded) {
                const Component = loaded.default;
                return <Component
                    title={props.activityList.filter(x => (x.name === props.activity))[0].title}
                    changeActivity={props.changeActivity}
                />;
            },
            loading: Loading,
            delay: 300,
            timeout: 10000
        });
        return <Tool/>
    }
}

export default withStyles(styles)(Layout);