import React from "react";
import objectGroup from "../../../utils/ObjectGroup";
import Typography from "@material-ui/core/Typography";
import TableContainer from "@material-ui/core/TableContainer";
import Paper from "@material-ui/core/Paper";
import TableHead from "@material-ui/core/TableHead";
import TableRow from "@material-ui/core/TableRow";
import TableCell from "@material-ui/core/TableCell";
import TableBody from "@material-ui/core/TableBody";
import Table from "@material-ui/core/Table";

const UA = [
    // Chrome
    {
        browser: "Chrome",
        platform: "Windows",
        content: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/81.0.4044.129 Safari/537.36"
    },
    {
        browser: "Chrome",
        platform: "MacOS",
        content: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_4) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/81.0.4044.129 Safari/537.36"
    },
    {
        browser: "Chrome",
        platform: "Linux",
        content: "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/81.0.4044.129 Safari/537.36"
    },
    {
        browser: "Chrome",
        platform: "iOS",
        content: "Mozilla/5.0 (iPhone; CPU iPhone OS 13_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/81.0.4044.124 Mobile/15E148 Safari/604.1"
    },
    {
        browser: "Chrome",
        platform: "Android",
        content: "Mozilla/5.0 (Linux; Android 10) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/81.0.4044.117 Mobile Safari/537.36"
    },
    // Firefox
    {
        browser: "Firefox",
        platform: "Windows",
        content: "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:75.0) Gecko/20100101 Firefox/75.0"
    },
    {
        browser: "Firefox",
        platform: "MacOS",
        content: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:75.0) Gecko/20100101 Firefox/75.0"
    },
    {
        browser: "Firefox",
        platform: "MacOS",
        content: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:75.0) Gecko/20100101 Firefox/75.0"
    },
    {
        browser: "Firefox",
        platform: "Linux",
        content: "Mozilla/5.0 (X11; Ubuntu; Linux x86_64; rv:75.0) Gecko/20100101 Firefox/75.0"
    },
    {
        browser: "Firefox",
        platform: "iOS",
        content: "Mozilla/5.0 (iPhone; CPU iPhone OS 10_15_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) FxiOS/25.0 Mobile/15E148 Safari/605.1.15"
    },
    {
        browser: "Firefox",
        platform: "Android",
        content: "Mozilla/5.0 (Android 10; Mobile; rv:68.0) Gecko/68.0 Firefox/68.0"
    },
    // Safari
    {
        browser: "Safari",
        platform: "MacOS",
        content: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_4) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/81.0.4044.129 Safari/537.36"
    },
    {
        browser: "Safari",
        platform: "iOS",
        content: "Mozilla/5.0 (iPhone; CPU iPhone OS 13_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/81.0.4044.124 Mobile/15E148 Safari/604.1"
    },
    // Edge
    {
        browser: "Edge",
        platform: "Windows",
        content: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/81.0.4044.129 Safari/537.36 Edg/81.0.416.68"
    },
    {
        browser: "Edge",
        platform: "MacOS",
        content: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_4) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/81.0.4044.129 Safari/537.36 Edg/81.0.416.68"
    },
    {
        browser: "Edge",
        platform: "Android",
        content: "Mozilla/5.0 (Linux; Android 10; HD1913) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/81.0.4044.117 Mobile Safari/537.36 EdgA/45.2.2.4930"
    },
    {
        browser: "Edge",
        platform: "iOS",
        content: "Mozilla/5.0 (iPhone; CPU iPhone OS 13_4_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/13.0 EdgiOS/45.3.19 Mobile/15E148 Safari/605.1.15"
    },
    {
        browser: "Edge",
        platform: "Xbox One",
        content: "Mozilla/5.0 (Windows NT 10.0; Win64; x64; Xbox; Xbox One) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/81.0.4044.129 Safari/537.36 Edge/44.18363.8131"
    },
    // Internet Explorer
    {
        browser: "Internet Explorer",
        platform: "Windows",
        content: "Mozilla/5.0 (Windows NT 10.0; Trident/7.0; rv:11.0) like Gecko"
    }
];

const UA_GROUPED = objectGroup(UA, "browser");

export default class UaList extends React.PureComponent {
    render() {
        const table = [];
        UA_GROUPED.forEach((val, key) => {
            table.push(
                <>
                    <Typography variant={"h6"}>{key}</Typography>
                    <TableContainer component={Paper}>
                        <Table>
                            <TableHead>
                                <TableRow>
                                    <TableCell>{"Platform"}</TableCell>
                                    <TableCell align={"right"}>{"User agent"}</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {val.map((item, index) => (
                                    <TableRow key={index}>
                                        <TableCell>{item.platform}</TableCell>
                                        <TableCell align={"right"}>{item.content}</TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </TableContainer>
                </>
            );
        })
        return table.map((item, index) => <div key={index}>{item}</div>);
    }
}