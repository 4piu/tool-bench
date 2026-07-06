import React from "react";
import AddIcon from "@mui/icons-material/Add";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutlineOutlined";
import DragIndicatorIcon from "@mui/icons-material/DragIndicator";
import RefreshIcon from "@mui/icons-material/Refresh";
import SwapHorizIcon from "@mui/icons-material/SwapHoriz";
import SwapVertIcon from "@mui/icons-material/SwapVert";
import {
    Alert,
    Autocomplete,
    Box,
    Button,
    CircularProgress,
    IconButton,
    InputAdornment,
    Link,
    Paper,
    Stack,
    TextField,
    Tooltip,
    Typography
} from "@mui/material";
import {useTranslation} from "react-i18next";
import {loadCurrencies, loadRates, type CurrencyList, type RatesResult} from "../../lib/currency";
import {useLocalStorageState} from "../shared/hooks";
import {ToolHeader, ToolSurface} from "../shared/ToolScaffold";

type AmountSide = "from" | "to";

type CurrencyPanel = {
    id: string;
    from: string;
    to: string;
    amount: string;
    amountSide: AmountSide;
};

const DEFAULT_PANELS: CurrencyPanel[] = [{id: "panel-default", from: "usd", to: "eur", amount: "1", amountSide: "from"}];
const MAX_FREQUENT = 5;
const LONG_PRESS_MS = 500;
const MOVE_CANCEL_THRESHOLD_PX = 10;
const REORDER_ANIMATION_MS = 220;

const formatNumber = (value: number, locale: string) => new Intl.NumberFormat(locale, {maximumSignificantDigits: 8}).format(value);

const parseAmount = (raw: string): number => {
    const trimmed = raw.trim();
    if (!trimmed) return NaN;
    return Number(trimmed.replace(",", "."));
};

const sanitizeAmountInput = (raw: string): string => {
    let value = raw.replace(/[^0-9.,]/g, "");
    const separatorIndex = value.search(/[.,]/);
    if (separatorIndex !== -1) {
        value = value.slice(0, separatorIndex + 1) + value.slice(separatorIndex + 1).replace(/[.,]/g, "");
    }
    return value;
};

const currencySymbolCache = new Map<string, string>();

const getCurrencySymbol = (code: string, locale: string): string => {
    const cacheKey = `${locale}:${code}`;
    const cached = currencySymbolCache.get(cacheKey);
    if (cached !== undefined) return cached;

    let symbol = code.toUpperCase();
    try {
        const parts = new Intl.NumberFormat(locale, {style: "currency", currency: code.toUpperCase(), currencyDisplay: "narrowSymbol"}).formatToParts(1);
        const currencyPart = parts.find(part => part.type === "currency");
        if (currencyPart) symbol = currencyPart.value;
    } catch {
        // Not a recognized ISO 4217 code (e.g. a crypto asset); fall back to the code itself.
    }

    currencySymbolCache.set(cacheKey, symbol);
    return symbol;
};

const CurrencySelect = ({label, value, currencies, usageCounts, onChange}: {
    label: string;
    value: string;
    currencies: CurrencyList;
    usageCounts: Record<string, number>;
    onChange: (code: string) => void;
}) => {
    const {t} = useTranslation();

    const {orderedOptions, frequentSet} = React.useMemo(() => {
        const codes = Object.keys(currencies);
        const usedCodes = codes.filter(code => (usageCounts[code] ?? 0) > 0);
        usedCodes.sort((a, b) => (usageCounts[b] ?? 0) - (usageCounts[a] ?? 0) || a.localeCompare(b));
        const frequent = usedCodes.slice(0, MAX_FREQUENT);
        const frequentSet = new Set(frequent);
        const rest = codes.filter(code => !frequentSet.has(code)).sort((a, b) => a.localeCompare(b));
        return {orderedOptions: [...frequent, ...rest], frequentSet};
    }, [currencies, usageCounts]);

    return (
        <Autocomplete
            options={orderedOptions}
            value={currencies[value] ? value : null}
            onChange={(_, next) => {
                if (next) onChange(next);
            }}
            groupBy={code => frequentSet.has(code) ? t("currency.frequentlyUsed") : t("currency.allCurrencies")}
            getOptionLabel={code => code.toUpperCase()}
            renderOption={(props, code) => {
                const {key, ...optionProps} = props;
                return (
                    <li key={key} {...optionProps}>
                        {code.toUpperCase()} — {currencies[code]}
                    </li>
                );
            }}
            filterOptions={(options, state) => {
                const query = state.inputValue.trim().toLowerCase();
                if (!query) return options;
                return options.filter(code => code.toLowerCase().includes(query) || currencies[code]?.toLowerCase().includes(query));
            }}
            isOptionEqualToValue={(option, val) => option === val}
            disableClearable
            fullWidth
            slotProps={{popper: {style: {width: "max-content", minWidth: 260}, placement: "bottom-start"}}}
            renderInput={params => <TextField {...params} label={label}/>}
        />
    );
};

type RateEntry = {
    loading: boolean;
    error: string;
    result: RatesResult | null;
};

const PanelCard = ({
    panel, currencies, usageCounts, rateEntry, showRemove, isDragging, cardRef, onChange, onRemove, onBumpUsage,
    onCardPointerDown, onCardPointerMove, onCardPointerUp
}: {
    panel: CurrencyPanel;
    currencies: CurrencyList;
    usageCounts: Record<string, number>;
    rateEntry: RateEntry | undefined;
    showRemove: boolean;
    isDragging: boolean;
    cardRef: (el: HTMLDivElement | null) => void;
    onChange: (patch: Partial<CurrencyPanel>) => void;
    onRemove: () => void;
    onBumpUsage: (code: string) => void;
    onCardPointerDown: (event: React.PointerEvent<HTMLDivElement>) => void;
    onCardPointerMove: (event: React.PointerEvent<HTMLDivElement>) => void;
    onCardPointerUp: (event: React.PointerEvent<HTMLDivElement>) => void;
}) => {
    const {t, i18n} = useTranslation();
    const rate = rateEntry?.result?.rates[panel.to];
    const numericAmount = parseAmount(panel.amount);

    let fromValue: string;
    let toValue: string;
    if (panel.amountSide === "from") {
        fromValue = panel.amount;
        toValue = rate !== undefined && Number.isFinite(numericAmount) ? formatNumber(numericAmount * rate, i18n.language) : "";
    } else {
        toValue = panel.amount;
        fromValue = rate !== undefined && rate !== 0 && Number.isFinite(numericAmount) ? formatNumber(numericAmount / rate, i18n.language) : "";
    }

    return (
        <Paper
            ref={cardRef}
            variant="outlined"
            onPointerDown={onCardPointerDown}
            onPointerMove={onCardPointerMove}
            onPointerUp={onCardPointerUp}
            onPointerCancel={onCardPointerUp}
            onContextMenu={event => event.preventDefault()}
            sx={{
                p: {xs: 1.5, sm: 2},
                borderRadius: 2,
                opacity: isDragging ? 0.6 : 1,
                boxShadow: isDragging ? 6 : undefined,
                touchAction: isDragging ? "none" : "auto",
                userSelect: isDragging ? "none" : "auto",
                transition: "opacity 0.15s ease"
            }}
        >
            <Stack spacing={2}>
                <Stack direction={{xs: "column", md: "row"}} spacing={{xs: 1.5, md: 2}} sx={{alignItems: {xs: "stretch", md: "center"}}}>
                    <Stack direction="row" spacing={1} sx={{flex: 1, minWidth: 0, width: {xs: "100%", md: "auto"}}}>
                        <Box sx={{width: 116, flexShrink: 0}}>
                            <CurrencySelect
                                label={t("currency.from")}
                                value={panel.from}
                                currencies={currencies}
                                usageCounts={usageCounts}
                                onChange={code => {
                                    onChange({from: code});
                                    onBumpUsage(code);
                                }}
                            />
                        </Box>
                        <TextField
                            label={t("currency.amount")}
                            value={fromValue}
                            onChange={event => onChange({amount: sanitizeAmountInput(event.target.value), amountSide: "from"})}
                            fullWidth
                            slotProps={{
                                htmlInput: {inputMode: "decimal", spellCheck: false},
                                input: {startAdornment: <InputAdornment position="start">{getCurrencySymbol(panel.from, i18n.language)}</InputAdornment>}
                            }}
                        />
                    </Stack>

                    <IconButton
                        aria-label={t("currency.swap")}
                        onClick={() => onChange({from: panel.to, to: panel.from, amountSide: panel.amountSide === "from" ? "to" : "from"})}
                        sx={{alignSelf: "center"}}
                    >
                        <SwapHorizIcon sx={{display: {xs: "none", md: "block"}}}/>
                        <SwapVertIcon sx={{display: {xs: "block", md: "none"}}}/>
                    </IconButton>

                    <Stack direction="row" spacing={1} sx={{flex: 1, minWidth: 0, width: {xs: "100%", md: "auto"}}}>
                        <Box sx={{width: 116, flexShrink: 0}}>
                            <CurrencySelect
                                label={t("currency.to")}
                                value={panel.to}
                                currencies={currencies}
                                usageCounts={usageCounts}
                                onChange={code => {
                                    onChange({to: code});
                                    onBumpUsage(code);
                                }}
                            />
                        </Box>
                        <TextField
                            label={t("currency.amount")}
                            value={toValue}
                            onChange={event => onChange({amount: sanitizeAmountInput(event.target.value), amountSide: "to"})}
                            fullWidth
                            slotProps={{
                                htmlInput: {inputMode: "decimal", spellCheck: false},
                                input: {startAdornment: <InputAdornment position="start">{getCurrencySymbol(panel.to, i18n.language)}</InputAdornment>}
                            }}
                        />
                    </Stack>
                </Stack>

                {rateEntry?.error && <Alert severity="error">{rateEntry.error}</Alert>}
                {rateEntry?.loading && !rateEntry.result && (
                    <Stack direction="row" spacing={1} sx={{alignItems: "center"}}>
                        <CircularProgress size={16}/>
                        <Typography variant="body2" color="text.secondary">{t("currency.loading")}</Typography>
                    </Stack>
                )}
                {rateEntry?.result && rate === undefined && <Alert severity="warning">{t("currency.rateUnavailable")}</Alert>}

                <Stack direction="row" sx={{alignItems: "center"}}>
                    <Stack direction="row" spacing={0.75} sx={{alignItems: "center", flexGrow: 1}}>
                        <Tooltip title={t("currency.dragHint")}>
                            <Box
                                component="span"
                                data-drag-handle="true"
                                sx={{
                                    display: "inline-flex",
                                    p: 0.5,
                                    m: -0.5,
                                    touchAction: "none",
                                    borderRadius: "50%",
                                    "&:hover": {bgcolor: "action.hover"}
                                }}
                            >
                                <DragIndicatorIcon fontSize="small" sx={{color: "text.disabled", cursor: isDragging ? "grabbing" : "grab"}}/>
                            </Box>
                        </Tooltip>
                        {rateEntry?.result && rate !== undefined && (
                            <Typography variant="caption" sx={{color: "text.secondary"}}>
                                {t("currency.updated", {date: rateEntry.result.date})}
                                {rateEntry.result.stale ? ` · ${t("currency.stale")}` : ""}
                            </Typography>
                        )}
                    </Stack>
                    {showRemove && (
                        <Tooltip title={t("currency.removePanel")}>
                            <IconButton aria-label={t("currency.removePanel")} onClick={onRemove} size="small">
                                <DeleteOutlineIcon fontSize="small"/>
                            </IconButton>
                        </Tooltip>
                    )}
                </Stack>
            </Stack>
        </Paper>
    );
};

const CurrencyTool = () => {
    const {t} = useTranslation();
    const [panels, setPanels] = useLocalStorageState<CurrencyPanel[]>("currency.panels", DEFAULT_PANELS);
    const [usageCounts, setUsageCounts] = useLocalStorageState<Record<string, number>>("currency.usageCounts", {});

    const [currencies, setCurrencies] = React.useState<CurrencyList | null>(null);
    const [currenciesError, setCurrenciesError] = React.useState("");
    const [currenciesLoading, setCurrenciesLoading] = React.useState(true);

    const [rateEntries, setRateEntries] = React.useState<Record<string, RateEntry>>({});
    const loadingBasesRef = React.useRef<Set<string>>(new Set());

    const loadCurrencyList = React.useCallback(async () => {
        setCurrenciesLoading(true);
        setCurrenciesError("");
        try {
            const result = await loadCurrencies();
            setCurrencies(result.currencies);
        } catch (err) {
            setCurrenciesError(err instanceof Error ? err.message : t("currency.loadFailed"));
        } finally {
            setCurrenciesLoading(false);
        }
    }, [t]);

    React.useEffect(() => {
        loadCurrencyList();
    }, [loadCurrencyList]);

    const ensureRates = React.useCallback((base: string, forceRefresh = false) => {
        if (!forceRefresh && loadingBasesRef.current.has(base)) return;
        loadingBasesRef.current.add(base);
        setRateEntries(current => ({...current, [base]: {loading: true, error: "", result: current[base]?.result ?? null}}));
        loadRates(base, forceRefresh)
            .then(result => {
                setRateEntries(current => ({...current, [base]: {loading: false, error: "", result}}));
            })
            .catch(err => {
                setRateEntries(current => ({
                    ...current,
                    [base]: {loading: false, error: err instanceof Error ? err.message : t("currency.loadFailed"), result: current[base]?.result ?? null}
                }));
            })
            .finally(() => {
                loadingBasesRef.current.delete(base);
            });
    }, [t]);

    const uniqueBases = React.useMemo(() => Array.from(new Set(panels.map(panel => panel.from))), [panels]);

    React.useEffect(() => {
        uniqueBases.forEach(base => {
            if (!rateEntries[base] && !loadingBasesRef.current.has(base)) ensureRates(base);
        });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [uniqueBases, ensureRates]);

    const refreshAll = () => uniqueBases.forEach(base => ensureRates(base, true));

    const bumpUsage = (code: string) => setUsageCounts(current => ({...current, [code]: (current[code] ?? 0) + 1}));

    const updatePanel = (id: string, patch: Partial<CurrencyPanel>) => setPanels(current => current.map(panel => panel.id === id ? {...panel, ...patch} : panel));

    const removePanel = (id: string) => setPanels(current => current.filter(panel => panel.id !== id));

    const cardRefs = React.useRef(new Map<string, HTMLDivElement>());
    const pendingDragRef = React.useRef<{pointerId: number; id: string; startX: number; startY: number; timer: number | null} | null>(null);
    const [draggingId, setDraggingId] = React.useState<string | null>(null);
    const flipRectsRef = React.useRef<Map<string, DOMRect> | null>(null);

    const registerCardRef = React.useCallback((id: string, el: HTMLDivElement | null) => {
        if (el) cardRefs.current.set(id, el);
        else cardRefs.current.delete(id);
    }, []);

    const captureFlipRects = React.useCallback(() => {
        const rects = new Map<string, DOMRect>();
        cardRefs.current.forEach((el, id) => rects.set(id, el.getBoundingClientRect()));
        flipRectsRef.current = rects;
    }, []);

    const orderKey = panels.map(panel => panel.id).join(",");

    React.useLayoutEffect(() => {
        const previousRects = flipRectsRef.current;
        if (!previousRects) return;
        flipRectsRef.current = null;

        cardRefs.current.forEach((el, id) => {
            const before = previousRects.get(id);
            if (!before) return;
            const after = el.getBoundingClientRect();
            const deltaX = before.left - after.left;
            const deltaY = before.top - after.top;
            if (!deltaX && !deltaY) return;

            el.style.transition = "none";
            el.style.transform = `translate(${deltaX}px, ${deltaY}px)`;
            el.getBoundingClientRect();
            requestAnimationFrame(() => {
                el.style.transition = `transform ${REORDER_ANIMATION_MS}ms ease`;
                el.style.transform = "";
            });
            const clearTransition = () => {
                el.style.transition = "";
                el.removeEventListener("transitionend", clearTransition);
            };
            el.addEventListener("transitionend", clearTransition);
        });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [orderKey]);

    const cancelPendingDrag = React.useCallback((pointerId: number) => {
        const pending = pendingDragRef.current;
        if (pending && pending.pointerId === pointerId) {
            if (pending.timer !== null) window.clearTimeout(pending.timer);
            pendingDragRef.current = null;
        }
    }, []);

    const handleCardPointerDown = React.useCallback((id: string, event: React.PointerEvent<HTMLDivElement>) => {
        if (pendingDragRef.current || draggingId) return;

        const isMiddle = event.button === 1;
        const isRight = event.button === 2;
        const isTouch = event.pointerType === "touch";
        const isLeftOnHandle = event.button === 0 && !isTouch && (event.target as HTMLElement).closest('[data-drag-handle="true"]') !== null;
        if (!isMiddle && !isRight && !isTouch && !isLeftOnHandle) return;

        if (isMiddle || isRight || isLeftOnHandle) {
            event.preventDefault();
            setDraggingId(id);
            return;
        }

        const pointerId = event.pointerId;
        const timer = window.setTimeout(() => {
            if (pendingDragRef.current?.pointerId === pointerId) {
                pendingDragRef.current = null;
                setDraggingId(id);
            }
        }, LONG_PRESS_MS);
        pendingDragRef.current = {pointerId, id, startX: event.clientX, startY: event.clientY, timer};
    }, [draggingId]);

    const handleCardPointerMove = React.useCallback((event: React.PointerEvent<HTMLDivElement>) => {
        const pending = pendingDragRef.current;
        if (!pending || pending.pointerId !== event.pointerId) return;
        const dx = Math.abs(event.clientX - pending.startX);
        const dy = Math.abs(event.clientY - pending.startY);
        if (dx > MOVE_CANCEL_THRESHOLD_PX || dy > MOVE_CANCEL_THRESHOLD_PX) cancelPendingDrag(event.pointerId);
    }, [cancelPendingDrag]);

    const handleCardPointerUp = React.useCallback((event: React.PointerEvent<HTMLDivElement>) => {
        cancelPendingDrag(event.pointerId);
    }, [cancelPendingDrag]);

    React.useEffect(() => {
        if (!draggingId) return;

        let cooldown = false;
        let cooldownTimer: number | null = null;

        const handleWindowPointerMove = (event: PointerEvent) => {
            event.preventDefault();
            if (cooldown) return;

            let targetId: string | null = null;
            let closestDistance = Infinity;
            cardRefs.current.forEach((el, id) => {
                const rect = el.getBoundingClientRect();
                const center = rect.top + rect.height / 2;
                const distance = Math.abs(center - event.clientY);
                if (distance < closestDistance) {
                    closestDistance = distance;
                    targetId = id;
                }
            });
            if (!targetId || targetId === draggingId) return;

            cooldown = true;
            cooldownTimer = window.setTimeout(() => {
                cooldown = false;
            }, REORDER_ANIMATION_MS);

            captureFlipRects();
            setPanels(current => {
                const fromIndex = current.findIndex(panel => panel.id === draggingId);
                const toIndex = current.findIndex(panel => panel.id === targetId);
                if (fromIndex === -1 || toIndex === -1 || fromIndex === toIndex) return current;
                const next = [...current];
                const [moved] = next.splice(fromIndex, 1);
                next.splice(toIndex, 0, moved);
                return next;
            });
        };

        const handleWindowPointerUp = () => setDraggingId(null);

        window.addEventListener("pointermove", handleWindowPointerMove);
        window.addEventListener("pointerup", handleWindowPointerUp);
        window.addEventListener("pointercancel", handleWindowPointerUp);
        return () => {
            if (cooldownTimer !== null) window.clearTimeout(cooldownTimer);
            window.removeEventListener("pointermove", handleWindowPointerMove);
            window.removeEventListener("pointerup", handleWindowPointerUp);
            window.removeEventListener("pointercancel", handleWindowPointerUp);
        };
    }, [draggingId, setPanels, captureFlipRects]);

    const addPanel = () => setPanels(current => [...current, {id: crypto.randomUUID(), from: "usd", to: "eur", amount: "1", amountSide: "from"}]);

    return (
        <ToolSurface>
            <ToolHeader title={t("currency.title")} description={t("currency.description")}/>
            <Stack spacing={2}>
                {currenciesError && !currencies && <Alert severity="error">{currenciesError}</Alert>}
                {currenciesLoading && !currencies && (
                    <Stack direction="row" spacing={1} sx={{alignItems: "center"}}>
                        <CircularProgress size={20}/>
                        <Typography color="text.secondary">{t("currency.loading")}</Typography>
                    </Stack>
                )}

                {currencies && (
                    <>
                        <Stack direction="row" sx={{justifyContent: "flex-end"}}>
                            <Button startIcon={<RefreshIcon/>} onClick={refreshAll}>{t("currency.refresh")}</Button>
                        </Stack>

                        {!panels.length && <Typography color="text.secondary">{t("currency.empty")}</Typography>}

                        <Stack spacing={2}>
                            {panels.map(panel => (
                                <PanelCard
                                    key={panel.id}
                                    panel={panel}
                                    currencies={currencies}
                                    usageCounts={usageCounts}
                                    rateEntry={rateEntries[panel.from]}
                                    showRemove={panels.length > 1}
                                    isDragging={draggingId === panel.id}
                                    cardRef={el => registerCardRef(panel.id, el)}
                                    onChange={patch => updatePanel(panel.id, patch)}
                                    onRemove={() => removePanel(panel.id)}
                                    onBumpUsage={bumpUsage}
                                    onCardPointerDown={event => handleCardPointerDown(panel.id, event)}
                                    onCardPointerMove={handleCardPointerMove}
                                    onCardPointerUp={handleCardPointerUp}
                                />
                            ))}
                        </Stack>

                        <Button startIcon={<AddIcon/>} onClick={addPanel} variant="outlined" sx={{alignSelf: "flex-start"}}>
                            {t("currency.addPanel")}
                        </Button>

                        <Typography variant="caption" color="text.secondary" sx={{textAlign: "center"}}>
                            {t("currency.dataProvider")}{" "}
                            <Link
                                href="https://github.com/fawazahmed0/exchange-api"
                                target="_blank"
                                rel="noopener noreferrer"
                                color="text.secondary"
                            >
                                fawazahmed0/exchange-api
                            </Link>
                        </Typography>
                    </>
                )}
            </Stack>
        </ToolSurface>
    );
};

export default CurrencyTool;
