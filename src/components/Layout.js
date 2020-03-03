import React from "react";
import Grid from "@material-ui/core/Grid";
import MyCard from "./MyCard";
import {withStyles} from "@material-ui/core/styles";

const styles = theme => ({
    root: {
        padding: theme.spacing(3)
    }
});

class Layout extends React.Component {
    render() {
        const {classes} = this.props;

        return (
            <Grid container spacing={2} className={classes.root}>
                <Grid item xs={12} sm={6} md={4} lg={3} xl={2}>
                    <MyCard title={'Lorem'} description={'Ipsum dolor sit amet'}/>
                </Grid>
                <Grid item xs={12} sm={6} md={4} lg={3} xl={2}>
                    <MyCard title={'Lorem'} description={'Ipsum dolor sit amet'}/>
                </Grid>
                <Grid item xs={12} sm={6} md={4} lg={3} xl={2}>
                    <MyCard title={'Lorem'} description={'Ipsum dolor sit amet'}/>
                </Grid>
                <Grid item xs={12} sm={6} md={4} lg={3} xl={2}>
                    <MyCard title={'Lorem'} description={'Ipsum dolor sit amet'}/>
                </Grid>
                <Grid item xs={12} sm={6} md={4} lg={3} xl={2}>
                    <MyCard title={'Lorem'} description={'Ipsum dolor sit amet'}/>
                </Grid>
                <Grid item xs={12} sm={6} md={4} lg={3} xl={2}>
                    <MyCard title={'Lorem'} description={'Ipsum dolor sit amet'}/>
                </Grid>
                <Grid item xs={12} sm={6} md={4} lg={3} xl={2}>
                    <MyCard title={'Lorem'} description={'Ipsum dolor sit amet'}/>
                </Grid>
                <Grid item xs={12} sm={6} md={4} lg={3} xl={2}>
                    <MyCard title={'Lorem'} description={'Ipsum dolor sit amet'}/>
                </Grid>
                <Grid item xs={12} sm={6} md={4} lg={3} xl={2}>
                    <MyCard title={'Lorem'} description={'Ipsum dolor sit amet'}/>
                </Grid>
                <Grid item xs={12} sm={6} md={4} lg={3} xl={2}>
                    <MyCard title={'Lorem'} description={'Ipsum dolor sit amet'}/>
                </Grid>
                <Grid item xs={12} sm={6} md={4} lg={3} xl={2}>
                    <MyCard title={'Lorem'} description={'Ipsum dolor sit amet'}/>
                </Grid>
                <Grid item xs={12} sm={6} md={4} lg={3} xl={2}>
                    <MyCard title={'Lorem'} description={'Ipsum dolor sit amet'}/>
                </Grid>
                <Grid item xs={12} sm={6} md={4} lg={3} xl={2}>
                    <MyCard title={'Lorem'} description={'Ipsum dolor sit amet'}/>
                </Grid>
                <Grid item xs={12} sm={6} md={4} lg={3} xl={2}>
                    <MyCard title={'Lorem'} description={'Ipsum dolor sit amet'}/>
                </Grid>
                <Grid item xs={12} sm={6} md={4} lg={3} xl={2}>
                    <MyCard title={'Lorem'} description={'Ipsum dolor sit amet'}/>
                </Grid>
                <Grid item xs={12} sm={6} md={4} lg={3} xl={2}>
                    <MyCard title={'Lorem'} description={'Ipsum dolor sit amet'}/>
                </Grid>
                <Grid item xs={12} sm={6} md={4} lg={3} xl={2}>
                    <MyCard title={'Lorem'} description={'Ipsum dolor sit amet'}/>
                </Grid>
                <Grid item xs={12} sm={6} md={4} lg={3} xl={2}>
                    <MyCard title={'Lorem'} description={'Ipsum dolor sit amet'}/>
                </Grid>
                <Grid item xs={12} sm={6} md={4} lg={3} xl={2}>
                    <MyCard title={'Lorem'} description={'Ipsum dolor sit amet'}/>
                </Grid>
                <Grid item xs={12} sm={6} md={4} lg={3} xl={2}>
                    <MyCard title={'Lorem'} description={'Ipsum dolor sit amet'}/>
                </Grid>
            </Grid>
        )
    }
}

export default withStyles(styles)(Layout);