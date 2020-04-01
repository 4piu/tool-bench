import dnsPacket from "dns-packet";
import base64url from "base64url";

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
    if (method === "GET") {
        const query = base64url(buffer);
        const response = await fetch(`${serverUrl}?dns=${query}`);
        console.debug(response);
    } else if (method === "POST") {
        const response = await fetch(serverUrl, {
            method: "POST",
            headers: {
                "Accept": "application/dns-message",
                "Content-Type": "application/dns-message",
                "Content-Length": Buffer.byteLength(buffer)
            },
            body: buffer
        });
        console.debug(response);
    } else {
        throw new Error("Unsupported method");
    }
};