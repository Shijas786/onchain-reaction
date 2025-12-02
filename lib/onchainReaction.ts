// src/lib/onchainReaction.ts

export const onchainReactionAbi = [
  // createMatch(address token, uint256 entryFee, uint256 maxPlayers)
  {
    type: "function",
    name: "createMatch",
    stateMutability: "nonpayable",
    inputs: [
      { name: "token", type: "address" },
      { name: "entryFee", type: "uint256" },
      { name: "maxPlayers", type: "uint256" },
    ],
    outputs: [{ name: "matchId", type: "uint256" }],
  },

  // joinMatch(uint256 matchId)
  {
    type: "function",
    name: "joinMatch",
    stateMutability: "nonpayable",
    inputs: [{ name: "matchId", type: "uint256" }],
    outputs: [],
  },

  // leaveMatch(uint256 matchId)
  {
    type: "function",
    name: "leaveMatch",
    stateMutability: "nonpayable",
    inputs: [{ name: "matchId", type: "uint256" }],
    outputs: [],
  },

  // startMatch(uint256 matchId)
  {
    type: "function",
    name: "startMatch",
    stateMutability: "nonpayable",
    inputs: [{ name: "matchId", type: "uint256" }],
    outputs: [],
  },

  // finishMatch(uint256 matchId, address winner) – called by oracle backend
  {
    type: "function",
    name: "finishMatch",
    stateMutability: "nonpayable",
    inputs: [
      { name: "matchId", type: "uint256" },
      { name: "winner", type: "address" },
    ],
    outputs: [],
  },

  // claimPrize(uint256 matchId)
  {
    type: "function",
    name: "claimPrize",
    stateMutability: "nonpayable",
    inputs: [{ name: "matchId", type: "uint256" }],
    outputs: [],
  },

  // matches(matchId) -> struct
  {
    type: "function",
    name: "matches",
    stateMutability: "view",
    inputs: [{ name: "matchId", type: "uint256" }],
    outputs: [
      { name: "host", type: "address" },
      { name: "token", type: "address" },
      { name: "entryFee", type: "uint256" },
      { name: "maxPlayers", type: "uint256" },
      { name: "prizePool", type: "uint256" },
      { name: "status", type: "uint8" }, // enum MatchStatus
      { name: "winner", type: "address" },
      { name: "createdAt", type: "uint256" },
      { name: "expiresAt", type: "uint256" },
    ],
  },

  // allowedTokens(token) -> bool
  {
    type: "function",
    name: "allowedTokens",
    stateMutability: "view",
    inputs: [{ name: "", type: "address" }],
    outputs: [{ name: "", type: "bool" }],
  },

  // claimed(matchId) -> bool
  {
    type: "function",
    name: "claimed",
    stateMutability: "view",
    inputs: [{ name: "", type: "uint256" }],
    outputs: [{ name: "", type: "bool" }],
  },

  // view: nextMatchId
  {
    type: "function",
    name: "nextMatchId",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
  },

  // owner() -> address
  {
    type: "function",
    name: "owner",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "address" }],
  },

  // oracle() -> address
  {
    type: "function",
    name: "oracle",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "address" }],
  },

  // isPlayerInMatch(matchId, player) -> bool
  {
    type: "function",
    name: "isPlayerInMatch",
    stateMutability: "view",
    inputs: [
      { name: "matchId", type: "uint256" },
      { name: "player", type: "address" },
    ],
    outputs: [{ name: "", type: "bool" }],
  },

  // getPlayers(matchId) -> address[]
  {
    type: "function",
    name: "getPlayers",
    stateMutability: "view",
    inputs: [{ name: "matchId", type: "uint256" }],
    outputs: [{ name: "", type: "address[]" }],
  },

  // emergencyCancelMatch(matchId)
  {
    type: "function",
    name: "emergencyCancelMatch",
    stateMutability: "nonpayable",
    inputs: [{ name: "matchId", type: "uint256" }],
    outputs: [],
  },
] as const;


