import React from "react";
import {v4 as uuidV4} from "uuid";
import AddIcon from "@mui/icons-material/Add";
import CancelIcon from "@mui/icons-material/Cancel";
import DeleteIcon from "@mui/icons-material/Delete";
import {Box, Button, FormControl, IconButton, InputLabel, LinearProgress, MenuItem, Paper, Select, Stack, Tooltip, Typography} from "@mui/material";
import type {SelectChangeEvent} from "@mui/material/Select";
import {useTranslation} from "react-i18next";
import FileHashWorker from "../../workers/fileHash.worker.ts?worker";
import type {HashWorkerMessage} from "../../workers/fileHash.worker";
import {copyText, downloadText} from "../shared/browser";
import {useAsyncTask, useLocalStorageState} from "../shared/hooks";
import {CopyButton, DownloadButton, ToolHeader, ToolSurface} from "../shared/ToolScaffold";

type HashJob = {
    taskId: string;
    file: File;
    hashAlgorithm: string;
    resultMd5?: string;
    resultSha1?: string;
    resultSha256?: string;
    resultSha512?: string;
    error?: string;
    progress?: number;
    status?: "pending" | "processing" | "done" | "error" | "cancelled";
};

const algorithms = ["MD5", "SHA-1", "SHA-256", "SHA-512", "ALL"];
const resultEntries = (job: HashJob) => [
    ["MD5", job.resultMd5],
    ["SHA-1", job.resultSha1],
    ["SHA-256", job.resultSha256],
    ["SHA-512", job.resultSha512]
].filter((entry): entry is [string, string] => Boolean(entry[1]));
const resultForHash = (job: HashJob) => resultEntries(job).map(([name, value]) => `${name}: ${value}`).join("\n");

const HashTool = () => {
    const {t} = useTranslation();
    const [algorithm, setAlgorithm] = useLocalStorageState("hash.algorithm", "SHA-256");
    const [concurrency, setConcurrency] = useLocalStorageState("hash.concurrency", Math.min(navigator.hardwareConcurrency || 1, 4));
    const [jobs, setJobs] = React.useState<HashJob[]>([]);
    const {running: processing, run, cancel} = useAsyncTask();
    const workersRef = React.useRef<Map<string, Worker>>(new Map());
    const resolversRef = React.useRef<Map<string, (job: HashJob | null) => void>>(new Map());
    const cancelledTaskIdsRef = React.useRef<Set<string>>(new Set());

    const addFiles = (files: FileList | null) => {
        if (!files) return;
        setJobs(current => current.concat(Array.from(files).map(file => ({
            taskId: uuidV4(),
            file,
            hashAlgorithm: algorithm,
            status: "pending"
        }))));
    };

    const runJob = (job: HashJob) => new Promise<HashJob | null>(resolve => {
        const worker = new FileHashWorker();
        workersRef.current.set(job.taskId, worker);
        resolversRef.current.set(job.taskId, resolve);
        worker.addEventListener("message", event => {
            const message = event.data as HashWorkerMessage;
            if (message.type === "progress") {
                setJobs(current => current.map(item => item.taskId === message.taskId ? {...item, progress: message.progress} : item));
                return;
            }
            workersRef.current.delete(job.taskId);
            resolversRef.current.delete(job.taskId);
            worker.terminate();
            resolve(message.job);
        });
        worker.postMessage(job);
    });

    const cleanupJob = (taskId: string) => {
        cancelledTaskIdsRef.current.add(taskId);
        workersRef.current.get(taskId)?.terminate();
        workersRef.current.delete(taskId);
        resolversRef.current.get(taskId)?.(null);
        resolversRef.current.delete(taskId);
    };

    const cancelJob = (taskId: string) => {
        cleanupJob(taskId);
        setJobs(current => current.map(item => item.taskId === taskId ? {...item, status: "cancelled", progress: undefined} : item));
    };

    const removeJob = (taskId: string) => {
        cleanupJob(taskId);
        setJobs(current => current.filter(item => item.taskId !== taskId));
    };

    const cancelAll = () => {
        cancel();
        jobs.filter(job => job.status === "pending" || job.status === "processing").forEach(job => cancelJob(job.taskId));
    };

    const hashAll = () => run(async isCancelled => {
        cancelledTaskIdsRef.current.clear();
        const queue: HashJob[] = jobs.map(job => ({...job, status: "pending", progress: undefined, error: undefined}));
        setJobs(queue);
        let cursor = 0;
        const workerCount = Math.max(1, Math.min(concurrency, queue.length));

        const runNext = async (): Promise<void> => {
            if (isCancelled()) return;
            const index = cursor++;
            if (index >= queue.length) return;
            const job = queue[index];
            if (cancelledTaskIdsRef.current.has(job.taskId)) return runNext();
            setJobs(current => current.map(item => item.taskId === job.taskId ? {...item, status: "processing", progress: 0} : item));
            const result = await runJob(job);
            if (result && !cancelledTaskIdsRef.current.has(job.taskId)) {
                setJobs(current => current.map(item => item.taskId === job.taskId ? {...result, status: result.error ? "error" : "done"} : item));
            }
            await runNext();
        };

        await Promise.all(Array.from({length: workerCount}, runNext));
    });

    const updateJobAlgorithm = (taskId: string, nextAlgorithm: string) => {
        setJobs(current => current.map(job => job.taskId === taskId ? {
            ...job,
            hashAlgorithm: nextAlgorithm,
            status: "pending",
            resultMd5: undefined,
            resultSha1: undefined,
            resultSha256: undefined,
            resultSha512: undefined,
            error: undefined
        } : job));
    };

    const exportRows = () => jobs
        .map(job => ({
            file: job.file.name,
            algorithm: job.hashAlgorithm,
            md5: job.resultMd5 ?? "",
            sha1: job.resultSha1 ?? "",
            sha256: job.resultSha256 ?? "",
            sha512: job.resultSha512 ?? "",
            error: job.error ?? ""
        }));

    const exportCsv = () => [
        "file,algorithm,md5,sha1,sha256,sha512,error",
        ...exportRows().map(row => [row.file, row.algorithm, row.md5, row.sha1, row.sha256, row.sha512, row.error]
            .map(value => `"${value.replace(/"/g, "\"\"")}"`)
            .join(","))
    ].join("\n");

    return (
        <ToolSurface>
            <ToolHeader title={t("hash.title")} description={t("hash.description")}/>
            <Stack spacing={2}>
                <Stack direction={{xs: "column", sm: "row"}} spacing={2}>
                    <FormControl sx={{minWidth: 160}}>
                        <InputLabel>{t("hash.algorithm")}</InputLabel>
                        <Select value={algorithm} label={t("hash.algorithm")} onChange={(event: SelectChangeEvent) => setAlgorithm(event.target.value)}>
                            {algorithms.map(value => <MenuItem key={value} value={value}>{value}</MenuItem>)}
                        </Select>
                    </FormControl>
                    <FormControl sx={{minWidth: 140}}>
                        <InputLabel>{t("hash.concurrency")}</InputLabel>
                        <Select value={String(concurrency)} label={t("hash.concurrency")} onChange={(event: SelectChangeEvent) => setConcurrency(Number(event.target.value))}>
                            {[1, 2, 4, 8, 16].map(value => <MenuItem key={value} value={value}>{value}</MenuItem>)}
                        </Select>
                    </FormControl>
                    <Button component="label" startIcon={<AddIcon/>} variant="outlined">
                        {t("hash.addFiles")}
                        <input hidden multiple type="file" onChange={event => addFiles(event.target.files)}/>
                    </Button>
                    <Button variant="contained" onClick={hashAll} disabled={!jobs.length || processing}>{t("hash.hashAll")}</Button>
                    {processing && <Button color="error" variant="outlined" startIcon={<CancelIcon/>} onClick={cancelAll}>{t("hash.cancelAll")}</Button>}
                    <DownloadButton label={t("hash.exportJson")} disabled={!jobs.length} onDownload={() => downloadText("hashes.json", JSON.stringify(exportRows(), null, 2))}/>
                    <DownloadButton label={t("hash.exportCsv")} disabled={!jobs.length} onDownload={() => downloadText("hashes.csv", exportCsv())}/>
                </Stack>
                <Paper
                    variant="outlined"
                    sx={{p: 3, textAlign: "center", borderStyle: "dashed"}}
                    onDragOver={event => event.preventDefault()}
                    onDrop={event => {
                        event.preventDefault();
                        addFiles(event.dataTransfer.files);
                    }}
                >
                    {t("hash.dragDrop")}
                </Paper>
                {processing && <LinearProgress/>}
                <Stack spacing={1}>
                    {jobs.map(job => (
                        <Paper key={job.taskId} variant="outlined" sx={{p: 2}}>
                            <Stack direction="row" spacing={1} sx={{alignItems: "center"}}>
                                <Box sx={{flex: 1, minWidth: 0}}>
                                    <Typography noWrap>{job.file.name}</Typography>
                                    <Typography variant="body2" color={job.error ? "error" : "text.secondary"} sx={{wordBreak: "break-all"}}>
                                        {job.error || resultForHash(job) || t(`hash.status.${job.status ?? "pending"}`)}
                                    </Typography>
                                    {job.status === "processing" && (
                                        <LinearProgress variant="determinate" value={Math.round((job.progress ?? 0) * 100)} sx={{mt: 1}}/>
                                    )}
                                </Box>
                                <FormControl sx={{minWidth: 120}}>
                                    <InputLabel>{t("hash.algorithm")}</InputLabel>
                                    <Select value={job.hashAlgorithm} label={t("hash.algorithm")} onChange={(event: SelectChangeEvent) => updateJobAlgorithm(job.taskId, event.target.value)} disabled={processing}>
                                        {algorithms.map(value => <MenuItem key={value} value={value}>{value}</MenuItem>)}
                                    </Select>
                                </FormControl>
                                <CopyButton label={t("hash.copyHash")} disabled={!resultForHash(job)} onCopy={() => copyText(resultForHash(job))}/>
                                {(job.status === "pending" || job.status === "processing") && (
                                    <Tooltip title={t("hash.cancel")}>
                                        <IconButton onClick={() => cancelJob(job.taskId)}>
                                            <CancelIcon/>
                                        </IconButton>
                                    </Tooltip>
                                )}
                                <Tooltip title={t("hash.remove")}>
                                    <IconButton onClick={() => removeJob(job.taskId)}>
                                        <DeleteIcon/>
                                    </IconButton>
                                </Tooltip>
                            </Stack>
                        </Paper>
                    ))}
                </Stack>
            </Stack>
        </ToolSurface>
    );
};

export default HashTool;
