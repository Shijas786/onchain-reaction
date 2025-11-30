"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { SpacetimeDBClient, Identity } from "@clockworklabs/spacetimedb-sdk";
import {
  getSpacetimeClient,
  connectToSpacetimeDB,
  disconnectFromSpacetimeDB,
  isConnected as checkConnected,
} from "@/lib/spacetimedb/client";
import {
  Lobby,
  LobbyPlayer,
  GameState,
  Board,
  parseBoard,
} from "@/lib/spacetimedb/types";

// Connection status
export type ConnectionStatus = "disconnected" | "connecting" | "connected" | "error";

/**
 * Hook for SpacetimeDB connection management
 */
export function useSpacetimeConnection() {
  const [status, setStatus] = useState<ConnectionStatus>("disconnected");
  const [identity, setIdentity] = useState<string | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const clientRef = useRef<SpacetimeDBClient | null>(null);

  const connect = useCallback(async () => {
    if (status === "connecting" || status === "connected") return;
    
    setStatus("connecting");
    setError(null);
    
    try {
      const client = await connectToSpacetimeDB();
      clientRef.current = client;
      setIdentity(client.identity?.toHexString() || null);
      setStatus("connected");
    } catch (err) {
      setError(err as Error);
      setStatus("error");
    }
  }, [status]);

  const disconnect = useCallback(() => {
    disconnectFromSpacetimeDB();
    clientRef.current = null;
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
    client: clientRef.current,
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

  const { client, isConnected, identity } = useSpacetimeConnection();

  // Subscribe to lobby updates
  useEffect(() => {
    if (!client || !isConnected || !lobbyId) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);

    // Subscribe to tables
    // Note: Actual subscription syntax depends on generated client code
    // This is a placeholder showing the intended usage pattern
    
    const unsubscribeLobby = client.db.lobby?.onInsert((row: Lobby) => {
      if (row.id === lobbyId) setLobby(row);
    });
    
    const unsubscribeLobbyUpdate = client.db.lobby?.onUpdate((oldRow: Lobby, newRow: Lobby) => {
      if (newRow.id === lobbyId) setLobby(newRow);
    });

    const unsubscribePlayers = client.db.lobbyPlayer?.onInsert((row: LobbyPlayer) => {
      if (row.lobbyId === lobbyId) {
        setPlayers(prev => [...prev.filter(p => p.id !== row.id), row]);
      }
    });

    const unsubscribePlayersUpdate = client.db.lobbyPlayer?.onUpdate((oldRow: LobbyPlayer, newRow: LobbyPlayer) => {
      if (newRow.lobbyId === lobbyId) {
        setPlayers(prev => prev.map(p => p.id === newRow.id ? newRow : p));
      }
    });

    const unsubscribePlayersDelete = client.db.lobbyPlayer?.onDelete((row: LobbyPlayer) => {
      if (row.lobbyId === lobbyId) {
        setPlayers(prev => prev.filter(p => p.id !== row.id));
      }
    });

    const unsubscribeGameState = client.db.gameState?.onInsert((row: GameState) => {
      if (row.lobbyId === lobbyId) {
        setGameState(row);
        setBoard(parseBoard(row.boardJson));
      }
    });

    const unsubscribeGameStateUpdate = client.db.gameState?.onUpdate((oldRow: GameState, newRow: GameState) => {
      if (newRow.lobbyId === lobbyId) {
        setGameState(newRow);
        setBoard(parseBoard(newRow.boardJson));
      }
    });

    // Query initial data
    // This would use the generated query methods
    setIsLoading(false);

    return () => {
      unsubscribeLobby?.();
      unsubscribeLobbyUpdate?.();
      unsubscribePlayers?.();
      unsubscribePlayersUpdate?.();
      unsubscribePlayersDelete?.();
      unsubscribeGameState?.();
      unsubscribeGameStateUpdate?.();
    };
  }, [client, isConnected, lobbyId]);

  // Actions
  const createLobby = useCallback(async (
    chainId: number,
    matchId: bigint,
    arenaAddress: string,
    hostAddress: string,
    entryFee: string,
    maxPlayers: number,
    hostName: string
  ): Promise<string | null> => {
    if (!client || !isConnected) return null;
    
    try {
      // Call reducer
      const result = await client.reducers.createLobby(
        chainId,
        matchId,
        arenaAddress,
        hostAddress,
        entryFee,
        maxPlayers,
        hostName
      );
      return result as string;
    } catch (err) {
      console.error("Failed to create lobby:", err);
      return null;
    }
  }, [client, isConnected]);

  const joinLobby = useCallback(async (
    targetLobbyId: string,
    playerAddress: string,
    playerName: string
  ): Promise<boolean> => {
    if (!client || !isConnected) return false;
    
    try {
      await client.reducers.joinLobby(targetLobbyId, playerAddress, playerName);
      return true;
    } catch (err) {
      console.error("Failed to join lobby:", err);
      return false;
    }
  }, [client, isConnected]);

  const confirmDeposit = useCallback(async (
    targetLobbyId: string,
    playerAddress: string
  ): Promise<boolean> => {
    if (!client || !isConnected) return false;
    
    try {
      await client.reducers.confirmDeposit(targetLobbyId, playerAddress);
      return true;
    } catch (err) {
      console.error("Failed to confirm deposit:", err);
      return false;
    }
  }, [client, isConnected]);

  const startGame = useCallback(async (): Promise<boolean> => {
    if (!client || !isConnected || !lobbyId) return false;
    
    try {
      await client.reducers.startGame(lobbyId);
      return true;
    } catch (err) {
      console.error("Failed to start game:", err);
      return false;
    }
  }, [client, isConnected, lobbyId]);

  const makeMove = useCallback(async (row: number, col: number): Promise<boolean> => {
    if (!client || !isConnected || !lobbyId) return false;
    
    try {
      await client.reducers.makeMove(lobbyId, row, col);
      return true;
    } catch (err) {
      console.error("Failed to make move:", err);
      return false;
    }
  }, [client, isConnected, lobbyId]);

  const leaveLobby = useCallback(async (): Promise<boolean> => {
    if (!client || !isConnected || !lobbyId) return false;
    
    try {
      await client.reducers.leaveLobby(lobbyId);
      return true;
    } catch (err) {
      console.error("Failed to leave lobby:", err);
      return false;
    }
  }, [client, isConnected, lobbyId]);

  // Derived state
  const currentPlayer = players.find(p => p.identity === identity);
  const isHost = currentPlayer?.isHost || false;
  const isMyTurn = gameState 
    ? players.filter(p => p.isAlive)[gameState.currentPlayerIndex]?.identity === identity
    : false;
  const alivePlayers = players.filter(p => p.isAlive);
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

  const { client, isConnected } = useSpacetimeConnection();

  useEffect(() => {
    if (!client || !isConnected) {
      setIsLoading(false);
      return;
    }

    // Subscribe to lobby table
    const unsubscribe = client.db.lobby?.onInsert((row: Lobby) => {
      if (row.status === "waiting") {
        setLobbies(prev => [...prev.filter(l => l.id !== row.id), row]);
      }
    });

    const unsubscribeUpdate = client.db.lobby?.onUpdate((oldRow: Lobby, newRow: Lobby) => {
      if (newRow.status === "waiting") {
        setLobbies(prev => prev.map(l => l.id === newRow.id ? newRow : l));
      } else {
        // Remove from list if no longer waiting
        setLobbies(prev => prev.filter(l => l.id !== newRow.id));
      }
    });

    const unsubscribeDelete = client.db.lobby?.onDelete((row: Lobby) => {
      setLobbies(prev => prev.filter(l => l.id !== row.id));
    });

    setIsLoading(false);

    return () => {
      unsubscribe?.();
      unsubscribeUpdate?.();
      unsubscribeDelete?.();
    };
  }, [client, isConnected]);

  return {
    lobbies,
    isLoading,
    waitingLobbies: lobbies.filter(l => l.status === "waiting"),
  };
}

