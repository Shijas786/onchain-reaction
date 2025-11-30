import { Board, Cell, ROWS, COLS, PlayerColor } from "@/types/game";

export const createBoard = (): Board => {
    return Array.from({ length: ROWS }, (_, r) =>
        Array.from({ length: COLS }, (_, c) => ({
            row: r,
            col: c,
            count: 0,
            owner: null,
            maxCapacity: getMaxCapacity(r, c)
        }))
    );
};

export const getMaxCapacity = (row: number, col: number): number => {
    // Corner cells: 2 neighbors -> capacity 1
    // Edge cells: 3 neighbors -> capacity 2
    // Inner cells: 4 neighbors -> capacity 3
    // Wait, standard Chain Reaction rules:
    // Corner: max 1 (explodes at 2)
    // Edge: max 2 (explodes at 3)
    // Inner: max 3 (explodes at 4)

    // My implementation uses "capacity" as the limit.
    // Let's stick to standard:
    // Corner: 2 neighbors
    // Edge: 3 neighbors
    // Inner: 4 neighbors
    // Capacity = neighbors - 1? No.
    // Explosion happens when count == neighbors.
    // So max capacity before explosion is neighbors - 1.

    let neighbors = 4;
    if (row === 0 || row === ROWS - 1) neighbors--;
    if (col === 0 || col === COLS - 1) neighbors--;

    return neighbors;
};

export const isValidMove = (board: Board, row: number, col: number, playerColor: PlayerColor): boolean => {
    const cell = board[row][col];
    return cell.owner === null || cell.owner === playerColor;
};

export const getNeighbors = (row: number, col: number): { r: number, c: number }[] => {
    const neighbors = [];
    if (row > 0) neighbors.push({ r: row - 1, c: col });
    if (row < ROWS - 1) neighbors.push({ r: row + 1, c: col });
    if (col > 0) neighbors.push({ r: row, c: col - 1 });
    if (col < COLS - 1) neighbors.push({ r: row, c: col + 1 });
    return neighbors;
};
