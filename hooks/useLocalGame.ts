import { useState, useEffect, useCallback, useMemo } from 'react';
import { Board, Player, GameState, PLAYER_COLORS, PlayerColor } from '@/types/game';
import { createBoard, getMaxCapacity, isValidMove, getNeighbors } from '@/lib/gameLogic';
import { getBoardSize } from '@/lib/boardSize';
import { soundManager } from '@/lib/sound';

export const useLocalGame = (playerCount: number, customColors?: PlayerColor[]) => {
    const { rows, cols } = useMemo(() => getBoardSize(playerCount), [playerCount]);

    const [gameState, setGameState] = useState<GameState>({
        board: createBoard(rows, cols),
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
        setGameState({
            board: createBoard(rows, cols),
            players: newPlayers,
            currentPlayerIndex: 0,
            isGameOver: false,
            winner: null,
            isAnimating: false,
        });
        setExplosionQueue([]);
    }, [playerCount, customColors, rows, cols]);

    const checkWinner = useCallback((board: Board, players: Player[], currentPlayerIndex: number) => {
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
    }, []);

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
                // Animation done, switch turn
                setGameState(prev => {
                    const winner = checkWinner(board, prev.players, prev.currentPlayerIndex);
                    let nextIndex = (prev.currentPlayerIndex + 1) % prev.players.length;

                    // Filter out players who have no orbs left
                    const playersWithOrbs = prev.players.filter(p => {
                        let orbCount = 0;
                        board.forEach((row: any) => row.forEach((cell: any) => {
                            if (cell.owner === p.color) {
                                orbCount++;
                            }
                        }));
                        return orbCount > 0;
                    });

                    // If current player has no orbs, skip to next active player
                    // But wait, we just finished a turn. The next player should be someone who is alive.
                    // If nextIndex points to a dead player, skip them.

                    // Simple skip logic:
                    // We need to ensure we don't loop infinitely if everyone is dead (which shouldn't happen here if we check winner).
                    // But let's just do a simple loop.

                    let attempts = 0;
                    while (attempts < prev.players.length) {
                        const nextPlayer = prev.players[nextIndex];
                        // Check if this player is alive (has orbs).
                        // Note: We need to check the NEW board state for orbs.
                        let hasOrbs = false;
                        for (let r = 0; r < rows; r++) {
                            for (let c = 0; c < cols; c++) {
                                if (board[r][c].owner === nextPlayer.color) {
                                    hasOrbs = true;
                                    break;
                                }
                            }
                            if (hasOrbs) break;
                        }

                        // Also, if it's the very first round, everyone has 0 orbs but is alive.
                        // So we should also check if totalOrbs > 0.
                        // If totalOrbs < 2 (start of game), everyone is alive.

                        let totalOrbs = 0;
                        board.forEach((row: any) => row.forEach((cell: any) => { if (cell.owner) totalOrbs++; }));

                        if (totalOrbs < 2 || hasOrbs) {
                            break; // Found a valid next player
                        }

                        nextIndex = (nextIndex + 1) % prev.players.length;
                        attempts++;
                    }

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

    }, [checkWinner, rows, cols]);

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
