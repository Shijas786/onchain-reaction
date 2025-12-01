import "dotenv/config";
import { createPublicClient, createWalletClient, http } from "viem";
import { base, arbitrum } from "viem/chains";
import { privateKeyToAccount } from "viem/accounts";
import { onchainReactionAbi } from "../lib/onchainReaction";
import { ARENA_ADDRESSES, CHAIN_IDS } from "../lib/contracts";

const ORACLE_PK = process.env.ORACLE_PRIVATE_KEY as `0x${string}`;
if (!ORACLE_PK) {
    throw new Error("Missing ORACLE_PRIVATE_KEY in environment variables");
}

const account = privateKeyToAccount(ORACLE_PK);

const RPC_URLS: Record<number, string | undefined> = {
    [CHAIN_IDS.BASE]: process.env.RPC_URL_BASE,
    [CHAIN_IDS.ARBITRUM]: process.env.RPC_URL_ARBITRUM,
};

function getWalletClient(chainId: number) {
    const chain = chainId === CHAIN_IDS.BASE ? base : arbitrum;
    const rpcUrl = RPC_URLS[chainId];
    return createWalletClient({
        chain,
        transport: rpcUrl ? http(rpcUrl) : http(),
        account,
    });
}

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
        console.error("Usage: npx tsx scripts/finalizeMatchManual.ts <chainId> <matchId> <winnerAddress>");
        process.exit(1);
    }

    const chainId = parseInt(args[0]);
    const matchId = BigInt(args[1]);
    const winnerAddress = args[2] as `0x${string}`;

    console.log(`Finalizing match manually:`);
    console.log(`Chain ID: ${chainId}`);
    console.log(`Match ID: ${matchId}`);
    console.log(`Winner: ${winnerAddress}`);

    const arenaAddress = ARENA_ADDRESSES[chainId];
    if (!arenaAddress) {
        throw new Error(`No arena address for chain ${chainId}`);
    }

    const publicClient = getPublicClient(chainId);
    const walletClient = getWalletClient(chainId);

    try {
        // Check status first
        const matchInfo = await publicClient.readContract({
            address: arenaAddress,
            abi: onchainReactionAbi,
            functionName: "matches",
            args: [matchId],
        });
        const status = matchInfo[5] as number;
        console.log(`Current Match Status: ${status} (0=Pending, 1=Live, 2=Finished, 3=PaidOut, 4=Cancelled)`);

        if (status >= 2) {
            console.log("Match already finished or paid out.");
            return;
        }

        // Simulate
        const { request } = await publicClient.simulateContract({
            address: arenaAddress,
            abi: onchainReactionAbi,
            functionName: "finishMatch",
            args: [matchId, winnerAddress],
            account: account.address,
        });

        // Execute
        const txHash = await walletClient.writeContract(request);
        console.log(`Transaction sent: ${txHash}`);

        const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash });
        if (receipt.status === "success") {
            console.log("✅ Match finalized successfully!");
        } else {
            console.error("❌ Transaction reverted");
        }

    } catch (error) {
        console.error("Error:", error);
    }
}

main();
