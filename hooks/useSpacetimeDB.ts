"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Identity } from "spacetimedb";
import {
  connectToSpacetimeDB,
  disconnectFromSpacetimeDB,
  getDbConnection,
  isConnected as checkConnected,
  tables,
  reducers,
  type EventContext,
  type ReducerEventContext,
} from "@/lib/spacetimedb/client";
import { DbConnection } from "@/lib/spacetimedb/generated";

// Types from generated code
export type Lobby = {
  id: string;
  chainId: number;
  matchId: bigint;
  arenaAddress: string;
  hostIdentity: Identity;
  hostAddress: string;
  entryFee: string;
  maxPlayers: number;
  status: string;
  winnerIdentity: Identity | null;
  winnerAddress: string | null;
  createdAt: bigint;
  updatedAt: bigint;
};

export type LobbyPlayer = {
  id: string;
  lobbyId: string;
  identity: Identity;
  address: string;
  name: string;
  color: string;
  isHost: boolean;
  isAlive: boolean;
  hasDeposited: boolean;
  joinedAt: bigint;
  // Computed for UI
  avatar?: string;
  farcasterHandle?: string;
};

export type GameState = {
  lobbyId: string;
  boardJson: string;
  rows: number;
  cols: number;
  currentPlayerIndex: number;
  isAnimating: boolean;
  moveCount: number;
  lastMoveAt: bigint;
};

export type Board = { orbs: number; owner: string | null }[][];

export function parseBoard(boardJson: string): Board {
  try {
    return JSON.parse(boardJson);
  } catch {
    return Array(9).fill(null).map(() => Array(6).fill(null).map(() => ({ orbs: 0, owner: null })));
  }
}

export const PLAYER_COLORS = ["red", "blue", "green", "yellow", "purple", "orange", "pink", "cyan"];

// Connection status
export type ConnectionStatus = "disconnected" | "connecting" | "connected" | "error";

/**
 * Hook for SpacetimeDB connection management
 */
export function useSpacetimeConnection() {
  const [status, setStatus] = useState<ConnectionStatus>("disconnected");
  const [identity, setIdentity] = useState<string | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const connectionRef = useRef<DbConnection | null>(null);

  const connect = useCallback(async () => {
    if (status === "connecting" || status === "connected") return;

    setStatus("connecting");
    setError(null);

    try {
      const conn = await connectToSpacetimeDB();
      connectionRef.current = conn;
      
      // Get identity from connection
      const id = conn.identity;
      setIdentity(id?.toHexString() || null);
      setStatus("connected");
    } catch (err) {
      setError(err as Error);
      setStatus("error");
    }
  }, [status]);

  const disconnect = useCallback(() => {
    disconnectFromSpacetimeDB();
    connectionRef.current = null;
    setIdentity(null);
    setStatus("disconnected");
  }, []);

  // Auto-connect on mount
  useEffect(() => {
    connect();
    return () => {
      // Don't disconnect on unmount - keep connection alive
    };
  }, []);

  return {
    status,
    identity,
    error,
    connection: connectionRef.current,
    connect,
    disconnect,
    isConnected: status === "connected",
  };
}

/**
 * Hook for lobby state and actions
 */
export function useLobby(lobbyId: string | null) {
  const [lobby, setLobby] = useState<Lobby | null>(null);
  const [players, setPlayers] = useState<LobbyPlayer[]>([]);
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [board, setBoard] = useState<Board | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const { connection, isConnected, identity } = useSpacetimeConnection();

  // Subscribe to tables and set up event handlers
  useEffect(() => {
    if (!isConnected || !lobbyId) {
      setIsLoading(false);
      return;
    }

    const conn = getDbConnection();
    if (!conn) return;

    setIsLoading(true);

    // Subscribe to the lobby and related data
    const subscription = conn.subscriptionBuilder()
      .onApplied((ctx) => {
        console.log("Subscription applied");
        
        // Load initial data
        const lobbyData = ctx.db.lobby.id.find(lobbyId);
        if (lobbyData) {
          setLobby(lobbyData as unknown as Lobby);
        }

        const playersData = Array.from(ctx.db.lobbyPlayer.lobby_id.filter(lobbyId));
        setPlayers(playersData.map(p => ({
          ...p as unknown as LobbyPlayer,
          avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(p.name)}&background=random`,
          farcasterHandle: `@${p.name.toLowerCase().replace(/\s+/g, '')}`,
        })));

        const gameData = ctx.db.gameState.lobby_id.find(lobbyId);
        if (gameData) {
          const gs = gameData as unknown as GameState;
          setGameState(gs);
          setBoard(parseBoard(gs.boardJson));
        }

        setIsLoading(false);
      })
      .onError((err) => {
        console.error("Subscription error:", err);
        setIsLoading(false);
      })
      .subscribe([
        `SELECT * FROM lobby WHERE id = '${lobbyId}'`,
        `SELECT * FROM lobby_player WHERE lobby_id = '${lobbyId}'`,
        `SELECT * FROM game_state WHERE lobby_id = '${lobbyId}'`,
        `SELECT * FROM game_move WHERE lobby_id = '${lobbyId}'`,
      ]);

    // Set up table event handlers
    conn.db.lobby.onInsert((ctx, row) => {
      if (row.id === lobbyId) {
        setLobby(row as unknown as Lobby);
      }
    });

    conn.db.lobby.onUpdate((ctx, oldRow, newRow) => {
      if (newRow.id === lobbyId) {
        setLobby(newRow as unknown as Lobby);
      }
    });

    conn.db.lobbyPlayer.onInsert((ctx, row) => {
      if (row.lobbyId === lobbyId) {
        setPlayers(prev => {
          const existing = prev.find(p => p.id === row.id);
          if (existing) return prev;
          return [...prev, {
            ...row as unknown as LobbyPlayer,
            avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(row.name)}&background=random`,
            farcasterHandle: `@${row.name.toLowerCase().replace(/\s+/g, '')}`,
          }];
        });
      }
    });

    conn.db.lobbyPlayer.onUpdate((ctx, oldRow, newRow) => {
      if (newRow.lobbyId === lobbyId) {
        setPlayers(prev => prev.map(p => 
          p.id === newRow.id 
            ? { 
                ...newRow as unknown as LobbyPlayer,
                avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(newRow.name)}&background=random`,
                farcasterHandle: `@${newRow.name.toLowerCase().replace(/\s+/g, '')}`,
              }
            : p
        ));
      }
    });

    conn.db.lobbyPlayer.onDelete((ctx, row) => {
      if (row.lobbyId === lobbyId) {
        setPlayers(prev => prev.filter(p => p.id !== row.id));
      }
    });

    conn.db.gameState.onInsert((ctx, row) => {
      if (row.lobbyId === lobbyId) {
        const gs = row as unknown as GameState;
        setGameState(gs);
        setBoard(parseBoard(gs.boardJson));
      }
    });

    conn.db.gameState.onUpdate((ctx, oldRow, newRow) => {
      if (newRow.lobbyId === lobbyId) {
        const gs = newRow as unknown as GameState;
        setGameState(gs);
        setBoard(parseBoard(gs.boardJson));
      }
    });

    return () => {
      subscription?.unsubscribe();
    };
  }, [isConnected, lobbyId]);

  // Actions
  const createLobby = useCallback(
    async (
      chainId: number,
      matchId: bigint,
      arenaAddress: string,
      hostAddress: string,
      entryFee: string,
      maxPlayers: number,
      hostName: string
    ): Promise<string | null> => {
      const conn = getDbConnection();
      if (!conn || !lobbyId) return null;

      try {
        conn.reducers.createLobby({
          chainId,
          matchId,
          arenaAddress,
          hostAddress,
          entryFee,
          maxPlayers,
          hostName,
          lobbyId,
        });
        return lobbyId;
      } catch (err) {
        console.error("Failed to create lobby:", err);
        return null;
      }
    },
    [lobbyId]
  );

  const joinLobby = useCallback(
    async (
      targetLobbyId: string,
      playerAddress: string,
      playerName: string
    ): Promise<boolean> => {
      const conn = getDbConnection();
      if (!conn) return false;

      try {
        conn.reducers.joinLobby({
          lobbyId: targetLobbyId,
          playerAddress,
          playerName,
        });
        return true;
      } catch (err) {
        console.error("Failed to join lobby:", err);
        return false;
      }
    },
    []
  );

  const confirmDeposit = useCallback(
    async (targetLobbyId: string, playerAddress: string): Promise<boolean> => {
      const conn = getDbConnection();
      if (!conn) return false;

      try {
        conn.reducers.confirmDeposit({
          lobbyId: targetLobbyId,
          playerAddress,
        });
        return true;
      } catch (err) {
        console.error("Failed to confirm deposit:", err);
        return false;
      }
    },
    []
  );

  const startGame = useCallback(async (): Promise<boolean> => {
    const conn = getDbConnection();
    if (!conn || !lobbyId) return false;

    try {
      conn.reducers.startGame({ lobbyId });
      return true;
    } catch (err) {
      console.error("Failed to start game:", err);
      return false;
    }
  }, [lobbyId]);

  const makeMove = useCallback(
    async (row: number, col: number): Promise<boolean> => {
      const conn = getDbConnection();
      if (!conn || !lobbyId) return false;

    try {
      conn.reducers.makeMove({ lobbyId, row, col });
      return true;
    } catch (err) {
      console.error("Failed to make move:", err);
      return false;
    }
    },
    [lobbyId]
  );

  const leaveLobby = useCallback(async (): Promise<boolean> => {
    const conn = getDbConnection();
    if (!conn || !lobbyId) return false;

    try {
      conn.reducers.leaveLobby({ lobbyId });
      return true;
    } catch (err) {
      console.error("Failed to leave lobby:", err);
      return false;
    }
  }, [lobbyId]);

  // Derived state
  const currentPlayer = players.find((p) => p.identity?.toHexString() === identity);
  const isHost = currentPlayer?.isHost || false;
  const alivePlayers = players.filter((p) => p.isAlive);
  const isMyTurn = gameState
    ? alivePlayers[gameState.currentPlayerIndex % alivePlayers.length]?.identity?.toHexString() === identity
    : false;
  const currentTurnPlayer = gameState
    ? alivePlayers[gameState.currentPlayerIndex % alivePlayers.length]
    : null;

  return {
    // State
    lobby,
    players,
    gameState,
    board,
    isLoading,
    // Derived
    currentPlayer,
    isHost,
    isMyTurn,
    currentTurnPlayer,
    alivePlayers,
    // Actions
    createLobby,
    joinLobby,
    confirmDeposit,
    startGame,
    makeMove,
    leaveLobby,
  };
}

/**
 * Hook for listing available lobbies
 */
export function useLobbyList() {
  const [lobbies, setLobbies] = useState<Lobby[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const { isConnected } = useSpacetimeConnection();

  useEffect(() => {
    if (!isConnected) {
      setIsLoading(false);
      return;
    }

    const conn = getDbConnection();
    if (!conn) return;

    setIsLoading(true);

    // Subscribe to all lobbies
    const subscription = conn.subscriptionBuilder()
      .onApplied((ctx) => {
        const allLobbies = Array.from(ctx.db.lobby.iter());
        setLobbies(allLobbies as unknown as Lobby[]);
        setIsLoading(false);
      })
      .onError((err) => {
        console.error("Lobby list subscription error:", err);
        setIsLoading(false);
      })
      .subscribe(["SELECT * FROM lobby WHERE status = 'waiting'"]);

    // Set up event handlers
    conn.db.lobby.onInsert((ctx, row) => {
      if (row.status === "waiting") {
        setLobbies(prev => {
          const existing = prev.find(l => l.id === row.id);
          if (existing) return prev;
          return [...prev, row as unknown as Lobby];
        });
      }
    });

    conn.db.lobby.onUpdate((ctx, oldRow, newRow) => {
      setLobbies(prev => {
        if (newRow.status === "waiting") {
          const existing = prev.find(l => l.id === newRow.id);
          if (existing) {
            return prev.map(l => l.id === newRow.id ? newRow as unknown as Lobby : l);
          }
          return [...prev, newRow as unknown as Lobby];
        } else {
          return prev.filter(l => l.id !== newRow.id);
        }
      });
    });

    conn.db.lobby.onDelete((ctx, row) => {
      setLobbies(prev => prev.filter(l => l.id !== row.id));
    });

    return () => {
      subscription?.unsubscribe();
    };
  }, [isConnected]);

  const waitingLobbies = lobbies.filter(l => l.status === "waiting");

  return {
    lobbies,
    isLoading,
    waitingLobbies,
  };
}
