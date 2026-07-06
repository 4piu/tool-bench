import React from "react";
import SwapHorizIcon from "@mui/icons-material/SwapHoriz";
import SwapVertIcon from "@mui/icons-material/SwapVert";
import {
    Alert,
    Box,
    Divider,
    Paper,
    Stack,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    TextField,
    Typography
} from "@mui/material";
import { useTranslation } from "react-i18next";
import {
    cidrBlockToString,
    getCidrDetails,
    ipToString,
    ipv4ToBinary,
    maskToPrefixLength,
    parseCidr,
    parseIp,
    prefixLengthToMask,
    rangeToCidrs
} from "../../lib/cidr";
import { copyText, downloadText } from "../shared/browser";
import { useLocalStorageState } from "../shared/hooks";
import { CopyButton, DownloadButton, ToolHeader, ToolSurface } from "../shared/ToolScaffold";

const CidrTool = () => {
    const { t } = useTranslation();
    const [prefixInput, setPrefixInput] = useLocalStorageState("cidr.maskPrefix", "24");
    const [netmaskInput, setNetmaskInput] = useLocalStorageState("cidr.maskNetmask", "255.255.255.0");
    const [startInput, setStartInput] = useLocalStorageState("cidr.rangeStart", "192.168.1.5");
    const [endInput, setEndInput] = useLocalStorageState("cidr.rangeEnd", "192.168.1.20");
    const [cidrInput, setCidrInput] = useLocalStorageState("cidr.cidrInput", "192.168.1.0/24");

    const prefixNum = /^\d+$/.test(prefixInput.trim()) ? Number(prefixInput.trim()) : null;
    const prefixValid = prefixNum !== null && prefixNum <= 32;
    const parsedNetmaskIp = parseIp(netmaskInput.trim());
    const netmaskValue = parsedNetmaskIp && parsedNetmaskIp.version === 4 ? parsedNetmaskIp.value : null;
    const netmaskPrefixLen = netmaskValue !== null ? maskToPrefixLength(netmaskValue, 4) : null;
    const netmaskValid = netmaskValue !== null && netmaskPrefixLen !== null;
    const maskBinary = netmaskValid ? ipv4ToBinary(netmaskValue!) : prefixValid ? ipv4ToBinary(prefixLengthToMask(prefixNum!, 4)) : null;

    const handlePrefixChange = (value: string) => {
        setPrefixInput(value);
        const trimmed = value.trim();
        if (/^\d+$/.test(trimmed)) {
            const n = Number(trimmed);
            if (n <= 32) setNetmaskInput(ipToString(prefixLengthToMask(n, 4), 4));
        }
    };

    const handleNetmaskChange = (value: string) => {
        setNetmaskInput(value);
        const parsed = parseIp(value.trim());
        if (parsed && parsed.version === 4) {
            const prefixLength = maskToPrefixLength(parsed.value, 4);
            if (prefixLength !== null) setPrefixInput(String(prefixLength));
        }
    };

    const rangeResult = React.useMemo(() => {
        const start = startInput.trim();
        const end = endInput.trim();
        if (!start || !end) return null;
        const parsedStart = parseIp(start);
        const parsedEnd = parseIp(end);
        if (!parsedStart || !parsedEnd) return { error: t("cidr.error.invalidIp") } as const;
        if (parsedStart.version !== parsedEnd.version) return { error: t("cidr.error.versionMismatch") } as const;
        if (parsedStart.value > parsedEnd.value) return { error: t("cidr.error.startAfterEnd") } as const;
        const blocks = rangeToCidrs(parsedStart.value, parsedEnd.value, parsedStart.version);
        const totalAddresses = parsedEnd.value - parsedStart.value + 1n;
        return { blocks, totalAddresses } as const;
    }, [startInput, endInput, t]);

    const cidrResult = React.useMemo(() => {
        const trimmed = cidrInput.trim();
        if (!trimmed) return null;
        const parsed = parseCidr(trimmed);
        if (!parsed) return { error: t("cidr.error.invalidCidr") } as const;
        return { details: getCidrDetails(parsed) } as const;
    }, [cidrInput, t]);

    const blockLines = rangeResult && "blocks" in rangeResult ? rangeResult.blocks.map(cidrBlockToString) : [];

    return (
        <ToolSurface>
            <ToolHeader title={t("cidr.title")} description={t("cidr.description")} />
            <Stack spacing={4}>
                <Stack spacing={2}>
                    <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>{t("cidr.maskConvert.heading")}</Typography>
                    <Stack direction={{ xs: "column", sm: "row" }} spacing={{ xs: 1, sm: 2 }} sx={{ alignItems: { xs: "center", sm: "flex-start" } }}>
                        <TextField
                            label={t("cidr.maskConvert.prefixLength")}
                            value={prefixInput}
                            onChange={event => handlePrefixChange(event.target.value)}
                            error={prefixInput.trim() !== "" && !prefixValid}
                            helperText={prefixInput.trim() !== "" && !prefixValid ? t("cidr.maskConvert.invalidPrefix") : t("cidr.maskConvert.prefixHelp")}
                            fullWidth
                            slotProps={{ htmlInput: { spellCheck: false } }}
                        />
                        <Box sx={{ display: "flex", justifyContent: "center", flexShrink: 0, pt: { xs: 0, sm: "16px" } }}>
                            <SwapHorizIcon sx={{ display: { xs: "none", sm: "block" }, color: "text.secondary" }} />
                            <SwapVertIcon sx={{ display: { xs: "block", sm: "none" }, color: "text.secondary" }} />
                        </Box>
                        <TextField
                            label={t("cidr.maskConvert.netmask")}
                            value={netmaskInput}
                            onChange={event => handleNetmaskChange(event.target.value)}
                            error={netmaskInput.trim() !== "" && !netmaskValid}
                            helperText={netmaskInput.trim() !== "" && !netmaskValid ? t("cidr.maskConvert.invalidNetmask") : t("cidr.maskConvert.netmaskHelp")}
                            fullWidth
                            slotProps={{ htmlInput: { spellCheck: false } }}
                        />
                    </Stack>
                    {maskBinary && (
                        <Typography variant="body2" sx={{ fontFamily: "monospace", color: "text.secondary" }}>
                            {maskBinary}
                        </Typography>
                    )}
                </Stack>

                <Divider />

                <Stack spacing={2}>
                    <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>{t("cidr.rangeToCidr.heading")}</Typography>
                    <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
                        <TextField
                            label={t("cidr.rangeToCidr.startIp")}
                            value={startInput}
                            onChange={event => setStartInput(event.target.value)}
                            fullWidth
                            slotProps={{ htmlInput: { spellCheck: false } }}
                        />
                        <TextField
                            label={t("cidr.rangeToCidr.endIp")}
                            value={endInput}
                            onChange={event => setEndInput(event.target.value)}
                            fullWidth
                            slotProps={{ htmlInput: { spellCheck: false } }}
                        />
                    </Stack>
                    {rangeResult && "error" in rangeResult && <Alert severity="error">{rangeResult.error}</Alert>}
                    {rangeResult && "blocks" in rangeResult && (
                        <>
                            <Typography variant="body2" color="text.secondary">
                                {t("cidr.rangeToCidr.summary", {
                                    blockCount: rangeResult.blocks.length,
                                    totalAddresses: rangeResult.totalAddresses.toLocaleString()
                                })}
                            </Typography>
                            <TableContainer component={Paper} variant="outlined">
                                <Table size="small">
                                    <TableHead>
                                        <TableRow>
                                            <TableCell>{t("cidr.rangeToCidr.blockColumn")}</TableCell>
                                        </TableRow>
                                    </TableHead>
                                    <TableBody>
                                        {rangeResult.blocks.map(block => (
                                            <TableRow key={cidrBlockToString(block)}>
                                                <TableCell sx={{ fontFamily: "monospace" }}>{cidrBlockToString(block)}</TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </TableContainer>
                            <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
                                <CopyButton onCopy={() => copyText(blockLines.join("\n"))} />
                                <DownloadButton onDownload={() => downloadText("cidr-blocks.txt", blockLines.join("\n"))} />
                            </Stack>
                        </>
                    )}
                </Stack>

                <Divider />

                <Stack spacing={2}>
                    <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>{t("cidr.cidrToRange.heading")}</Typography>
                    <TextField
                        label={t("cidr.cidrToRange.input")}
                        value={cidrInput}
                        onChange={event => setCidrInput(event.target.value)}
                        fullWidth
                        slotProps={{ htmlInput: { spellCheck: false } }}
                    />
                    {cidrResult && "error" in cidrResult && <Alert severity="error">{cidrResult.error}</Alert>}
                    {cidrResult && "details" in cidrResult && (() => {
                        const d = cidrResult.details;
                        const rows: [string, string][] = [
                            [t("cidr.cidrToRange.version"), d.version === 4 ? "IPv4" : "IPv6"],
                            [t("cidr.cidrToRange.networkAddress"), ipToString(d.network, d.version)],
                            [
                                d.version === 4 ? t("cidr.cidrToRange.broadcastAddress") : t("cidr.cidrToRange.lastAddress"),
                                ipToString(d.lastAddress, d.version)
                            ],
                            [t("cidr.cidrToRange.firstUsable"), ipToString(d.firstUsable, d.version)],
                            [t("cidr.cidrToRange.lastUsable"), ipToString(d.lastUsable, d.version)],
                            [t("cidr.cidrToRange.usableHosts"), d.usableHosts.toLocaleString()],
                            [t("cidr.cidrToRange.totalAddresses"), d.totalAddresses.toLocaleString()],
                            ...(d.netmask !== null ? [[t("cidr.cidrToRange.netmask"), ipToString(d.netmask, 4)] as [string, string]] : []),
                            ...(d.wildcardMask !== null ? [[t("cidr.cidrToRange.wildcardMask"), ipToString(d.wildcardMask, 4)] as [string, string]] : [])
                        ];
                        const summaryText = rows.map(([label, value]) => `${label}: ${value}`).join("\n");
                        return (
                            <>
                                <TableContainer component={Paper} variant="outlined">
                                    <Table size="small">
                                        <TableBody>
                                            {rows.map(([label, value]) => (
                                                <TableRow key={label}>
                                                    <TableCell sx={{ color: "text.secondary", whiteSpace: "nowrap" }}>{label}</TableCell>
                                                    <TableCell sx={{ fontFamily: "monospace" }}>{value}</TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </TableContainer>
                                <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
                                    <CopyButton onCopy={() => copyText(summaryText)} />
                                </Stack>
                            </>
                        );
                    })()}
                </Stack>
            </Stack>
        </ToolSurface>
    );
};

export default CidrTool;
