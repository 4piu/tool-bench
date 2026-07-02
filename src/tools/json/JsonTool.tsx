import React from "react";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import {search as jmesSearch} from "jmespath";
import {JSONPath} from "jsonpath-plus";
import {Alert, Button, FormControl, FormControlLabel, Grid, InputLabel, MenuItem, Select, Stack, Switch, TextField} from "@mui/material";
import type {SelectChangeEvent} from "@mui/material/Select";
import {copyText, downloadText} from "../shared/browser";
import {DocumentTabsBar, useDocumentTabs} from "../shared/DocumentTabs";
import {DownloadButton, ToolHeader, ToolSurface} from "../shared/ToolScaffold";

type QueryMode = "pointer" | "jsonpath" | "jmespath";

const queryPlaceholders: Record<QueryMode, string> = {
    pointer: "/items/0/name",
    jsonpath: "$.items[*].name or $..name",
    jmespath: "items[?price > `10`].name"
};

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

const runQueryMode = (mode: QueryMode, parsed: unknown, query: string) => {
    const trimmed = query.trim();
    if (mode === "pointer") return getJsonPointer(parsed, trimmed);
    if (mode === "jsonpath") return JSONPath({path: trimmed || "$", json: parsed as object});
    return jmesSearch(parsed, trimmed || "@");
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

type JsonDocument = {
    input: string;
    output: string;
    indent: string;
    sortKeys: boolean;
    query: string;
    queryMode: QueryMode;
    diffInput: string;
    error: string;
};

const createDocument = (): JsonDocument => ({
    input: "{\"hello\":\"world\"}",
    output: "",
    indent: "2",
    sortKeys: false,
    query: "/",
    queryMode: "pointer",
    diffInput: "{\"hello\":\"toolbench\"}",
    error: ""
});

const JsonTool = () => {
    const {documents, activeId, activeDocument, setActiveId, addDocument, closeDocument, closeAll, updateDocument} =
        useDocumentTabs<JsonDocument>("json", createDocument);
    const {input, output, indent, sortKeys, query, queryMode, diffInput, error} = activeDocument;

    const transform = (mode: "format" | "minify") => {
        try {
            updateDocument(activeId, {output: formatParsed(JSON.parse(input), indent, sortKeys, mode === "minify"), error: ""});
        } catch (err) {
            updateDocument(activeId, {error: err instanceof Error ? err.message : "Invalid JSON"});
        }
    };

    const validate = () => {
        try {
            const parsed = JSON.parse(input);
            const objectCount = parsed && typeof parsed === "object" ? Object.keys(parsed as object).length : 0;
            updateDocument(activeId, {
                output: `Valid JSON\nRoot type: ${Array.isArray(parsed) ? "array" : typeof parsed}\nTop-level entries: ${objectCount}`,
                error: ""
            });
        } catch (err) {
            updateDocument(activeId, {error: err instanceof Error ? err.message : "Invalid JSON"});
        }
    };

    const runQuery = () => {
        try {
            const result = runQueryMode(queryMode, JSON.parse(input), query);
            updateDocument(activeId, {output: JSON.stringify(result, null, 2), error: ""});
        } catch (err) {
            updateDocument(activeId, {error: err instanceof Error ? err.message : "JSON query failed"});
        }
    };

    const runDiff = () => {
        try {
            const changes = diffJson(JSON.parse(input), JSON.parse(diffInput));
            updateDocument(activeId, {output: changes.length ? changes.join("\n") : "No differences", error: ""});
        } catch (err) {
            updateDocument(activeId, {error: err instanceof Error ? err.message : "JSON diff failed"});
        }
    };

    const copyFormatted = (compact = false) => {
        try {
            copyText(formatParsed(JSON.parse(input), indent, sortKeys, compact));
            updateDocument(activeId, {error: ""});
        } catch (err) {
            updateDocument(activeId, {error: err instanceof Error ? err.message : "Invalid JSON"});
        }
    };

    return (
        <ToolSurface>
            <ToolHeader title="JSON Formatter" description="Format, query, and diff JSON with local parsing across multiple tabs."/>
            <Stack spacing={2}>
                <DocumentTabsBar
                    documents={documents}
                    activeId={activeId}
                    onSelect={setActiveId}
                    onAdd={addDocument}
                    onClose={closeDocument}
                    onCloseAll={closeAll}
                />
                <Stack direction={{xs: "column", sm: "row"}} spacing={1} sx={{flexWrap: "wrap"}} useFlexGap>
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
                        <Select value={indent} label="Indent" onChange={(event: SelectChangeEvent) => updateDocument(activeId, {indent: event.target.value})}>
                            <MenuItem value="2">2 spaces</MenuItem>
                            <MenuItem value="3">3 spaces</MenuItem>
                            <MenuItem value="4">4 spaces</MenuItem>
                            <MenuItem value="tab">Tab</MenuItem>
                        </Select>
                    </FormControl>
                    <FormControlLabel
                        control={<Switch checked={sortKeys} onChange={event => updateDocument(activeId, {sortKeys: event.target.checked})}/>}
                        label="Sort object keys"
                    />
                </Stack>
                <Stack direction={{xs: "column", sm: "row"}} spacing={2}>
                    <FormControl sx={{minWidth: 160}}>
                        <InputLabel>Query mode</InputLabel>
                        <Select value={queryMode} label="Query mode" onChange={(event: SelectChangeEvent) => updateDocument(activeId, {queryMode: event.target.value as QueryMode})}>
                            <MenuItem value="pointer">JSON Pointer</MenuItem>
                            <MenuItem value="jsonpath">JSONPath</MenuItem>
                            <MenuItem value="jmespath">JMESPath</MenuItem>
                        </Select>
                    </FormControl>
                    <TextField
                        label="Query"
                        value={query}
                        onChange={event => updateDocument(activeId, {query: event.target.value})}
                        helperText={`Example: ${queryPlaceholders[queryMode]}`}
                        fullWidth
                    />
                </Stack>
                {error && <Alert severity="error">{error}</Alert>}
                <Grid container spacing={2}>
                    <Grid size={{xs: 12, md: 6}}>
                        <TextField label="Input" value={input} onChange={event => updateDocument(activeId, {input: event.target.value})} multiline minRows={14} fullWidth/>
                    </Grid>
                    <Grid size={{xs: 12, md: 6}}>
                        <TextField label="Output" value={output} multiline minRows={14} fullWidth slotProps={{htmlInput: {readOnly: true}}}/>
                    </Grid>
                    <Grid size={{xs: 12}}>
                        <TextField label="Diff target JSON" value={diffInput} onChange={event => updateDocument(activeId, {diffInput: event.target.value})} multiline minRows={6} fullWidth/>
                    </Grid>
                </Grid>
            </Stack>
        </ToolSurface>
    );
};

export default JsonTool;
