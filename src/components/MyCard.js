import React from 'react';
import PropTypes from 'prop-types';
import {withStyles} from '@material-ui/core/styles';
import Card from '@material-ui/core/Card';
import WrenchIcon from '../assets/img/icon_wrench.svg';
import {CardHeader} from "@material-ui/core";
import Avatar from "@material-ui/core/Avatar";
import CardActionArea from "@material-ui/core/CardActionArea";

const styles = theme => ({
    root: {
        cursor: 'default'
    },
    icon: {
        width: 55,
        height: 55,
        position: 'absolute',
        top: '50%',
        left: '50%',
        transform: 'translate(-25px, -25px)'
    }
});

class MyCard extends React.PureComponent {
    static propTypes = {
        title: PropTypes.string.isRequired,
        description: PropTypes.string,
        image: PropTypes.string
    };

    static defaultProps = {
        description: "",
        image: WrenchIcon
    };

    render() {
        const {classes} = this.props;

        return (
            <Card className={classes.root}>
                <CardActionArea>
                    <CardHeader
                        avatar={<Avatar src={this.props.image}/>}
                        title={this.props.title}
                        subheader={this.props.description}
                    />
                </CardActionArea>

            </Card>
        );
    }
}

export default withStyles(styles)(MyCard);