import dnsPacket from "dns-packet";
import base64url from "base64url";
import fetch from "node-fetch";
// noinspection ES6UnusedImports
import regeneratorRuntime from "regenerator-runtime";

export const query = async (qName, qType = "A", qClass = "IN", url = "https://cloudflare-dns.com/dns-query", method = "GET") => {
    const buffer = dnsPacket.encode({
        type: "query",
        id: Math.floor(Math.random() * 65534 + 1),
        flags: dnsPacket.RECURSION_DESIRED,
        questions: [{
            name: qName,
            type: qType,
            class: qClass
        }]
    });
    const serverUrl = url.endsWith("/") ? url.slice(0, -1) : url;
    let response;
    if (method === "GET") {
        const query = base64url(buffer);
        response = await fetch(`${serverUrl}?dns=${query}`);
    } else if (method === "POST") {
        response = await fetch(serverUrl, {
            method: "POST",
            headers: {
                "Accept": "application/dns-message",
                "Content-Type": "application/dns-message",
                "Content-Length": Buffer.byteLength(buffer)
            },
            body: buffer
        });
    } else {
        throw new Error("Unsupported method");
    }
    if (!response.ok) throw new Error(response.statusText);
    return dnsPacket.decode(Buffer.from(await response.arrayBuffer()));

};