import React from "react";

const MIME_TYPE_CANDIDATES = ["video/webm;codecs=vp9,opus", "video/webm;codecs=vp8,opus", "video/webm", "video/mp4"];

const pickMimeType = () => {
    if (typeof MediaRecorder === "undefined") return "";
    return MIME_TYPE_CANDIDATES.find(type => MediaRecorder.isTypeSupported(type)) ?? "";
};

export type RecordingResult = { blob: Blob; mimeType: string };

export const useCameraRecorder = (stream: MediaStream | null) => {
    const [isRecording, setIsRecording] = React.useState(false);
    const [elapsedMs, setElapsedMs] = React.useState(0);

    const recorderRef = React.useRef<MediaRecorder | null>(null);
    const chunksRef = React.useRef<Blob[]>([]);
    const mimeTypeRef = React.useRef("");
    const timerRef = React.useRef<number | null>(null);
    const startedAtRef = React.useRef(0);

    const stopTimer = React.useCallback(() => {
        if (timerRef.current !== null) window.clearInterval(timerRef.current);
        timerRef.current = null;
    }, []);

    const start = React.useCallback(() => {
        if (!stream || recorderRef.current) return false;
        const mimeType = pickMimeType();
        const recorder = new MediaRecorder(stream, mimeType ? {mimeType} : undefined);
        mimeTypeRef.current = mimeType;
        chunksRef.current = [];
        recorder.addEventListener("dataavailable", event => {
            if (event.data.size > 0) chunksRef.current.push(event.data);
        });
        recorder.start();
        recorderRef.current = recorder;
        startedAtRef.current = Date.now();
        setElapsedMs(0);
        setIsRecording(true);
        stopTimer();
        timerRef.current = window.setInterval(() => setElapsedMs(Date.now() - startedAtRef.current), 500);
        return true;
    }, [stream, stopTimer]);

    const stop = React.useCallback((): Promise<RecordingResult | null> => {
        const recorder = recorderRef.current;
        if (!recorder) return Promise.resolve(null);
        return new Promise(resolve => {
            recorder.addEventListener("stop", () => {
                stopTimer();
                setIsRecording(false);
                recorderRef.current = null;
                const blob = new Blob(chunksRef.current, {type: mimeTypeRef.current || "video/webm"});
                chunksRef.current = [];
                resolve({blob, mimeType: mimeTypeRef.current || "video/webm"});
            }, {once: true});
            recorder.stop();
        });
    }, [stopTimer]);

    React.useEffect(() => () => {
        stopTimer();
        recorderRef.current?.stop();
        recorderRef.current = null;
    }, [stopTimer]);

    return {isRecording, elapsedMs, start, stop} as const;
};
