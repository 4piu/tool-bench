import React from "react";
import {withStyles} from "@material-ui/core/styles";
import PropTypes from "prop-types";
import MyAppBar from "../MyAppBar";
import Container from "@material-ui/core/Container";
import AppBar from "@material-ui/core/AppBar";
import Tabs from "@material-ui/core/Tabs";
import Tab from "@material-ui/core/Tab";
import AddIcon from '@material-ui/icons/Add';
import IconButton from "@material-ui/core/IconButton";
import CloseIcon from '@material-ui/icons/Close';
import {v4 as uuidV4} from "uuid";
import {shallowCompare} from "../../utils/ObjectCompare";
import Typography from "@material-ui/core/Typography";

class DefaultTab {
    constructor() {
        this.id = uuidV4();
        this.encoded = "";
        this.decoded = "";
        this.name = "New tab";
    }
}

const styles = theme => ({
    Container: {
        padding: theme.spacing(3),
        '& > *': {
            marginBottom: theme.spacing(3),
        }
    },
    TabsBar: {
        width: "100%",
        backgroundColor: theme.palette.background.paper
    },
    Tab: {
        borderRight: "1px solid #ddd"
    },
    TabLabel: {
        textOverflow: "ellipsis",
        overflow: "hidden",
        whiteSpace: "nowrap"
    },
    NewTabButton: {
        minWidth: 0
    },
    CustomTabLabel: {
        width: "100%",
        display: "flex"
    },
    CloseTabButton: {
        marginLeft: "auto",
        padding: 0
    }
});

class Base64Codec extends React.PureComponent {
    static propTypes = {
        title: PropTypes.string.isRequired,
        changeActivity: PropTypes.func.isRequired
    };

    constructor(props) {
        super(props);
        this.state = {
            tabIndex: "",
            tabs: []
        }
    }

    componentDidMount() {
        this.loadState()
    }

    componentDidUpdate(prevProps, prevState, snapshot) {
        if (!shallowCompare(prevState, this.state, ['tabIndex'])) this.saveState();
    };

    loadState = () => {
        let savedInstance;
        try {
            savedInstance = JSON.parse(localStorage.getItem('base64-codec'));
        } catch (e) {
            console.error('Failed to load saved instance');
        }
        if (savedInstance) {
            this.setState(savedInstance);
        } else {
            this.newTab();
        }
    };

    saveState = () => {
        localStorage.setItem('base64-codec', JSON.stringify(this.state));
    };

    changeTab = (event, newValue) => {
        this.setState({tabIndex: newValue})
    };

    newTab = () => {
        const newTab = new DefaultTab();
        this.setState(prevState => ({
            tabs: [...prevState.tabs, newTab],
            tabIndex: newTab.id
        }));
    };

    closeThisTab = event => {
        event.stopPropagation();    // Don't bother changeTab
        const indexToRemove = event.currentTarget.getAttribute('data-index');
        let newTabIndex = this.state.tabIndex;  // Default no tab switch
        if (this.state.tabIndex === indexToRemove) {
            const indexOfElement = this.state.tabs.findIndex(({id}) => id === indexToRemove);
            if (indexOfElement < this.state.tabs.length - 1) {  // Switch to right tab
                newTabIndex = this.state.tabs[indexOfElement + 1].id;
            } else if (indexOfElement > 0) {    // Switch to left tab
                newTabIndex = this.state.tabs[indexOfElement - 1].id;
            } else {    // No index
                newTabIndex = 0
            }
        }
        this.setState(prevState => {
            return {
                tabs: prevState.tabs.filter(({id}) => (id !== indexToRemove)),
                tabIndex: newTabIndex
            }
        });
    };

    closeAllTab = event => {
        this.setState({
            tabs: [new DefaultTab()]
        })
    };

    render() {
        const {classes} = this.props;
        return (
            <>
                {/** App bar */}
                <MyAppBar
                    title={this.props.title}
                    showBackButton={true}
                    changeActivity={this.props.changeActivity}/>
                {/** Tabs */}
                <AppBar className={classes.TabsBar} position="static" color="default">
                    <Tabs
                        value={this.state.tabIndex || 0}
                        onChange={this.changeTab}
                        indicatorColor="primary"
                        textColor="primary"
                        variant="scrollable"
                        scrollButtons="auto"
                        aria-label="opened working tabs"
                    >
                        {this.state.tabs.map((tab) => (
                            <Tab key={tab.id} value={tab.id}
                                 className={classes.Tab}
                                 component={"div"}
                                 label={
                                     <div className={classes.CustomTabLabel}>
                                         <div className={classes.TabLabel}>
                                             {tab.name}
                                         </div>
                                         <IconButton className={classes.CloseTabButton} size={"small"}
                                                     onClick={this.closeThisTab} data-index={tab.id}>
                                             <CloseIcon/>
                                         </IconButton>
                                     </div>
                                 }
                            />
                        ))}
                        <Tab className={classes.NewTabButton}
                             component={"div"}
                             label={
                                 <IconButton size={"small"}>
                                     <AddIcon/>
                                 </IconButton>
                             } onClick={this.newTab}/>
                    </Tabs>
                </AppBar>
                {/** Main view */}
                <Container className={classes.Container} maxWidth={"md"}>
                    {this.state.tabs.map(tab => (
                        <Typography
                            key={tab.id}
                            component="div"
                            role="tabpanel"
                            hidden={this.state.tabIndex !== tab.id}
                        >
                            {tab.name + ': ' + tab.id}
                        </Typography>
                    ))}
                </Container>
            </>
        );
    }
}

export default withStyles(styles)(Base64Codec);