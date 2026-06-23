import {createMD5, createSHA1, createSHA256, createSHA512} from "hash-wasm";

const createHasher = async algorithm => {
    switch (algorithm) {
        case "MD5":
            return createMD5();
        case "SHA-1":
            return createSHA1();
        case "SHA-256":
            return createSHA256();
        case "SHA-512":
            return createSHA512();
        default:
            throw new Error(`Unsupported hash algorithm: ${algorithm}`);
    }
};

const resultProperty = algorithm => {
    switch (algorithm) {
        case "MD5":
            return "resultMd5";
        case "SHA-1":
            return "resultSha1";
        case "SHA-256":
            return "resultSha256";
        case "SHA-512":
            return "resultSha512";
        default:
            throw new Error(`Unsupported hash algorithm: ${algorithm}`);
    }
};

self.addEventListener("message", async m => {
    const job = m.data;
    try {
        const hasher = await createHasher(job.hashAlgorithm);
        hasher.init();

        const reader = job.file.stream().getReader();
        for (; ;) {
            const {done, value} = await reader.read();
            if (done) break;
            hasher.update(value);
        }

        job[resultProperty(job.hashAlgorithm)] = hasher.digest();
        postMessage(job);
    } catch (error) {
        job.error = error.message;
        postMessage(job);
    } finally {
        close();
    }
});
