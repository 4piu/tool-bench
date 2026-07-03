import React from "react";
import BrightnessAutoIcon from "@mui/icons-material/BrightnessAuto";
import CloseIcon from "@mui/icons-material/Close";
import DarkModeIcon from "@mui/icons-material/DarkMode";
import HomeIcon from "@mui/icons-material/Home";
import LightModeIcon from "@mui/icons-material/LightMode";
import SearchIcon from "@mui/icons-material/Search";
import TranslateIcon from "@mui/icons-material/Translate";
import {
    AppBar,
    Box,
    Card,
    CardActionArea,
    CardContent,
    CircularProgress,
    Container,
    Grid,
    IconButton,
    Paper,
    Stack,
    TextField,
    Toolbar,
    Typography
} from "@mui/material";
import {useTranslation} from "react-i18next";
import {findTool, tools} from "./tools/registry";
import type {ToolId} from "./tools/types";
import {useLanguageMode, type LanguageMode} from "./lib/language";
import {useThemeMode, type ThemeMode} from "./lib/theme";

const toolFromHash = () => {
    const toolId = window.location.hash.replace(/^#\/?/, "");
    return findTool(toolId as ToolId) ? toolId as ToolId : "home";
};

const LOADING_INDICATOR_DELAY_MS = 200;

const LoadingTool = () => {
    const {t} = useTranslation();
    const [show, setShow] = React.useState(false);

    React.useEffect(() => {
        const timer = window.setTimeout(() => setShow(true), LOADING_INDICATOR_DELAY_MS);
        return () => window.clearTimeout(timer);
    }, []);

    if (!show) return null;

    return (
        <Container maxWidth="md" sx={{py: 6, textAlign: "center"}}>
            <CircularProgress/>
            <Typography sx={{mt: 2}} color="text.secondary">{t("app.loadingTool")}</Typography>
        </Container>
    );
};

const THEME_MODE_ICONS: Record<ThemeMode, React.ReactNode> = {
    system: <BrightnessAutoIcon/>,
    light: <LightModeIcon/>,
    dark: <DarkModeIcon/>
};

const NEXT_THEME_MODE: Record<ThemeMode, ThemeMode> = {
    system: "light",
    light: "dark",
    dark: "system"
};

const ThemeToggle = () => {
    const {t} = useTranslation();
    const {mode, setMode} = useThemeMode();
    const label = t(`theme.${mode}`);

    return (
        <IconButton
            color="inherit"
            aria-label={`${label}. Click to change.`}
            title={label}
            onClick={() => setMode(NEXT_THEME_MODE[mode])}
        >
            {THEME_MODE_ICONS[mode]}
        </IconButton>
    );
};

const NEXT_LANGUAGE_MODE: Record<LanguageMode, LanguageMode> = {
    system: "en",
    en: "zh",
    zh: "system"
};

const LanguageToggle = () => {
    const {t} = useTranslation();
    const {mode, setMode} = useLanguageMode();
    const label = t(`language.${mode}`);

    return (
        <IconButton
            color="inherit"
            aria-label={`${label}. Click to change.`}
            title={label}
            onClick={() => setMode(NEXT_LANGUAGE_MODE[mode])}
        >
            <TranslateIcon/>
        </IconButton>
    );
};

const Home = ({onSelectTool}: { onSelectTool: (toolId: ToolId) => void }) => {
    const {t} = useTranslation();
    const [query, setQuery] = React.useState("");
    const filteredTools = tools.filter(tool => `${t(tool.titleKey)} ${t(tool.descriptionKey)} ${tool.id}`.toLowerCase().includes(query.toLowerCase()));

    return (
        <Container maxWidth="lg" sx={{py: 5}}>
            <Stack spacing={2} sx={{mb: 4}}>
                <Typography color="text.secondary">{t("app.tagline")}</Typography>
                <TextField label={t("app.searchLabel")} value={query} onChange={event => setQuery(event.target.value)} fullWidth/>
            </Stack>
            <Grid container spacing={2}>
                {filteredTools.map(tool => (
                    <Grid key={tool.id} size={{xs: 12, sm: 6, md: 4}}>
                        <Card variant="outlined" sx={{height: "100%", borderRadius: 3}}>
                            <CardActionArea onClick={() => onSelectTool(tool.id)} sx={{height: "100%"}}>
                                <CardContent>
                                    <Stack direction="row" spacing={2} sx={{alignItems: "center"}}>
                                        <Box sx={{color: "primary.main", display: "flex"}}>{tool.icon}</Box>
                                        <Box>
                                            <Typography variant="h6">{t(tool.titleKey)}</Typography>
                                            <Typography variant="body2" color="text.secondary">{t(tool.descriptionKey)}</Typography>
                                        </Box>
                                    </Stack>
                                </CardContent>
                            </CardActionArea>
                        </Card>
                    </Grid>
                ))}
            </Grid>
        </Container>
    );
};

const ToolSearch = ({activeTool, onSelectTool}: {
    activeTool: ToolId | "home";
    onSelectTool: (toolId: ToolId) => void;
}) => {
    const {t} = useTranslation();
    const [query, setQuery] = React.useState("");
    const [open, setOpen] = React.useState(false);
    const [expanded, setExpanded] = React.useState(false);
    const containerRef = React.useRef<HTMLDivElement | null>(null);
    const filteredTools = tools.filter(tool => `${t(tool.titleKey)} ${t(tool.descriptionKey)} ${tool.id}`.toLowerCase().includes(query.toLowerCase()));
    const activeToolDefinition = activeTool !== "home" ? findTool(activeTool) : undefined;

    const closeSearch = () => {
        setOpen(false);
        setExpanded(false);
    };

    const selectTool = (toolId: ToolId) => {
        onSelectTool(toolId);
        setQuery("");
        closeSearch();
    };

    React.useEffect(() => {
        if (!open) return;
        const handlePointerDown = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                closeSearch();
            }
        };
        document.addEventListener("mousedown", handlePointerDown);
        return () => document.removeEventListener("mousedown", handlePointerDown);
    }, [open]);

    const resultRows = (
        <>
            {filteredTools.map(tool => (
                <Box
                    key={tool.id}
                    role="button"
                    tabIndex={0}
                    onMouseDown={event => event.preventDefault()}
                    onClick={() => selectTool(tool.id)}
                    onKeyDown={event => {
                        if (event.key === "Enter") selectTool(tool.id);
                    }}
                    sx={{
                        borderRadius: 1,
                        cursor: "pointer",
                        p: 1,
                        "&:hover, &:focus": {
                            bgcolor: "action.hover",
                            outline: "none"
                        }
                    }}
                >
                    <Stack direction="row" spacing={1.5} sx={{alignItems: "center"}}>
                        <Box sx={{color: "primary.main", display: "flex"}}>{tool.icon}</Box>
                        <Box>
                            <Typography variant="body2">{t(tool.titleKey)}</Typography>
                            <Typography variant="caption" color="text.secondary">{t(tool.descriptionKey)}</Typography>
                        </Box>
                    </Stack>
                </Box>
            ))}
            {!filteredTools.length && (
                <Typography variant="body2" color="text.secondary" sx={{p: 1.5}}>
                    {t("app.noMatchingTools")}
                </Typography>
            )}
        </>
    );

    return (
        <Box ref={containerRef} sx={{position: "relative", ml: {xs: "auto", sm: 2}, width: {sm: 280, md: 360}}}>
            <IconButton
                color="inherit"
                aria-label={t("app.searchLabel")}
                onClick={() => setExpanded(current => {
                    const next = !current;
                    setOpen(next);
                    return next;
                })}
                sx={{display: {xs: "inline-flex", sm: "none"}}}
            >
                <SearchIcon/>
            </IconButton>
            <TextField
                size="small"
                label={t("app.searchLabel")}
                value={query}
                onChange={event => {
                    setQuery(event.target.value);
                    setOpen(true);
                }}
                onFocus={() => setOpen(true)}
                onBlur={() => window.setTimeout(() => {
                    if (!containerRef.current?.contains(document.activeElement)) closeSearch();
                }, 0)}
                onKeyDown={event => {
                    if (event.key === "Enter" && filteredTools[0]) selectTool(filteredTools[0].id);
                    if (event.key === "Escape") closeSearch();
                }}
                placeholder={activeToolDefinition ? t(activeToolDefinition.titleKey) : t("app.searchPlaceholder")}
                fullWidth
                sx={{
                    display: {xs: "none", sm: "block"},
                    "& .MuiInputBase-root": {
                        bgcolor: "background.paper"
                    }
                }}
            />
            {open && (
                <Paper
                    elevation={6}
                    sx={{
                        display: {xs: "none", sm: "block"},
                        position: "absolute",
                        top: "calc(100% + 8px)",
                        right: 0,
                        zIndex: theme => theme.zIndex.appBar + 1,
                        width: "min(420px, 90vw)",
                        maxHeight: 360,
                        overflow: "auto",
                        p: 0.5
                    }}
                >
                    {resultRows}
                </Paper>
            )}
            {expanded && (
                <Paper
                    elevation={6}
                    square
                    sx={{
                        display: {xs: "flex", sm: "none"},
                        flexDirection: "column",
                        position: "fixed",
                        left: 0,
                        right: 0,
                        top: 0,
                        maxHeight: "100dvh",
                        zIndex: theme => theme.zIndex.appBar + 1
                    }}
                >
                    <Stack direction="row" spacing={1} sx={{alignItems: "center", p: 1}}>
                        <TextField
                            size="small"
                            label={t("app.searchLabel")}
                            value={query}
                            autoFocus
                            onChange={event => {
                                setQuery(event.target.value);
                                setOpen(true);
                            }}
                            onKeyDown={event => {
                                if (event.key === "Enter" && filteredTools[0]) selectTool(filteredTools[0].id);
                                if (event.key === "Escape") closeSearch();
                            }}
                            placeholder={activeToolDefinition ? t(activeToolDefinition.titleKey) : t("app.searchPlaceholder")}
                            fullWidth
                        />
                        <IconButton aria-label={t("app.closeSearch")} onClick={closeSearch}>
                            <CloseIcon/>
                        </IconButton>
                    </Stack>
                    <Box sx={{overflow: "auto", px: 1, pb: 1, minHeight: 0}}>
                        {resultRows}
                    </Box>
                </Paper>
            )}
        </Box>
    );
};

const App = () => {
    const {t} = useTranslation();
    const [activeTool, setActiveTool] = React.useState<ToolId | "home">(() => toolFromHash());
    const selectedTool = findTool(activeTool);
    const ActiveComponent = React.useMemo(
        () => selectedTool ? React.lazy(selectedTool.loader) : null,
        [selectedTool]
    );

    React.useEffect(() => {
        document.title = selectedTool ? `ToolBench - ${t(selectedTool.titleKey)}` : "ToolBench";
    }, [selectedTool, t]);

    React.useEffect(() => {
        const handleHashChange = () => setActiveTool(toolFromHash());
        window.addEventListener("hashchange", handleHashChange);
        return () => window.removeEventListener("hashchange", handleHashChange);
    }, []);

    const selectTool = (toolId: ToolId | "home") => {
        window.location.hash = toolId === "home" ? "" : `/${toolId}`;
        setActiveTool(toolId);
    };

    return (
        <Box sx={{minHeight: "100dvh", display: "flex", flexDirection: "column"}}>
            <AppBar position="sticky" elevation={0} sx={{borderBottom: 1, borderColor: "divider"}}>
                <Toolbar>
                    {activeTool !== "home" && (
                        <IconButton color="inherit" edge="start" onClick={() => selectTool("home")} sx={{mr: 1}}>
                            <HomeIcon/>
                        </IconButton>
                    )}
                    <Typography variant="h6" sx={{display: {xs: "none", sm: "block"}, flex: 1}}>ToolBench</Typography>
                    <Box sx={{display: {xs: "block", sm: "none"}, flex: 1}}/>
                    <SearchIcon sx={{ml: 2, mr: 1, display: {xs: "none", sm: "block"}}}/>
                    <ToolSearch activeTool={activeTool} onSelectTool={selectTool}/>
                    <LanguageToggle/>
                    <ThemeToggle/>
                </Toolbar>
            </AppBar>

            <Box component="main" sx={{flex: 1}}>
                {activeTool === "home" || !selectedTool || !ActiveComponent ? (
                    <Home onSelectTool={selectTool}/>
                ) : (
                    <React.Suspense fallback={<LoadingTool/>}>
                        <ActiveComponent/>
                    </React.Suspense>
                )}
            </Box>

            <Box
                component="footer"
                sx={{
                    bgcolor: theme => theme.palette.mode === "dark" ? "grey.950" : "grey.900",
                    color: "grey.400"
                }}
            >
                <Container maxWidth="lg" sx={{py: 3}}>
                    <Typography variant="body2" color="inherit">
                        {t("app.footer")}
                    </Typography>
                </Container>
            </Box>
        </Box>
    );
};

export default App;
