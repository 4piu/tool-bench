import React from "react";
import {Button, FormControlLabel, Grid, Stack, Switch, TextField} from "@mui/material";
import {base64ToBytes, bytesToBase64, copyText, downloadBytes, downloadText} from "../shared/browser";
import {DocumentTabsBar, useDocumentTabs} from "../shared/DocumentTabs";
import {CopyButton, DownloadButton, ToolHeader, ToolSurface} from "../shared/ToolScaffold";

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
    fileName: string;
    urlSafe: boolean;
    error: string;
};

const createDocument = (): Base64Document => {
    const plainText = "Hello, ToolBench!";
    return {
        plainText,
        base64: bytesToBase64(encoder.encode(plainText)),
        fileName: "decoded.bin",
        urlSafe: false,
        error: ""
    };
};

const Base64Tool = () => {
    const {documents, activeId, activeDocument, setActiveId, addDocument, closeDocument, closeAll, updateDocument} =
        useDocumentTabs<Base64Document>("base64", createDocument);
    const {plainText, base64, fileName, urlSafe, error} = activeDocument;

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
            fileName: file.name,
            error: ""
        });
    };

    const downloadDecodedFile = () => {
        try {
            downloadBytes(fileName || "decoded.bin", base64ToBytes(urlSafe ? fromUrlSafe(base64) : base64));
        } catch {
            updateDocument(activeId, {error: "Malformed Base64 input"});
        }
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
                />
                <FormControlLabel
                    control={<Switch checked={urlSafe} onChange={event => toggleUrlSafe(event.target.checked)}/>}
                    label="URL-safe Base64"
                />
                <Stack direction={{xs: "column", sm: "row"}} spacing={1} sx={{flexWrap: "wrap"}} useFlexGap>
                    <CopyButton label="Copy plain text" onCopy={() => copyText(plainText)}/>
                    <DownloadButton label="Download plain text" onDownload={() => downloadText("decoded.txt", plainText)}/>
                    <CopyButton label="Copy Base64" onCopy={() => copyText(base64)}/>
                    <DownloadButton label="Download Base64" onDownload={() => downloadText("encoded.txt", base64)}/>
                    <DownloadButton label="Download decoded file" onDownload={downloadDecodedFile} disabled={!base64}/>
                    <Button component="label">
                        Encode file
                        <input hidden type="file" onChange={event => event.target.files?.[0] && encodeFile(event.target.files[0])}/>
                    </Button>
                </Stack>
            </Stack>
            <Grid container spacing={2} sx={{mt: 1}}>
                <Grid size={{xs: 12, md: 6}}>
                    <TextField label="Plain text" value={plainText} onChange={event => encode(event.target.value)} multiline minRows={12} fullWidth/>
                </Grid>
                <Grid size={{xs: 12, md: 6}}>
                    <TextField label="Base64" value={base64} onChange={event => decode(event.target.value)} multiline minRows={12} fullWidth error={Boolean(error)} helperText={error}/>
                </Grid>
            </Grid>
        </ToolSurface>
    );
};

export default Base64Tool;
