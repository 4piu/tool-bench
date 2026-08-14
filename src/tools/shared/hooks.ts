import React from "react";

export const useLocalStorageState = <T,>(key: string, initialValue: T) => {
    const [value, setValue] = React.useState<T>(() => {
        try {
            const stored = localStorage.getItem(key);
            return stored ? JSON.parse(stored) as T : initialValue;
        } catch {
            return initialValue;
        }
    });

    React.useEffect(() => {
        localStorage.setItem(key, JSON.stringify(value));
    }, [key, value]);

    return [value, setValue] as const;
};

const currentFullscreenElement = () => document.fullscreenElement ?? document.webkitFullscreenElement ?? null;
// iOS Safari doesn't implement the Fullscreen API for arbitrary elements at all.
const fullscreenSupported = () => Boolean(document.fullscreenEnabled || document.webkitFullscreenEnabled);

export const useFullscreen = (ref: React.RefObject<HTMLElement | null>) => {
    const [isFullscreen, setIsFullscreen] = React.useState(false);
    // Set when a request/exit is rejected (e.g. Safari can refuse requestFullscreen() while a
    // live getUserMedia video is playing, and per spec the attempt still consumes the click's
    // transient activation either way - so a same-gesture retry can never work here, only a
    // fresh click can). Surfaced so the UI can tell the user to just click again.
    const [error, setError] = React.useState<string | null>(null);

    React.useEffect(() => {
        const handleFullscreenChange = () => setIsFullscreen(currentFullscreenElement() === ref.current);
        document.addEventListener("fullscreenchange", handleFullscreenChange);
        document.addEventListener("webkitfullscreenchange", handleFullscreenChange);
        return () => {
            document.removeEventListener("fullscreenchange", handleFullscreenChange);
            document.removeEventListener("webkitfullscreenchange", handleFullscreenChange);
        };
    }, [ref]);

    const toggle = React.useCallback(() => {
        const el = ref.current;
        if (!el) return;
        setError(null);
        const fail = (err: unknown) => setError(err instanceof Error ? err.message : String(err));
        if (currentFullscreenElement() === el) {
            if (document.exitFullscreen) void document.exitFullscreen().catch(fail);
            else document.webkitExitFullscreen?.();
            return;
        }
        if (el.requestFullscreen) void el.requestFullscreen().catch(fail);
        else el.webkitRequestFullscreen?.();
    }, [ref]);

    return {isFullscreen, toggle, isSupported: fullscreenSupported(), error, clearError: () => setError(null)} as const;
};

export const useAsyncTask = () => {
    const [running, setRunning] = React.useState(false);
    const cancelledRef = React.useRef(false);

    const run = React.useCallback(async (task: (isCancelled: () => boolean) => Promise<void>) => {
        cancelledRef.current = false;
        setRunning(true);
        try {
            await task(() => cancelledRef.current);
        } finally {
            setRunning(false);
        }
    }, []);

    const cancel = React.useCallback(() => {
        cancelledRef.current = true;
    }, []);

    return {running, run, cancel, isCancelled: () => cancelledRef.current} as const;
};
