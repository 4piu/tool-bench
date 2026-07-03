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
            setError(err instanceof Error ? err.message : "Failed to load OUI database");
        } finally {
            setLoading(false);
        }
    }, []);

    React.useEffect(() => {
        load();
    }, [load]);

    const results = React.useMemo(() => input
        .split("\n")
        .map(parseMacLine)
        .map(parsed => ({ ...parsed, match: parsed.hex && index ? lookupOui(index, parsed.hex) : null }))
        .filter(result => result.raw.trim() || result.error), [input, index]);

    return (
        <ToolSurface>
            <ToolHeader title="OUI Lookup" description="Look up MAC address vendors (MA-L / MA-M / MA-S) with a fast local index." />
            <Stack spacing={2}>
                <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
                    {loading ? (
                        <>
                            <CircularProgress size={16} />
                            <Typography variant="body2" color="text.secondary">Loading vendor database...</Typography>
                        </>
                    ) : (
                        <Typography variant="body2" color="text.secondary">
                            {entryCount.toLocaleString()} entries
                            {fetchedAt && ` · updated ${new Date(fetchedAt).toLocaleString()}`}
                        </Typography>
                    )}
                    <Tooltip title="Refresh database now">
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
                        Refresh failed — showing the last known-good copy from {fetchedAt ? new Date(fetchedAt).toLocaleString() : "an earlier session"}.
                    </Alert>
                )}
                <TextField
                    label="MAC addresses"
                    value={input}
                    onChange={event => setInput(event.target.value)}
                    multiline
                    minRows={6}
                    fullWidth
                    helperText="One per line. Delimiters (: - . space) are ignored; partial prefixes (6, 7, or 9 hex digits) are accepted."
                />
                {results.length > 0 && (
                    <TableContainer component={Paper} variant="outlined">
                        <Table size="small">
                            <TableHead>
                                <TableRow>
                                    <TableCell>Input</TableCell>
                                    <TableCell>Registry</TableCell>
                                    <TableCell>Vendor</TableCell>
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
                                                {result.error ?? (!index ? "Loading..." : result.match ? result.match.vendor : "No match found")}
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
