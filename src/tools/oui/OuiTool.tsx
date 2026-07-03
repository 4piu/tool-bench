import React from "react";
import RefreshIcon from "@mui/icons-material/Refresh";
import {
    Alert,
    Chip,
    CircularProgress,
    IconButton,
    Paper,
    Stack,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    TextField,
    Tooltip,
    Typography
} from "@mui/material";
import {useTranslation} from "react-i18next";
import { buildOuiIndex, loadOuiEntries, lookupOui, parseMacLine, type OuiIndex, type OuiRegistry } from "../../lib/ouiData";
import { useLocalStorageState } from "../shared/hooks";
import { ToolHeader, ToolSurface } from "../shared/ToolScaffold";

const registryColor: Record<OuiRegistry, "primary" | "secondary" | "info"> = {
    "MA-L": "primary",
    "MA-M": "secondary",
    "MA-S": "info"
};

const exampleInput = "3C:5A:B4\nAA-BB-CC-DD-EE-FF\n8C1F64AFA\nnot-a-mac";

const OuiTool = () => {
    const {t} = useTranslation();
    const [input, setInput] = useLocalStorageState("oui.input", exampleInput);
    const [index, setIndex] = React.useState<OuiIndex | null>(null);
    const [entryCount, setEntryCount] = React.useState(0);
    const [fetchedAt, setFetchedAt] = React.useState<number | null>(null);
    const [stale, setStale] = React.useState(false);
    const [loading, setLoading] = React.useState(true);
    const [error, setError] = React.useState("");

    const load = React.useCallback(async (forceRefresh = false) => {
        setLoading(true);
        setError("");
        try {
            const result = await loadOuiEntries(forceRefresh);
            setIndex(buildOuiIndex(result.entries));
            setEntryCount(Object.keys(result.entries).length);
            setFetchedAt(result.fetchedAt);
            setStale(result.stale);
        } catch (err) {
            setError(err instanceof Error ? err.message : t("oui.loadFailed"));
        } finally {
            setLoading(false);
        }
    }, [t]);

    React.useEffect(() => {
        load();
    }, [load]);

    const results = React.useMemo(() => input
        .split("\n")
        .map(parseMacLine)
        .map(parsed => ({
            ...parsed,
            error: parsed.errorCode ? t(`oui.parseError.${parsed.errorCode}`) : null,
            match: parsed.hex && index ? lookupOui(index, parsed.hex) : null
        }))
        .filter(result => result.raw.trim() || result.error), [input, index, t]);

    return (
        <ToolSurface>
            <ToolHeader title={t("oui.title")} description={t("oui.description")} />
            <Stack spacing={2}>
                <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
                    {loading ? (
                        <>
                            <CircularProgress size={16} />
                            <Typography variant="body2" color="text.secondary">{t("oui.loading")}</Typography>
                        </>
                    ) : (
                        <Typography variant="body2" color="text.secondary">
                            {t("oui.entryCount", {count: entryCount.toLocaleString()})}
                            {fetchedAt && ` · ${t("oui.updatedAt", {date: new Date(fetchedAt).toLocaleString()})}`}
                        </Typography>
                    )}
                    <Tooltip title={t("oui.refreshNow")}>
                        <span>
                            <IconButton size="small" onClick={() => load(true)} disabled={loading}>
                                <RefreshIcon fontSize="small" />
                            </IconButton>
                        </span>
                    </Tooltip>
                </Stack>
                {error && <Alert severity="error">{error}</Alert>}
                {stale && !error && (
                    <Alert severity="warning">
                        {t("oui.staleWarning", {date: fetchedAt ? new Date(fetchedAt).toLocaleString() : t("oui.earlierSession")})}
                    </Alert>
                )}
                <TextField
                    label={t("oui.macAddresses")}
                    value={input}
                    onChange={event => setInput(event.target.value)}
                    multiline
                    minRows={6}
                    fullWidth
                    helperText={t("oui.macAddressesHelp")}
                />
                {results.length > 0 && (
                    <TableContainer component={Paper} variant="outlined">
                        <Table size="small">
                            <TableHead>
                                <TableRow>
                                    <TableCell>{t("oui.column.input")}</TableCell>
                                    <TableCell>{t("oui.column.registry")}</TableCell>
                                    <TableCell>{t("oui.column.vendor")}</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {results.map((result, resultIndex) => (
                                    <TableRow key={resultIndex}>
                                        <TableCell sx={{ whiteSpace: "nowrap" }}>
                                            <Typography component="span" variant="body2" color={result.error ? "error" : "text.primary"} sx={{ fontFamily: "monospace" }}>
                                                {result.formatted ?? result.raw}
                                            </Typography>
                                        </TableCell>
                                        <TableCell>
                                            {result.match && (
                                                <Chip size="small" label={result.match.registry} color={registryColor[result.match.registry]} />
                                            )}
                                        </TableCell>
                                        <TableCell>
                                            <Typography
                                                variant="body2"
                                                color={result.error ? "error" : !result.hex || result.match ? "text.primary" : "text.secondary"}
                                            >
                                                {result.error ?? (!index ? t("oui.loading") : result.match ? result.match.vendor : t("oui.noMatch"))}
                                            </Typography>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </TableContainer>
                )}
            </Stack>
        </ToolSurface>
    );
};

export default OuiTool;
