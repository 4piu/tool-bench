import readerWasmUrl from "zxing-wasm/reader/zxing_reader.wasm?url";
import {prepareZXingModule, readBarcodes} from "zxing-wasm/reader";

export type CodeScannerResult = {
    text: string;
    format: string;
    contentType: string;
    orientation: number;
};

export type CodeScannerRequest = {
    id: number;
    input: Blob | ImageData;
    tryHarder: boolean;
};

export type CodeScannerResponse = {
    id: number;
    results?: CodeScannerResult[];
    error?: string;
};

prepareZXingModule({
    overrides: {
        locateFile: (path, prefix) => path.endsWith(".wasm") ? readerWasmUrl : `${prefix}${path}`
    }
});

self.addEventListener("message", async (event: MessageEvent<CodeScannerRequest>) => {
    const {id, input, tryHarder} = event.data;
    try {
        const results = await readBarcodes(input, {
            formats: ["All"],
            tryHarder,
            tryRotate: true,
            tryInvert: true,
            tryDownscale: false,
            maxNumberOfSymbols: 16
        });
        const response: CodeScannerResponse = {
            id,
            results: results
                .filter(result => result.isValid)
                .map(result => ({
                    text: result.text,
                    format: result.format,
                    contentType: result.contentType,
                    orientation: result.orientation
                }))
        };
        self.postMessage(response);
    } catch (error) {
        const response: CodeScannerResponse = {
            id,
            error: error instanceof Error ? error.message : String(error)
        };
        self.postMessage(response);
    }
});
