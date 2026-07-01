import React from "react";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import DoneIcon from "@mui/icons-material/Done";
import DownloadIcon from "@mui/icons-material/Download";
import RefreshIcon from "@mui/icons-material/Refresh";
import {Box, Button, Container, Paper, Stack, Typography} from "@mui/material";

export const ToolSurface = ({children}: { children: React.ReactNode }) => (
    <Container maxWidth="md" sx={{py: 4}}>
        <Paper variant="outlined" sx={{p: {xs: 2, sm: 3}, borderRadius: 3}}>
            {children}
        </Paper>
    </Container>
);

export const ToolHeader = ({title, description}: { title: string; description: string }) => (
    <Box sx={{mb: 3}}>
        <Typography variant="h4" component="h1" gutterBottom>{title}</Typography>
        <Typography color="text.secondary">{description}</Typography>
    </Box>
);

export const ActionRow = ({onRefresh, onCopy, onDownload}: {
    onRefresh: () => void;
    onCopy: () => void;
    onDownload: () => void;
}) => (
    <Stack direction={{xs: "column", sm: "row"}} spacing={1}>
        <Button variant="contained" startIcon={<RefreshIcon/>} onClick={onRefresh}>Generate</Button>
        <CopyButton onCopy={onCopy}/>
        <DownloadButton onDownload={onDownload}/>
    </Stack>
);

export const CopyButton = ({onCopy, disabled = false, label = "Copy"}: {
    onCopy: () => void | Promise<void>;
    disabled?: boolean;
    label?: string;
}) => {
    const [copied, setCopied] = React.useState(false);

    const handleCopy = async () => {
        await onCopy();
        setCopied(true);
        window.setTimeout(() => setCopied(false), 1500);
    };

    return (
        <Button startIcon={copied ? <DoneIcon/> : <ContentCopyIcon/>} onClick={handleCopy} disabled={disabled}>
            {copied ? "Copied" : label}
        </Button>
    );
};

export const DownloadButton = ({onDownload, disabled = false, label = "Download"}: {
    onDownload: () => void;
    disabled?: boolean;
    label?: string;
}) => (
    <Button startIcon={<DownloadIcon/>} onClick={onDownload} disabled={disabled}>
        {label}
    </Button>
);
