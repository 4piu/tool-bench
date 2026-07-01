import React from "react";
import {Button, FormControlLabel, Grid, Stack, Switch, TextField} from "@mui/material";
import {base64ToBytes, bytesToBase64, copyText, downloadBytes, downloadText} from "../shared/browser";
import {useLocalStorageState} from "../shared/hooks";
import {CopyButton, DownloadButton, ToolHeader, ToolSurface} from "../shared/ToolScaffold";

const encoder = new TextEncoder();
const decoder = new TextDecoder();

const toUrlSafe = (value: string) => value.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
const fromUrlSafe = (value: string) => {
    const standard = value.replace(/-/g, "+").replace(/_/g, "/");
    return standard.padEnd(Math.ceil(standard.length / 4) * 4, "=");
};

const Base64Tool = () => {
    const [urlSafe, setUrlSafe] = useLocalStorageState("base64.urlSafe", false);
    const [plainText, setPlainText] = useLocalStorageState("base64.plainText", "Hello, ToolBench!");
    const [base64, setBase64] = React.useState(() => urlSafe ? toUrlSafe(bytesToBase64(encoder.encode(plainText))) : bytesToBase64(encoder.encode(plainText)));
    const [error, setError] = React.useState("");
    const [fileName, setFileName] = React.useState("decoded.bin");

    const encode = (value: string) => {
        setPlainText(value);
        const nextBase64 = bytesToBase64(encoder.encode(value));
        setBase64(urlSafe ? toUrlSafe(nextBase64) : nextBase64);
        setError("");
    };

    const decode = (value: string) => {
        setBase64(value);
        try {
            setPlainText(decoder.decode(base64ToBytes(urlSafe ? fromUrlSafe(value) : value)));
            setError("");
        } catch {
            setError("Malformed Base64 input");
        }
    };

    React.useEffect(() => {
        encode(plainText);
    }, [urlSafe]);

    const encodeFile = async (file: File) => {
        const bytes = new Uint8Array(await file.arrayBuffer());
        const nextBase64 = bytesToBase64(bytes);
        setBase64(urlSafe ? toUrlSafe(nextBase64) : nextBase64);
        setPlainText(`[${file.name}] ${bytes.byteLength} bytes`);
        setFileName(file.name);
        setError("");
    };

    const downloadDecodedFile = () => {
        try {
            downloadBytes(fileName || "decoded.bin", base64ToBytes(urlSafe ? fromUrlSafe(base64) : base64));
        } catch {
            setError("Malformed Base64 input");
        }
    };

    return (
        <ToolSurface>
            <ToolHeader title="Base64 Encoder / Decoder" description="Encode and decode UTF-8 text."/>
            <Stack spacing={2}>
                <FormControlLabel
                    control={<Switch checked={urlSafe} onChange={event => setUrlSafe(event.target.checked)}/>}
                    label="URL-safe Base64"
                />
                <Stack direction={{xs: "column", sm: "row"}} spacing={1}>
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
