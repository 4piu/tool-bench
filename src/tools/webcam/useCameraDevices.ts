import React from "react";

export const useCameraDevices = () => {
    const [devices, setDevices] = React.useState<MediaDeviceInfo[]>([]);

    const refresh = React.useCallback(async () => {
        if (!navigator.mediaDevices?.enumerateDevices) return;
        const all = await navigator.mediaDevices.enumerateDevices();
        // Safari (unlike Chrome) reports every device with a blank deviceId/label until the
        // origin has been granted camera access at least once - those entries aren't selectable.
        setDevices(all.filter(device => device.kind === "videoinput" && device.deviceId));
    }, []);

    React.useEffect(() => {
        void refresh();
        const mediaDevices = navigator.mediaDevices;
        if (!mediaDevices) return;
        mediaDevices.addEventListener("devicechange", refresh);
        return () => mediaDevices.removeEventListener("devicechange", refresh);
    }, [refresh]);

    return {devices, refresh} as const;
};
