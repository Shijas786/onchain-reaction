// SpacetimeDB Oracle Worker
// This script listens for finished games in SpacetimeDB and calls finishMatch() on-chain
// Run this as a Node.js process: npx tsx scripts/spacetimeOracle.ts

import "dotenv/config";
console.log("Starting oracle script...");
console.log("ORACLE_PRIVATE_KEY present:", !!process.env.ORACLE_PRIVATE_KEY);
import { createPublicClient, createWalletClient, http } from "viem";
import { base, arbitrum } from "viem/chains";
import { privateKeyToAccount } from "viem/accounts";
import { onchainReactionAbi } from "../lib/onchainReaction";
import { ARENA_ADDRESSES, CHAIN_IDS } from "../lib/contracts";
import { Infer } from "spacetimedb";
import {
  DbConnection,
  DbConnectionBuilder,
  Lobby,
  LobbyRow,
} from "../lib/spacetimedb/generated";

type LobbyType = Infer<typeof Lobby>;
type LobbyRowType = Infer<typeof LobbyRow>;

const ORACLE_PK = process.env.ORACLE_PRIVATE_KEY as `0x${string}`;
if (!ORACLE_PK) {
  throw new Error("Missing ORACLE_PRIVATE_KEY in environment variables");
}

const SPACETIMEDB_CONFIG = {
  host: process.env.NEXT_PUBLIC_SPACETIMEDB_HOST || "wss://maincloud.spacetimedb.com",
  moduleName: process.env.NEXT_PUBLIC_SPACETIMEDB_MODULE || "chain-reaction",
};

// RPC URLs (optional, uses default if not provided)
const RPC_URLS: Record<number, string | undefined> = {
  [CHAIN_IDS.BASE]: process.env.RPC_URL_BASE,
  [CHAIN_IDS.ARBITRUM]: process.env.RPC_URL_ARBITRUM,
};

const account = privateKeyToAccount(ORACLE_PK);

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

function chainFromId(chainId: number): "base" | "arbitrum" {
  if (chainId === CHAIN_IDS.BASE) return "base";
  if (chainId === CHAIN_IDS.ARBITRUM) return "arbitrum";
  throw new Error(`Unsupported chain ID: ${chainId}`);
}

/**
 * Check if match is already finalized on-chain
 */
async function isMatchFinalized(chainId: number, matchId: bigint): Promise<boolean> {
  try {
    const arenaAddress = ARENA_ADDRESSES[chainId];
    if (!arenaAddress) return false;

    const publicClient = getPublicClient(chainId);
    const matchInfo = await publicClient.readContract({
      address: arenaAddress,
      abi: onchainReactionAbi,
      functionName: "matches",
      args: [matchId],
    });

    // Status: 0=Pending, 1=Live, 2=Finished, 3=PaidOut, 4=Cancelled
    const status = matchInfo[5] as number;
    return status >= 2; // Finished or PaidOut
  } catch (error) {
    console.error(`Error checking match status:`, error);
    return false;
  }
}

/**
 * Finalize a match on-chain by calling finishMatch
 */
async function finalizeMatchOnChain(
  lobby: LobbyType
): Promise<{ success: boolean; txHash?: string; error?: string }> {
  try {
    if (lobby.status !== "finished") {
      return { success: false, error: "Lobby is not finished" };
    }

    if (!lobby.winnerAddress) {
      return { success: false, error: "Winner address not set" };
    }

    const chainId = lobby.chainId;
    const arenaAddress = ARENA_ADDRESSES[chainId];

    if (!arenaAddress) {
      return { success: false, error: "Arena contract not deployed on this chain" };
    }

    const matchId = BigInt(Number(lobby.matchId));
    const winnerAddress = lobby.winnerAddress as `0x${string}`;

    // Check if already finalized
    const alreadyFinalized = await isMatchFinalized(chainId, matchId);
    if (alreadyFinalized) {
      console.log(`Match ${matchId} already finalized on-chain`);
      return { success: true, txHash: "already-finalized" };
    }

    console.log(
      `Finalizing match on-chain: matchId=${matchId}, winner=${winnerAddress}, chain=${chainFromId(chainId)}`
    );

    const walletClient = getWalletClient(chainId);
    const publicClient = getPublicClient(chainId);

    // Simulate first
    const { request } = await publicClient.simulateContract({
      address: arenaAddress,
      abi: onchainReactionAbi,
      functionName: "finishMatch",
      args: [matchId, winnerAddress],
      account: account.address,
    });

    // Execute transaction
    const txHash = await walletClient.writeContract(request);
    console.log(`finishMatch transaction sent: ${txHash}`);

    // Wait for confirmation
    const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash });

    if (receipt.status === "success") {
      console.log(`✅ Match ${matchId} finalized on chain ${chainId}. TX: ${txHash}`);
      return { success: true, txHash };
    } else {
      return { success: false, error: "Transaction reverted" };
    }
  } catch (error: any) {
    console.error("Error finalizing match on-chain:", error);
    return {
      success: false,
      error: error?.shortMessage || error?.message || "Unknown error",
    };
  }
}

/**
 * Mark lobby as settled in SpacetimeDB
 * NOTE: This requires a reducer in the SpacetimeDB module to update the lobby
 * For now, we'll just log - you may need to add a reducer or update field
 */
async function markLobbyAsSettled(
  connection: DbConnection,
  lobbyId: string,
  txHash: string
): Promise<void> {
  // NOTE: The current SpacetimeDB schema doesn't have a settled_onchain field
  // You'll need to either:
  // 1. Add a reducer to update the lobby status to "settled"
  // 2. Add a settled_onchain field to the Lobby table in Rust
  // 3. Use the existing status field and change "finished" to "settled"

  console.log(`Would mark lobby ${lobbyId} as settled with tx ${txHash}`);
  // TODO: Call a reducer like: connection.reducers.markSettled({ lobbyId, txHash });
}

/**
 * Main oracle function
 */
async function main() {
  console.log("🚀 Starting SpacetimeDB Oracle...");
  console.log(`Oracle address: ${account.address}`);

  // Connect to SpacetimeDB
  let connection: DbConnection | null = null;

  try {
    connection = await new Promise<DbConnection>((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error("Connection timeout"));
      }, 30000);

      const builder = DbConnection.builder()
        .withUri(SPACETIMEDB_CONFIG.host)
        .withModuleName(SPACETIMEDB_CONFIG.moduleName)
        .onConnect((conn) => {
          clearTimeout(timeout);
          console.log("✅ Connected to SpacetimeDB");
          resolve(conn);
        })
        .onConnectError((ctx, err) => {
          clearTimeout(timeout);
          console.error("❌ SpacetimeDB connection error:", err);
          reject(err);
        })
        .onDisconnect((ctx) => {
          console.log("⚠️  Disconnected from SpacetimeDB");
          connection = null;
          // Attempt to reconnect
          setTimeout(() => {
            console.log("Attempting to reconnect...");
            main().catch(console.error);
          }, 5000);
        });

      builder.build();
    });

    // Subscribe to lobby table and watch for finished games
    console.log("📡 Subscribing to lobby table...");

    const subscription = connection.subscriptionBuilder()
      .onApplied((ctx) => {
        console.log("Subscription applied, scanning for finished games...");

        // Get all finished lobbies that have a winner
        const allLobbies = Array.from(ctx.db.lobby.iter());
        const finishedLobbies = allLobbies.filter(
          (lobby: LobbyRowType) => lobby.status === "finished" && lobby.winnerAddress
        );

        console.log(`Found ${finishedLobbies.length} finished lobby/lobbies`);

        // Process each finished lobby
        finishedLobbies.forEach((lobby) => {
          processFinishedLobby(lobby as unknown as LobbyType, connection!);
        });
      })
      .onError((err) => {
        console.error("Subscription error:", err);
      })
      .subscribe([`SELECT * FROM lobby WHERE status = 'finished' AND winner_address IS NOT NULL`]);

    // Listen for updates to lobby table
    connection.db.lobby.onUpdate((ctx, oldRow, newRow) => {
      // Only process when status changes from non-finished to finished
      if (oldRow.status !== "finished" && newRow.status === "finished" && newRow.winnerAddress) {
        console.log(`🎯 New finished lobby detected: ${newRow.id}`);
        processFinishedLobby(newRow as unknown as LobbyType, connection!);
      }
    });

    console.log("👂 Listening for finished games...");
    console.log("Press Ctrl+C to stop");

    // Keep process alive
    process.on("SIGINT", () => {
      console.log("\n🛑 Shutting down oracle...");
      if (connection) {
        connection.disconnect();
      }
      process.exit(0);
    });

    process.on("SIGTERM", () => {
      console.log("\n🛑 Shutting down oracle...");
      if (connection) {
        connection.disconnect();
      }
      process.exit(0);
    });
  } catch (error) {
    console.error("Failed to start oracle:", error);
    process.exit(1);
  }
}

/**
 * Process a finished lobby - finalize on-chain
 */
async function processFinishedLobby(lobby: LobbyType, connection: DbConnection): Promise<void> {
  console.log(`\n🔄 Processing finished lobby: ${lobby.id}`);

  // Check if already settled (in case we restarted)
  const alreadyFinalized = await isMatchFinalized(lobby.chainId, BigInt(Number(lobby.matchId)));

  if (alreadyFinalized) {
    console.log(`   ⏭️  Match ${lobby.matchId} already finalized on-chain, skipping`);
    return;
  }

  try {
    const result = await finalizeMatchOnChain(lobby);

    if (result.success && result.txHash) {
      console.log(`   ✅ Successfully finalized match ${lobby.matchId} on-chain`);
      console.log(`   📝 Transaction: ${result.txHash}`);

      // Mark as settled (requires reducer or manual update)
      if (result.txHash !== "already-finalized") {
        await markLobbyAsSettled(connection, lobby.id, result.txHash);
      }
    } else {
      console.error(`   ❌ Failed to finalize match: ${result.error}`);
      // You might want to retry logic here or alert
    }
  } catch (error) {
    console.error(`   ❌ Error processing lobby ${lobby.id}:`, error);
  }
}

// Run the oracle
main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});

