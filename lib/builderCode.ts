import { Attribution } from 'ox/erc8021'

// Base Builder Code: bc_9vdy4xyw
const BUILDER_CODE = "bc_9vdy4xyw";

export function getBuilderSuffix() {
    return Attribution.toDataSuffix({ codes: [BUILDER_CODE] });
}

export function appendBuilderSuffix(data: string): `0x${string}` {
    const suffix = getBuilderSuffix();
    // Remove 0x prefix from suffix
    const suffixBytes = suffix.slice(2);
    // Ensure data starts with 0x
    const prefix = data.startsWith("0x") ? "" : "0x";
    return `${prefix}${data}${suffixBytes}` as `0x${string}`;
}
