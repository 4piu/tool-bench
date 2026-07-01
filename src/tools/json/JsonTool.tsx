import React from "react";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import {Alert, Button, FormControl, FormControlLabel, Grid, InputLabel, MenuItem, Select, Stack, Switch, TextField} from "@mui/material";
import type {SelectChangeEvent} from "@mui/material/Select";
import {copyText, downloadText} from "../shared/browser";
import {useLocalStorageState} from "../shared/hooks";
import {DownloadButton, ToolHeader, ToolSurface} from "../shared/ToolScaffold";

const sortKeysDeep = (value: unknown): unknown => {
    if (Array.isArray(value)) return value.map(sortKeysDeep);
    if (value && typeof value === "object") {
        return Object.fromEntries(
            Object.entries(value as Record<string, unknown>)
                .sort(([left], [right]) => left.localeCompare(right))
                .map(([key, item]) => [key, sortKeysDeep(item)])
        );
    }
    return value;
};

const getJsonPointer = (value: unknown, pointer: string) => {
    if (!pointer || pointer === "/") return value;
    return pointer
        .split("/")
        .slice(1)
        .reduce<unknown>((current, part) => {
            const key = part.replace(/~1/g, "/").replace(/~0/g, "~");
            if (Array.isArray(current)) return current[Number(key)];
            if (current && typeof current === "object") return (current as Record<string, unknown>)[key];
            return undefined;
        }, value);
};

const getJsonPath = (value: unknown, path: string) => {
    if (!path || path === "$") return value;
    if (!path.startsWith("$")) throw new Error("JSONPath must start with $");
    const tokens = Array.from(path.matchAll(/\.([A-Za-z_$][\w$-]*)|\[(\d+|"[^"]+"|'[^']+')\]/g)).map(match => {
        const token = match[1] ?? match[2];
        return token.replace(/^["']|["']$/g, "");
    });
    return tokens.reduce<unknown>((current, token) => {
        if (Array.isArray(current)) return current[Number(token)];
        if (current && typeof current === "object") return (current as Record<string, unknown>)[token];
        return undefined;
    }, value);
};

const formatParsed = (value: unknown, indent: string, sortKeys: boolean, compact = false) => {
    const parsed = sortKeys ? sortKeysDeep(value) : value;
    const spacing = indent === "tab" ? "\t" : Number(indent);
    return JSON.stringify(parsed, null, compact ? 0 : spacing);
};

const diffJson = (left: unknown, right: unknown, path = "$"): string[] => {
    if (Object.is(left, right)) return [];
    if (typeof left !== typeof right || left === null || right === null || typeof left !== "object" || typeof right !== "object") {
        return [`${path}: ${JSON.stringify(left)} -> ${JSON.stringify(right)}`];
    }
    const keys = new Set([...Object.keys(left as object), ...Object.keys(right as object)]);
    return Array.from(keys).flatMap(key => diffJson(
        (left as Record<string, unknown>)[key],
        (right as Record<string, unknown>)[key],
        `${path}.${key}`
    ));
};

const JsonTool = () => {
    const [input, setInput] = useLocalStorageState("json.input", "{\"hello\":\"world\"}");
    const [indent, setIndent] = useLocalStorageState("json.indent", "2");
    const [sortKeys, setSortKeys] = useLocalStorageState("json.sortKeys", false);
    const [query, setQuery] = useLocalStorageState("json.query", "/");
    const [diffInput, setDiffInput] = useLocalStorageState("json.diffInput", "{\"hello\":\"toolbench\"}");
    const [output, setOutput] = React.useState("");
    const [error, setError] = React.useState("");

    const transform = (mode: "format" | "minify") => {
        try {
            setOutput(formatParsed(JSON.parse(input), indent, sortKeys, mode === "minify"));
            setError("");
        } catch (err) {
            setError(err instanceof Error ? err.message : "Invalid JSON");
        }
    };

    const validate = () => {
        try {
            const parsed = JSON.parse(input);
            const objectCount = parsed && typeof parsed === "object" ? Object.keys(parsed as object).length : 0;
            setOutput(`Valid JSON\nRoot type: ${Array.isArray(parsed) ? "array" : typeof parsed}\nTop-level entries: ${objectCount}`);
            setError("");
        } catch (err) {
            setError(err instanceof Error ? err.message : "Invalid JSON");
        }
    };

    const runQuery = () => {
        try {
            const parsed = JSON.parse(input);
            const result = query.trim().startsWith("$") ? getJsonPath(parsed, query.trim()) : getJsonPointer(parsed, query.trim());
            setOutput(JSON.stringify(result, null, 2));
            setError("");
        } catch (err) {
            setError(err instanceof Error ? err.message : "JSON query failed");
        }
    };

    const runDiff = () => {
        try {
            const changes = diffJson(JSON.parse(input), JSON.parse(diffInput));
            setOutput(changes.length ? changes.join("\n") : "No differences");
            setError("");
        } catch (err) {
            setError(err instanceof Error ? err.message : "JSON diff failed");
        }
    };

    const copyFormatted = (compact = false) => {
        try {
            copyText(formatParsed(JSON.parse(input), indent, sortKeys, compact));
            setError("");
        } catch (err) {
            setError(err instanceof Error ? err.message : "Invalid JSON");
        }
    };

    return (
        <ToolSurface>
            <ToolHeader title="JSON Formatter" description="Format or minify JSON with local parsing."/>
            <Stack spacing={2}>
                <Stack direction={{xs: "column", sm: "row"}} spacing={1}>
                    <Button variant="contained" onClick={() => transform("format")}>Format</Button>
                    <Button variant="outlined" onClick={() => transform("minify")}>Minify</Button>
                    <Button variant="outlined" onClick={validate}>Validate</Button>
                    <Button variant="outlined" onClick={runQuery}>Query</Button>
                    <Button variant="outlined" onClick={runDiff}>Diff</Button>
                    <Button startIcon={<ContentCopyIcon/>} onClick={() => copyText(output)} disabled={!output}>Copy output</Button>
                    <Button startIcon={<ContentCopyIcon/>} onClick={() => copyFormatted(false)}>Copy pretty</Button>
                    <Button startIcon={<ContentCopyIcon/>} onClick={() => copyFormatted(true)}>Copy compact</Button>
                    <DownloadButton label="Download output" onDownload={() => downloadText("json-output.txt", output)} disabled={!output}/>
                </Stack>
                <Stack direction={{xs: "column", sm: "row"}} spacing={2}>
                    <FormControl sx={{minWidth: 140}}>
                        <InputLabel>Indent</InputLabel>
                        <Select value={indent} label="Indent" onChange={(event: SelectChangeEvent) => setIndent(event.target.value)}>
                            <MenuItem value="2">2 spaces</MenuItem>
                            <MenuItem value="3">3 spaces</MenuItem>
                            <MenuItem value="4">4 spaces</MenuItem>
                            <MenuItem value="tab">Tab</MenuItem>
                        </Select>
                    </FormControl>
                    <FormControlLabel
                        control={<Switch checked={sortKeys} onChange={event => setSortKeys(event.target.checked)}/>}
                        label="Sort object keys"
                    />
                </Stack>
                <TextField label="JSON Pointer / path query" value={query} onChange={event => setQuery(event.target.value)} helperText="Examples: /items/0/name or $.items[0].name"/>
                {error && <Alert severity="error">{error}</Alert>}
                <Grid container spacing={2}>
                    <Grid size={{xs: 12, md: 6}}>
                        <TextField label="Input" value={input} onChange={event => setInput(event.target.value)} multiline minRows={14} fullWidth/>
                    </Grid>
                    <Grid size={{xs: 12, md: 6}}>
                        <TextField label="Output" value={output} multiline minRows={14} fullWidth slotProps={{htmlInput: {readOnly: true}}}/>
                    </Grid>
                    <Grid size={{xs: 12}}>
                        <TextField label="Diff target JSON" value={diffInput} onChange={event => setDiffInput(event.target.value)} multiline minRows={6} fullWidth/>
                    </Grid>
                </Grid>
            </Stack>
        </ToolSurface>
    );
};

export default JsonTool;
