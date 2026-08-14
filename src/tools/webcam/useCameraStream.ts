import React from "react";

export type CameraStatus = "idle" | "starting" | "active" | "error";
export type CameraErrorCode = "insecure" | "unsupported" | "denied" | "not-found" | "overconstrained" | "disconnected" | "unknown";

const errorCodeFor = (error: unknown): CameraErrorCode => {
    const name = error instanceof Error ? error.name : "";
    if (name === "NotAllowedError" || name === "SecurityError") return "denied";
    if (name === "NotFoundError") return "not-found";
    if (name === "OverconstrainedError") return "overconstrained";
    return "unknown";
};

/**
 * Owns the getUserMedia lifecycle for a single camera. Unlike ScannerTool's camera handling,
 * this deliberately does NOT stop the stream when the tab is hidden - a webcam view or an
 * in-progress recording shouldn't die just because the user switched tabs.
 */
export const useCameraStream = (deviceId: string | undefined, enabled: boolean) => {
    const [status, setStatus] = React.useState<CameraStatus>("idle");
    const [errorCode, setErrorCode] = React.useState<CameraErrorCode | null>(null);
    const [capabilities, setCapabilities] = React.useState<MediaTrackCapabilities | null>(null);
    const [settings, setSettings] = React.useState<MediaTrackSettings | null>(null);
    const [stream, setStream] = React.useState<MediaStream | null>(null);

    const videoRef = React.useRef<HTMLVideoElement | null>(null);
    const streamRef = React.useRef<MediaStream | null>(null);
    const sessionRef = React.useRef(0);
    const activeDeviceIdRef = React.useRef<string | undefined>(undefined);

    const release = React.useCallback((updateState = true) => {
        sessionRef.current += 1;
        streamRef.current?.getTracks().forEach(track => track.stop());
        streamRef.current = null;
        activeDeviceIdRef.current = undefined;
        if (videoRef.current) videoRef.current.srcObject = null;
        if (updateState) {
            setStatus("idle");
            setErrorCode(null);
            setCapabilities(null);
            setSettings(null);
            setStream(null);
        }
    }, []);

    const refreshTrackInfo = React.useCallback((track: MediaStreamTrack) => {
        setCapabilities(track.getCapabilities ? track.getCapabilities() : null);
        setSettings(track.getSettings ? track.getSettings() : null);
    }, []);

    React.useEffect(() => {
        if (!enabled) {
            release();
            return;
        }
        // Already streaming this exact device (e.g. the picker just caught up to the device
        // a generic/unconstrained request resolved to) - avoid an unnecessary restart.
        if (deviceId && streamRef.current && activeDeviceIdRef.current === deviceId) {
            return;
        }
        if (!window.isSecureContext) {
            setStatus("error");
            setErrorCode("insecure");
            return;
        }
        if (!navigator.mediaDevices?.getUserMedia) {
            setStatus("error");
            setErrorCode("unsupported");
            return;
        }

        release();
        const session = sessionRef.current;
        setStatus("starting");
        setErrorCode(null);

        (async () => {
            try {
                const newStream = await navigator.mediaDevices.getUserMedia({
                    audio: false,
                    video: {
                        deviceId: deviceId ? {exact: deviceId} : undefined,
                        width: {ideal: 1920},
                        height: {ideal: 1080},
                        frameRate: {ideal: 30}
                    }
                });
                if (session !== sessionRef.current) {
                    newStream.getTracks().forEach(track => track.stop());
                    return;
                }
                streamRef.current = newStream;
                const video = videoRef.current;
                if (video) {
                    video.srcObject = newStream;
                    await video.play();
                }
                const track = newStream.getVideoTracks()[0];
                if (track) {
                    refreshTrackInfo(track);
                    activeDeviceIdRef.current = track.getSettings ? track.getSettings().deviceId : undefined;
                    track.addEventListener("ended", () => {
                        if (session !== sessionRef.current) return;
                        setStatus("error");
                        setErrorCode("disconnected");
                    });
                }
                setStream(newStream);
                setStatus("active");
            } catch (error) {
                if (session !== sessionRef.current) return;
                release(false);
                setStatus("error");
                setErrorCode(errorCodeFor(error));
            }
        })();

        return () => release(false);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [deviceId, enabled]);

    const applyConstraint = React.useCallback(async (patch: MediaTrackConstraintSet) => {
        const track = streamRef.current?.getVideoTracks()[0];
        if (!track) return;
        await track.applyConstraints({advanced: [patch]});
        refreshTrackInfo(track);
    }, [refreshTrackInfo]);

    return {videoRef, status, errorCode, capabilities, settings, stream, applyConstraint} as const;
};
