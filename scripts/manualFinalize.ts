
import "dotenv/config";
import { createWalletClient, createPublicClient, http } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { base } from "viem/chains";
import { onchainReactionAbi } from "../lib/onchainReaction";

const ARENA_ADDRESS = "0x7B04eb09b6748097067c7C9d97C545ADDFD7C97E";
const ORACLE_PK = process.env.ORACLE_PRIVATE_KEY as `0x${string}`;
const WINNER_ADDRESS = "0x6C31212a23040998E1D1c157ACe3982aBDBE3154";

// Matches to finalize manually
const MATCH_IDS = [33, 37, 38];

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

    console.log(`Manually finalizing matches: ${MATCH_IDS.join(", ")}`);
    console.log(`Winner: ${WINNER_ADDRESS}`);

    for (const id of MATCH_IDS) {
        const matchId = BigInt(id);
        console.log(`\nProcessing Match ${matchId}...`);

        try {
            // 1. Check if already finalized
            const matchInfo = await publicClient.readContract({
                address: ARENA_ADDRESS,
                abi: onchainReactionAbi,
                functionName: "matches",
                args: [matchId]
            });

            if (matchInfo[5] >= 2) {
                console.log(`Match ${matchId} already finalized (Status: ${matchInfo[5]})`);
                continue;
            }

            // 2. Finalize
            const hash = await walletClient.writeContract({
                address: ARENA_ADDRESS,
                abi: onchainReactionAbi,
                functionName: "finishMatch",
                args: [matchId, WINNER_ADDRESS]
            });

            console.log(`Tx sent: ${hash}`);
            await publicClient.waitForTransactionReceipt({ hash });
            console.log(`✅ Match ${matchId} finalized!`);

        } catch (error) {
            console.error(`❌ Error finalizing match ${matchId}:`, error);
        }
    }
}

main();
