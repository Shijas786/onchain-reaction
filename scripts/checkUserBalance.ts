import { createPublicClient, http, formatUnits } from "viem";
import { base } from "viem/chains";
import { ARENA_ADDRESSES, CHAIN_IDS, USDC_ADDRESSES } from "../lib/contracts";
import ERC20Abi from "../abi/ERC20.json";

async function main() {
    const rpcUrl = "https://mainnet.base.org";
    const publicClient = createPublicClient({
        chain: base,
        transport: http(rpcUrl),
    });

    const userAddress = "0x6C31212a23040998E1D1c157ACe3982aBDBE3154"; // User from previous logs
    const arenaAddress = ARENA_ADDRESSES[CHAIN_IDS.BASE];

    const nativeUSDC = USDC_ADDRESSES[CHAIN_IDS.BASE]; // 0x8335...
    const bridgedUSDbC = "0xd9aAEc86B65D86f6A7B5B1b0c42FFA531710b6CA";

    console.log("Checking balances for user:", userAddress);
    console.log("Arena Address:", arenaAddress);

    // Check Native USDC
    console.log("\n--- Native USDC (0x8335...) ---");
    try {
        const balance = await publicClient.readContract({
            address: nativeUSDC,
            abi: ERC20Abi,
            functionName: "balanceOf",
            args: [userAddress],
        });
        console.log("Balance:", formatUnits(balance as bigint, 6));

        const allowance = await publicClient.readContract({
            address: nativeUSDC,
            abi: ERC20Abi,
            functionName: "allowance",
            args: [userAddress, arenaAddress],
        });
        console.log("Allowance:", formatUnits(allowance as bigint, 6));
    } catch (e: any) {
        console.error("Error checking Native USDC:", e.message);
    }

    // Check Bridged USDbC
    console.log("\n--- Bridged USDbC (0xd9aA...) ---");
    try {
        const balance = await publicClient.readContract({
            address: bridgedUSDbC,
            abi: ERC20Abi,
            functionName: "balanceOf",
            args: [userAddress],
        });
        console.log("Balance:", formatUnits(balance as bigint, 6));

        const allowance = await publicClient.readContract({
            address: bridgedUSDbC,
            abi: ERC20Abi,
            functionName: "allowance",
            args: [userAddress, arenaAddress],
        });
        console.log("Allowance:", formatUnits(allowance as bigint, 6));
    } catch (e: any) {
        console.error("Error checking Bridged USDbC:", e.message);
    }
}

main();
