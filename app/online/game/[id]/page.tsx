"use client";

import { useEffect, useState, Suspense, useMemo } from "react";
import { useParams, useSearchParams, useRouter } from "next/navigation";
import { useAccount } from "wagmi";
import { BoardRenderer } from "@/components/game/BoardRenderer";
import { Button } from "@/components/ui/Button";
import { DoodleBackground } from "@/components/ui/DoodleBackground";
import { useLobby, useSpacetimeConnection } from "@/hooks/useSpacetimeDB";
import { parseBoard, PlayerColor } from "@/lib/spacetimedb/types";
import { getChainName, formatUSDC } from "@/lib/contracts";
import { motion, AnimatePresence } from "framer-motion";
import { Board, Player, PlayerColor as GamePlayerColor } from "@/types/game";
import { createBoard } from "@/lib/gameLogic";

function OnlineGameContent() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const { address } = useAccount();

  const lobbyId = params.id as string;
  const chainId = parseInt(searchParams.get("chainId") || "8453");
  const arenaAddress = searchParams.get("arena") || "";

  // SpacetimeDB connection and lobby state
  const { status: connectionStatus, identity } = useSpacetimeConnection();
  const {
    lobby,
    players,
    gameState,
    board: spacetimeBoard,
    isLoading,
    currentPlayer,
    isHost,
    isMyTurn,
    currentTurnPlayer,
    alivePlayers,
    makeMove,
    leaveLobby,
  } = useLobby(lobbyId);

  const [explosionQueue, setExplosionQueue] = useState<{ row: number; col: number }[]>([]);
  const [showWinModal, setShowWinModal] = useState(false);

  // Convert SpacetimeDB board to game board format
  const gameBoard = useMemo((): Board => {
    if (!spacetimeBoard || !Array.isArray(spacetimeBoard) || spacetimeBoard.length === 0) {
      // Create empty board with correct dimensions from gameState
      const rows = gameState?.rows || 9;
      const cols = gameState?.cols || 6;
      return Array.from({ length: rows }, (_, r) =>
        Array.from({ length: cols }, (_, c) => ({
          row: r,
          col: c,
          count: 0,
          owner: null,
        }))
      );
    }
    return spacetimeBoard.map((row, rowIndex) => {
      if (!Array.isArray(row)) {
        return [];
      }
      return row.map((cell, colIndex) => ({
        row: rowIndex,
        col: colIndex,
        count: cell?.orbs || 0,
        owner: (cell?.owner as GamePlayerColor) || null,
      }));
    });
  }, [spacetimeBoard, gameState]);

  // Convert SpacetimeDB players to game players
  const gamePlayers = useMemo((): Player[] => {
    console.log(`[OnlineGame] Raw players array:`, players.length, players.map(p => ({ id: p.id, name: p.name, color: p.color })));
    const mapped = players.map(p => ({
      id: p.identity?.toHexString?.() || p.id,
      name: p.name,
      color: p.color as GamePlayerColor,
      isAlive: p.isAlive,
    }));
    console.log(`[OnlineGame] Mapped gamePlayers:`, mapped.length, mapped.map(p => ({ name: p.name, color: p.color, isAlive: p.isAlive })));
    return mapped;
  }, [players]);

  // Check for winner
  useEffect(() => {
    if (lobby?.status === "finished" && lobby.winnerAddress) {
      setShowWinModal(true);
    }
  }, [lobby?.status, lobby?.winnerAddress]);

  // Handle cell click
  const handleCellClick = async (row: number, col: number) => {
    console.log('[OnlineGame] Cell clicked:', { row, col, isMyTurn, lobbyStatus: lobby?.status, gameStateExists: !!gameState, isAnimating: gameState?.isAnimating });
    
    if (lobby?.status !== "live") {
      console.warn('[OnlineGame] Cannot move: Game not live', lobby?.status);
      return;
    }
    
    if (!isMyTurn) {
      console.warn('[OnlineGame] Cannot move: Not your turn', { isMyTurn, currentTurnPlayer: currentTurnPlayer?.name });
      return;
    }

    if (gameState?.isAnimating) {
      console.warn('[OnlineGame] Cannot move: Animation in progress');
      return;
    }

    console.log('[OnlineGame] Attempting to make move...');
    const success = await makeMove(row, col);
    if (!success) {
      console.error("[OnlineGame] Failed to make move");
      alert("Failed to make move. Please try again.");
    } else {
      console.log('[OnlineGame] Move initiated successfully');
    }
  };

  // Handle exit
  const handleExit = async () => {
    if (lobby?.status === "waiting" || lobby?.status === "live") {
      await leaveLobby();
    }
    router.push("/online");
  };

  // Loading state
  if (connectionStatus === "connecting" || isLoading) {
    return (
      <div className="flex flex-col items-center gap-4">
        <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
        <p className="font-bold text-lg text-white">
          {connectionStatus === "connecting" ? "Connecting to SpacetimeDB..." : "Loading game..."}
        </p>
      </div>
    );
  }

  // Connection error
  if (connectionStatus === "error") {
    return (
      <div className="flex flex-col items-center gap-4 text-center">
        <div className="text-6xl">😵</div>
        <p className="font-bold text-lg text-red-400">Connection failed</p>
        <Button variant="secondary" onClick={() => router.push("/online")}>
          Back to Menu
        </Button>
      </div>
    );
  }

  // Lobby not found
  if (!lobby) {
    return (
      <div className="flex flex-col items-center gap-4 text-center">
        <div className="text-6xl">🔍</div>
        <p className="font-bold text-lg text-white">Game not found</p>
        <Button variant="secondary" onClick={() => router.push("/online")}>
          Back to Menu
        </Button>
      </div>
    );
  }

  const winner = players.find(p => p.address === lobby.winnerAddress);
  const isWinner = currentPlayer?.address === lobby.winnerAddress;
  const prizePool = formatUSDC(lobby.entryFee ? BigInt(lobby.entryFee) * BigInt(players.length) : BigInt(0));

  return (
    <>
      {/* Header */}
      <div className="w-full max-w-4xl space-y-2 sm:space-y-4 mb-2 sm:mb-4 px-2 sm:px-4">
        {/* Top bar */}
        <div className="flex justify-between items-center">
          <Button
            variant="secondary"
            size="sm"
            onClick={handleExit}
            className="bg-slate-800/80 text-slate-300 hover:bg-slate-700 shadow-none backdrop-blur-sm"
          >
            Exit
          </Button>
          <div className="flex items-center gap-2">
            <span className={`px-2 py-1 rounded text-xs font-bold ${
              chainId === 8453 ? "bg-blue-500/20 text-blue-300" : "bg-orange-500/20 text-orange-300"
            }`}>
              {getChainName(chainId)}
            </span>
            <span className="text-slate-400 text-sm font-mono">#{lobbyId}</span>
          </div>
        </div>

        {/* Prize pool */}
        <div className="bg-gradient-to-r from-emerald-500/20 to-teal-500/20 rounded-xl p-3 border border-emerald-500/30 backdrop-blur-sm">
          <div className="flex items-center justify-between">
            <span className="text-emerald-300 text-sm">Prize Pool</span>
            <span className="text-emerald-400 font-bold text-lg">${prizePool} USDC</span>
          </div>
        </div>

        {/* Player turn indicator */}
        <div className="flex flex-col gap-2">
          <div className="text-center text-xs text-slate-400">
            Players ({gamePlayers.length}/{lobby?.maxPlayers || 0}): {gamePlayers.map(p => p.name).join(', ')}
          </div>
          <div className="flex items-center justify-center gap-2 py-2 flex-wrap max-w-full overflow-x-auto">
            {gamePlayers.length > 0 ? gamePlayers.map((player, index) => (
            <div
              key={player.id}
              className={`flex items-center gap-2 px-3 py-2 rounded-xl transition-all ${
                currentTurnPlayer?.identity?.toHexString?.() === player.id
                  ? "bg-white/20 scale-105 shadow-lg"
                  : "bg-white/5 opacity-60"
              } ${!player.isAlive ? "opacity-30 grayscale" : ""}`}
            >
              <div
                className={`w-4 h-4 rounded-full shadow-inner ${
                  player.color === "red" ? "bg-red-500" :
                  player.color === "blue" ? "bg-blue-500" :
                  player.color === "green" ? "bg-green-500" :
                  player.color === "yellow" ? "bg-yellow-500" :
                  player.color === "purple" ? "bg-purple-500" :
                  player.color === "orange" ? "bg-orange-500" :
                  player.color === "pink" ? "bg-pink-500" :
                  "bg-cyan-500"
                }`}
              />
              <span className="text-white text-xs font-medium truncate max-w-[50px]">
                {player.name}
              </span>
              {currentTurnPlayer?.identity?.toHexString?.() === player.id && (
                <span className="text-[10px] bg-white/30 px-1.5 py-0.5 rounded text-white">
                  TURN
                </span>
              )}
            </div>
          )) : (
            <div className="text-white text-sm">No players loaded...</div>
          )}
          </div>
        </div>

        {/* Your turn indicator */}
        {isMyTurn && lobby.status === "live" && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center py-2 px-4 bg-emerald-500/20 rounded-xl border border-emerald-500/30"
          >
            <span className="text-emerald-400 font-bold">Your turn! Tap a cell to place an orb</span>
          </motion.div>
        )}
        
        {/* Debug info - remove in production */}
        {process.env.NODE_ENV === 'development' && (
          <div className="text-xs text-slate-400 space-y-1 p-2 bg-black/30 rounded">
            <div>Status: {lobby?.status} | isMyTurn: {String(isMyTurn)}</div>
            <div>GameState: {gameState ? 'exists' : 'missing'} | Animating: {String(gameState?.isAnimating)}</div>
            <div>Current Turn Player: {currentTurnPlayer?.name || 'none'} | Identity: {identity?.substring(0, 8) || 'none'}</div>
            <div>Alive Players: {alivePlayers?.length || 0} | Current Index: {gameState?.currentPlayerIndex ?? 'N/A'}</div>
          </div>
        )}
      </div>

      {/* Game Board */}
      <div className="relative p-0 overflow-hidden flex-grow flex items-center justify-center min-h-0">
        <BoardRenderer
          board={gameBoard}
          rows={gameState?.rows || 9}
          cols={gameState?.cols || 6}
          onCellClick={handleCellClick}
          animating={gameState?.isAnimating || false}
          explosionQueue={explosionQueue}
          clearExplosionQueue={() => setExplosionQueue([])}
        />
        
        {/* Overlay when not your turn */}
        {!isMyTurn && lobby.status === "live" && (
          <div className="absolute inset-0 bg-black/30 flex items-center justify-center pointer-events-none">
            <div className="bg-black/60 px-4 py-2 rounded-xl backdrop-blur-sm">
              <span className="text-white/80 text-sm">
                Waiting for {currentTurnPlayer?.name || "opponent"}...
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Win Modal */}
      <AnimatePresence>
        {showWinModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4"
          >
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-3xl p-8 max-w-sm w-full text-center border border-slate-700 shadow-2xl"
            >
              <div className="text-6xl mb-4">{isWinner ? "🎉" : "😢"}</div>
              <h2 className="text-2xl font-black text-white mb-2">
                {isWinner ? "You Won!" : "Game Over"}
              </h2>
              <p className="text-slate-400 mb-4">
                {isWinner 
                  ? `Congratulations! You won the ${prizePool} USDC prize pool!`
                  : `${winner?.name || "Opponent"} won this match.`}
              </p>
              
              {isWinner && (
                <div className="bg-emerald-500/20 rounded-xl p-4 mb-6 border border-emerald-500/30">
                  <p className="text-emerald-400 text-sm mb-2">Prize awaits claim:</p>
                  <p className="text-emerald-300 text-2xl font-black">${prizePool} USDC</p>
                </div>
              )}

              <div className="flex flex-col gap-3">
                {isWinner && (
                  <Button
                    variant="primary"
                    size="lg"
                    onClick={() => router.push("/profile/prizes")}
                    className="w-full bg-gradient-to-r from-emerald-500 to-teal-500"
                  >
                    Claim Prize
                  </Button>
                )}
                <Button
                  variant="secondary"
                  onClick={() => router.push("/online")}
                  className="w-full"
                >
                  Back to Arena
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

export default function OnlineGamePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-4 relative overflow-hidden">
      {/* Background effects */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl" />
      </div>

      <Suspense
        fallback={
          <div className="flex flex-col items-center gap-4">
            <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
            <p className="text-slate-400">Loading...</p>
          </div>
        }
      >
        <OnlineGameContent />
      </Suspense>
    </main>
  );
}
