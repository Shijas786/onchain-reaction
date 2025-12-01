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
// === SPACETIMEDB CONFIG ===
const STDB_HOST = process.env.NEXT_PUBLIC_SPACETIMEDB_URI || "http://localhost:3000";
const STDB_NAME = "onchain-reaction"; // Adjust if needed

// Helper to fetch table data
async function fetchTable(tableName) {
    try {
        const res = await fetch(`${STDB_HOST}/database/sql/${STDB_NAME}`, {
            method: "POST",
            headers: { "Content-Type": "text/plain" },
            body: `SELECT * FROM ${tableName}`
        });
        if (!res.ok) throw new Error(`Failed to fetch ${tableName}: ${res.statusText}`);
        const data = await res.json();
        return data; // Array of arrays usually, need to parse based on schema
    } catch (err) {
        console.error(`Error fetching ${tableName}:`, err);
        return [];
    }
}

// Helper to call reducer
async function callReducer(reducerName, args) {
    try {
        const res = await fetch(`${STDB_HOST}/database/call/${STDB_NAME}/${reducerName}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(args)
        });
        if (!res.ok) {
            const text = await res.text();
            throw new Error(`Reducer ${reducerName} failed: ${text}`);
        }
        console.log(`Reducer ${reducerName} called successfully`);
        return true;
    } catch (err) {
        console.error(`Error calling reducer ${reducerName}:`, err);
        return false;
    }
}

// === POLLING LOGIC ===
export async function pollMatches() {
    console.log("Polling matches...");

    // 1. Fetch Lobbies and GameStates
    // Note: SpacetimeDB SQL API returns { schema: [...], data: [[...], [...]] }
    // We need to map columns carefully.

    // For now, let's assume we can query specific columns to be safe
    // Or just fetch all and map by index if we know the schema order.
    // Better: Use the SQL API which returns column names in schema.

    try {
        // Fetch live lobbies
        const lobbyRes = await fetch(`${STDB_HOST}/database/sql/${STDB_NAME}`, {
            method: "POST",
            headers: { "Content-Type": "text/plain" },
            body: `SELECT id, match_id, status, winner_address FROM lobby WHERE status = 'live' OR status = 'finished'`
        });
        const lobbyJson = await lobbyRes.json();

        // Map data to objects
        const lobbies = lobbyJson.data.map(row => ({
            id: row[0],
            matchId: row[1],
            status: row[2],
            winnerAddress: row[3]
        }));

        for (const lobby of lobbies) {
            // Case 1: Game Finished -> Settle on Chain
            if (lobby.status === 'finished' && lobby.winnerAddress) {
                // TODO: Check if already settled on chain to avoid duplicate txs?
                // For now, just try to finish. The contract might revert if already finished, which is fine.
                // Ideally we check on-chain state first.

                // We can check if match is active on chain
                const isMatchActive = await provider.readContract({
                    address: CONTRACT_ADDRESS,
                    abi: onchainReactionAbi,
                    functionName: "isMatchActive",
                    args: [BigInt(lobby.matchId)]
                });

                if (isMatchActive) {
                    console.log(`Match ${lobby.matchId} finished in DB but active on chain. Settling...`);
                    await finishMatch(lobby.matchId, lobby.winnerAddress);
                } else {
                    // console.log(`Match ${lobby.matchId} already settled.`);
                }
            }

            // Case 2: Game Live -> Check Timeout
            if (lobby.status === 'live') {
                // Fetch GameState for this lobby
                const gsRes = await fetch(`${STDB_HOST}/database/sql/${STDB_NAME}`, {
                    method: "POST",
                    headers: { "Content-Type": "text/plain" },
                    body: `SELECT turn_deadline FROM game_state WHERE lobby_id = '${lobby.id}'`
                });
                const gsJson = await gsRes.json();

                if (gsJson.data.length > 0) {
                    // turn_deadline is a timestamp (microseconds in SpacetimeDB usually)
                    const turnDeadlineMicros = gsJson.data[0][0];
                    const turnDeadlineMs = Number(turnDeadlineMicros) / 1000;
                    const nowMs = Date.now();

                    if (nowMs > turnDeadlineMs) {
                        console.log(`Match ${lobby.matchId} (Lobby ${lobby.id}) timed out! Triggering claim_timeout...`);
                        await callReducer("claim_timeout", [lobby.id]); // Args format depends on reducer
                        // Note: claim_timeout takes (lobby_id: String). 
                        // The JSON array body should be the arguments.
                        // For a single string arg, it might be ["lobby_id_value"] or just "lobby_id_value" depending on client.
                        // Standard SpacetimeDB HTTP API expects array of args.
                    }
                }
            }
        }

    } catch (err) {
        console.error("Polling error:", err);
    }

    // Schedule next poll
    setTimeout(pollMatches, 5000); // Poll every 5 seconds
}

// Start polling if run directly
if (process.argv[1] === import.meta.url) {
    pollMatches();
}
