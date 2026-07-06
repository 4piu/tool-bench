const JSDELIVR_BASE = "https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1";
const FALLBACK_BASE = "https://latest.currency-api.pages.dev/v1";

const CURRENCIES_CACHE_KEY = "toolbench.currency.currencies";
const CURRENCIES_META_KEY = "toolbench.currency.currencies.meta";
const RATES_CACHE_PREFIX = "toolbench.currency.rates.";
const RATES_META_PREFIX = "toolbench.currency.ratesMeta.";

const CURRENCIES_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const RATES_TTL_MS = 12 * 60 * 60 * 1000;

export type CurrencyList = Record<string, string>;

type CacheMeta = {
    fetchedAt: number;
};

const readJson = <T,>(key: string): T | null => {
    try {
        const raw = localStorage.getItem(key);
        return raw ? JSON.parse(raw) as T : null;
    } catch {
        return null;
    }
};

const writeJson = (key: string, value: unknown) => {
    try {
        localStorage.setItem(key, JSON.stringify(value));
    } catch {
        // Storage full or unavailable; the fetched data still works for this session.
    }
};

const fetchJsonWithFallback = async (path: string): Promise<unknown> => {
    try {
        const response = await fetch(`${JSDELIVR_BASE}${path}`, {cache: "no-store"});
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return await response.json();
    } catch {
        const response = await fetch(`${FALLBACK_BASE}${path}`, {cache: "no-store"});
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return await response.json();
    }
};

export type CurrenciesResult = {
    currencies: CurrencyList;
    fetchedAt: number;
    stale: boolean;
};

export const loadCurrencies = async (forceRefresh = false): Promise<CurrenciesResult> => {
    const meta = readJson<CacheMeta>(CURRENCIES_META_KEY);
    const cached = readJson<CurrencyList>(CURRENCIES_CACHE_KEY);
    const isFresh = Boolean(meta && cached && Date.now() - meta.fetchedAt < CURRENCIES_TTL_MS);

    if (!forceRefresh && isFresh && cached && meta) {
        return {currencies: cached, fetchedAt: meta.fetchedAt, stale: false};
    }

    try {
        const data = await fetchJsonWithFallback("/currencies.min.json") as CurrencyList;
        const fetchedAt = Date.now();
        writeJson(CURRENCIES_CACHE_KEY, data);
        writeJson(CURRENCIES_META_KEY, {fetchedAt} satisfies CacheMeta);
        return {currencies: data, fetchedAt, stale: false};
    } catch (err) {
        if (cached && meta) return {currencies: cached, fetchedAt: meta.fetchedAt, stale: true};
        throw err;
    }
};

export type RatesResult = {
    rates: Record<string, number>;
    date: string;
    fetchedAt: number;
    stale: boolean;
};

export const loadRates = async (base: string, forceRefresh = false): Promise<RatesResult> => {
    const cacheKey = RATES_CACHE_PREFIX + base;
    const metaKey = RATES_META_PREFIX + base;
    const meta = readJson<CacheMeta>(metaKey);
    const cached = readJson<{ date: string; rates: Record<string, number> }>(cacheKey);
    const isFresh = Boolean(meta && cached && Date.now() - meta.fetchedAt < RATES_TTL_MS);

    if (!forceRefresh && isFresh && cached && meta) {
        return {rates: cached.rates, date: cached.date, fetchedAt: meta.fetchedAt, stale: false};
    }

    try {
        const data = await fetchJsonWithFallback(`/currencies/${base}.min.json`) as Record<string, unknown>;
        const date = data.date as string;
        const rates = data[base] as Record<string, number>;
        const fetchedAt = Date.now();
        writeJson(cacheKey, {date, rates});
        writeJson(metaKey, {fetchedAt} satisfies CacheMeta);
        return {rates, date, fetchedAt, stale: false};
    } catch (err) {
        if (cached && meta) return {rates: cached.rates, date: cached.date, fetchedAt: meta.fetchedAt, stale: true};
        throw err;
    }
};
