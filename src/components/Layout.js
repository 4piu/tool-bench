import React from "react";
import Grid from "@material-ui/core/Grid";
import MyCard from "./MyCard";
import {withStyles} from "@material-ui/core/styles";
import Loadable from "react-loadable";
import MyAppBar from "./MyAppBar";
import MyAlert from "./MyAlert";
import ApplicationContext from "./ApplicationContext";

const styles = theme => ({
    GridContainer: {
        padding: theme.spacing(3),
        width: "100%",
        maxWidth: 1440,
        marginLeft: "auto",
        marginRight: "auto"
    },
    GridItem: {
        '& > *': {
            height: "100%",
            '& > *': {
                height: "100%"
            }
        }
    }
});

class Layout extends React.PureComponent {

    onCardClick = (e) => {
        this.context.onActivityChange(e.currentTarget.getAttribute('data-id'));
    };

    render() {
        const {classes} = this.props;
        const props = this.props;
        const context = this.context;

        // Show card list
        if (context.activity === 'home') return (
            <>
                <MyAppBar
                    title={"ToolHub"}
                    showSearchBar={true}/>
                <Grid container spacing={2} className={classes.GridContainer}>
                    {context.activityList.map(item => (
                        <Grid className={classes.GridItem}
                              key={item.name}
                              data-id={item.name}
                              onClick={this.onCardClick}
                              item xs={12} sm={6} md={4} lg={3}>
                            <MyCard
                                title={item.title}
                                description={item.description}
                                image={item.icon}
                                changeActivity={context.onActivityChange}
                            />
                        </Grid>
                    ))}
                </Grid>
            </>
        );

        // Dynamic load card content
        const alertCancelHandler = () => {
            context.onActivityChange('home');
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
            loader: context.activityList.filter(({name}) => (name === context.activity))[0].loader,
            render: (loaded) => {
                const Component = loaded.default;
                return <Component
                    title={context.activityList.filter(x => (x.name === context.activity))[0].title}
                    changeActivity={context.onActivityChange}
                />;
            },
            loading: Loading,
            delay: 200,
            timeout: 10000
        });
        return <Tool/>
    }
}

Layout.contextType = ApplicationContext;

export default withStyles(styles)(Layout);