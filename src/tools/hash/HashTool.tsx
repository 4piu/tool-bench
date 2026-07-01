import React from "react";
import {v4 as uuidV4} from "uuid";
import AddIcon from "@mui/icons-material/Add";
import DeleteIcon from "@mui/icons-material/Delete";
import {Box, Button, FormControl, IconButton, InputLabel, LinearProgress, MenuItem, Paper, Select, Stack, Tooltip, Typography} from "@mui/material";
import type {SelectChangeEvent} from "@mui/material/Select";
import FileHashWorker from "../../workers/fileHash.worker.ts?worker";
import {copyText, downloadText} from "../shared/browser";
import {useLocalStorageState} from "../shared/hooks";
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
    status?: "pending" | "processing" | "done" | "error";
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
    const [algorithm, setAlgorithm] = useLocalStorageState("hash.algorithm", "SHA-256");
    const [concurrency, setConcurrency] = useLocalStorageState("hash.concurrency", Math.min(navigator.hardwareConcurrency || 1, 4));
    const [jobs, setJobs] = React.useState<HashJob[]>([]);
    const [processing, setProcessing] = React.useState(false);

    const addFiles = (files: FileList | null) => {
        if (!files) return;
        setJobs(current => current.concat(Array.from(files).map(file => ({
            taskId: uuidV4(),
            file,
            hashAlgorithm: algorithm,
            status: "pending"
        }))));
    };

    const runJob = (job: HashJob) => new Promise<HashJob>(resolve => {
        const worker = new FileHashWorker();
        worker.addEventListener("message", event => {
            resolve(event.data);
            worker.terminate();
        });
        worker.postMessage(job);
    });

    const hashAll = async () => {
        setProcessing(true);
        const queue: HashJob[] = jobs.map(job => ({...job, status: "pending"}));
        const nextJobs: HashJob[] = [...queue];
        let cursor = 0;
        const workerCount = Math.max(1, Math.min(concurrency, queue.length));

        const runNext = async (): Promise<void> => {
            const index = cursor++;
            if (index >= queue.length) return;
            const job = queue[index];
            nextJobs[index] = {...job, status: "processing"};
            setJobs([...nextJobs]);
            const result = await runJob(job);
            nextJobs[index] = {...result, status: result.error ? "error" : "done"};
            setJobs([...nextJobs]);
            await runNext();
        };

        await Promise.all(Array.from({length: workerCount}, runNext));
        setProcessing(false);
    };

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
            <ToolHeader title="File Checksum" description="Hash files locally in a Web Worker."/>
            <Stack spacing={2}>
                <Stack direction={{xs: "column", sm: "row"}} spacing={2}>
                    <FormControl sx={{minWidth: 160}}>
                        <InputLabel>Algorithm</InputLabel>
                        <Select value={algorithm} label="Algorithm" onChange={(event: SelectChangeEvent) => setAlgorithm(event.target.value)}>
                            {algorithms.map(value => <MenuItem key={value} value={value}>{value}</MenuItem>)}
                        </Select>
                    </FormControl>
                    <FormControl sx={{minWidth: 140}}>
                        <InputLabel>Concurrency</InputLabel>
                        <Select value={String(concurrency)} label="Concurrency" onChange={(event: SelectChangeEvent) => setConcurrency(Number(event.target.value))}>
                            {[1, 2, 4, 8, 16].map(value => <MenuItem key={value} value={value}>{value}</MenuItem>)}
                        </Select>
                    </FormControl>
                    <Button component="label" startIcon={<AddIcon/>} variant="outlined">
                        Add files
                        <input hidden multiple type="file" onChange={event => addFiles(event.target.files)}/>
                    </Button>
                    <Button variant="contained" onClick={hashAll} disabled={!jobs.length || processing}>Hash all</Button>
                    <DownloadButton label="Export JSON" disabled={!jobs.length} onDownload={() => downloadText("hashes.json", JSON.stringify(exportRows(), null, 2))}/>
                    <DownloadButton label="Export CSV" disabled={!jobs.length} onDownload={() => downloadText("hashes.csv", exportCsv())}/>
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
                    Drag and drop files here
                </Paper>
                {processing && <LinearProgress/>}
                <Stack spacing={1}>
                    {jobs.map(job => (
                        <Paper key={job.taskId} variant="outlined" sx={{p: 2}}>
                            <Stack direction="row" spacing={1} sx={{alignItems: "center"}}>
                                <Box sx={{flex: 1, minWidth: 0}}>
                                    <Typography noWrap>{job.file.name}</Typography>
                                    <Typography variant="body2" color={job.error ? "error" : "text.secondary"} sx={{wordBreak: "break-all"}}>
                                        {job.error || resultForHash(job) || job.status || "Pending"}
                                    </Typography>
                                </Box>
                                <FormControl sx={{minWidth: 120}}>
                                    <InputLabel>Algorithm</InputLabel>
                                    <Select value={job.hashAlgorithm} label="Algorithm" onChange={(event: SelectChangeEvent) => updateJobAlgorithm(job.taskId, event.target.value)} disabled={processing}>
                                        {algorithms.map(value => <MenuItem key={value} value={value}>{value}</MenuItem>)}
                                    </Select>
                                </FormControl>
                                <CopyButton label="Copy hash" disabled={!resultForHash(job)} onCopy={() => copyText(resultForHash(job))}/>
                                <Tooltip title="Remove">
                                    <IconButton onClick={() => setJobs(current => current.filter(item => item.taskId !== job.taskId))}>
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
