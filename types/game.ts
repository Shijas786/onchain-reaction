export type PlayerColor = 'red' | 'blue' | 'green' | 'yellow' | 'purple' | 'orange' | 'pink' | 'cyan';

export interface Player {
    id: string;
    color: PlayerColor;
    isAlive: boolean;
    name: string;
}

export interface Cell {
    row: number;
    col: number;
    count: number;
    owner: PlayerColor | null;
}

export type Board = Cell[][];

export interface GameState {
    board: Board;
    players: Player[];
    currentPlayerIndex: number;
    isGameOver: boolean;
    winner: Player | null;
    isAnimating: boolean; // To block input during chain reactions
}

export const ROWS = 8;
export const COLS = 8;

export const PLAYER_COLORS: PlayerColor[] = ['red', 'blue', 'green', 'yellow', 'purple', 'orange', 'pink', 'cyan'];
