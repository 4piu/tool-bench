import React from "react";
import CssBaseline from '@material-ui/core/CssBaseline';
import MyAppBar from "./components/MyAppBar";
import {Helmet} from "react-helmet";
import logo from "./assets/img/logo.png";
import Layout from "./components/Layout";

const style = {
    display: 'flex',
    flexDirection: 'column',
    minHeight: '100vh',
    overflow: 'hidden'
};

export default class App extends React.Component {
    render() {
        return (
            <div style={style}>
                <Helmet>
                    <title>Tool Bench</title>
                    <link rel="icon" type="image/png" href={logo}/>
                    <meta
                        name="viewport"
                        content="minimum-scale=1, initial-scale=1, width=device-width"
                    />
                    <link rel="stylesheet" href="https://fonts.googleapis.com/css?family=Roboto:300,400,500,700&display=swap" />
                </Helmet>
                <CssBaseline/>
                <MyAppBar/>
                <Layout/>
            </div>
        );
    }
}
