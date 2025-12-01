import "dotenv/config";
import { createPublicClient, http } from "viem";
import { base, arbitrum } from "viem/chains";
import { onchainReactionAbi } from "../lib/onchainReaction";
import { ARENA_ADDRESSES, CHAIN_IDS } from "../lib/contracts";

const RPC_URLS: Record<number, string | undefined> = {
    [CHAIN_IDS.BASE]: process.env.RPC_URL_BASE,
    [CHAIN_IDS.ARBITRUM]: process.env.RPC_URL_ARBITRUM,
};

function getPublicClient(chainId: number) {
    const chain = chainId === CHAIN_IDS.BASE ? base : arbitrum;
    const rpcUrl = RPC_URLS[chainId];
    return createPublicClient({
        chain,
        transport: rpcUrl ? http(rpcUrl) : http(),
    });
}

async function main() {
    const args = process.argv.slice(2);
    if (args.length < 3) {
        console.error("Usage: npx tsx scripts/simulateClaim.ts <chainId> <matchId> <winnerAddress>");
        process.exit(1);
    }

    const chainId = parseInt(args[0]);
    const matchId = BigInt(args[1]);
    const winnerAddress = args[2] as `0x${string}`;

    console.log(`Simulating Claim Prize:`);
    console.log(`Chain ID: ${chainId}`);
    console.log(`Match ID: ${matchId}`);
    console.log(`Winner (Impersonated): ${winnerAddress}`);

    const arenaAddress = ARENA_ADDRESSES[chainId];
    if (!arenaAddress) {
        throw new Error(`No arena address for chain ${chainId}`);
    }
    console.log(`Arena Address: ${arenaAddress}`);

    const publicClient = getPublicClient(chainId);

    try {
        // 1. Check Match Status first
        const matchInfo = await publicClient.readContract({
            address: arenaAddress,
            abi: onchainReactionAbi,
            functionName: "matches",
            args: [matchId],
        });
        const status = matchInfo[5] as number;
        const actualWinner = matchInfo[6] as string;

        console.log(`Contract State: Status=${status} (type: ${typeof status}), Winner=${actualWinner}`);

        if (Number(status) !== 2) {
            console.error("❌ Match is NOT Finished (Status 2). Cannot claim.");
            // Proceed anyway to see the simulation error
        }
        if (actualWinner.toLowerCase() !== winnerAddress.toLowerCase()) {
            console.error("❌ Winner mismatch.");
            // Proceed anyway
        }

        // 2. Simulate Claim
        console.log("Simulating claimPrize transaction...");
        const { result } = await publicClient.simulateContract({
            address: arenaAddress,
            abi: onchainReactionAbi,
            functionName: "claimPrize",
            args: [matchId],
            account: winnerAddress, // Impersonate
        });

        console.log("✅ Simulation Successful!");
        console.log("Result:", result);

    } catch (error: any) {
        console.error("❌ Simulation Failed:", error?.shortMessage || error?.message || error);
    }
}

main();
