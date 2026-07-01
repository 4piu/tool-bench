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
