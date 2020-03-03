import React from 'react';
import Typography from '@material-ui/core/Typography';
import {withStyles} from '@material-ui/core/styles';
import Container from '@material-ui/core/Container';
import Link from '@material-ui/core/Link';

const styles = theme => ({
    footer: {
        padding: theme.spacing(3, 2),
        marginTop: 'auto',
        backgroundColor:
            theme.palette.type === 'dark' ? theme.palette.grey[800] : theme.palette.grey[200],
    }
});

class MyFooter extends React.Component {
    render() {
        const {classes} = this.props;

        return (
            <footer className={classes.footer}>
                <Container maxWidth="sm">
                    <Typography variant="body1">My sticky footer can be found here.</Typography>
                    <Typography variant="body2" color="textSecondary">
                        {'Copyright © '}
                        <Link color="inherit" href="https://material-ui.com/">
                            Your Website
                        </Link>{' '}{new Date().getFullYear()}{'.'}
                    </Typography>
                </Container>
            </footer>
        );
    }
}

export default withStyles(styles)(MyFooter);