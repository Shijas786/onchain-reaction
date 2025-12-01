import "dotenv/config";
import { createWalletClient, createPublicClient, http } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { base, arbitrum } from "viem/chains";
import { onchainReactionAbi } from "./abi.js";

// Configuration
const ARENA_ADDRESSES = {
    8453: "0x060603093f98243003254139F61002c138f514C8", // Base
    42161: "0x0000000000000000000000000000000000000000", // Arbitrum (Placeholder)
};

const RPC_URLS = {
    8453: process.env.RPC_URL_BASE || "https://base.publicnode.com",
    42161: process.env.RPC_URL_ARBITRUM || "https://arb1.arbitrum.io/rpc",
};

// Oracle Key Setup
let oraclePk = process.env.ORACLE_PRIVATE_KEY;
if (!oraclePk) {
    console.error("Missing ORACLE_PRIVATE_KEY");
    process.exit(1);
}
if (!oraclePk.startsWith("0x")) {
    oraclePk = `0x${oraclePk}`;
}
const account = privateKeyToAccount(oraclePk);

function getClients(chainId) {
    const chain = chainId === 8453 ? base : arbitrum;
    const rpcUrl = RPC_URLS[chainId];
    const transport = rpcUrl ? http(rpcUrl) : http();

    const publicClient = createPublicClient({ chain, transport });
    const walletClient = createWalletClient({ chain, transport, account });

    return { publicClient, walletClient };
}

export async function finishMatch(matchId, winnerAddress) {
    // Default to Base if chainId not provided (or pass it in args if needed)
    // For now, assuming Base (8453) as per current usage
    const chainId = 8453;
    const arenaAddress = ARENA_ADDRESSES[chainId];

    if (!arenaAddress) throw new Error(`No arena for chain ${chainId}`);

    console.log(`Finalizing match ${matchId} for winner ${winnerAddress} on chain ${chainId}`);

    const { publicClient, walletClient } = getClients(chainId);

    try {
        // Execute directly (skip simulation to avoid RPC errors)
        const hash = await walletClient.writeContract({
            address: arenaAddress,
            abi: onchainReactionAbi,
            functionName: "finishMatch",
            args: [BigInt(matchId), winnerAddress],
            account,
        });
        console.log(`Tx sent: ${hash}`);

        // Wait
        const receipt = await publicClient.waitForTransactionReceipt({ hash });
        console.log(`Tx confirmed in block ${receipt.blockNumber}`);

        return { success: true, txHash: hash };
    } catch (error) {
        console.error("Error finalizing:", error);
        // Check if already finished
        if (error.message && error.message.includes("Not live")) {
            return { success: true, message: "Match already finished" };
        }
        throw error;
    }
}
