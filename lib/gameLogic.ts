import { Board, ROWS, COLS, PlayerColor } from "@/types/game";

export const createBoard = (rows: number = ROWS, cols: number = COLS): Board => {
    return Array.from({ length: rows }, (_, r) =>
        Array.from({ length: cols }, (_, c) => ({
            row: r,
            col: c,
            count: 0,
            owner: null,
        }))
    );
};

export const getMaxCapacity = (row: number, col: number, rows: number = ROWS, cols: number = COLS): number => {
    let neighbors = 4;
    if (row === 0 || row === rows - 1) neighbors--;
    if (col === 0 || col === cols - 1) neighbors--;
    return neighbors;
};

export const isValidMove = (board: Board, row: number, col: number, playerColor: PlayerColor): boolean => {
    const cell = board[row][col];
    return cell.owner === null || cell.owner === playerColor;
};

export const getNeighbors = (row: number, col: number, rows: number = ROWS, cols: number = COLS): { r: number, c: number }[] => {
    const neighbors: { r: number; c: number }[] = [];
    if (row > 0) neighbors.push({ r: row - 1, c: col });
    if (row < rows - 1) neighbors.push({ r: row + 1, c: col });
    if (col > 0) neighbors.push({ r: row, c: col - 1 });
    if (col < cols - 1) neighbors.push({ r: row, c: col + 1 });
    return neighbors;
};
