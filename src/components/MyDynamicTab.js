import React from "react";
import PropTypes from "prop-types";
import {v4 as uuidV4} from "uuid";
import {withStyles} from "@material-ui/core/styles";
import Tabs from "@material-ui/core/Tabs";
import IconButton from "@material-ui/core/IconButton";
import AddIcon from "@material-ui/icons/Add";
import CloseIcon from "@material-ui/icons/Close";
import AppBar from "@material-ui/core/AppBar";
import Tab from "@material-ui/core/Tab";

const styles = theme => ({
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

class MyDynamicTab extends React.Component {
    static DataTab = class {
        constructor(active = false) {
            this.id = uuidV4();
            this.name = "New tab";
            this.active = active;
            this.data = null;
        }
    };

    static propTypes = {
        tabClass: PropTypes.func,
        tabs: PropTypes.array,
        onTabChange: PropTypes.func
    };

    static defaultProps = {
        tabClass: MyDynamicTab.DataTab
    };

    constructor(props) {
        super(props);
    }

    changeTab = (event, newValue) => {
        this.props.tabs.find(x => x.active).active = false;
        this.props.tabs.find(({id}) => id === newValue).active = true;
        this.props.onTabChange([...this.props.tabs]);
    };

    newTab = event => {
        event.stopPropagation();    // Don't fire changeTab
        this.props.tabs.find(x => x.active).active = false;
        this.props.tabs.push(new this.props.tabClass(true));
        this.props.onTabChange([...this.props.tabs]);
    };

    closeThisTab = event => {
        event.stopPropagation();    // Don't fire changeTab
        const indexToRemove = event.currentTarget.getAttribute("data-index");
        let newTabIndex = this.props.tabs.find(x => x.active).id;  // Default no tab switch
        if (newTabIndex === indexToRemove) {
            const indexOfElement = this.props.tabs.findIndex(({id}) => id === indexToRemove);
            if (indexOfElement < this.props.tabs.length - 1) {  // Switch to right tab
                this.props.tabs[indexOfElement + 1].active = true;
            } else if (indexOfElement > 0) {    // Switch to left tab
                this.props.tabs[indexOfElement - 1].active = true;
            } else {    // New tab
                this.props.tabs.push(new this.props.tabClass(true));
            }
        }
        const newTabs = this.props.tabs.filter(({id}) => id !== indexToRemove);
        this.props.onTabChange([...newTabs]);
    };

    render() {
        const {classes} = this.props;
        const activeTab = this.props.tabs.find(x => x.active);
        return (
            <AppBar className={classes.TabsBar} position={"static"} color="default">
                <Tabs
                    value={activeTab.id}
                    onChange={this.changeTab}
                    indicatorColor="primary"
                    textColor="primary"
                    variant="scrollable"
                    scrollButtons="auto"
                >
                    {this.props.tabs.map((tab) => (
                        <Tab key={tab.id} value={tab.id} className={classes.Tab} component={"div"}
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
                    <Tab className={classes.NewTabButton} component={"div"}
                         label={
                             <IconButton size={"small"} onClick={this.newTab}>
                                 <AddIcon/>
                             </IconButton>
                         }/>
                </Tabs>
            </AppBar>
        );
    }
}

export default withStyles(styles)(MyDynamicTab);