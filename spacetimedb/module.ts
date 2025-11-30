// SpacetimeDB Module for Chain Reaction: Orbs Edition
// Deploy with: spacetime publish chain-reaction --project-path .

import {
  SpacetimeDBClient,
  Identity,
  Address,
  ReducerContext,
  Table,
  Reducer,
  column,
  primaryKey,
  unique,
  index,
} from "@spacetimedb/sdk";

// ============================================================================
// TABLES
// ============================================================================

/**
 * Lobby - Represents a match room
 */
@Table({ name: "lobby", public: true })
export class Lobby {
  @primaryKey
  @column("string")
  id!: string; // UUID

  @column("u32")
  chainId!: number; // 8453 (Base) or 42161 (Arbitrum)

  @column("u64")
  matchId!: bigint; // On-chain match ID from createMatch

  @column("string")
  arenaAddress!: string; // ChainOrbArena contract address

  @column("string")
  hostIdentity!: string; // SpacetimeDB Identity of host

  @column("string")
  hostAddress!: string; // Wallet address of host

  @column("string")
  entryFee!: string; // In USDC wei units (string for bigint)

  @column("u32")
  maxPlayers!: number;

  @column("string")
  status!: string; // "waiting" | "live" | "finished" | "cancelled"

  @column("string")
  winnerIdentity!: string; // Optional - winner's SpacetimeDB Identity

  @column("string")
  winnerAddress!: string; // Optional - winner's wallet address

  @column("u64")
  createdAt!: bigint;

  @column("u64")
  updatedAt!: bigint;
}

/**
 * LobbyPlayer - Players in a lobby
 */
@Table({ name: "lobby_player", public: true })
export class LobbyPlayer {
  @primaryKey
  @column("string")
  id!: string; // lobbyId + "_" + identity

  @index
  @column("string")
  lobbyId!: string; // FK to Lobby.id

  @column("string")
  identity!: string; // SpacetimeDB Identity

  @column("string")
  address!: string; // Wallet address

  @column("string")
  name!: string; // Display name

  @column("string")
  color!: string; // Orb color: "red" | "blue" | "green" | "yellow" | etc.

  @column("bool")
  isHost!: boolean;

  @column("bool")
  isAlive!: boolean; // Still in the game

  @column("bool")
  hasDeposited!: boolean; // Has deposited USDC on-chain

  @column("u64")
  joinedAt!: bigint;
}

/**
 * GameState - Current board state for a lobby
 */
@Table({ name: "game_state", public: true })
export class GameState {
  @primaryKey
  @column("string")
  lobbyId!: string; // FK to Lobby.id

  @column("string")
  boardJson!: string; // JSON serialized board state

  @column("u32")
  currentPlayerIndex!: number;

  @column("bool")
  isAnimating!: boolean;

  @column("u32")
  moveCount!: number;

  @column("u64")
  lastMoveAt!: bigint;
}

/**
 * GameMove - Individual moves for replay/verification
 */
@Table({ name: "game_move", public: true })
export class GameMove {
  @primaryKey
  @column("string")
  id!: string; // lobbyId + "_" + moveIndex

  @index
  @column("string")
  lobbyId!: string;

  @column("u32")
  moveIndex!: number;

  @column("string")
  playerIdentity!: string;

  @column("u32")
  row!: number;

  @column("u32")
  col!: number;

  @column("u64")
  timestamp!: bigint;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const ROWS = 9;
const COLS = 6;
const PLAYER_COLORS = ["red", "blue", "green", "yellow", "purple", "orange", "pink", "cyan"];

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function generateId(): string {
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
}

function now(): bigint {
  return BigInt(Date.now());
}

function createEmptyBoard(): string {
  const board: { orbs: number; owner: string | null }[][] = [];
  for (let r = 0; r < ROWS; r++) {
    const row: { orbs: number; owner: string | null }[] = [];
    for (let c = 0; c < COLS; c++) {
      row.push({ orbs: 0, owner: null });
    }
    board.push(row);
  }
  return JSON.stringify(board);
}

function getMaxCapacity(row: number, col: number): number {
  const isCorner =
    (row === 0 || row === ROWS - 1) && (col === 0 || col === COLS - 1);
  const isEdge =
    row === 0 || row === ROWS - 1 || col === 0 || col === COLS - 1;

  if (isCorner) return 2;
  if (isEdge) return 3;
  return 4;
}

// ============================================================================
// REDUCERS
// ============================================================================

/**
 * Create a new lobby
 */
@Reducer
export function createLobby(
  ctx: ReducerContext,
  chainId: number,
  matchId: bigint,
  arenaAddress: string,
  hostAddress: string,
  entryFee: string,
  maxPlayers: number,
  hostName: string
): string {
  const identity = ctx.sender.toHexString();
  const lobbyId = generateId();
  const timestamp = now();

  // Create lobby
  const lobby = new Lobby();
  lobby.id = lobbyId;
  lobby.chainId = chainId;
  lobby.matchId = matchId;
  lobby.arenaAddress = arenaAddress;
  lobby.hostIdentity = identity;
  lobby.hostAddress = hostAddress;
  lobby.entryFee = entryFee;
  lobby.maxPlayers = maxPlayers;
  lobby.status = "waiting";
  lobby.winnerIdentity = "";
  lobby.winnerAddress = "";
  lobby.createdAt = timestamp;
  lobby.updatedAt = timestamp;
  ctx.db.lobby.insert(lobby);

  // Add host as first player
  const player = new LobbyPlayer();
  player.id = `${lobbyId}_${identity}`;
  player.lobbyId = lobbyId;
  player.identity = identity;
  player.address = hostAddress;
  player.name = hostName;
  player.color = PLAYER_COLORS[0];
  player.isHost = true;
  player.isAlive = true;
  player.hasDeposited = false; // Will be updated when on-chain deposit confirmed
  player.joinedAt = timestamp;
  ctx.db.lobbyPlayer.insert(player);

  // Create empty game state
  const gameState = new GameState();
  gameState.lobbyId = lobbyId;
  gameState.boardJson = createEmptyBoard();
  gameState.currentPlayerIndex = 0;
  gameState.isAnimating = false;
  gameState.moveCount = 0;
  gameState.lastMoveAt = timestamp;
  ctx.db.gameState.insert(gameState);

  console.log(`Lobby created: ${lobbyId} by ${identity}`);
  return lobbyId;
}

/**
 * Join an existing lobby
 */
@Reducer
export function joinLobby(
  ctx: ReducerContext,
  lobbyId: string,
  playerAddress: string,
  playerName: string
): void {
  const identity = ctx.sender.toHexString();

  // Get lobby
  const lobby = ctx.db.lobby.findByPrimaryKey(lobbyId);
  if (!lobby) {
    throw new Error("Lobby not found");
  }
  if (lobby.status !== "waiting") {
    throw new Error("Lobby is not accepting players");
  }

  // Check if already joined
  const existingPlayer = ctx.db.lobbyPlayer.findByPrimaryKey(`${lobbyId}_${identity}`);
  if (existingPlayer) {
    throw new Error("Already joined this lobby");
  }

  // Check max players
  const players = ctx.db.lobbyPlayer.filter((p) => p.lobbyId === lobbyId);
  if (players.length >= lobby.maxPlayers) {
    throw new Error("Lobby is full");
  }

  // Assign color
  const usedColors = new Set(players.map((p) => p.color));
  const availableColor = PLAYER_COLORS.find((c) => !usedColors.has(c)) || PLAYER_COLORS[0];

  // Add player
  const player = new LobbyPlayer();
  player.id = `${lobbyId}_${identity}`;
  player.lobbyId = lobbyId;
  player.identity = identity;
  player.address = playerAddress;
  player.name = playerName;
  player.color = availableColor;
  player.isHost = false;
  player.isAlive = true;
  player.hasDeposited = false;
  player.joinedAt = now();
  ctx.db.lobbyPlayer.insert(player);

  // Update lobby timestamp
  lobby.updatedAt = now();
  ctx.db.lobby.update(lobby);

  console.log(`Player ${identity} joined lobby ${lobbyId}`);
}

/**
 * Mark player as having deposited USDC on-chain
 */
@Reducer
export function confirmDeposit(
  ctx: ReducerContext,
  lobbyId: string,
  playerAddress: string
): void {
  // Find player by address in this lobby
  const players = ctx.db.lobbyPlayer.filter(
    (p) => p.lobbyId === lobbyId && p.address.toLowerCase() === playerAddress.toLowerCase()
  );

  if (players.length === 0) {
    throw new Error("Player not found in lobby");
  }

  const player = players[0];
  player.hasDeposited = true;
  ctx.db.lobbyPlayer.update(player);

  console.log(`Deposit confirmed for ${playerAddress} in lobby ${lobbyId}`);
}

/**
 * Start the game (host only)
 */
@Reducer
export function startGame(ctx: ReducerContext, lobbyId: string): void {
  const identity = ctx.sender.toHexString();

  const lobby = ctx.db.lobby.findByPrimaryKey(lobbyId);
  if (!lobby) {
    throw new Error("Lobby not found");
  }
  if (lobby.hostIdentity !== identity) {
    throw new Error("Only host can start the game");
  }
  if (lobby.status !== "waiting") {
    throw new Error("Game already started");
  }

  const players = ctx.db.lobbyPlayer.filter((p) => p.lobbyId === lobbyId);
  if (players.length < 2) {
    throw new Error("Need at least 2 players to start");
  }

  // Check all players have deposited
  const allDeposited = players.every((p) => p.hasDeposited);
  if (!allDeposited) {
    throw new Error("Not all players have deposited USDC");
  }

  // Update lobby status
  lobby.status = "live";
  lobby.updatedAt = now();
  ctx.db.lobby.update(lobby);

  console.log(`Game started in lobby ${lobbyId}`);
}

/**
 * Make a move (place orb)
 */
@Reducer
export function makeMove(
  ctx: ReducerContext,
  lobbyId: string,
  row: number,
  col: number
): void {
  const identity = ctx.sender.toHexString();

  // Validate lobby
  const lobby = ctx.db.lobby.findByPrimaryKey(lobbyId);
  if (!lobby) {
    throw new Error("Lobby not found");
  }
  if (lobby.status !== "live") {
    throw new Error("Game is not live");
  }

  // Get game state
  const gameState = ctx.db.gameState.findByPrimaryKey(lobbyId);
  if (!gameState) {
    throw new Error("Game state not found");
  }
  if (gameState.isAnimating) {
    throw new Error("Wait for animation to finish");
  }

  // Get players
  const players = ctx.db.lobbyPlayer
    .filter((p) => p.lobbyId === lobbyId && p.isAlive)
    .sort((a, b) => Number(a.joinedAt - b.joinedAt));

  if (players.length === 0) {
    throw new Error("No active players");
  }

  // Check if it's this player's turn
  const currentPlayer = players[gameState.currentPlayerIndex % players.length];
  if (currentPlayer.identity !== identity) {
    throw new Error("Not your turn");
  }

  // Parse board
  const board: { orbs: number; owner: string | null }[][] = JSON.parse(gameState.boardJson);

  // Validate move
  if (row < 0 || row >= ROWS || col < 0 || col >= COLS) {
    throw new Error("Invalid position");
  }

  const cell = board[row][col];
  if (cell.owner !== null && cell.owner !== currentPlayer.color) {
    throw new Error("Cell owned by another player");
  }

  // Place orb
  cell.orbs += 1;
  cell.owner = currentPlayer.color;

  // Process chain reactions
  const explosions: { row: number; col: number }[] = [];
  let hasExplosion = true;

  while (hasExplosion) {
    hasExplosion = false;

    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const maxCap = getMaxCapacity(r, c);
        if (board[r][c].orbs >= maxCap) {
          hasExplosion = true;
          explosions.push({ row: r, col: c });

          const explodingOwner = board[r][c].owner;
          board[r][c].orbs = 0;
          board[r][c].owner = null;

          // Spread to neighbors
          const neighbors = [
            [r - 1, c],
            [r + 1, c],
            [r, c - 1],
            [r, c + 1],
          ];

          for (const [nr, nc] of neighbors) {
            if (nr >= 0 && nr < ROWS && nc >= 0 && nc < COLS) {
              board[nr][nc].orbs += 1;
              board[nr][nc].owner = explodingOwner;
            }
          }
        }
      }
    }
  }

  // Check for eliminated players
  const playerOrbCounts: Record<string, number> = {};
  players.forEach((p) => (playerOrbCounts[p.color] = 0));

  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      if (board[r][c].owner) {
        playerOrbCounts[board[r][c].owner] = (playerOrbCounts[board[r][c].owner] || 0) + 1;
      }
    }
  }

  // Only check eliminations after first round (each player has moved once)
  if (gameState.moveCount >= players.length) {
    for (const player of players) {
      if (playerOrbCounts[player.color] === 0 && player.isAlive) {
        player.isAlive = false;
        ctx.db.lobbyPlayer.update(player);
        console.log(`Player ${player.name} eliminated!`);
      }
    }
  }

  // Check for winner
  const alivePlayers = players.filter((p) => p.isAlive);
  let totalOrbs = 0;
  for (const count of Object.values(playerOrbCounts)) {
    totalOrbs += count;
  }

  if (alivePlayers.length === 1 && totalOrbs > 0) {
    // We have a winner!
    const winner = alivePlayers[0];
    lobby.status = "finished";
    lobby.winnerIdentity = winner.identity;
    lobby.winnerAddress = winner.address;
    lobby.updatedAt = now();
    ctx.db.lobby.update(lobby);

    console.log(`Game finished! Winner: ${winner.name} (${winner.address})`);
  }

  // Record move
  const move = new GameMove();
  move.id = `${lobbyId}_${gameState.moveCount}`;
  move.lobbyId = lobbyId;
  move.moveIndex = gameState.moveCount;
  move.playerIdentity = identity;
  move.row = row;
  move.col = col;
  move.timestamp = now();
  ctx.db.gameMove.insert(move);

  // Update game state
  gameState.boardJson = JSON.stringify(board);
  gameState.currentPlayerIndex = (gameState.currentPlayerIndex + 1) % alivePlayers.length;
  gameState.moveCount += 1;
  gameState.lastMoveAt = now();
  ctx.db.gameState.update(gameState);
}

/**
 * Leave lobby (before game starts)
 */
@Reducer
export function leaveLobby(ctx: ReducerContext, lobbyId: string): void {
  const identity = ctx.sender.toHexString();

  const lobby = ctx.db.lobby.findByPrimaryKey(lobbyId);
  if (!lobby) {
    throw new Error("Lobby not found");
  }
  if (lobby.status !== "waiting") {
    throw new Error("Cannot leave after game started");
  }

  const player = ctx.db.lobbyPlayer.findByPrimaryKey(`${lobbyId}_${identity}`);
  if (!player) {
    throw new Error("Not in this lobby");
  }

  // If host leaves, cancel the lobby
  if (player.isHost) {
    lobby.status = "cancelled";
    lobby.updatedAt = now();
    ctx.db.lobby.update(lobby);

    // Remove all players
    const allPlayers = ctx.db.lobbyPlayer.filter((p) => p.lobbyId === lobbyId);
    for (const p of allPlayers) {
      ctx.db.lobbyPlayer.delete(p);
    }

    console.log(`Lobby ${lobbyId} cancelled by host`);
  } else {
    // Just remove this player
    ctx.db.lobbyPlayer.delete(player);
    lobby.updatedAt = now();
    ctx.db.lobby.update(lobby);

    console.log(`Player ${identity} left lobby ${lobbyId}`);
  }
}

/**
 * Admin: Force finish game (for stuck games or testing)
 */
@Reducer
export function adminFinishGame(
  ctx: ReducerContext,
  lobbyId: string,
  winnerAddress: string
): void {
  // TODO: Add proper admin authentication
  const lobby = ctx.db.lobby.findByPrimaryKey(lobbyId);
  if (!lobby) {
    throw new Error("Lobby not found");
  }

  const players = ctx.db.lobbyPlayer.filter(
    (p) => p.lobbyId === lobbyId && p.address.toLowerCase() === winnerAddress.toLowerCase()
  );

  if (players.length === 0) {
    throw new Error("Winner not found in lobby");
  }

  const winner = players[0];
  lobby.status = "finished";
  lobby.winnerIdentity = winner.identity;
  lobby.winnerAddress = winner.address;
  lobby.updatedAt = now();
  ctx.db.lobby.update(lobby);

  console.log(`Admin finished game. Winner: ${winner.address}`);
}

