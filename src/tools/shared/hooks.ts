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
