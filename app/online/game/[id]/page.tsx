"use client";

import { useEffect, useState, Suspense, useMemo, useRef } from "react";
import { useParams, useSearchParams, useRouter } from "next/navigation";
import { useAccount } from "wagmi";
import { BoardRenderer } from "@/components/game/BoardRenderer";
import { Button } from "@/components/ui/Button";
import { useLobby, useSpacetimeConnection } from "@/hooks/useSpacetimeDB";
import { useVisualBoard } from "@/hooks/useVisualBoard";
import { formatUSDC } from "@/lib/contracts";
import { motion, AnimatePresence } from "framer-motion";
import { Board, Player, PlayerColor as GamePlayerColor } from "@/types/game";
import { getMaxCapacity } from "@/lib/gameLogic";
import { soundManager } from "@/lib/sound";

function OnlineGameContent() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const { address } = useAccount();

  const lobbyId = params.id as string;
  const chainId = parseInt(searchParams.get("chainId") || "8453");

  // SpacetimeDB connection and lobby state
  const { status: connectionStatus, identity } = useSpacetimeConnection();
  const {
    lobby,
    players,
    gameState,
    board: spacetimeBoard,
    lastMove,
    isLoading,
    currentPlayer,
    isHost,
    isMyTurn,
    currentTurnPlayer,
    alivePlayers,
    makeMove,
    leaveLobby,
  } = useLobby(lobbyId);

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
    return players.map(p => ({
      id: p.identity?.toHexString?.() || p.id,
      name: p.name,
      color: p.color as GamePlayerColor,
      isAlive: p.isAlive,
    }));
  }, [players]);

  // Visual Board State (Handles local animations)
  const {
    visualBoard,
    isAnimating,
    explosionQueue,
    clearExplosionQueue,
    animateMove
  } = useVisualBoard(gameBoard, gameState?.rows || 9, gameState?.cols || 6);

  const lastProcessedMoveIndex = useRef<number>(-1);

  // Handle incoming moves for animation
  useEffect(() => {
    if (lastMove && lastMove.moveIndex > lastProcessedMoveIndex.current) {
      lastProcessedMoveIndex.current = lastMove.moveIndex;

      const player = players.find(p => p.identity.toHexString() === lastMove.playerIdentity.toHexString());
      if (player) {
        console.log(`[OnlineGame] Animating move: ${player.name} at (${lastMove.row}, ${lastMove.col})`);
        animateMove(lastMove.row, lastMove.col, player.color as GamePlayerColor);
      }
    }
  }, [lastMove, players, animateMove]);

  const [showWinModal, setShowWinModal] = useState(false);
  const [hasTriggeredOracle, setHasTriggeredOracle] = useState(false);


  // Check for winner and trigger oracle
  useEffect(() => {
    if (lobby?.status === "finished" && lobby.winnerAddress) {
      setShowWinModal(true);

      // Trigger Oracle if not already done
      if (!hasTriggeredOracle) {
        setHasTriggeredOracle(true);
        const oracleUrl = process.env.NEXT_PUBLIC_ORACLE_API_URL;
        if (oracleUrl) {
          console.log("Triggering Oracle at:", oracleUrl);
          fetch(oracleUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              id: String(lobby.matchId),
              winner: lobby.winnerAddress
            })
          })
            .then(res => res.json())
            .then(data => console.log("Oracle response:", data))
            .catch(err => console.error("Oracle trigger failed:", err));
        }
      }
    }
  }, [lobby?.status, lobby?.winnerAddress, hasTriggeredOracle, lobby?.matchId]);

  // Handle cell click
  const handleCellClick = async (row: number, col: number) => {
    if (lobby?.status !== "live" || !isMyTurn || isAnimating) return;
    soundManager.playPop();
    await makeMove(row, col);
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
        <div className="w-12 h-12 border-4 border-black border-t-transparent rounded-full animate-spin" />
        <p className="font-bold text-lg text-black">Loading game...</p>
      </div>
    );
  }

  // Connection error
  if (connectionStatus === "error") {
    return (
      <div className="flex flex-col items-center gap-4 text-center">
        <div className="text-6xl">😵</div>
        <p className="font-bold text-lg text-red-500">Connection failed</p>
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
        <p className="font-bold text-lg text-black">Game not found</p>
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
      {/* Top Bar */}
      <div className="w-full max-w-lg flex justify-between items-center mb-2 sm:mb-6 px-2 sm:px-4">
        <Button
          variant="secondary"
          size="sm"
          onClick={handleExit}
          className="bg-white text-black border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all font-bold"
        >
          Exit
        </Button>

        <div className="flex items-center gap-3 bg-white px-4 py-2 rounded-2xl border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
          <span className="text-black text-sm font-bold uppercase tracking-wider">Prize:</span>
          <span className="text-black font-bold text-lg">${prizePool}</span>
        </div>
      </div>

      {/* Player List (Turn Indicator Style) */}
      <div className="w-full max-w-lg mb-4 px-2 sm:px-4">
        <div className="flex items-center justify-center gap-2 py-2 flex-wrap max-w-full overflow-x-auto">
          {gamePlayers.map((player) => (
            <div
              key={player.id}
              className={`flex items-center gap-2 px-3 py-2 rounded-xl border-2 transition-all ${currentTurnPlayer?.identity?.toHexString?.() === player.id
                ? "bg-white border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] scale-105"
                : "bg-white/50 border-transparent opacity-60"
                } ${!player.isAlive ? "opacity-30 grayscale" : ""}`}
            >
              <div
                className={`w-4 h-4 rounded-full border border-black ${player.color === "red" ? "bg-[#FF9AA2]" :
                  player.color === "blue" ? "bg-[#C7CEEA]" :
                    player.color === "green" ? "bg-[#B5EAD7]" :
                      player.color === "yellow" ? "bg-[#FFF7B1]" :
                        player.color === "purple" ? "bg-[#E0BBE4]" :
                          player.color === "orange" ? "bg-[#FFDAC1]" :
                            player.color === "pink" ? "bg-[#F8BBD0]" :
                              "bg-[#B2EBF2]"
                  }`}
              />
              <span className="text-black text-xs font-bold truncate max-w-[80px]">
                {player.name}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Game Board */}
      <div className="relative p-0 bg-transparent rounded-none shadow-none border-none">
        <BoardRenderer
          board={visualBoard || gameBoard}
          rows={gameState?.rows || 9}
          cols={gameState?.cols || 6}
          onCellClick={handleCellClick}
          animating={isAnimating}
          explosionQueue={explosionQueue}
          clearExplosionQueue={clearExplosionQueue}
        />
      </div>

      {/* Win Modal */}
      <AnimatePresence>
        {showWinModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.5, y: 50 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.5, opacity: 0 }}
              className="bg-white border-4 border-black p-8 rounded-3xl shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] text-center max-w-sm w-full mx-4"
            >
              <div className="text-6xl mb-4">{isWinner ? "👑" : "💀"}</div>
              <h2 className="text-4xl font-black text-black mb-2">
                {isWinner ? "You Won!" : "Game Over"}
              </h2>
              <p className="text-xl font-bold mb-8 text-black">
                {isWinner ? (
                  <span>You won <span className="text-green-600">${prizePool}</span>!</span>
                ) : (
                  <span style={{
                    color: winner?.color === 'red' ? '#FF9AA2' :
                      winner?.color === 'blue' ? '#C7CEEA' :
                        winner?.color === 'green' ? '#B5EAD7' :
                          winner?.color === 'yellow' ? '#FFF7B1' :
                            winner?.color === 'purple' ? '#E0BBE4' :
                              winner?.color === 'orange' ? '#FFDAC1' :
                                winner?.color === 'pink' ? '#F8BBD0' :
                                  '#B2EBF2',
                    textShadow: '1px 1px 0 #000'
                  }}>
                    {winner?.name || "Opponent"} won.
                  </span>
                )}
              </p>

              <div className="flex flex-col gap-3">
                {isWinner && (
                  <Button
                    onClick={() => router.push("/profile/prizes")}
                    className="bg-[#B5EAD7] text-black border-4 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all font-bold rounded-xl"
                  >
                    Claim Prize
                  </Button>
                )}
                <Button
                  variant="secondary"
                  onClick={() => router.push("/online")}
                  className="bg-[#FF9AA2] text-black border-4 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all font-bold rounded-xl"
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
    <main className="flex min-h-screen flex-col items-center justify-center bg-[#f0f0f0] p-4 overflow-hidden touch-none">
      <Suspense
        fallback={
          <div className="flex flex-col items-center gap-4">
            <div className="w-12 h-12 border-4 border-black border-t-transparent rounded-full animate-spin" />
            <p className="text-black font-bold">Loading...</p>
          </div>
        }
      >
        <OnlineGameContent />
      </Suspense>
    </main>
  );
}
