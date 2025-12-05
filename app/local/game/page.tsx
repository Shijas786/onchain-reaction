"use client";

import { useEffect, useState, Suspense, useMemo } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useLocalGame } from "@/hooks/useLocalGame";
import { BoardRenderer } from "@/components/game/BoardRenderer";
import { Button } from "@/components/ui/Button";
import { motion, AnimatePresence } from "framer-motion";
import { PlayerColor } from "@/types/game";
import { getBoardSize } from "@/lib/boardSize";

function LocalGameContent() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const playerCount = parseInt(searchParams.get("players") || "2", 10);

    const customColors = useMemo(() => {
        const colors: PlayerColor[] = [];
        for (let i = 0; i < playerCount; i++) {
            const color = searchParams.get(`p${i}`) as PlayerColor;
            if (color) colors.push(color);
        }
        return colors.length === playerCount ? colors : undefined;
    }, [searchParams, playerCount]);

    const { gameState, makeMove, explosionQueue, clearExplosionQueue } = useLocalGame(playerCount, customColors);
    const [showWinModal, setShowWinModal] = useState(false);
    const { rows, cols } = getBoardSize(playerCount);

    useEffect(() => {
        if (gameState.winner) {
            setShowWinModal(true);
        }
    }, [gameState.winner]);

    const currentPlayer = gameState.players[gameState.currentPlayerIndex];

    return (
        <>
            {/* Floating UI Container */}
            <div className="absolute top-0 left-0 w-full z-10 flex flex-col items-center pointer-events-none pt-[env(safe-area-inset-top)]">
                {/* Top Bar */}
                <div className="w-full max-w-lg flex justify-between items-center p-2 sm:p-4 pointer-events-auto">
                    <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => router.push('/')}
                        className="bg-white text-black border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all font-bold"
                    >
                        Exit
                    </Button>

                    <div className="flex items-center gap-3 bg-white px-4 py-2 rounded-2xl border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                        <span className="text-black text-sm font-bold uppercase tracking-wider">Turn:</span>
                        <div className="flex items-center gap-2">
                            <div
                                className="w-4 h-4 rounded-full border border-black"
                                style={{
                                    backgroundColor:
                                        currentPlayer?.color === 'red' ? '#FF9AA2' :
                                            currentPlayer?.color === 'blue' ? '#C7CEEA' :
                                                currentPlayer?.color === 'green' ? '#B5EAD7' :
                                                    currentPlayer?.color === 'yellow' ? '#FFF7B1' :
                                                        currentPlayer?.color === 'purple' ? '#E0BBE4' :
                                                            '#FFDAC1'
                                }}
                            />
                            <span className="text-black font-bold">{currentPlayer?.name}</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Game Board Container */}
            <div className="relative w-full h-full flex justify-center items-center">
                <BoardRenderer
                    board={gameState.board}
                    rows={rows}
                    cols={cols}
                    onCellClick={makeMove}
                    animating={gameState.isAnimating}
                    explosionQueue={explosionQueue}
                    clearExplosionQueue={clearExplosionQueue}
                    currentTurnPlayer={currentPlayer?.color}
                />
            </div>

            {/* Win Modal */}
            <AnimatePresence>
                {showWinModal && gameState.winner && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm"
                    >
                        <motion.div
                            initial={{ scale: 0.5, y: 50 }}
                            animate={{ scale: 1, y: 0 }}
                            className="bg-white border-4 border-black p-8 rounded-3xl shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] text-center max-w-sm w-full mx-4"
                        >
                            <div className="text-6xl mb-4">👑</div>
                            <h2 className="text-4xl font-black text-black mb-2">Winner!</h2>
                            <p className="text-2xl font-bold mb-8" style={{
                                color: gameState.winner.color === 'red' ? '#FF9AA2' :
                                    gameState.winner.color === 'blue' ? '#C7CEEA' :
                                        gameState.winner.color === 'green' ? '#B5EAD7' :
                                            gameState.winner.color === 'yellow' ? '#FFF7B1' :
                                                gameState.winner.color === 'purple' ? '#E0BBE4' : '#FFDAC1',
                                textShadow: '1px 1px 0 #000'
                            }}>
                                {gameState.winner.name}
                            </p>

                            <div className="flex flex-col gap-3">
                                <Button
                                    onClick={() => window.location.reload()}
                                    className="bg-[#B5EAD7] text-black border-4 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all font-bold rounded-xl"
                                >
                                    Play Again
                                </Button>
                                <Button
                                    variant="secondary"
                                    onClick={() => router.push('/')}
                                    className="bg-[#FF9AA2] text-black border-4 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all font-bold rounded-xl"
                                >
                                    Back to Menu
                                </Button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    );
}

export default function LocalGame() {
    return (
        <main className="relative w-full h-[100vh] bg-transparent overflow-hidden">
            <Suspense fallback={<div className="flex flex-col items-center justify-center h-full text-green-500 font-mono">Loading game...</div>}>
                <LocalGameContent />
            </Suspense>
        </main>
    );
}
