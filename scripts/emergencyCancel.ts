
import "dotenv/config";
import { createWalletClient, createPublicClient, http } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { base } from "viem/chains";
import { onchainReactionAbi } from "../lib/onchainReaction";

const ARENA_ADDRESS = "0x426E2cA323fA707bd1921ECcce0a27aD7804b2A2"; // OnchainReactionBaseV3
const ORACLE_PK = process.env.ORACLE_PRIVATE_KEY as `0x${string}`;

// Matches to cancel
const MATCH_IDS = [15, 14]; // Match #15 is stuck Live (expired), Match #14 is Pending (expired)

async function main() {
    if (!ORACLE_PK) throw new Error("Missing ORACLE_PRIVATE_KEY");

    const account = privateKeyToAccount(ORACLE_PK);
    const walletClient = createWalletClient({
        account,
        chain: base,
        transport: http()
    });
    const publicClient = createPublicClient({
        chain: base,
        transport: http()
    });

    console.log(`Emergency cancelling matches: ${MATCH_IDS.join(", ")}`);

    for (const id of MATCH_IDS) {
        await new Promise(r => setTimeout(r, 1000)); // Add delay
        const matchId = BigInt(id);
        console.log(`\nProcessing Match ${matchId}...`);

        try {
            // 1. Check status
            const matchInfo = await publicClient.readContract({
                address: ARENA_ADDRESS,
                abi: onchainReactionAbi,
                functionName: "matches",
                args: [matchId]
            });

            // Status 4 is Cancelled
            if (matchInfo[5] === 4) {
                console.log(`Match ${matchId} already cancelled.`);
                continue;
            }
            if (matchInfo[5] >= 2) {
                console.log(`Match ${matchId} already finished/paid out (Status: ${matchInfo[5]}). Cannot cancel.`);
                continue;
            }

            // 2. Cancel
            const hash = await walletClient.writeContract({
                address: ARENA_ADDRESS,
                abi: onchainReactionAbi,
                functionName: "emergencyCancelMatch",
                args: [matchId]
            });

            console.log(`Tx sent: ${hash}`);
            await publicClient.waitForTransactionReceipt({ hash });
            console.log(`✅ Match ${matchId} cancelled and refunded!`);

        } catch (error) {
            console.error(`❌ Error cancelling match ${matchId}:`, error);
        }
    }
}

main();
