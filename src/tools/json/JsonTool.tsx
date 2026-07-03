import React from "react";
import {search as jmesSearch} from "jmespath";
import {JSONPath} from "jsonpath-plus";
import {Alert, Button, FormControl, FormControlLabel, Grid, InputLabel, MenuItem, Select, Stack, Switch, TextField} from "@mui/material";
import type {SelectChangeEvent} from "@mui/material/Select";
import {useTranslation} from "react-i18next";
import {copyText, downloadText} from "../shared/browser";
import {DocumentTabsBar, useDocumentTabs} from "../shared/DocumentTabs";
import {CopyIconButton, DownloadIconButton, FieldLabelRow, ToolHeader, ToolSurface} from "../shared/ToolScaffold";

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
    const {t} = useTranslation();
    const {documents, activeId, activeDocument, setActiveId, addDocument, closeDocument, closeAll, renameDocument, updateDocument} =
        useDocumentTabs<JsonDocument>("json", createDocument);
    const {input, output, indent, sortKeys, query, queryMode, diffInput, error} = activeDocument;

    const transform = (mode: "format" | "minify") => {
        try {
            updateDocument(activeId, {output: formatParsed(JSON.parse(input), indent, sortKeys, mode === "minify"), error: ""});
        } catch (err) {
            updateDocument(activeId, {error: err instanceof Error ? err.message : t("json.invalidJson")});
        }
    };

    const validate = () => {
        try {
            const parsed = JSON.parse(input);
            const objectCount = parsed && typeof parsed === "object" ? Object.keys(parsed as object).length : 0;
            updateDocument(activeId, {
                output: t("json.validSummary", {rootType: Array.isArray(parsed) ? "array" : typeof parsed, count: objectCount}),
                error: ""
            });
        } catch (err) {
            updateDocument(activeId, {error: err instanceof Error ? err.message : t("json.invalidJson")});
        }
    };

    const runQuery = () => {
        try {
            const result = runQueryMode(queryMode, JSON.parse(input), query);
            updateDocument(activeId, {output: JSON.stringify(result, null, 2), error: ""});
        } catch (err) {
            updateDocument(activeId, {error: err instanceof Error ? err.message : t("json.queryFailed")});
        }
    };

    const runDiff = () => {
        try {
            const changes = diffJson(JSON.parse(input), JSON.parse(diffInput));
            updateDocument(activeId, {output: changes.length ? changes.join("\n") : t("json.noDifferences"), error: ""});
        } catch (err) {
            updateDocument(activeId, {error: err instanceof Error ? err.message : t("json.diffFailed")});
        }
    };

    return (
        <ToolSurface>
            <ToolHeader title={t("json.title")} description={t("json.description")}/>
            <Stack spacing={2}>
                <DocumentTabsBar
                    documents={documents}
                    activeId={activeId}
                    onSelect={setActiveId}
                    onAdd={addDocument}
                    onClose={closeDocument}
                    onCloseAll={closeAll}
                    onRename={renameDocument}
                />
                <Stack direction={{xs: "column", sm: "row"}} spacing={1} sx={{flexWrap: "wrap"}} useFlexGap>
                    <Button variant="contained" onClick={() => transform("format")}>{t("json.format")}</Button>
                    <Button variant="outlined" onClick={() => transform("minify")}>{t("json.minify")}</Button>
                    <Button variant="outlined" onClick={validate}>{t("json.validate")}</Button>
                    <Button variant="outlined" onClick={runQuery}>{t("json.query")}</Button>
                    <Button variant="outlined" onClick={runDiff}>{t("json.diff")}</Button>
                </Stack>
                <Stack direction={{xs: "column", sm: "row"}} spacing={2}>
                    <FormControl sx={{minWidth: 140}}>
                        <InputLabel>{t("json.indent")}</InputLabel>
                        <Select value={indent} label={t("json.indent")} onChange={(event: SelectChangeEvent) => updateDocument(activeId, {indent: event.target.value})}>
                            <MenuItem value="2">{t("json.indentOption.spaces", {count: 2})}</MenuItem>
                            <MenuItem value="3">{t("json.indentOption.spaces", {count: 3})}</MenuItem>
                            <MenuItem value="4">{t("json.indentOption.spaces", {count: 4})}</MenuItem>
                            <MenuItem value="tab">{t("json.indentOption.tab")}</MenuItem>
                        </Select>
                    </FormControl>
                    <FormControlLabel
                        control={<Switch checked={sortKeys} onChange={event => updateDocument(activeId, {sortKeys: event.target.checked})}/>}
                        label={t("json.sortKeys")}
                    />
                </Stack>
                <Stack direction={{xs: "column", sm: "row"}} spacing={2}>
                    <FormControl sx={{minWidth: 160}}>
                        <InputLabel>{t("json.queryMode")}</InputLabel>
                        <Select value={queryMode} label={t("json.queryMode")} onChange={(event: SelectChangeEvent) => updateDocument(activeId, {queryMode: event.target.value as QueryMode})}>
                            <MenuItem value="pointer">{t("json.queryModeOption.pointer")}</MenuItem>
                            <MenuItem value="jsonpath">{t("json.queryModeOption.jsonpath")}</MenuItem>
                            <MenuItem value="jmespath">{t("json.queryModeOption.jmespath")}</MenuItem>
                        </Select>
                    </FormControl>
                    <TextField
                        label={t("json.queryLabel")}
                        value={query}
                        onChange={event => updateDocument(activeId, {query: event.target.value})}
                        helperText={t("json.queryExample", {example: queryPlaceholders[queryMode]})}
                        fullWidth
                    />
                </Stack>
                {error && <Alert severity="error">{error}</Alert>}
                <Grid container spacing={2}>
                    <Grid size={{xs: 12, md: 6}}>
                        <FieldLabelRow label={t("json.input")}>
                            <CopyIconButton onCopy={() => copyText(input)}/>
                        </FieldLabelRow>
                        <TextField value={input} onChange={event => updateDocument(activeId, {input: event.target.value})} multiline minRows={14} fullWidth/>
                    </Grid>
                    <Grid size={{xs: 12, md: 6}}>
                        <FieldLabelRow label={t("json.output")}>
                            <CopyIconButton onCopy={() => copyText(output)} disabled={!output}/>
                            <DownloadIconButton title={t("json.downloadOutput")} onDownload={() => downloadText("json-output.txt", output)} disabled={!output}/>
                        </FieldLabelRow>
                        <TextField value={output} multiline minRows={14} fullWidth slotProps={{htmlInput: {readOnly: true}}}/>
                    </Grid>
                    <Grid size={{xs: 12}}>
                        <FieldLabelRow label={t("json.diffTarget")}>
                            <CopyIconButton onCopy={() => copyText(diffInput)}/>
                        </FieldLabelRow>
                        <TextField value={diffInput} onChange={event => updateDocument(activeId, {diffInput: event.target.value})} multiline minRows={6} fullWidth/>
                    </Grid>
                </Grid>
            </Stack>
        </ToolSurface>
    );
};

export default JsonTool;
