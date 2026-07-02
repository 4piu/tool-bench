import {Buffer} from "buffer";
import dnsPacket from "dns-packet";

const toBase64Url = (bytes: Uint8Array) => {
    let binary = "";
    for (const byte of bytes) binary += String.fromCharCode(byte);
    return btoa(binary)
        .replace(/\+/g, "-")
        .replace(/\//g, "_")
        .replace(/=+$/g, "");
};

export const queryDns = async (
    qName: string,
    qType = "A",
    qClass = "IN",
    url = "https://cloudflare-dns.com/dns-query",
    method: "GET" | "POST" = "GET"
) => {
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
    const response = method === "GET"
        ? await fetch(`${serverUrl}?dns=${toBase64Url(buffer)}`, {
            headers: {
                Accept: "application/dns-message"
            }
        })
        : await fetch(serverUrl, {
            method: "POST",
            headers: {
                Accept: "application/dns-message",
                "Content-Type": "application/dns-message"
            },
            body: buffer
        });

    if (!response.ok) throw new Error(response.statusText);
    return dnsPacket.decode(Buffer.from(await response.arrayBuffer()));
};
