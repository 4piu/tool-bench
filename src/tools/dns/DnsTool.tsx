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
import {useTranslation} from "react-i18next";
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
    const {t} = useTranslation();
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
            if (!names.length) throw new Error(t("dns.enterDomain"));
            const started = performance.now();
            const responses = await Promise.all(names.map(async query => ({
                query,
                response: await queryDns(query, type, dnsClass, serverUrl, method) as DnsResponse
            })));
            setLatency(Math.round(performance.now() - started));
            setRows(responses.flatMap(({query, response}) => (response.answers ?? []).map(answer => ({...answer, query}))));
            setResult(JSON.stringify(responses.length === 1 ? responses[0].response : responses, null, 2));
        } catch (err) {
            setError(err instanceof Error ? err.message : t("dns.lookupFailed"));
        } finally {
            setLoading(false);
        }
    };

    return (
        <ToolSurface>
            <ToolHeader title={t("dns.title")} description={t("dns.description")}/>
            <Stack spacing={2}>
                <Stack direction={{xs: "column", sm: "row"}} spacing={2}>
                    <TextField label={t("dns.domains")} helperText={t("dns.domainsHelp")} value={name} onChange={event => setName(event.target.value)} fullWidth multiline minRows={1}/>
                    <FormControl sx={{minWidth: 120}}>
                        <InputLabel>{t("dns.type")}</InputLabel>
                        <Select value={type} label={t("dns.type")} onChange={(event: SelectChangeEvent) => setType(event.target.value)}>
                            {typeOptions.map(value => <MenuItem key={value} value={value}>{value}</MenuItem>)}
                        </Select>
                    </FormControl>
                    <FormControl sx={{minWidth: 110}}>
                        <InputLabel>{t("dns.class")}</InputLabel>
                        <Select value={dnsClass} label={t("dns.class")} onChange={(event: SelectChangeEvent) => setDnsClass(event.target.value)}>
                            {dnsClasses.map(value => <MenuItem key={value} value={value}>{value}</MenuItem>)}
                        </Select>
                    </FormControl>
                    <Button variant="contained" startIcon={<SearchIcon/>} onClick={lookup}>{t("dns.lookup")}</Button>
                </Stack>
                <Stack direction={{xs: "column", sm: "row"}} spacing={2}>
                    <FormControl fullWidth>
                        <InputLabel>{t("dns.dohProvider")}</InputLabel>
                        <Select value={serverUrl} label={t("dns.dohProvider")} onChange={(event: SelectChangeEvent) => setServerUrl(event.target.value)}>
                            {dnsProviders.map(value => <MenuItem key={value} value={value}>{value}</MenuItem>)}
                        </Select>
                    </FormControl>
                    <FormControl sx={{minWidth: 120}}>
                        <InputLabel>{t("dns.method")}</InputLabel>
                        <Select value={method} label={t("dns.method")} onChange={(event: SelectChangeEvent) => setMethod(event.target.value as "GET" | "POST")}>
                            <MenuItem value="GET">GET</MenuItem>
                            <MenuItem value="POST">POST</MenuItem>
                        </Select>
                    </FormControl>
                </Stack>
                <TextField label={t("dns.customDohUrl")} value={serverUrl} onChange={event => setServerUrl(event.target.value)}/>
                <Stack direction={{xs: "column", sm: "row"}} spacing={1}>
                    <FormControlLabel control={<Switch checked={showAdvanced} onChange={event => setShowAdvanced(event.target.checked)}/>} label={t("dns.showAdvanced")}/>
                    <FormControlLabel control={<Switch checked={showRaw} onChange={event => setShowRaw(event.target.checked)}/>} label={t("dns.showRaw")}/>
                </Stack>
                {loading && <LinearProgress/>}
                {error && <Alert severity="error">{error}</Alert>}
                {latency !== null && !loading && <Alert severity="info">{t("dns.latency", {latency})}</Alert>}
                {!showRaw && rows.length > 0 && (
                    <TableContainer component={Paper} variant="outlined">
                        <Table size="small">
                            <TableHead>
                                <TableRow>
                                    <TableCell>{t("dns.column.query")}</TableCell>
                                    <TableCell>{t("dns.column.name")}</TableCell>
                                    <TableCell>{t("dns.column.type")}</TableCell>
                                    <TableCell>{t("dns.column.class")}</TableCell>
                                    <TableCell>{t("dns.column.ttl")}</TableCell>
                                    <TableCell>{t("dns.column.data")}</TableCell>
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
                {!showRaw && !loading && !error && result && rows.length === 0 && <Alert severity="warning">{t("dns.noAnswers")}</Alert>}
                {showRaw && <TextField value={result} multiline minRows={12} fullWidth slotProps={{htmlInput: {readOnly: true}}}/>}
            </Stack>
        </ToolSurface>
    );
};

export default DnsTool;
