import FileReaderStream from "filereader-stream";
import crypto from "crypto";

self.addEventListener("message", m => {
    const job = m.data;
    const fileStream = FileReaderStream(job.file);
    switch (job.hashAlgorithm) {
        case "MD5": {
            const hash = crypto.createHash("md5");
            hash.on("finish", () => {
                job.resultMd5 = hash.read().toString("hex");
                postMessage(job);
                close();
            });
            fileStream.pipe(hash);
            break;
        }
        case "SHA-1": {
            const hash = crypto.createHash("sha1");
            hash.on("finish", () => {
                job.resultSha1 = hash.read().toString("hex");
                postMessage(job);
                close();
            });
            fileStream.pipe(hash);
            break;
        }
        case "SHA-256": {
            const hash = crypto.createHash("sha256");
            hash.on("finish", () => {
                job.resultSha256 = hash.read().toString("hex");
                postMessage(job);
                close();
            });
            fileStream.pipe(hash);
            break;
        }
        case "SHA-512": {
            const hash = crypto.createHash("sha512");
            hash.on("finish", () => {
                job.resultSha512 = hash.read().toString("hex");
                postMessage(job);
                close();
            });
            fileStream.pipe(hash);
            break;
        }
    }
});