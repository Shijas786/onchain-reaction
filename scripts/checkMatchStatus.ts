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
    if (args.length < 2) {
        console.error("Usage: npx tsx scripts/checkMatchStatus.ts <chainId> <matchId>");
        process.exit(1);
    }

    const chainId = parseInt(args[0]);
    const matchId = BigInt(args[1]);

    console.log(`Checking match status:`);
    console.log(`Chain ID: ${chainId}`);
    console.log(`Match ID: ${matchId}`);

    const arenaAddress = ARENA_ADDRESSES[chainId];
    if (!arenaAddress) {
        throw new Error(`No arena address for chain ${chainId}`);
    }
    console.log(`Arena Address: ${arenaAddress}`);

    const publicClient = getPublicClient(chainId);

    try {
        const matchInfo = await publicClient.readContract({
            address: arenaAddress,
            abi: onchainReactionAbi,
            functionName: "matches",
            args: [matchId],
        });

        // struct Match {
        //     address host;
        //     address token;
        //     uint256 entryFee;
        //     uint256 maxPlayers;
        //     uint256 prizePool;
        //     MatchStatus status;
        //     address winner;
        //     ...
        // }

        const status = matchInfo[5] as number;
        const winner = matchInfo[6] as string;

        const STATUS_MAP = ["Pending", "Live", "Finished", "PaidOut", "Cancelled"];

        console.log(`Status: ${status} (${STATUS_MAP[status]})`);
        console.log(`Winner: ${winner}`);

    } catch (error) {
        console.error("Error:", error);
    }
}

main();
