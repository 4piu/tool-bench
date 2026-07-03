import React from "react";
import {v1 as uuidV1, v3 as uuidV3, v4 as uuidV4, v5 as uuidV5} from "uuid";
import {FormControl, InputLabel, MenuItem, Select, Stack, TextField} from "@mui/material";
import type {SelectChangeEvent} from "@mui/material/Select";
import {useTranslation} from "react-i18next";
import {copyText, downloadText} from "../shared/browser";
import {useLocalStorageState} from "../shared/hooks";
import {ActionRow, ToolHeader, ToolSurface} from "../shared/ToolScaffold";

type UuidVersion = "v1" | "v3" | "v4" | "v5" | "v7";
type OutputMode = "lines" | "json" | "csv";

const namespacePresets = {
    DNS: "6ba7b810-9dad-11d1-80b4-00c04fd430c8",
    URL: "6ba7b811-9dad-11d1-80b4-00c04fd430c8",
    OID: "6ba7b812-9dad-11d1-80b4-00c04fd430c8",
    X500: "6ba7b814-9dad-11d1-80b4-00c04fd430c8"
};

const validateUuid = (value: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);

const uuidV7 = () => {
    const bytes = new Uint8Array(16);
    crypto.getRandomValues(bytes);
    const timestamp = BigInt(Date.now());
    for (let index = 5; index >= 0; index--) {
        bytes[index] = Number((timestamp >> BigInt((5 - index) * 8)) & 0xffn);
    }
    bytes[6] = (bytes[6] & 0x0f) | 0x70;
    bytes[8] = (bytes[8] & 0x3f) | 0x80;
    const hex = Array.from(bytes, byte => byte.toString(16).padStart(2, "0")).join("");
    return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
};

const formatOutput = (uuids: string[], outputMode: OutputMode) => {
    if (outputMode === "json") return JSON.stringify(uuids, null, 2);
    if (outputMode === "csv") return uuids.map(uuid => `"${uuid}"`).join("\n");
    return uuids.join("\n");
};

const UuidTool = () => {
    const {t} = useTranslation();
    const [version, setVersion] = useLocalStorageState<UuidVersion>("uuid.version", "v4");
    const [count, setCount] = useLocalStorageState("uuid.count", 8);
    const [name, setName] = useLocalStorageState("uuid.name", "example.com");
    const [namespace, setNamespace] = useLocalStorageState("uuid.namespace", namespacePresets.DNS);
    const [outputMode, setOutputMode] = useLocalStorageState<OutputMode>("uuid.outputMode", "lines");
    const [uuids, setUuids] = React.useState<string[]>(() => Array.from({length: count}, () => uuidV4()));
    const usesNamespace = version === "v3" || version === "v5";
    const namespaceInvalid = usesNamespace && !validateUuid(namespace);
    const output = formatOutput(uuids, outputMode);

    const generate = () => {
        if (namespaceInvalid) return;
        if (version === "v1") setUuids(Array.from({length: count}, () => uuidV1()));
        if (version === "v4") setUuids(Array.from({length: count}, () => uuidV4()));
        if (version === "v7") setUuids(Array.from({length: count}, () => uuidV7()));
        if (version === "v3") setUuids([uuidV3(name, namespace)]);
        if (version === "v5") setUuids([uuidV5(name, namespace)]);
    };

    return (
        <ToolSurface>
            <ToolHeader title={t("uuid.title")} description={t("uuid.description")}/>
            <Stack spacing={2}>
                <FormControl>
                    <InputLabel>{t("uuid.version")}</InputLabel>
                    <Select value={version} label={t("uuid.version")} onChange={(event: SelectChangeEvent) => setVersion(event.target.value as UuidVersion)}>
                        <MenuItem value="v1">{t("uuid.versionOption.v1")}</MenuItem>
                        <MenuItem value="v3">{t("uuid.versionOption.v3")}</MenuItem>
                        <MenuItem value="v4">{t("uuid.versionOption.v4")}</MenuItem>
                        <MenuItem value="v5">{t("uuid.versionOption.v5")}</MenuItem>
                        <MenuItem value="v7">{t("uuid.versionOption.v7")}</MenuItem>
                    </Select>
                </FormControl>
                {!usesNamespace && (
                    <TextField
                        label={t("uuid.count")}
                        type="number"
                        value={count}
                        slotProps={{htmlInput: {min: 1, max: 1000}}}
                        onChange={event => setCount(Math.max(1, Math.min(1000, Number(event.target.value) || 1)))}
                    />
                )}
                {usesNamespace && (
                    <>
                        <TextField label={t("uuid.name")} value={name} onChange={event => setName(event.target.value)}/>
                        <FormControl>
                            <InputLabel>{t("uuid.namespacePreset")}</InputLabel>
                            <Select value={namespace} label={t("uuid.namespacePreset")} onChange={(event: SelectChangeEvent) => setNamespace(event.target.value)}>
                                {Object.entries(namespacePresets).map(([label, value]) => <MenuItem key={label} value={value}>{label}</MenuItem>)}
                            </Select>
                        </FormControl>
                        <TextField
                            label={t("uuid.namespaceUuid")}
                            value={namespace}
                            onChange={event => setNamespace(event.target.value)}
                            error={namespaceInvalid}
                            helperText={namespaceInvalid ? t("uuid.namespaceInvalid") : t("uuid.namespaceHelp")}
                        />
                    </>
                )}
                <FormControl>
                    <InputLabel>{t("uuid.output")}</InputLabel>
                    <Select value={outputMode} label={t("uuid.output")} onChange={(event: SelectChangeEvent) => setOutputMode(event.target.value as OutputMode)}>
                        <MenuItem value="lines">{t("uuid.outputOption.lines")}</MenuItem>
                        <MenuItem value="json">{t("uuid.outputOption.json")}</MenuItem>
                        <MenuItem value="csv">{t("uuid.outputOption.csv")}</MenuItem>
                    </Select>
                </FormControl>
                <ActionRow
                    onRefresh={generate}
                    onCopy={() => copyText(output)}
                    onDownload={() => downloadText(`UUID-${uuids.length}.txt`, output)}
                />
                <TextField value={output} multiline minRows={10} fullWidth slotProps={{htmlInput: {readOnly: true}}}/>
            </Stack>
        </ToolSurface>
    );
};

export default UuidTool;
