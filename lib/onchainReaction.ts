// Minimal ABI for OnchainReaction contract (UI-only functions)
// Only includes what the frontend needs

export const onchainReactionAbi = [
  // createMatch(address token, uint256 entryFee, uint256 maxPlayers)
  {
    type: "function",
    name: "createMatch",
    stateMutability: "nonpayable",
    inputs: [
      { name: "token", type: "address", internalType: "address" },
      { name: "entryFee", type: "uint256", internalType: "uint256" },
      { name: "maxPlayers", type: "uint256", internalType: "uint256" },
    ],
    outputs: [{ name: "id", type: "uint256", internalType: "uint256" }],
  },

  // joinMatch(uint256 matchId)
  {
    type: "function",
    name: "joinMatch",
    stateMutability: "nonpayable",
    inputs: [{ name: "id", type: "uint256", internalType: "uint256" }],
    outputs: [],
  },

  // leaveMatch(uint256 matchId)
  {
    type: "function",
    name: "leaveMatch",
    stateMutability: "nonpayable",
    inputs: [{ name: "id", type: "uint256", internalType: "uint256" }],
    outputs: [],
  },

  // startMatch(uint256 matchId)
  {
    type: "function",
    name: "startMatch",
    stateMutability: "nonpayable",
    inputs: [{ name: "id", type: "uint256", internalType: "uint256" }],
    outputs: [],
  },

  // finishMatch(uint256 matchId, address winner) – called by oracle backend
  {
    type: "function",
    name: "finishMatch",
    stateMutability: "nonpayable",
    inputs: [
      { name: "id", type: "uint256", internalType: "uint256" },
      { name: "winner", type: "address", internalType: "address" },
    ],
    outputs: [],
  },

  // claimPrize(uint256 matchId)
  {
    type: "function",
    name: "claimPrize",
    stateMutability: "nonpayable",
    inputs: [{ name: "id", type: "uint256", internalType: "uint256" }],
    outputs: [],
  },

  // matches(matchId) -> struct
  {
    type: "function",
    name: "matches",
    stateMutability: "view",
    inputs: [{ name: "", type: "uint256", internalType: "uint256" }],
    outputs: [
      { name: "host", type: "address", internalType: "address" },
      { name: "token", type: "address", internalType: "address" },
      { name: "entryFee", type: "uint256", internalType: "uint256" },
      { name: "maxPlayers", type: "uint256", internalType: "uint256" },
      { name: "prizePool", type: "uint256", internalType: "uint256" },
      { name: "status", type: "uint8", internalType: "uint8" }, // enum MatchStatus
      { name: "winner", type: "address", internalType: "address" },
      { name: "createdAt", type: "uint256", internalType: "uint256" },
      { name: "expiresAt", type: "uint256", internalType: "uint256" },
    ],
  },

  // getPlayers(uint256 matchId) -> address[]
  {
    type: "function",
    name: "getPlayers",
    stateMutability: "view",
    inputs: [{ name: "matchId", type: "uint256", internalType: "uint256" }],
    outputs: [{ name: "", type: "address[]", internalType: "address[]" }],
  },

  // isPlayerInMatch(uint256 matchId, address player) -> bool
  {
    type: "function",
    name: "isPlayerInMatch",
    stateMutability: "view",
    inputs: [
      { name: "", type: "uint256", internalType: "uint256" },
      { name: "", type: "address", internalType: "address" },
    ],
    outputs: [{ name: "", type: "bool", internalType: "bool" }],
  },

  // allowedTokens(token) -> bool
  {
    type: "function",
    name: "allowedTokens",
    stateMutability: "view",
    inputs: [{ name: "", type: "address", internalType: "address" }],
    outputs: [{ name: "", type: "bool", internalType: "bool" }],
  },

  // claimed(matchId) -> bool
  {
    type: "function",
    name: "claimed",
    stateMutability: "view",
    inputs: [{ name: "", type: "uint256", internalType: "uint256" }],
    outputs: [{ name: "", type: "bool", internalType: "bool" }],
  },

  // view: nextMatchId
  {
    type: "function",
    name: "nextMatchId",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint256", internalType: "uint256" }],
  },

  // Events
  {
    type: "event",
    name: "MatchCreated",
    anonymous: false,
    inputs: [
      { indexed: true, name: "matchId", type: "uint256", internalType: "uint256" },
      { indexed: true, name: "host", type: "address", internalType: "address" },
    ],
  },
  {
    type: "event",
    name: "PlayerJoined",
    anonymous: false,
    inputs: [
      { indexed: true, name: "matchId", type: "uint256", internalType: "uint256" },
      { indexed: true, name: "player", type: "address", internalType: "address" },
    ],
  },
  {
    type: "event",
    name: "MatchStarted",
    anonymous: false,
    inputs: [
      { indexed: true, name: "matchId", type: "uint256", internalType: "uint256" },
    ],
  },
  {
    type: "event",
    name: "MatchFinished",
    anonymous: false,
    inputs: [
      { indexed: true, name: "matchId", type: "uint256", internalType: "uint256" },
      { indexed: true, name: "winner", type: "address", internalType: "address" },
    ],
  },
  {
    type: "event",
    name: "PrizeClaimed",
    anonymous: false,
    inputs: [
      { indexed: true, name: "matchId", type: "uint256", internalType: "uint256" },
      { indexed: false, name: "amount", type: "uint256", internalType: "uint256" },
    ],
  },
] as const;

