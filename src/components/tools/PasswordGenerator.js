import React from "react";
import PropTypes from "prop-types";
import MyAppBar from "../MyAppBar";

class PasswordGenerator extends React.Component {
    static propTypes = {
        title: PropTypes.string.isRequired,
        changeActivity: PropTypes.func.isRequired
    };

    render() {
        return (
            <React.Fragment>
                <MyAppBar
                    title={this.props.title}
                    isHome={false}
                    changeActivity={this.props.changeActivity}/>
                <div>Alan please add details</div>
            </React.Fragment>
        );
    }
}

export default PasswordGenerator;