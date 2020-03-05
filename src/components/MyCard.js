import React from 'react';
import PropTypes from 'prop-types';
import {withStyles} from '@material-ui/core/styles';
import Card from '@material-ui/core/Card';
import CardActionArea from '@material-ui/core/CardActionArea';
import CardContent from '@material-ui/core/CardContent';
import Typography from '@material-ui/core/Typography';
import WrenchIcon from '../assets/img/icon_wrench.svg';

const styles = theme => ({
    banner: {
        height: 100,
        backgroundColor: props => props.backgroundColor,
        position: 'relative'
    },
    icon: {
        width: 50,
        height: 50,
        position: 'absolute',
        top: '50%',
        left: '50%',
        transform: 'translate(-25px, -25px)'
    }
});

class MyCard extends React.Component {
    static propTypes = {
        title: PropTypes.string.isRequired,
        description: PropTypes.string,
        image: PropTypes.string,
        backgroundColor: PropTypes.string
    };

    static defaultProps = {
        description: "",
        image: WrenchIcon,
        backgroundColor: "#333"
    };

    render() {
        const {classes} = this.props;

        return (
            <Card>
                <CardActionArea>
                    <div className={classes.banner}>
                        <img className={classes.icon} src={this.props.image} alt={this.props.title}/>
                    </div>
                    <CardContent>
                        <Typography gutterBottom variant="h5" component="h2">
                            {this.props.title}
                        </Typography>
                        <Typography variant="body2" color="textSecondary" component="p">
                            {this.props.description}
                        </Typography>
                    </CardContent>
                </CardActionArea>
            </Card>
        );
    }
}

export default withStyles(styles)(MyCard);