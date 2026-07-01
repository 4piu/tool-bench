import React from "react";
import SearchIcon from "@mui/icons-material/Search";
import {
    Alert,
    Button,
    FormControl,
    FormControlLabel,
    InputLabel,
    LinearProgress,
    MenuItem,
    Paper,
    Select,
    Stack,
    Switch,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    TextField
} from "@mui/material";
import type {SelectChangeEvent} from "@mui/material/Select";
import {queryDns} from "../../lib/dns";
import {useLocalStorageState} from "../shared/hooks";
import {ToolHeader, ToolSurface} from "../shared/ToolScaffold";

const dnsProviders = [
    "https://cloudflare-dns.com/dns-query",
    "https://dns.google/dns-query",
    "https://dns.quad9.net/dns-query",
    "https://dns.adguard.com/dns-query",
    "https://doh.opendns.com/dns-query"
];

const commonTypes = ["A", "AAAA", "CNAME", "MX", "NS", "TXT", "CAA"];
const advancedTypes = ["DNAME", "DNSKEY", "DS", "HINFO", "NSEC", "NSEC3", "PTR", "RP", "RRSIG", "SOA", "SRV"];
const dnsClasses = ["IN", "CS", "CH", "HS", "ANY"];

type DnsAnswer = {
    name?: string;
    type?: string;
    class?: string;
    ttl?: number;
    data?: unknown;
};

type DnsResponse = {
    answers?: DnsAnswer[];
};

type DnsRow = DnsAnswer & {
    query: string;
};

const parseNames = (value: string) => value
    .split(/[\s,]+/)
    .map(item => item.trim())
    .filter(Boolean);

const stringifyData = (data: unknown) => {
    if (typeof data === "string") return data;
    if (data === undefined || data === null) return "";
    return JSON.stringify(data);
};

const DnsTool = () => {
    const [name, setName] = useLocalStorageState("dns.name", "example.com");
    const [type, setType] = useLocalStorageState("dns.type", "A");
    const [dnsClass, setDnsClass] = useLocalStorageState("dns.class", "IN");
    const [serverUrl, setServerUrl] = useLocalStorageState("dns.serverUrl", dnsProviders[0]);
    const [method, setMethod] = useLocalStorageState<"GET" | "POST">("dns.method", "GET");
    const [showAdvanced, setShowAdvanced] = useLocalStorageState("dns.advanced", false);
    const [showRaw, setShowRaw] = useLocalStorageState("dns.raw", false);
    const [loading, setLoading] = React.useState(false);
    const [result, setResult] = React.useState("");
    const [rows, setRows] = React.useState<DnsRow[]>([]);
    const [error, setError] = React.useState("");
    const [latency, setLatency] = React.useState<number | null>(null);
    const typeOptions = showAdvanced ? commonTypes.concat(advancedTypes) : commonTypes;

    const lookup = async () => {
        setLoading(true);
        setError("");
        setRows([]);
        setResult("");
        try {
            const names = parseNames(name);
            if (!names.length) throw new Error("Enter at least one domain name");
            const started = performance.now();
            const responses = await Promise.all(names.map(async query => ({
                query,
                response: await queryDns(query, type, dnsClass, serverUrl, method) as DnsResponse
            })));
            setLatency(Math.round(performance.now() - started));
            setRows(responses.flatMap(({query, response}) => (response.answers ?? []).map(answer => ({...answer, query}))));
            setResult(JSON.stringify(responses.length === 1 ? responses[0].response : responses, null, 2));
        } catch (err) {
            setError(err instanceof Error ? err.message : "DNS lookup failed");
        } finally {
            setLoading(false);
        }
    };

    return (
        <ToolSurface>
            <ToolHeader title="DNS Lookup" description="Query DNS over HTTPS from your browser."/>
            <Stack spacing={2}>
                <Stack direction={{xs: "column", sm: "row"}} spacing={2}>
                    <TextField label="Domains" helperText="Use spaces, commas, or new lines for batch lookups." value={name} onChange={event => setName(event.target.value)} fullWidth multiline minRows={1}/>
                    <FormControl sx={{minWidth: 120}}>
                        <InputLabel>Type</InputLabel>
                        <Select value={type} label="Type" onChange={(event: SelectChangeEvent) => setType(event.target.value)}>
                            {typeOptions.map(value => <MenuItem key={value} value={value}>{value}</MenuItem>)}
                        </Select>
                    </FormControl>
                    <FormControl sx={{minWidth: 110}}>
                        <InputLabel>Class</InputLabel>
                        <Select value={dnsClass} label="Class" onChange={(event: SelectChangeEvent) => setDnsClass(event.target.value)}>
                            {dnsClasses.map(value => <MenuItem key={value} value={value}>{value}</MenuItem>)}
                        </Select>
                    </FormControl>
                    <Button variant="contained" startIcon={<SearchIcon/>} onClick={lookup}>Lookup</Button>
                </Stack>
                <Stack direction={{xs: "column", sm: "row"}} spacing={2}>
                    <FormControl fullWidth>
                        <InputLabel>DoH provider</InputLabel>
                        <Select value={serverUrl} label="DoH provider" onChange={(event: SelectChangeEvent) => setServerUrl(event.target.value)}>
                            {dnsProviders.map(value => <MenuItem key={value} value={value}>{value}</MenuItem>)}
                        </Select>
                    </FormControl>
                    <FormControl sx={{minWidth: 120}}>
                        <InputLabel>Method</InputLabel>
                        <Select value={method} label="Method" onChange={(event: SelectChangeEvent) => setMethod(event.target.value as "GET" | "POST")}>
                            <MenuItem value="GET">GET</MenuItem>
                            <MenuItem value="POST">POST</MenuItem>
                        </Select>
                    </FormControl>
                </Stack>
                <TextField label="Custom DoH URL" value={serverUrl} onChange={event => setServerUrl(event.target.value)}/>
                <Stack direction={{xs: "column", sm: "row"}} spacing={1}>
                    <FormControlLabel control={<Switch checked={showAdvanced} onChange={event => setShowAdvanced(event.target.checked)}/>} label="Show advanced record types"/>
                    <FormControlLabel control={<Switch checked={showRaw} onChange={event => setShowRaw(event.target.checked)}/>} label="Show raw DNS message"/>
                </Stack>
                {loading && <LinearProgress/>}
                {error && <Alert severity="error">{error}</Alert>}
                {latency !== null && !loading && <Alert severity="info">Resolver latency: {latency} ms</Alert>}
                {!showRaw && rows.length > 0 && (
                    <TableContainer component={Paper} variant="outlined">
                        <Table size="small">
                            <TableHead>
                                <TableRow>
                                    <TableCell>Query</TableCell>
                                    <TableCell>Name</TableCell>
                                    <TableCell>Type</TableCell>
                                    <TableCell>Class</TableCell>
                                    <TableCell>TTL</TableCell>
                                    <TableCell>Data</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {rows.map((row, index) => (
                                    <TableRow key={`${row.query}-${row.name}-${row.type}-${index}`}>
                                        <TableCell>{row.query}</TableCell>
                                        <TableCell>{row.name}</TableCell>
                                        <TableCell>{row.type}</TableCell>
                                        <TableCell>{row.class}</TableCell>
                                        <TableCell>{row.ttl}</TableCell>
                                        <TableCell sx={{wordBreak: "break-word"}}>{stringifyData(row.data)}</TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </TableContainer>
                )}
                {!showRaw && !loading && !error && result && rows.length === 0 && <Alert severity="warning">No answers returned.</Alert>}
                {showRaw && <TextField value={result} multiline minRows={12} fullWidth slotProps={{htmlInput: {readOnly: true}}}/>}
            </Stack>
        </ToolSurface>
    );
};

export default DnsTool;
