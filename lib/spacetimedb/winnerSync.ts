// Winner Sync Service
// This service calls the smart contract to finalize winners after game ends
// NOTE: This should run on a backend/oracle service, not in the browser
// This file is for reference and can be adapted for a Node.js backend service

import { createPublicClient, createWalletClient, http, decodeEventLog } from "viem";
import { base, arbitrum } from "viem/chains";
import { privateKeyToAccount } from "viem/accounts";
import { onchainReactionAbi } from "@/lib/onchainReaction";
import { ARENA_ADDRESSES, CHAIN_IDS } from "@/lib/contracts";
import type { Lobby } from "./types";

// Chain configuration
const CHAIN_CONFIG = {
  [CHAIN_IDS.BASE]: base,
  [CHAIN_IDS.ARBITRUM]: arbitrum,
} as const;

// Oracle configuration
// IMPORTANT: Never expose private keys in frontend code!
// This is for backend/server-side use only
interface OracleConfig {
  privateKey: `0x${string}`;
  rpcUrls?: {
    [CHAIN_IDS.BASE]?: string;
    [CHAIN_IDS.ARBITRUM]?: string;
  };
}

/**
 * Create clients for interacting with the blockchain
 */
function createClients(chainId: number, config: OracleConfig) {
  const chain = CHAIN_CONFIG[chainId as keyof typeof CHAIN_CONFIG];
  if (!chain) throw new Error(`Unsupported chain: ${chainId}`);

  const transport = http(config.rpcUrls?.[chainId as keyof typeof config.rpcUrls]);

  const publicClient = createPublicClient({
    chain,
    transport,
  });

  const account = privateKeyToAccount(config.privateKey);

  const walletClient = createWalletClient({
    chain,
    transport,
    account,
  });

  return { publicClient, walletClient, account };
}

/**
 * Finalize a match on-chain after game ends in SpacetimeDB
 * This should be called from a backend service when a game ends
 */
export async function finalizeMatchOnChain(
  lobby: Lobby,
  oracleConfig: OracleConfig
): Promise<{ success: boolean; txHash?: string; error?: string }> {
  try {
    // Validate lobby
    if (lobby.status !== "finished") {
      return { success: false, error: "Lobby is not finished" };
    }
    if (!lobby.winnerAddress) {
      return { success: false, error: "Winner address not set" };
    }

    const chainId = lobby.chainId;
    const arenaAddress = ARENA_ADDRESSES[chainId];

    if (!arenaAddress || arenaAddress === "0x0000000000000000000000000000000000000000") {
      return { success: false, error: "Arena contract not deployed on this chain" };
    }

    const { publicClient, walletClient, account } = createClients(chainId, oracleConfig);

    // Check current match status on-chain
    const matchInfo = await publicClient.readContract({
      address: arenaAddress,
      abi: onchainReactionAbi,
      functionName: "matches",
      args: [lobby.matchId],
    }) as [string, bigint, bigint, bigint, number, string];

    const onChainStatus = matchInfo[4]; // status enum index

    // Status: 0=Pending, 1=Live, 2=Finished, 3=PaidOut, 4=Cancelled
    if (onChainStatus >= 2) {
      return { success: false, error: "Match already finalized on-chain" };
    }

    // Simulate the transaction first
    const { request } = await publicClient.simulateContract({
      address: arenaAddress,
      abi: onchainReactionAbi,
      functionName: "finishMatch",
      args: [lobby.matchId, lobby.winnerAddress as `0x${string}`],
      account,
    });

    // Execute the transaction
    const txHash = await walletClient.writeContract(request);

    // Wait for confirmation
    const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash });

    if (receipt.status === "success") {
      console.log(`Match ${lobby.matchId} finalized on chain ${chainId}. TX: ${txHash}`);
      return { success: true, txHash };
    } else {
      return { success: false, error: "Transaction reverted" };
    }
  } catch (error: any) {
    console.error("Failed to finalize match:", error);
    return {
      success: false,
      error: error?.shortMessage || error?.message || "Unknown error"
    };
  }
}

/**
 * Check if a match has been finalized on-chain
 */
export async function isMatchFinalizedOnChain(
  chainId: number,
  matchId: bigint
): Promise<boolean> {
  try {
    const chain = CHAIN_CONFIG[chainId as keyof typeof CHAIN_CONFIG];
    if (!chain) return false;

    const arenaAddress = ARENA_ADDRESSES[chainId];
    if (!arenaAddress) return false;

    const publicClient = createPublicClient({
      chain,
      transport: http(),
    });

    const matchInfo = await publicClient.readContract({
      address: arenaAddress,
      abi: onchainReactionAbi,
      functionName: "matches",
      args: [matchId],
    }) as [string, bigint, bigint, bigint, number, string];

    const status = matchInfo[4];
    // Status 2 = Finished, 3 = PaidOut
    return status >= 2;
  } catch {
    return false;
  }
}

/**
 * Backend service that listens for finished games and syncs to chain
 * This would run as a separate Node.js process
 */
export class WinnerSyncService {
  private oracleConfig: OracleConfig;
  private isRunning = false;

  constructor(oracleConfig: OracleConfig) {
    this.oracleConfig = oracleConfig;
  }

  /**
   * Process a finished lobby
   */
  async processFinishedLobby(lobby: Lobby): Promise<void> {
    console.log(`Processing finished lobby: ${lobby.id}`);

    const result = await finalizeMatchOnChain(lobby, this.oracleConfig);

    if (result.success) {
      console.log(`Successfully finalized match ${lobby.matchId} on chain ${lobby.chainId}`);
      // TODO: Update SpacetimeDB to mark as synced
    } else {
      console.error(`Failed to finalize match: ${result.error}`);
      // TODO: Retry logic or alert
    }
  }

  /**
   * Start listening for finished games
   * This would connect to SpacetimeDB and listen for status changes
   */
  async start(): Promise<void> {
    if (this.isRunning) return;
    this.isRunning = true;

    console.log("Winner sync service started");

    // TODO: Connect to SpacetimeDB and subscribe to lobby table
    // When a lobby status changes to "finished", call processFinishedLobby

    // Example pseudo-code:
    // const client = await connectToSpacetimeDB();
    // client.db.lobby.onUpdate((oldLobby, newLobby) => {
    //   if (oldLobby.status !== "finished" && newLobby.status === "finished") {
    //     this.processFinishedLobby(newLobby);
    //   }
    // });
  }

  /**
   * Stop the service
   */
  stop(): void {
    this.isRunning = false;
    console.log("Winner sync service stopped");
  }
}

