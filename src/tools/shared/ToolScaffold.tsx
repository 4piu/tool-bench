import React from "react";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import DoneIcon from "@mui/icons-material/Done";
import DownloadIcon from "@mui/icons-material/Download";
import RefreshIcon from "@mui/icons-material/Refresh";
import {Box, Button, Container, IconButton, Paper, Stack, Tooltip, Typography} from "@mui/material";

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

export const FieldLabelRow = ({label, children}: { label: string; children: React.ReactNode }) => (
    <Stack direction="row" spacing={0.5} sx={{alignItems: "center", justifyContent: "space-between", mb: 0.5}}>
        <Typography variant="subtitle2" color="text.secondary">{label}</Typography>
        <Stack direction="row" spacing={0.25}>{children}</Stack>
    </Stack>
);

export const CopyIconButton = ({onCopy, disabled = false, title = "Copy"}: {
    onCopy: () => void | Promise<void>;
    disabled?: boolean;
    title?: string;
}) => {
    const [copied, setCopied] = React.useState(false);

    const handleCopy = async () => {
        await onCopy();
        setCopied(true);
        window.setTimeout(() => setCopied(false), 1500);
    };

    return (
        <Tooltip title={copied ? "Copied" : title}>
            <span>
                <IconButton size="small" onClick={handleCopy} disabled={disabled}>
                    {copied ? <DoneIcon fontSize="small"/> : <ContentCopyIcon fontSize="small"/>}
                </IconButton>
            </span>
        </Tooltip>
    );
};

export const DownloadIconButton = ({onDownload, disabled = false, title = "Download"}: {
    onDownload: () => void;
    disabled?: boolean;
    title?: string;
}) => (
    <Tooltip title={title}>
        <span>
            <IconButton size="small" onClick={onDownload} disabled={disabled}>
                <DownloadIcon fontSize="small"/>
            </IconButton>
        </span>
    </Tooltip>
);
