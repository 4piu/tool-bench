import {createMD5, createSHA1, createSHA256, createSHA512} from "hash-wasm";

type HashAlgorithm = "MD5" | "SHA-1" | "SHA-256" | "SHA-512";
type HashSelection = HashAlgorithm | "ALL";

type HashJob = {
    taskId: string;
    file: File;
    hashAlgorithm: HashSelection;
    resultMd5?: string;
    resultSha1?: string;
    resultSha256?: string;
    resultSha512?: string;
    error?: string;
};

const createHasher = async (algorithm: HashAlgorithm) => {
    switch (algorithm) {
        case "MD5":
            return createMD5();
        case "SHA-1":
            return createSHA1();
        case "SHA-256":
            return createSHA256();
        case "SHA-512":
            return createSHA512();
    }
};

const resultProperty = (algorithm: HashAlgorithm) => {
    switch (algorithm) {
        case "MD5":
            return "resultMd5";
        case "SHA-1":
            return "resultSha1";
        case "SHA-256":
            return "resultSha256";
        case "SHA-512":
            return "resultSha512";
    }
};

export type HashWorkerMessage =
    | {type: "progress"; taskId: string; progress: number}
    | {type: "result"; job: HashJob};

const PROGRESS_INTERVAL_MS = 100;

self.addEventListener("message", async (message: MessageEvent<HashJob>) => {
    const job = message.data;
    try {
        const selectedAlgorithms: HashAlgorithm[] = job.hashAlgorithm === "ALL"
            ? ["MD5", "SHA-1", "SHA-256", "SHA-512"]
            : [job.hashAlgorithm];
        const hashers = await Promise.all(selectedAlgorithms.map(async algorithm => ({
            algorithm,
            hasher: await createHasher(algorithm)
        })));
        hashers.forEach(({hasher}) => hasher.init());

        const totalBytes = job.file.size;
        let bytesRead = 0;
        let lastProgressAt = 0;
        const reader = job.file.stream().getReader();
        for (;;) {
            const {done, value} = await reader.read();
            if (done) break;
            hashers.forEach(({hasher}) => hasher.update(value));
            bytesRead += value.byteLength;
            const now = Date.now();
            if (now - lastProgressAt > PROGRESS_INTERVAL_MS) {
                lastProgressAt = now;
                postMessage({type: "progress", taskId: job.taskId, progress: totalBytes ? bytesRead / totalBytes : 1} satisfies HashWorkerMessage);
            }
        }
        postMessage({type: "progress", taskId: job.taskId, progress: 1} satisfies HashWorkerMessage);

        hashers.forEach(({algorithm, hasher}) => {
            job[resultProperty(algorithm)] = hasher.digest();
        });
        postMessage({type: "result", job} satisfies HashWorkerMessage);
    } catch (error) {
        job.error = error instanceof Error ? error.message : "Hashing failed";
        postMessage({type: "result", job} satisfies HashWorkerMessage);
    } finally {
        close();
    }
});
