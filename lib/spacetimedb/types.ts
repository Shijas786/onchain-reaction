// Re-export types from hooks (which now use generated types)
export type {
  Lobby,
  LobbyPlayer,
  GameState,
  Board,
} from "@/hooks/useSpacetimeDB";

export {
  parseBoard,
  PLAYER_COLORS,
} from "@/hooks/useSpacetimeDB";

// Legacy type alias for PlayerColor
export type PlayerColor = "red" | "blue" | "green" | "yellow" | "purple" | "orange" | "pink" | "cyan";
