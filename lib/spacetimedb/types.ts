// SpacetimeDB Types for Chain Reaction
// These types mirror the server-side module schema

export interface Lobby {
  id: string;
  chainId: number;
  matchId: bigint;
  arenaAddress: string;
  hostIdentity: string;
  hostAddress: string;
  entryFee: string;
  maxPlayers: number;
  status: "waiting" | "live" | "finished" | "cancelled";
  winnerIdentity: string;
  winnerAddress: string;
  createdAt: bigint;
  updatedAt: bigint;
}

export interface LobbyPlayer {
  id: string;
  lobbyId: string;
  identity: string;
  address: string;
  name: string;
  color: string;
  isHost: boolean;
  isAlive: boolean;
  hasDeposited: boolean;
  joinedAt: bigint;
}

export interface GameState {
  lobbyId: string;
  boardJson: string;
  currentPlayerIndex: number;
  isAnimating: boolean;
  moveCount: number;
  lastMoveAt: bigint;
}

export interface GameMove {
  id: string;
  lobbyId: string;
  moveIndex: number;
  playerIdentity: string;
  row: number;
  col: number;
  timestamp: bigint;
}

// Parsed board cell
export interface BoardCell {
  orbs: number;
  owner: string | null;
}

// Parsed board (9x6 grid)
export type Board = BoardCell[][];

// Parse board JSON to typed array
export function parseBoard(boardJson: string): Board {
  try {
    return JSON.parse(boardJson) as Board;
  } catch {
    // Return empty 9x6 board on parse error
    return Array(9).fill(null).map(() => 
      Array(6).fill(null).map(() => ({ orbs: 0, owner: null }))
    );
  }
}

// Player colors mapping
export const PLAYER_COLORS = [
  "red",
  "blue", 
  "green",
  "yellow",
  "purple",
  "orange",
  "pink",
  "cyan",
] as const;

export type PlayerColor = typeof PLAYER_COLORS[number];

