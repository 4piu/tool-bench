import React from "react";
import CssBaseline from '@material-ui/core/CssBaseline';
import {Helmet} from "react-helmet";
import logo from "./assets/img/logo.png";
import UuidIcon from "./assets/img/icon_uuid.svg";
import LockIcon from "./assets/img/icon_lock.svg";
import Base64Icon from "./assets/img/icon_base64.svg";
import QrIcon from "./assets/img/icon_qr.svg";
import JsonIcon from "./assets/img/icon_json.svg";
import ClockIcon from "./assets/img/icon_timestamp.svg";
import CheckIcon from "./assets/img/icon_check.svg";
import GlobeIcon from "./assets/img/icon_globe.svg";
import Layout from "./components/Layout";
import ApplicationContext from "./components/ApplicationContext";

const tools = [
    {
        name: "uuid",
        loader: () => import("./components/tools/Uuid/UuidGenerator.js"),
        title: "UUID Generator",
        description: "Batch generate UUID",
        icon: UuidIcon
    },
    {
        name: "password",
        loader: () => import("./components/tools/Password/PasswordGenerator.js"),
        title: "Password Generator",
        description: "Generate strong password",
        icon: LockIcon
    },
    {
        name: "base64",
        loader: () => import("./components/tools/Base64/Base64Codec.js"),
        title: "Base64 Encoder / Decoder",
        description: "Encode & decode base64 string",
        icon: Base64Icon
    },
    {
        name: "json",
        loader: () => import("./components/tools/Json/JsonFormatter.js"),
        title: "JSON Beautify / Uglify",
        description: "Beautify & uglify JSON",
        icon: JsonIcon
    },
    {
        name: "timestamp",
        loader: () => import("./components/tools/Timestamp/UnixTimestamp.js"),
        title: "Unix Timestamp",
        description: "Unix timestamp utilities",
        icon: ClockIcon
    },
    {
        name: "hash",
        loader: () => import("./components/tools/FileHash/FileHash.js"),
        title: "File Checksum",
        description: "Calculate the hash of file",
        icon: CheckIcon
    },
    {
        name: "qr",
        loader: () => import("./components/tools/QrCode/QrCodeGenerator.js"),
        title: "QR Code Creator",
        description: "Generate QR code",
        icon: QrIcon
    },
    {
        name: "dns",
        loader: () => import("./components/tools/DnsLookup/DnsLookup.js"),
        title: "DNS Lookup",
        description: "DNS lookup using DNS Over HTTPS",
        icon: GlobeIcon
    },
    {
        name: "test-fail",
        loader: () => {
            const fakeModule = 'YouShallNotPass';
            return import(fakeModule);
        },
        title: "I will fail",
        description: "Test purpose component",
        icon: undefined
    },
    {
        name: "test-timeout",
        loader: () => {
            return new Promise((resolve) => {
            });
        },
        title: "I will timeout",
        description: "Test purpose component",
        icon: undefined
    }
];

class App extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            activity: 'home'
        }
    }

    changeActivity = (newActivity) => {
        setTimeout(
            () => this.setState({activity: newActivity}),
            newActivity === 'home' ? 0 : 200
        )
    };

    render() {
        let title = "ToolHub";
        if (this.state.activity !== "home") {
            title += ` - ${tools.filter(x => (x.name === this.state.activity))[0].title}`;
        }
        return (
            <>
                <Helmet>
                    <title>{title}</title>
                    <link rel="icon" type="image/png" href={logo}/>
                    <meta
                        name="viewport"
                        content="minimum-scale=1, initial-scale=1, width=device-width"
                    />
                    <link rel="stylesheet"
                          href="https://fonts.googleapis.com/css?family=Roboto:300,400,500,700&display=swap"/>
                </Helmet>

                <CssBaseline/>

                <ApplicationContext.Provider value={{
                    changeActivity: this.changeActivity,
                    activityList: tools,
                    activity: this.state.activity
                }}>
                    <Layout/>
                </ApplicationContext.Provider>
            </>
        );
    }
}

export default App;