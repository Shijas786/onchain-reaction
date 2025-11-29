import { useState, useEffect, useCallback } from 'react';
import { Board, Player, GameState, PLAYER_COLORS, PlayerColor, ROWS, COLS } from '@/types/game';
import { createBoard, getMaxCapacity, isValidMove, getNeighbors } from '@/lib/gameLogic';
import { soundManager } from '@/lib/sound';

export const useLocalGame = (playerCount: number, customColors?: PlayerColor[]) => {
    const [gameState, setGameState] = useState<GameState>({
        board: createBoard(),
        players: [],
        currentPlayerIndex: 0,
        isGameOver: false,
        winner: null,
        isAnimating: false,
    });

    const [explosionQueue, setExplosionQueue] = useState<{ row: number; col: number }[]>([]);

    // Initialize players
    useEffect(() => {
        const newPlayers: Player[] = Array.from({ length: playerCount }, (_, i) => ({
            id: `p${i}`,
            color: customColors && customColors[i] ? customColors[i] : PLAYER_COLORS[i],
            isAlive: true,
            name: `Player ${i + 1}`,
        }));
        setGameState(prev => ({ ...prev, players: newPlayers, board: createBoard() }));
    }, [playerCount, customColors]);

    const checkWinner = (board: Board, players: Player[], currentPlayerIndex: number) => {
        const playerOrbCounts: Record<string, number> = {};
        players.forEach(p => playerOrbCounts[p.color] = 0);

        let totalOrbs = 0;
        board.forEach(row => row.forEach(cell => {
            if (cell.owner) {
                playerOrbCounts[cell.owner]++;
                totalOrbs++;
            }
        }));

        if (totalOrbs < 2) return null; // Game just started or empty

        const activePlayers = players.filter(p => playerOrbCounts[p.color] > 0);

        if (activePlayers.length === 1 && totalOrbs > 1) {
            return activePlayers[0];
        }
        return null;
    };

    const processChainReaction = useCallback(async (currentBoard: Board, currentPlayerColor: PlayerColor) => {
        let unstable = true;
        let board = JSON.parse(JSON.stringify(currentBoard)); // Deep copy

        const step = async () => {
            const unstableCells = [];
            for (let r = 0; r < ROWS; r++) {
                for (let c = 0; c < COLS; c++) {
                    if (board[r][c].count >= getMaxCapacity(r, c)) {
                        unstableCells.push({ r, c });
                    }
                }
            }

            if (unstableCells.length === 0) {
                // Animation done, switch turn
                setGameState(prev => {
                    const winner = checkWinner(board, prev.players, prev.currentPlayerIndex);
                    let nextIndex = (prev.currentPlayerIndex + 1) % prev.players.length;

                    return {
                        ...prev,
                        board,
                        isAnimating: false,
                        currentPlayerIndex: nextIndex,
                        winner: winner || null,
                        isGameOver: !!winner
                    };
                });
                return;
            }

            // Explode unstable cells
            setExplosionQueue(unstableCells.map(c => ({ row: c.r, col: c.c })));

            // Wait for explosion animation
            await new Promise(resolve => setTimeout(resolve, 300));

            // Apply logic
            const nextBoard = JSON.parse(JSON.stringify(board));
            unstableCells.forEach(({ r, c }) => {
                const cell = nextBoard[r][c];
                cell.count -= getMaxCapacity(r, c);
                if (cell.count === 0) {
                    cell.owner = null;
                }

                const neighbors = getNeighbors(r, c);
                neighbors.forEach(n => {
                    const neighbor = nextBoard[n.r][n.c];
                    neighbor.count++;
                    neighbor.owner = currentPlayerColor; // Conquer
                });
            });

            board = nextBoard;

            // Check for winner immediately after this step
            // We need to access the latest players list. Since we are in a closure, we should use the functional update to peek at state or pass it in.
            // Actually, let's just use the setGameState callback to check and decide whether to continue.

            let gameOver = false;
            setGameState(prev => {
                const winner = checkWinner(board, prev.players, prev.currentPlayerIndex);
                if (winner) {
                    gameOver = true;
                    return {
                        ...prev,
                        board,
                        isAnimating: false,
                        winner,
                        isGameOver: true
                    };
                }
                return { ...prev, board };
            });

            if (gameOver) return;

            // Next step
            setTimeout(step, 100); // Small delay between propagation steps
        };

        step();

    }, [checkWinner]); // Added checkWinner to dependencies (which depends on nothing but is re-created)

    const makeMove = useCallback((row: number, col: number) => {
        if (gameState.isAnimating || gameState.isGameOver) return;

        const currentPlayer = gameState.players[gameState.currentPlayerIndex];
        if (!isValidMove(gameState.board, row, col, currentPlayer.color)) return;

        // Play Sound
        soundManager.playPop();

        // Apply initial move
        const newBoard = JSON.parse(JSON.stringify(gameState.board));
        newBoard[row][col].count++;
        newBoard[row][col].owner = currentPlayer.color;

        setGameState(prev => ({ ...prev, board: newBoard, isAnimating: true }));

        // Start chain reaction loop
        processChainReaction(newBoard, currentPlayer.color);

    }, [gameState, processChainReaction]);

    return {
        gameState,
        makeMove,
        explosionQueue,
        clearExplosionQueue: () => setExplosionQueue([])
    };
};
