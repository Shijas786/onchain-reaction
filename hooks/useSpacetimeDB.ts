"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useLocalGame } from "./useLocalGame";
import type { Lobby, LobbyPlayer, GameState, Board } from "@/lib/spacetimedb/types";

export type ConnectionStatus = "disconnected" | "connecting" | "connected" | "error";

const DEFAULT_CHAIN_ID = 8453;
const MOCK_HOST_ADDRESS = "0xHostAddress";
const MOCK_ARENA = "0xMockArena";

const nowBigInt = () => BigInt(Date.now());

const createMockLobby = (lobbyId: string): Lobby => ({
  id: lobbyId,
  chainId: DEFAULT_CHAIN_ID,
  matchId: BigInt(lobbyId.replace(/\D/g, "") || Date.now()),
  arenaAddress: MOCK_ARENA,
  hostIdentity: "player-0",
  hostAddress: MOCK_HOST_ADDRESS,
  entryFee: (1_000_000).toString(),
  maxPlayers: 4,
  status: "waiting",
  winnerIdentity: "",
  winnerAddress: "",
  createdAt: nowBigInt(),
  updatedAt: nowBigInt(),
});

export function useSpacetimeConnection() {
  const [status, setStatus] = useState<ConnectionStatus>("connecting");
  const [identity, setIdentity] = useState<string | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      setStatus("connected");
      setIdentity("player-0");
    }, 200);
    return () => clearTimeout(timer);
  }, []);

  const connect = useCallback(() => {
    setStatus("connected");
    setIdentity("player-0");
  }, []);

  const disconnect = useCallback(() => {
    setStatus("disconnected");
    setIdentity(null);
  }, []);

  return {
    status,
    identity,
    error: null,
    client: null,
    connect,
    disconnect,
    isConnected: status === "connected",
  };
}

export function useLobby(lobbyId: string | null) {
  const [lobby, setLobby] = useState<Lobby | null>(lobbyId ? createMockLobby(lobbyId) : null);
  const [players, setPlayers] = useState<LobbyPlayer[]>([]);
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [board, setBoard] = useState<Board | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const { isConnected, identity } = useSpacetimeConnection();
  const { gameState: localGameState, makeMove: localMakeMove } = useLocalGame(2);
  const moveCounterRef = useRef(0);

  useEffect(() => {
    if (!lobbyId) return;
    setLobby(createMockLobby(lobbyId));
    setIsLoading(false);
  }, [lobbyId]);

  useEffect(() => {
    if (!lobby || !lobbyId) return;

    const nextPlayers: LobbyPlayer[] = localGameState.players.map((player, index) => ({
      id: `${lobbyId}_${index}`,
      lobbyId,
      identity: `player-${index}`,
      address: index === 0 ? MOCK_HOST_ADDRESS : `0xPlayer${index}`,
      name: player.name,
      color: player.color,
      isHost: index === 0,
      isAlive: player.isAlive !== false,
      hasDeposited: true,
      joinedAt: nowBigInt(),
    }));

    setPlayers(nextPlayers);

    const boardCopy: Board = localGameState.board.map(row =>
      row.map(cell => ({
        orbs: cell.count,
        owner: cell.owner ?? null,
      }))
    );

    setBoard(boardCopy);
    setGameState({
      lobbyId,
      boardJson: JSON.stringify(boardCopy),
      currentPlayerIndex: localGameState.currentPlayerIndex,
      isAnimating: localGameState.isAnimating,
      moveCount: moveCounterRef.current++,
      lastMoveAt: nowBigInt(),
    });

    setLobby(prev => {
      if (!prev) return prev;
      const winner = localGameState.winner;
      const winnerIndex = winner
        ? localGameState.players.findIndex(p => p.id === winner.id)
        : -1;
      return {
        ...prev,
        status: winner ? "finished" : "live",
        winnerIdentity: winnerIndex >= 0 ? `player-${winnerIndex}` : "",
        winnerAddress: winnerIndex >= 0 ? `0xPlayer${winnerIndex}` : "",
        updatedAt: nowBigInt(),
      };
    });
  }, [
    lobby,
    lobbyId,
    localGameState.board,
    localGameState.currentPlayerIndex,
    localGameState.isAnimating,
    localGameState.players,
    localGameState.winner,
  ]);

  const currentPlayer = useMemo(
    () => players.find(p => p.identity === identity) ?? players[0] ?? null,
    [players, identity]
  );

  const alivePlayers = useMemo(() => players.filter(p => p.isAlive), [players]);

  const currentTurnPlayer = useMemo(() => {
    if (!gameState || alivePlayers.length === 0) return null;
    return alivePlayers[gameState.currentPlayerIndex % alivePlayers.length] ?? null;
  }, [alivePlayers, gameState]);

  const isMyTurn = useMemo(() => {
    if (!currentTurnPlayer) return false;
    return currentTurnPlayer.identity === identity;
  }, [currentTurnPlayer, identity]);

  const createLobby = useCallback(async () => {
    const newId = Math.random().toString(36).substring(2, 8).toUpperCase();
    setLobby(createMockLobby(newId));
    return newId;
  }, []);

  const joinLobby = useCallback(async () => true, []);
  const confirmDeposit = useCallback(async () => true, []);
  const startGame = useCallback(async () => true, []);

  const makeMove = useCallback(
    async (row: number, col: number) => {
      if (!isConnected) return false;
      localMakeMove(row, col);
      return true;
    },
    [isConnected, localMakeMove]
  );

  const leaveLobby = useCallback(async () => {
    setLobby(prev => (prev ? { ...prev, status: "cancelled" } : prev));
    return true;
  }, []);

  return {
    lobby,
    players,
    gameState,
    board,
    isLoading,
    currentPlayer,
    isHost: currentPlayer?.isHost ?? false,
    isMyTurn,
    currentTurnPlayer,
    alivePlayers,
    createLobby,
    joinLobby,
    confirmDeposit,
    startGame,
    makeMove,
    leaveLobby,
  };
}

export function useLobbyList() {
  const [lobbies] = useState<Lobby[]>([createMockLobby("ABCD")]);

  return {
    lobbies,
    isLoading: false,
    waitingLobbies: lobbies,
  };
}
