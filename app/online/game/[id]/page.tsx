"use client";

import { useEffect, useState, Suspense } from "react";
import { useParams, useSearchParams, useRouter } from "next/navigation";
import { BoardRenderer } from "@/components/game/BoardRenderer";
import { Button } from "@/components/ui/Button";
import { createBoard } from "@/lib/gameLogic";
import { GameState, Player } from "@/types/game";

// Placeholder hook for Online Game
const useOnlineGame = (roomId: string, isHost: boolean) => {
    // This would connect to SpacetimeDB
    const [gameState, setGameState] = useState<GameState>({
        board: createBoard(),
        players: [],
        currentPlayerIndex: 0,
        isGameOver: false,
        winner: null,
        isAnimating: false,
    });

    const [isConnected, setIsConnected] = useState(false);

    useEffect(() => {
        // Simulate connection
        setTimeout(() => {
            setIsConnected(true);
            setGameState(prev => ({
                ...prev,
                players: [
                    { id: '1', name: 'You', color: 'red', isAlive: true },
                    { id: '2', name: 'Opponent', color: 'blue', isAlive: true }
                ]
            }));
        }, 1000);
    }, [roomId]);

    const makeMove = (row: number, col: number) => {
        console.log(`Online move: ${row}, ${col}`);
        // Dispatch to SpacetimeDB
    };

    return {
        gameState,
        isConnected,
        makeMove,
        explosionQueue: [],
        clearExplosionQueue: () => { }
    };
};

function OnlineGameContent() {
    const params = useParams();
    const searchParams = useSearchParams();
    const router = useRouter();

    const roomId = params.id as string;
    const isHost = searchParams.get("host") === "true";

    const { gameState, isConnected, makeMove, explosionQueue, clearExplosionQueue } = useOnlineGame(roomId, isHost);

    if (!isConnected) {
        return (
            <div className="flex flex-col items-center gap-4">
                <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
                <p className="font-bold text-lg text-white">Connecting to Room {roomId}...</p>
            </div>
        );
    }

    return (
        <>
            <div className="w-full max-w-lg flex justify-between items-center mb-6 px-4">
                <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => router.push('/online')}
                    className="bg-slate-800 text-slate-300 hover:bg-slate-700 shadow-none"
                >
                    Exit
                </Button>
                <div className="text-white font-bold">Room: {roomId}</div>
            </div>

            <div className="relative p-0 bg-black rounded-none shadow-none border-none">
                <BoardRenderer
                    board={gameState.board}
                    onCellClick={makeMove}
                    animating={gameState.isAnimating}
                    explosionQueue={explosionQueue}
                    clearExplosionQueue={clearExplosionQueue}
                />
            </div>

            <p className="mt-8 text-green-500 text-center max-w-md font-mono">
                Online Multiplayer is currently a UI placeholder.
                <br />SpacetimeDB integration required.
            </p>
        </>
    );
}

export default function OnlineGamePage() {
    return (
        <main className="flex min-h-screen flex-col items-center justify-center bg-black p-4">
            <Suspense fallback={<div className="text-green-500 font-mono">Loading...</div>}>
                <OnlineGameContent />
            </Suspense>
        </main>
    );
}
