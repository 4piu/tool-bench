export type IpVersion = 4 | 6;

export type ParsedIp = {
    version: IpVersion;
    value: bigint;
};

export type ParsedCidr = {
    version: IpVersion;
    ip: bigint;
    prefixLength: number;
};

export type CidrBlock = {
    network: bigint;
    prefixLength: number;
    version: IpVersion;
};

export type CidrDetails = {
    version: IpVersion;
    prefixLength: number;
    network: bigint;
    lastAddress: bigint;
    totalAddresses: bigint;
    firstUsable: bigint;
    lastUsable: bigint;
    usableHosts: bigint;
    netmask: bigint | null;
    wildcardMask: bigint | null;
};

const bitsForVersion = (version: IpVersion) => version === 4 ? 32 : 128;

const maskForPrefix = (prefixLength: number, bits: number): bigint => {
    const hostBits = bits - prefixLength;
    const fullMask = (1n << BigInt(bits)) - 1n;
    const hostMask = hostBits === 0 ? 0n : (1n << BigInt(hostBits)) - 1n;
    return fullMask ^ hostMask;
};

const IPV4_OCTET = /^(25[0-5]|2[0-4][0-9]|1[0-9]{2}|[1-9]?[0-9])$/;

const parseIpv4Octets = (input: string): number[] | null => {
    const parts = input.split(".");
    if (parts.length !== 4) return null;
    const octets: number[] = [];
    for (const part of parts) {
        if (!IPV4_OCTET.test(part)) return null;
        octets.push(Number(part));
    }
    return octets;
};

const parseIpv4 = (input: string): bigint | null => {
    const octets = parseIpv4Octets(input);
    if (!octets) return null;
    return octets.reduce((acc, octet) => (acc << 8n) | BigInt(octet), 0n);
};

const ipv4ToString = (value: bigint): string => [24n, 16n, 8n, 0n]
    .map(shift => Number((value >> shift) & 0xffn))
    .join(".");

const tokensToGroups = (tokens: string[]): number[] | null => {
    const groups: number[] = [];
    for (let index = 0; index < tokens.length; index++) {
        const token = tokens[index];
        if (token.includes(".")) {
            if (index !== tokens.length - 1) return null;
            const octets = parseIpv4Octets(token);
            if (!octets) return null;
            groups.push((octets[0] << 8) | octets[1], (octets[2] << 8) | octets[3]);
        } else {
            if (!/^[0-9a-fA-F]{1,4}$/.test(token)) return null;
            groups.push(parseInt(token, 16));
        }
    }
    return groups;
};

const parseIpv6 = (input: string): bigint | null => {
    if (!input || input.includes(":::")) return null;
    const doubleIdx = input.indexOf("::");

    let leftTokens: string[];
    let rightTokens: string[] | null = null;
    if (doubleIdx !== -1) {
        if (input.indexOf("::", doubleIdx + 1) !== -1) return null;
        const leftStr = input.slice(0, doubleIdx);
        const rightStr = input.slice(doubleIdx + 2);
        leftTokens = leftStr ? leftStr.split(":") : [];
        rightTokens = rightStr ? rightStr.split(":") : [];
    } else {
        leftTokens = input.split(":");
    }

    const left = tokensToGroups(leftTokens);
    if (left === null) return null;
    const right = rightTokens !== null ? tokensToGroups(rightTokens) : null;
    if (rightTokens !== null && right === null) return null;

    let groups: number[];
    if (doubleIdx !== -1) {
        const total = left.length + (right?.length ?? 0);
        if (total > 7) return null;
        groups = [...left, ...Array(8 - total).fill(0), ...(right ?? [])];
    } else {
        if (left.length !== 8) return null;
        groups = left;
    }
    if (groups.length !== 8) return null;

    return groups.reduce((acc, group) => (acc << 16n) | BigInt(group), 0n);
};

const ipv6ToString = (value: bigint): string => {
    const groups: number[] = [];
    for (let index = 7; index >= 0; index--) {
        groups.push(Number((value >> BigInt(index * 16)) & 0xffffn));
    }

    let bestStart = -1;
    let bestLen = 0;
    let curStart = -1;
    let curLen = 0;
    for (let index = 0; index < 8; index++) {
        if (groups[index] === 0) {
            if (curStart === -1) curStart = index;
            curLen++;
        } else {
            if (curLen > bestLen) {
                bestLen = curLen;
                bestStart = curStart;
            }
            curStart = -1;
            curLen = 0;
        }
    }
    if (curLen > bestLen) {
        bestLen = curLen;
        bestStart = curStart;
    }

    if (bestLen < 2) return groups.map(group => group.toString(16)).join(":");

    const before = groups.slice(0, bestStart).map(group => group.toString(16));
    const after = groups.slice(bestStart + bestLen).map(group => group.toString(16));
    return `${before.join(":")}::${after.join(":")}`;
};

export const parseIp = (input: string): ParsedIp | null => {
    const trimmed = input.trim();
    if (!trimmed) return null;
    if (trimmed.includes(":")) {
        const value = parseIpv6(trimmed);
        return value === null ? null : {version: 6, value};
    }
    const value = parseIpv4(trimmed);
    return value === null ? null : {version: 4, value};
};

export const ipToString = (value: bigint, version: IpVersion): string =>
    version === 4 ? ipv4ToString(value) : ipv6ToString(value);

export const parseCidr = (input: string): ParsedCidr | null => {
    const trimmed = input.trim();
    const slashIdx = trimmed.lastIndexOf("/");
    if (slashIdx === -1) return null;
    const parsedIp = parseIp(trimmed.slice(0, slashIdx));
    if (!parsedIp) return null;
    const prefixPart = trimmed.slice(slashIdx + 1);
    if (!/^\d+$/.test(prefixPart)) return null;
    const prefixLength = Number(prefixPart);
    if (prefixLength > bitsForVersion(parsedIp.version)) return null;
    return {version: parsedIp.version, ip: parsedIp.value, prefixLength};
};

export const cidrBlockToString = (block: CidrBlock): string =>
    `${ipToString(block.network, block.version)}/${block.prefixLength}`;

/**
 * Greedily consumes the range from `start`, each step choosing the largest
 * block that is both aligned to `start` and fits before `end`.
 */
export const rangeToCidrs = (start: bigint, end: bigint, version: IpVersion): CidrBlock[] => {
    const bits = bitsForVersion(version);
    const blocks: CidrBlock[] = [];
    let current = start;
    while (current <= end) {
        let prefixLength = bits;
        for (let candidate = 0; candidate <= bits; candidate++) {
            const blockSize = 1n << BigInt(bits - candidate);
            if (current % blockSize === 0n && current + blockSize - 1n <= end) {
                prefixLength = candidate;
                break;
            }
        }
        blocks.push({network: current, prefixLength, version});
        current += 1n << BigInt(bits - prefixLength);
    }
    return blocks;
};

export const getCidrDetails = ({version, ip, prefixLength}: ParsedCidr): CidrDetails => {
    const bits = bitsForVersion(version);
    const hostBits = bits - prefixLength;
    const netmask = maskForPrefix(prefixLength, bits);
    const hostMask = (1n << BigInt(bits)) - 1n - netmask;
    const network = ip & netmask;
    const lastAddress = network | hostMask;
    const totalAddresses = 1n << BigInt(hostBits);

    // IPv4 /31 and /32 have no network/broadcast reservation (RFC 3021); IPv6 has no broadcast concept at all.
    const wholeBlockUsable = version === 6 || prefixLength >= 31;

    return {
        version,
        prefixLength,
        network,
        lastAddress,
        totalAddresses,
        firstUsable: wholeBlockUsable ? network : network + 1n,
        lastUsable: wholeBlockUsable ? lastAddress : lastAddress - 1n,
        usableHosts: wholeBlockUsable ? totalAddresses : totalAddresses - 2n,
        netmask: version === 4 ? netmask : null,
        wildcardMask: version === 4 ? hostMask : null
    };
};

export const prefixLengthToMask = (prefixLength: number, version: IpVersion): bigint =>
    maskForPrefix(prefixLength, bitsForVersion(version));

/** Returns null when `mask` isn't a contiguous run of leading 1 bits (i.e. not a valid netmask). */
export const maskToPrefixLength = (mask: bigint, version: IpVersion): number | null => {
    const bits = bitsForVersion(version);
    for (let prefixLength = 0; prefixLength <= bits; prefixLength++) {
        if (maskForPrefix(prefixLength, bits) === mask) return prefixLength;
    }
    return null;
};

export const ipv4ToBinary = (value: bigint): string => [24n, 16n, 8n, 0n]
    .map(shift => Number((value >> shift) & 0xffn).toString(2).padStart(8, "0"))
    .join(".");
