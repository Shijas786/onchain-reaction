import "dotenv/config";
import { createWalletClient, createPublicClient, http } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { base, arbitrum } from "viem/chains";
import { onchainReactionAbi } from "./abi.js";

// === CONFIG ===

const CHAIN_IDS = {
    BASE: 8453,
    ARBITRUM: 42161
};

const CONFIG = {
    [CHAIN_IDS.BASE]: {
        chain: base,
        rpcUrl: "https://mainnet.base.org",
        contractAddress: "0x426E2cA323fA707bd1921ECcce0a27aD7804b2A2" // NEW Base contract
    },
    [CHAIN_IDS.ARBITRUM]: {
        chain: arbitrum,
        rpcUrl: "https://arb-mainnet.g.alchemy.com/v2/eTjwZLPVQJs7qTv3Inh338N4Uss_z7OT",
        contractAddress: "0x752267f970b1ddCF936F4EabA2d605B2d05167Eb" // NEW Arbitrum contract
    }
};

// === ORACLE KEY ===
let oraclePk = process.env.ORACLE_PRIVATE_KEY;
if (!oraclePk) {
    console.error("Missing ORACLE_PRIVATE_KEY");
    process.exit(1);
}
if (!oraclePk.startsWith("0x")) oraclePk = "0x" + oraclePk;

const account = privateKeyToAccount(oraclePk);

// === CLIENTS ===
const clients = {};

for (const [chainId, config] of Object.entries(CONFIG)) {
    clients[chainId] = {
        public: createPublicClient({
            chain: config.chain,
            transport: http(config.rpcUrl),
        }),
        wallet: createWalletClient({
            chain: config.chain,
            transport: http(config.rpcUrl),
            account,
        })
    };
}

// === FINISH MATCH ===
export async function finishMatch(chainId, matchId, winnerAddress) {
    console.log(`Finishing match #${matchId} on chain ${chainId}, winner = ${winnerAddress}`);

    const client = clients[chainId];
    if (!client) {
        console.error(`No client for chain ${chainId}`);
        return { success: false, error: "Unsupported chain" };
    }

    const contractAddress = CONFIG[chainId].contractAddress;

    try {
        const hash = await client.wallet.writeContract({
            address: contractAddress,
            abi: onchainReactionAbi,
            functionName: "finishMatch",
            args: [BigInt(matchId), winnerAddress],
        });

        console.log("Tx sent:", hash);

        const receipt = await client.public.waitForTransactionReceipt({ hash });

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

    try {
        // Fetch live lobbies
        // Added chain_id to query
        const lobbyRes = await fetch(`${STDB_HOST}/database/sql/${STDB_NAME}`, {
            method: "POST",
            headers: { "Content-Type": "text/plain" },
            body: `SELECT id, match_id, status, winner_address, chain_id FROM lobby WHERE status = 'live' OR status = 'finished'`
        });
        const lobbyJson = await lobbyRes.json();

        // Map data to objects
        const lobbies = lobbyJson.data.map(row => ({
            id: row[0],
            matchId: row[1],
            status: row[2],
            winnerAddress: row[3],
            chainId: row[4]
        }));

        for (const lobby of lobbies) {
            // Case 1: Game Finished -> Settle on Chain
            if (lobby.status === 'finished' && lobby.winnerAddress) {
                const client = clients[lobby.chainId];
                if (!client) {
                    console.warn(`Skipping match ${lobby.matchId}: Unsupported chain ${lobby.chainId}`);
                    continue;
                }

                const contractAddress = CONFIG[lobby.chainId].contractAddress;

                // We can check if match is active on chain
                const isMatchActive = await client.public.readContract({
                    address: contractAddress,
                    abi: onchainReactionAbi,
                    functionName: "isMatchActive",
                    args: [BigInt(lobby.matchId)]
                });

                if (isMatchActive) {
                    console.log(`Match ${lobby.matchId} finished in DB but active on chain ${lobby.chainId}. Settling...`);
                    await finishMatch(lobby.chainId, lobby.matchId, lobby.winnerAddress);
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
                        await callReducer("claim_timeout", [lobby.id]);
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
import { fileURLToPath } from 'url';
if (process.argv[1] === fileURLToPath(import.meta.url)) {
    pollMatches();
}
