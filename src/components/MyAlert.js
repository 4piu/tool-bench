import React from 'react';
import PropTypes from 'prop-types';
import Button from '@material-ui/core/Button';
import Dialog from '@material-ui/core/Dialog';
import DialogActions from '@material-ui/core/DialogActions';
import DialogContent from '@material-ui/core/DialogContent';
import DialogContentText from '@material-ui/core/DialogContentText';
import DialogTitle from '@material-ui/core/DialogTitle';
import CircularProgress from "@material-ui/core/CircularProgress";
import {withStyles} from "@material-ui/core/styles";

const styles = theme => ({
    content: {
        display: 'flex',
        alignItems: 'center'
    },
    spinner: {
        minWidth: '40px'
    },
    textContent: {
        marginBottom: 0,
        marginLeft: props => (props.showSpinner)? theme.spacing(2) : 0
    }
});

class MyAlert extends React.Component {

    static propTypes = {
        title: PropTypes.string,
        description: PropTypes.string,
        showSpinner: PropTypes.bool,
        disableIgnore: PropTypes.bool,
        maxWidth: PropTypes.string,
        textOk: PropTypes.string,
        funcOk: PropTypes.func,
        textCancel: PropTypes.string,
        funcCancel: PropTypes.func
    };

    static defaultProps = {
        disableIgnore: true,
        showSpinner: false,
        maxWidth: 'xl'
    };

    constructor(props) {
        super(props);
        this.state = {
            open: true
        }
    }

    close = () => {
        this.setState({
            open: false
        });
    };

    render() {
        const {classes} = this.props;
        return (
            <div>
                <Dialog
                    open={this.state.open}
                    onClose={this.props.funcCancel || this.close}
                    aria-labelledby="alert-dialog-title"
                    aria-describedby="alert-dialog-description"
                    disableBackdropClick={this.props.disableIgnore}
                    disableEscapeKeyDown={this.props.disableIgnore}
                    maxWidth={this.props.maxWidth}
                >
                    {this.props.title &&
                    <DialogTitle id="alert-dialog-title">
                        {this.props.title}
                    </DialogTitle>}
                    {this.props.description &&
                    <DialogContent className={classes.content}>
                        {this.props.showSpinner &&
                        <CircularProgress
                            size={40}
                            className={classes.spinner}/>
                        }
                        <DialogContentText
                            className={classes.textContent}
                            id="alert-dialog-description">
                            {this.props.description}
                        </DialogContentText>
                    </DialogContent>}
                    <DialogActions>
                        {this.props.textCancel &&
                        <Button onClick={this.props.funcCancel} color="primary">
                            {this.props.textCancel}
                        </Button>}
                        {this.props.textOk &&
                        <Button onClick={this.props.funcOk} color="primary">
                            {this.props.textOk}
                        </Button>}
                    </DialogActions>
                </Dialog>
            </div>
        );
    }
}

export default withStyles(styles)(MyAlert);