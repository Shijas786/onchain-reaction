/**
 * Get recommended board size based on number of players
 * Based on balanced gameplay requirements
 */
export function getBoardSize(maxPlayers: number): { rows: number; cols: number } {
  switch (maxPlayers) {
    case 2:
      // Classic setup - use 9×6 as default, can also use 10×10 or 12×8
      return { rows: 9, cols: 6 };
    
    case 3:
    case 4:
      // 3-4 players need more space
      return { rows: 12, cols: 10 };
    
    case 5:
      // 5 players need even more territory
      return { rows: 15, cols: 15 };
    
    case 6:
      // 6 players - large board
      return { rows: 15, cols: 15 };
    
    case 7:
      // 7 players - very large
      return { rows: 20, cols: 20 };
    
    case 8:
      // 8 players - maximum size
      return { rows: 20, cols: 20 };
    
    default:
      // Fallback for edge cases
      if (maxPlayers <= 2) {
        return { rows: 9, cols: 6 };
      } else if (maxPlayers <= 4) {
        return { rows: 12, cols: 10 };
      } else if (maxPlayers <= 6) {
        return { rows: 15, cols: 15 };
      } else {
        return { rows: 20, cols: 20 };
      }
  }
}

/**
 * Get max capacity for a cell based on its position
 */
export function getMaxCapacity(row: number, col: number, rows: number, cols: number): number {
  const isCorner = (row === 0 || row === rows - 1) && (col === 0 || col === cols - 1);
  const isEdge = row === 0 || row === rows - 1 || col === 0 || col === cols - 1;
  
  if (isCorner) return 2;
  if (isEdge) return 3;
  return 4;
}

