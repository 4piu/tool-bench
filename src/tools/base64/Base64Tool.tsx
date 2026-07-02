import React from "react";
import FileOpenIcon from "@mui/icons-material/FileOpen";
import {FormControlLabel, Grid, IconButton, Stack, Switch, TextField, Tooltip} from "@mui/material";
import {base64ToBytes, bytesToBase64, copyText, downloadText} from "../shared/browser";
import {DocumentTabsBar, useDocumentTabs} from "../shared/DocumentTabs";
import {CopyIconButton, DownloadIconButton, FieldLabelRow, ToolHeader, ToolSurface} from "../shared/ToolScaffold";

const encoder = new TextEncoder();
const decoder = new TextDecoder();

const toUrlSafe = (value: string) => value.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
const fromUrlSafe = (value: string) => {
    const standard = value.replace(/-/g, "+").replace(/_/g, "/");
    return standard.padEnd(Math.ceil(standard.length / 4) * 4, "=");
};
const formatBase64 = (raw: string, urlSafe: boolean) => urlSafe ? toUrlSafe(raw) : raw;

type Base64Document = {
    plainText: string;
    base64: string;
    urlSafe: boolean;
    error: string;
};

const createDocument = (): Base64Document => {
    const plainText = "Hello, ToolBench!";
    return {
        plainText,
        base64: bytesToBase64(encoder.encode(plainText)),
        urlSafe: false,
        error: ""
    };
};

const Base64Tool = () => {
    const {documents, activeId, activeDocument, setActiveId, addDocument, closeDocument, closeAll, renameDocument, updateDocument} =
        useDocumentTabs<Base64Document>("base64", createDocument);
    const {plainText, base64, urlSafe, error} = activeDocument;

    const encode = (value: string) => {
        const raw = bytesToBase64(encoder.encode(value));
        updateDocument(activeId, {plainText: value, base64: formatBase64(raw, urlSafe), error: ""});
    };

    const decode = (value: string) => {
        try {
            const nextPlainText = decoder.decode(base64ToBytes(urlSafe ? fromUrlSafe(value) : value));
            updateDocument(activeId, {base64: value, plainText: nextPlainText, error: ""});
        } catch {
            updateDocument(activeId, {base64: value, error: "Malformed Base64 input"});
        }
    };

    const toggleUrlSafe = (nextUrlSafe: boolean) => {
        const raw = bytesToBase64(encoder.encode(plainText));
        updateDocument(activeId, {urlSafe: nextUrlSafe, base64: formatBase64(raw, nextUrlSafe)});
    };

    const encodeFile = async (file: File) => {
        const bytes = new Uint8Array(await file.arrayBuffer());
        const raw = bytesToBase64(bytes);
        updateDocument(activeId, {
            base64: formatBase64(raw, urlSafe),
            plainText: `[${file.name}] ${bytes.byteLength} bytes`,
            error: ""
        });
    };

    return (
        <ToolSurface>
            <ToolHeader title="Base64 Encoder / Decoder" description="Encode and decode UTF-8 text across multiple tabs."/>
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
                <FormControlLabel
                    control={<Switch checked={urlSafe} onChange={event => toggleUrlSafe(event.target.checked)}/>}
                    label="URL-safe Base64"
                />
            </Stack>
            <Grid container spacing={2} sx={{mt: 1}}>
                <Grid size={{xs: 12, md: 6}}>
                    <FieldLabelRow label="Plain text">
                        <Tooltip title="Open file">
                            <IconButton size="small" component="label">
                                <FileOpenIcon fontSize="small"/>
                                <input hidden type="file" onChange={event => event.target.files?.[0] && encodeFile(event.target.files[0])}/>
                            </IconButton>
                        </Tooltip>
                        <CopyIconButton onCopy={() => copyText(plainText)}/>
                        <DownloadIconButton title="Download plain text" onDownload={() => downloadText("decoded.txt", plainText)}/>
                    </FieldLabelRow>
                    <TextField value={plainText} onChange={event => encode(event.target.value)} multiline minRows={12} fullWidth/>
                </Grid>
                <Grid size={{xs: 12, md: 6}}>
                    <FieldLabelRow label="Base64">
                        <CopyIconButton onCopy={() => copyText(base64)}/>
                        <DownloadIconButton title="Download Base64 text" onDownload={() => downloadText("encoded.txt", base64)}/>
                    </FieldLabelRow>
                    <TextField value={base64} onChange={event => decode(event.target.value)} multiline minRows={12} fullWidth error={Boolean(error)} helperText={error}/>
                </Grid>
            </Grid>
        </ToolSurface>
    );
};

export default Base64Tool;
