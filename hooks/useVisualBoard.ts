import { useState, useCallback, useEffect, useRef } from 'react';
import { Board, PlayerColor } from '@/types/game';
import { getMaxCapacity, getNeighbors } from '@/lib/gameLogic';
import { soundManager } from '@/lib/sound';

export const useVisualBoard = (initialBoard: Board | null, rows: number, cols: number) => {
    const [visualBoard, setVisualBoard] = useState<Board | null>(initialBoard);
    const [isAnimating, setIsAnimating] = useState(false);
    const [explosionQueue, setExplosionQueue] = useState<{ row: number; col: number }[]>([]);

    // Keep track of the latest remote board to sync after animation
    const pendingSyncBoard = useRef<Board | null>(null);

    // Sync with remote board if not animating
    useEffect(() => {
        if (!isAnimating && initialBoard) {
            // Deep comparison could be expensive, but for 9x6 it's fine
            // For now, just set it. If it causes flickers, we can optimize.
            setVisualBoard(initialBoard);
        } else if (isAnimating && initialBoard) {
            pendingSyncBoard.current = initialBoard;
        }
    }, [initialBoard, isAnimating]);

    const processChainReaction = useCallback(async (currentBoard: Board, currentPlayerColor: PlayerColor) => {
        let board = JSON.parse(JSON.stringify(currentBoard)); // Deep copy

        const step = async () => {
            const unstableCells: { r: number; c: number }[] = [];
            for (let r = 0; r < rows; r++) {
                for (let c = 0; c < cols; c++) {
                    if (board[r][c].count >= getMaxCapacity(r, c, rows, cols)) {
                        unstableCells.push({ r, c });
                    }
                }
            }

            if (unstableCells.length === 0) {
                // Animation done
                setIsAnimating(false);
                if (pendingSyncBoard.current) {
                    setVisualBoard(pendingSyncBoard.current);
                    pendingSyncBoard.current = null;
                } else {
                    setVisualBoard(board);
                }
                return;
            }

            // Explode unstable cells
            setExplosionQueue(unstableCells.map(c => ({ row: c.r, col: c.c })));

            // Play explosion sound
            soundManager.playExplosion();

            // Wait for explosion animation (visuals)
            await new Promise(resolve => setTimeout(resolve, 300));

            // Apply logic
            const nextBoard = JSON.parse(JSON.stringify(board));
            unstableCells.forEach(({ r, c }) => {
                const cell = nextBoard[r][c];
                cell.count -= getMaxCapacity(r, c, rows, cols);
                if (cell.count === 0) {
                    cell.owner = null;
                }

                const neighbors = getNeighbors(r, c, rows, cols);
                neighbors.forEach(n => {
                    const neighbor = nextBoard[n.r][n.c];
                    neighbor.count++;
                    neighbor.owner = currentPlayerColor; // Conquer
                });
            });

            board = nextBoard;
            setVisualBoard(board);

            // Next step
            setTimeout(step, 100); // Small delay between propagation steps
        };

        step();

    }, [rows, cols]);

    const animateMove = useCallback((row: number, col: number, playerColor: PlayerColor) => {
        if (!visualBoard) return;

        setIsAnimating(true);

        // Play Pop Sound
        soundManager.playPop();

        // Apply initial move locally
        const newBoard = JSON.parse(JSON.stringify(visualBoard));

        // Defensive check
        if (!newBoard[row] || !newBoard[row][col]) return;

        newBoard[row][col].count++;
        newBoard[row][col].owner = playerColor;

        setVisualBoard(newBoard);

        // Start chain reaction loop
        processChainReaction(newBoard, playerColor);

    }, [visualBoard, processChainReaction]);

    return {
        visualBoard,
        isAnimating,
        explosionQueue,
        clearExplosionQueue: () => setExplosionQueue([]),
        animateMove
    };
};
