const DATA_URL = "https://cdn.jsdelivr.net/gh/4piu/oui-data@master/data/lms.json";
const META_KEY = "toolbench.oui.meta";
const DATA_KEY = "toolbench.oui.data";
const TTL_MS = 7 * 24 * 60 * 60 * 1000;

export type OuiEntries = Record<string, string>;

type OuiMeta = {
    fetchedAt: number;
};

const readMeta = (): OuiMeta | null => {
    try {
        const raw = localStorage.getItem(META_KEY);
        return raw ? JSON.parse(raw) as OuiMeta : null;
    } catch {
        return null;
    }
};

const writeCache = (text: string, fetchedAt: number) => {
    try {
        localStorage.setItem(DATA_KEY, text);
        localStorage.setItem(META_KEY, JSON.stringify({fetchedAt} satisfies OuiMeta));
    } catch {
        // Storage full or unavailable; the fetched data still works for this session.
    }
};

export type OuiLoadResult = {
    entries: OuiEntries;
    fetchedAt: number;
    stale: boolean;
};

export const loadOuiEntries = async (forceRefresh = false): Promise<OuiLoadResult> => {
    const meta = readMeta();
    const cachedText = localStorage.getItem(DATA_KEY);
    const isFresh = Boolean(meta && cachedText && Date.now() - meta.fetchedAt < TTL_MS);

    if (!forceRefresh && isFresh && cachedText && meta) {
        return {entries: JSON.parse(cachedText) as OuiEntries, fetchedAt: meta.fetchedAt, stale: false};
    }

    try {
        const response = await fetch(DATA_URL, {cache: "no-store"});
        if (!response.ok) throw new Error(`Fetch failed: HTTP ${response.status}`);
        const text = await response.text();
        const entries = JSON.parse(text) as OuiEntries;
        const fetchedAt = Date.now();
        writeCache(text, fetchedAt);
        return {entries, fetchedAt, stale: false};
    } catch (err) {
        if (cachedText && meta) {
            return {entries: JSON.parse(cachedText) as OuiEntries, fetchedAt: meta.fetchedAt, stale: true};
        }
        throw err;
    }
};

const PREFIX_LENGTHS = [9, 7, 6] as const;

export type OuiRegistry = "MA-L" | "MA-M" | "MA-S";

export type OuiIndex = Map<number, Map<string, string>>;

export const buildOuiIndex = (entries: OuiEntries): OuiIndex => {
    const index: OuiIndex = new Map(PREFIX_LENGTHS.map(length => [length, new Map<string, string>()]));
    for (const [prefix, vendor] of Object.entries(entries)) {
        index.get(prefix.length)?.set(prefix, vendor);
    }
    return index;
};

const registryForLength = (length: number): OuiRegistry => length === 9 ? "MA-S" : length === 7 ? "MA-M" : "MA-L";

export type OuiMatch = {
    prefix: string;
    registry: OuiRegistry;
    vendor: string;
};

export const lookupOui = (index: OuiIndex, hex: string): OuiMatch | null => {
    for (const length of PREFIX_LENGTHS) {
        if (hex.length < length) continue;
        const candidate = hex.slice(0, length);
        const vendor = index.get(length)?.get(candidate);
        if (vendor) return {prefix: candidate, registry: registryForLength(length), vendor};
    }
    return null;
};

export type ParsedMacLine = {
    raw: string;
    hex: string | null;
    formatted: string | null;
    error: string | null;
};

const formatHex = (hex: string) => hex.length === 12 ? (hex.match(/.{2}/g) ?? [hex]).join(":") : hex;

export const parseMacLine = (line: string): ParsedMacLine => {
    const trimmed = line.trim();
    if (!trimmed) return {raw: line, hex: null, formatted: null, error: null};

    const stripped = trimmed.replace(/[:\-.\s]/g, "");
    if (!/^[0-9A-Fa-f]+$/.test(stripped)) {
        return {raw: line, hex: null, formatted: null, error: "Contains non-hex characters"};
    }
    if (stripped.length < 6) {
        return {raw: line, hex: null, formatted: null, error: "Too short — need at least 6 hex digits"};
    }
    if (stripped.length > 12) {
        return {raw: line, hex: null, formatted: null, error: "Too long — a MAC is at most 12 hex digits"};
    }

    const hex = stripped.toUpperCase();
    return {raw: line, hex, formatted: formatHex(hex), error: null};
};
