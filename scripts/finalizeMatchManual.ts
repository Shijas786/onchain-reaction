import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
import { createPublicClient, createWalletClient, http } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { base, arbitrum } from "viem/chains";
import { onchainReactionAbi } from "../lib/onchainReaction";
import { ARENA_ADDRESSES, CHAIN_IDS } from "../lib/contracts";

const RPC_URLS: Record<number, string | undefined> = {
    [CHAIN_IDS.BASE]: process.env.RPC_URL_BASE || "https://mainnet.base.org",
    [CHAIN_IDS.ARBITRUM]: process.env.RPC_URL_ARBITRUM || "https://arb1.arbitrum.io/rpc",
};

function getPublicClient(chainId: number) {
    const chain = chainId === CHAIN_IDS.BASE ? base : arbitrum;
    const rpcUrl = RPC_URLS[chainId];
    return createPublicClient({
        chain,
        transport: rpcUrl ? http(rpcUrl) : http(),
    });
}

// Add Oracle Key
let oraclePk = process.env.ORACLE_PRIVATE_KEY;
if (!oraclePk) {
    // Fallback for manual run if env missing
    console.error("Missing ORACLE_PRIVATE_KEY");
    process.exit(1);
}
if (!oraclePk.startsWith("0x")) {
    oraclePk = `0x${oraclePk}`;
}
const ORACLE_PK = oraclePk as `0x${string}`;

async function main() {
    // ... existing args parsing ...
    const args = process.argv.slice(2);
    if (args.length < 3) {
        console.error("Usage: npx tsx scripts/finalizeMatchManual.ts <chainId> <matchId> <winnerAddress>");
        process.exit(1);
    }

    const chainId = parseInt(args[0]);
    const matchId = BigInt(args[1]);
    const winnerAddress = args[2] as `0x${string}`;

    console.log(`Finalizing Match:`);
    console.log(`Chain ID: ${chainId}`);
    console.log(`Match ID: ${matchId}`);
    console.log(`Winner: ${winnerAddress}`);

    const arenaAddress = ARENA_ADDRESSES[chainId];
    if (!arenaAddress) {
        throw new Error(`No arena address for chain ${chainId}`);
    }

    const publicClient = getPublicClient(chainId);

    // Setup Wallet
    const account = privateKeyToAccount(ORACLE_PK);
    const chain = chainId === CHAIN_IDS.BASE ? base : arbitrum;
    const rpcUrl = RPC_URLS[chainId];

    const walletClient = createWalletClient({
        account,
        chain,
        transport: rpcUrl ? http(rpcUrl) : http(),
    });

    try {
        console.log("Sending finishMatch transaction...");
        const hash = await walletClient.writeContract({
            address: arenaAddress,
            abi: onchainReactionAbi,
            functionName: "finishMatch",
            args: [matchId, winnerAddress],
        });
        console.log(`✅ Transaction sent! Hash: ${hash}`);

        console.log("Waiting for confirmation...");
        const receipt = await publicClient.waitForTransactionReceipt({ hash });
        console.log(`✅ Transaction confirmed! Block: ${receipt.blockNumber}`);

    } catch (error: any) {
        console.error("Error Finalizing:", error);
        if (error.cause) console.error("Cause:", error.cause);
    }
}

main();
