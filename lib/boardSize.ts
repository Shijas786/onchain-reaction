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
      // 5 players - maximum allowed
      return { rows: 15, cols: 15 };
    
    default:
      // Fallback for edge cases
      if (maxPlayers <= 2) {
        return { rows: 9, cols: 6 };
      } else if (maxPlayers <= 4) {
        return { rows: 12, cols: 10 };
      } else {
        // 5 players (max)
        return { rows: 15, cols: 15 };
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

