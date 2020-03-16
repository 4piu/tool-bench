import React from "react";
import PropTypes from "prop-types";

const styleCommon = {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "transparent",
    border: "3px dashed #bbb",
    color: "#bbb",
    borderRadius: "1rem",
    padding: "2rem"
};

const styleHover = {
    color: "#216af3",
    backgroundColor: "rgba(36, 173, 253, 0.3)",
    border: "4px dashed #216af3",
};

export default class MyDragAndDrop extends React.PureComponent {

    static propTypes = {
        fullWindow: PropTypes.bool, // Add event listener to window or component only
        onDrop: PropTypes.func,
        styleCommon: PropTypes.object,
        styleHover: PropTypes.object,
        children: PropTypes.node
    };

    static defaultProps = {
        fullWindow: false,
        onDrop: () => void(0),
        children: <div style={{userSelect: "none"}}>Drag and drop file here</div>
    };

    constructor(props) {
        super(props);
        this.state = {
            hover: false
        };
    }

    componentDidMount() {
        const elem = (!this.props.fullWindow) ? this.dropBox : window;
        elem.addEventListener("dragenter", this.onDragEnter);
        elem.addEventListener("dragleave", this.onDragleave);
        elem.addEventListener("drop", this.onDrop);
        elem.addEventListener("dragover", this.onDragOver);
    }

    componentWillUnmount() {
        const elem = (!this.props.fullWindow) ? this.dropBox : window;
        elem.removeEventListener("dragenter", this.onDragEnter);
        elem.removeEventListener("dragleave", this.onDragleave);
        elem.removeEventListener("drop", this.onDrop);
        elem.removeEventListener("dragover", this.onDragOver);
    }

    onDragOver = event => {
        event.stopPropagation();
        event.preventDefault();
        return false;
    };

    onDragEnter = event => {
        event.stopPropagation();
        event.preventDefault();
        this.setState({
            hover: true
        });
        return false;
    };

    onDragleave = event => {
        event.stopPropagation();
        event.preventDefault();
        this.setState({
            hover: false
        });
        return false;
    };

    onDrop = event => {
        event.stopPropagation();
        event.preventDefault();
        this.setState({
            hover: false
        });
        this.props.onDrop(event);
        return false;
    };

    render() {
        // Allow parent overwrite style
        let elemStyle = this.state.hover ?
            {...styleCommon, ...this.props.styleCommon, ...styleHover, ...this.props.styleHover} :
            {...styleCommon, ...this.props.styleCommon};
        return (
            <div className={this.props.className}
                 ref={elem => this.dropBox = elem}
                 style={elemStyle}>
                {this.props.children}
            </div>
        );
    }
}