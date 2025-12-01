import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
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
        console.error("Usage: npx tsx scripts/debugMatchState.ts <chainId> <matchId> <winnerAddress>");
        process.exit(1);
    }

    const chainId = parseInt(args[0]);
    const matchId = BigInt(args[1]);
    const winnerAddress = args[2] as `0x${string}`;

    console.log(`Debugging Match State:`);
    console.log(`Chain ID: ${chainId}`);
    console.log(`Match ID: ${matchId}`);
    console.log(`Winner: ${winnerAddress}`);

    const arenaAddress = ARENA_ADDRESSES[chainId];
    if (!arenaAddress) {
        throw new Error(`No arena address for chain ${chainId}`);
    }
    console.log(`Arena Address: ${arenaAddress}`);

    const publicClient = getPublicClient(chainId);

    try {
        // 1. Check Owner
        const owner = await publicClient.readContract({
            address: arenaAddress,
            abi: onchainReactionAbi,
            functionName: "owner",
        });
        console.log(`Contract Owner: ${owner}`);

        // 2. Check Oracle
        const oracle = await publicClient.readContract({
            address: arenaAddress,
            abi: onchainReactionAbi,
            functionName: "oracle",
        });
        console.log(`Contract Oracle: ${oracle}`);

        // 3. Check if Winner is in Match
        const isPlayer = await publicClient.readContract({
            address: arenaAddress,
            abi: onchainReactionAbi,
            functionName: "isPlayerInMatch",
            args: [matchId, winnerAddress],
        });
        console.log(`Is Winner (${winnerAddress}) in Match? ${isPlayer}`);

        if (!isPlayer) {
            console.error("❌ CRITICAL: Winner is NOT a participant in this match. finishMatch will revert.");
        } else {
            console.log("✅ Winner is a valid participant.");
        }

        // 4. Check Match Status again
        const matchInfo = await publicClient.readContract({
            address: arenaAddress,
            abi: onchainReactionAbi,
            functionName: "matches",
            args: [matchId],
        });
        const status = matchInfo[5] as number;
        console.log(`Match Status: ${status} (1=Live)`);

    } catch (error: any) {
        console.error("Error:", error);
    }
}

main();
