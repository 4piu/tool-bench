self.addEventListener("message", m => {
    const job = m.data;
    // TODO hash file
    switch (job.hashAlgorithm) {
        case "MD5":
            job.resultMd5 = "foo";
            break;
        case "SHA-1":
            job.resultSha1 = "bar";
            break;
        case "SHA-256":
            job.resultSha256 = "buz";
            break;
        case "SHA-512":
            job.resultSha512 = "bar";
            break;
    }
    // console.debug('worker');
    // console.debug(job)
    setTimeout(()=> postMessage(job), Math.floor(Math.random() * 6000) + 2000);
});