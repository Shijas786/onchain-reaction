import "dotenv/config";
import { createWalletClient, createPublicClient, http } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { base } from "viem/chains";
import { onchainReactionAbi } from "./abi.js";

// === CONFIG ===

// PUT YOUR REAL CONTRACT ADDRESS HERE
const CONTRACT_ADDRESS = "0x7B04eb09b6748097067c7C9d97C545ADDFD7C97E";

const RPC_URL = "https://mainnet.base.org";

// === ORACLE KEY ===
let oraclePk = process.env.ORACLE_PRIVATE_KEY;
if (!oraclePk) {
    console.error("Missing ORACLE_PRIVATE_KEY");
    process.exit(1);
}
if (!oraclePk.startsWith("0x")) oraclePk = "0x" + oraclePk;

const account = privateKeyToAccount(oraclePk);

// === CLIENTS ===
const provider = createPublicClient({
    chain: base,
    transport: http(RPC_URL),
});

const walletClient = createWalletClient({
    chain: base,
    transport: http(RPC_URL),
    account,
});

// === FINISH MATCH ===
export async function finishMatch(matchId, winnerAddress) {
    console.log(`Finishing match #${matchId}, winner = ${winnerAddress}`);

    try {
        const hash = await walletClient.writeContract({
            address: CONTRACT_ADDRESS,
            abi: onchainReactionAbi,
            functionName: "finishMatch",
            args: [BigInt(matchId), winnerAddress],
        });

        console.log("Tx sent:", hash);

        const receipt = await provider.waitForTransactionReceipt({ hash });

        console.log("Tx confirmed:", receipt);

        return { success: true, txHash: hash };
    } catch (err) {
        console.error("🔥 Oracle error:", err);
        throw err;
    }
}
