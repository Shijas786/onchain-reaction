import { NextRequest, NextResponse } from "next/server";

// TODO: Replace with actual SpacetimeDB or database query
// This is a mock implementation for development

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

// Mock prizes for development - replace with real DB query
const mockPrizes: Record<string, Prize[]> = {
  // Example: user wallet address -> prizes
};

export async function GET(req: NextRequest) {
  try {
    // Get wallet address from query params or auth session
    const { searchParams } = new URL(req.url);
    const wallet = searchParams.get("wallet")?.toLowerCase();
    
    if (!wallet) {
      return NextResponse.json({ error: "Wallet address required" }, { status: 400 });
    }

    // TODO: Replace with actual database query
    // Query SpacetimeDB / DB: lobbies where winnerAddr = wallet AND claimed = false
    // 
    // Example with SpacetimeDB:
    // const prizes = await db.lobby.findMany({
    //   where: { winnerAddr: wallet, status: "finished", claimed: false },
    //   select: {
    //     id: true,
    //     chainId: true,
    //     matchId: true,
    //     arenaAddress: true,
    //     prizePool: true,
    //     entryFee: true,
    //     maxPlayers: true,
    //     createdAt: true,
    //   },
    // });

    // For now, return mock data or empty array
    const prizes = mockPrizes[wallet] || [];

    return NextResponse.json({ prizes });
  } catch (error) {
    console.error("Error fetching prizes:", error);
    return NextResponse.json({ error: "Failed to fetch prizes" }, { status: 500 });
  }
}

// POST endpoint to mark a prize as claimed (called after successful onchain claim)
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { matchId, chainId, wallet } = body;

    if (!matchId || !chainId || !wallet) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // TODO: Update database to mark prize as claimed
    // await db.lobby.update({
    //   where: { matchId, chainId },
    //   data: { claimed: true },
    // });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error marking prize claimed:", error);
    return NextResponse.json({ error: "Failed to update" }, { status: 500 });
  }
}

