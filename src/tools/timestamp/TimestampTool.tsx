import React from "react";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import {Alert, Button, FormControl, InputLabel, MenuItem, Select, Stack, TextField} from "@mui/material";
import type {SelectChangeEvent} from "@mui/material/Select";
import {useTranslation} from "react-i18next";
import {copyText} from "../shared/browser";
import {useLocalStorageState} from "../shared/hooks";
import {ToolHeader, ToolSurface} from "../shared/ToolScaffold";

type OutputFormat = "ISO-8601" | "RFC-1123" | "Locale";

const formatDate = (timestamp: string, format: OutputFormat, milliseconds: boolean) => {
    const date = new Date(Number(timestamp) * (milliseconds ? 1 : 1000));
    if (Number.isNaN(date.getTime())) return "";
    if (format === "ISO-8601") return date.toISOString();
    if (format === "RFC-1123") return date.toUTCString();
    return date.toLocaleString();
};

const TimestampTool = () => {
    const {t} = useTranslation();
    const [dateTime, setDateTime] = useLocalStorageState("timestamp.dateTime", new Date().toISOString().slice(0, 16));
    const [timestampInput, setTimestampInput] = useLocalStorageState("timestamp.input", String(Math.floor(Date.now() / 1000)));
    const [format, setFormat] = useLocalStorageState<OutputFormat>("timestamp.format", "Locale");
    const [timezoneOffset, setTimezoneOffset] = useLocalStorageState("timestamp.timezoneOffset", new Date().getTimezoneOffset());
    const [milliseconds, setMilliseconds] = useLocalStorageState("timestamp.milliseconds", false);
    const date = new Date(dateTime);
    const adjustedTime = Number.isNaN(date.getTime())
        ? NaN
        : date.getTime() - (timezoneOffset - date.getTimezoneOffset()) * 60_000;
    const timestamp = Number.isNaN(adjustedTime) ? "" : String(milliseconds ? adjustedTime : Math.floor(adjustedTime / 1000));
    const formatted = formatDate(timestampInput, format, milliseconds);

    const useNow = () => {
        const now = new Date();
        setDateTime(now.toISOString().slice(0, 16));
        setTimestampInput(String(milliseconds ? now.getTime() : Math.floor(now.getTime() / 1000)));
    };

    return (
        <ToolSurface>
            <ToolHeader title={t("timestamp.title")} description={t("timestamp.description")}/>
            <Stack spacing={3}>
                <Stack spacing={2}>
                    <TextField label={t("timestamp.dateTime")} type="datetime-local" value={dateTime} onChange={event => setDateTime(event.target.value)} slotProps={{inputLabel: {shrink: true}}}/>
                    <FormControl>
                        <InputLabel>{t("timestamp.timezoneOffset")}</InputLabel>
                        <Select value={String(timezoneOffset)} label={t("timestamp.timezoneOffset")} onChange={(event: SelectChangeEvent) => setTimezoneOffset(Number(event.target.value))}>
                            {Array.from({length: 27}, (_, index) => index - 12).map(hour => (
                                <MenuItem key={hour} value={String(hour * -60)}>UTC{hour >= 0 ? `+${hour}` : hour}</MenuItem>
                            ))}
                        </Select>
                    </FormControl>
                    <FormControl>
                        <InputLabel>{t("timestamp.precision")}</InputLabel>
                        <Select value={milliseconds ? "ms" : "s"} label={t("timestamp.precision")} onChange={(event: SelectChangeEvent) => setMilliseconds(event.target.value === "ms")}>
                            <MenuItem value="s">{t("timestamp.precisionOption.seconds")}</MenuItem>
                            <MenuItem value="ms">{t("timestamp.precisionOption.milliseconds")}</MenuItem>
                        </Select>
                    </FormControl>
                    <TextField label={t("timestamp.timestampFromDate")} value={timestamp} slotProps={{htmlInput: {readOnly: true}}}/>
                    <Stack direction={{xs: "column", sm: "row"}} spacing={1}>
                        <Button variant="contained" onClick={useNow}>{t("timestamp.now")}</Button>
                        <Button startIcon={<ContentCopyIcon/>} onClick={() => copyText(timestamp)} disabled={!timestamp}>{t("timestamp.copyTimestamp")}</Button>
                    </Stack>
                </Stack>
                <Stack spacing={2}>
                    <TextField label={milliseconds ? t("timestamp.timestampInMilliseconds") : t("timestamp.timestampInSeconds")} type="number" value={timestampInput} onChange={event => setTimestampInput(event.target.value)}/>
                    <FormControl>
                        <InputLabel>{t("timestamp.format")}</InputLabel>
                        <Select value={format} label={t("timestamp.format")} onChange={(event: SelectChangeEvent) => setFormat(event.target.value as OutputFormat)}>
                            <MenuItem value="Locale">{t("timestamp.formatOption.locale")}</MenuItem>
                            <MenuItem value="ISO-8601">{t("timestamp.formatOption.iso8601")}</MenuItem>
                            <MenuItem value="RFC-1123">{t("timestamp.formatOption.rfc1123")}</MenuItem>
                        </Select>
                    </FormControl>
                    {formatted ? <Alert severity="info">{formatted}</Alert> : <Alert severity="error">{t("timestamp.invalidTimestamp")}</Alert>}
                    <Button startIcon={<ContentCopyIcon/>} onClick={() => copyText(formatted)} disabled={!formatted}>{t("timestamp.copyFormatted")}</Button>
                </Stack>
            </Stack>
        </ToolSurface>
    );
};

export default TimestampTool;
