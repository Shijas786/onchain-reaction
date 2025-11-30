import { NextRequest, NextResponse } from "next/server";
import {
  DbConnection,
  DbConnectionBuilder,
} from "@/lib/spacetimedb/generated";

const SPACETIMEDB_CONFIG = {
  host: process.env.NEXT_PUBLIC_SPACETIMEDB_HOST || "wss://maincloud.spacetimedb.com",
  moduleName: process.env.NEXT_PUBLIC_SPACETIMEDB_MODULE || "chain-reaction",
};

interface Prize {
  id: string;
  chainId: number;
  matchId: number;
  arenaAddress: string;
  prizePool: string;
  entryFee: string;
  maxPlayers: number;
  createdAt: string;
}

/**
 * Connect to SpacetimeDB on the server side
 */
async function connectToSpacetimeDB(): Promise<DbConnection> {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error("Connection timeout"));
    }, 10000);

    const builder = DbConnection.builder()
      .withUri(SPACETIMEDB_CONFIG.host)
      .withModuleName(SPACETIMEDB_CONFIG.moduleName)
      .onConnect((conn) => {
        clearTimeout(timeout);
        resolve(conn);
      })
      .onConnectError((ctx, err) => {
        clearTimeout(timeout);
        console.error("SpacetimeDB connection error:", err);
        reject(err);
      });

    builder.build();
  });
}

/**
 * Query finished lobbies where the user won
 */
async function queryFinishedLobbies(walletAddress: string): Promise<Prize[]> {
  // Check if SpacetimeDB is configured
  if (!SPACETIMEDB_CONFIG.host || !SPACETIMEDB_CONFIG.moduleName) {
    console.warn("SpacetimeDB not configured, returning empty prizes");
    return [];
  }

  let conn: DbConnection | null = null;
  
  try {
    conn = await connectToSpacetimeDB();
    
    // Use subscription to query all finished lobbies
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error("Query timeout"));
      }, 8000);

      const subscription = conn!.subscriptionBuilder()
        .onApplied((ctx) => {
          clearTimeout(timeout);
          
          try {
            // Query all finished lobbies where winner matches wallet address
            const allLobbies = Array.from(ctx.db.lobby.iter());
            const finishedLobbies = allLobbies.filter(
              (lobby: any) =>
                lobby.status === "finished" &&
                lobby.winnerAddress?.toLowerCase() === walletAddress.toLowerCase()
            );

            // Convert to Prize format
            const prizes: Prize[] = finishedLobbies.map((lobby: any) => {
              // Calculate prize pool (entryFee * maxPlayers)
              const entryFeeNum = lobby.entryFee ? BigInt(lobby.entryFee) : BigInt(0);
              const maxPlayers = lobby.maxPlayers || 2;
              const prizePool = (entryFeeNum * BigInt(maxPlayers)).toString();

              return {
                id: lobby.id,
                chainId: lobby.chainId,
                matchId: Number(lobby.matchId),
                arenaAddress: lobby.arenaAddress,
                prizePool,
                entryFee: lobby.entryFee || "0",
                maxPlayers,
                createdAt: lobby.createdAt?.toString() || new Date().toISOString(),
              };
            });

            subscription.unsubscribe();
            resolve(prizes);
          } catch (err) {
            subscription.unsubscribe();
            reject(err);
          }
        })
        .onError((err) => {
          clearTimeout(timeout);
          subscription.unsubscribe();
          reject(err);
        })
        .subscribe(["SELECT * FROM lobby WHERE status = 'finished'"]);
    });
  } catch (error) {
    console.error("Error querying SpacetimeDB:", error);
    throw error;
  }
}

export async function GET(req: NextRequest) {
  try {
    // Get wallet address from query params
    const { searchParams } = new URL(req.url);
    const wallet = searchParams.get("wallet")?.toLowerCase();
    
    if (!wallet) {
      return NextResponse.json({ error: "Wallet address required" }, { status: 400 });
    }

    // Query SpacetimeDB for finished lobbies where user won
    const prizes = await queryFinishedLobbies(wallet);

    return NextResponse.json({ prizes });
  } catch (error) {
    console.error("Error fetching prizes:", error);
    return NextResponse.json({ 
      error: "Failed to fetch prizes",
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}

// POST endpoint to mark a prize as claimed (called after successful onchain claim)
// Note: SpacetimeDB doesn't have a "claimed" field currently, so this is a placeholder
// You could add a claimed field to the Lobby table in the Rust module if needed
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { matchId, chainId, wallet } = body;

    if (!matchId || !chainId || !wallet) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // Note: SpacetimeDB lobby table doesn't have a "claimed" field
    // If you want to track claimed status, add it to the Rust module:
    // pub claimed: bool, in the Lobby struct
    // Then update here:
    // const conn = await connectToSpacetimeDB();
    // const lobby = conn.db.lobby.iter().find((l: any) => 
    //   Number(l.matchId) === matchId && l.chainId === chainId
    // );
    // if (lobby) {
    //   conn.db.lobby.id.update({ ...lobby, claimed: true });
    // }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error marking prize claimed:", error);
    return NextResponse.json({ error: "Failed to update" }, { status: 500 });
  }
}

