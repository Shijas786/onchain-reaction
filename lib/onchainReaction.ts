// Complete ABI for OnchainReactionBaseV3
// Generated from contract at 0x426E2cA323fA707bd1921ECcce0a27aD7804b2A2

export const onchainReactionAbi = [
  // createMatch(address token, uint256 entryFee, uint256 maxPlayers) returns (uint256)
  {
    type: "function",
    name: "createMatch",
    stateMutability: "nonpayable",
    inputs: [
      { name: "token", type: "address" },
      { name: "entryFee", type: "uint256" },
      { name: "maxPlayers", type: "uint256" },
    ],
    outputs: [{ name: "id", type: "uint256" }],
  },

  // joinMatch(uint256 matchId)
  {
    type: "function",
    name: "joinMatch",
    stateMutability: "nonpayable",
    inputs: [{ name: "id", type: "uint256" }],
    outputs: [],
  },

  // leaveMatch(uint256 matchId)
  {
    type: "function",
    name: "leaveMatch",
    stateMutability: "nonpayable",
    inputs: [{ name: "id", type: "uint256" }],
    outputs: [],
  },

  // startMatch(uint256 matchId)
  {
    type: "function",
    name: "startMatch",
    stateMutability: "nonpayable",
    inputs: [{ name: "id", type: "uint256" }],
    outputs: [],
  },

  // finishMatch(uint256 matchId, address winner)
  {
    type: "function",
    name: "finishMatch",
    stateMutability: "nonpayable",
    inputs: [
      { name: "id", type: "uint256" },
      { name: "winner", type: "address" },
    ],
    outputs: [],
  },

  // claimPrize(uint256 matchId)
  {
    type: "function",
    name: "claimPrize",
    stateMutability: "nonpayable",
    inputs: [{ name: "id", type: "uint256" }],
    outputs: [],
  },

  // claimExpiredRefund(uint256 matchId)
  {
    type: "function",
    name: "claimExpiredRefund",
    stateMutability: "nonpayable",
    inputs: [{ name: "id", type: "uint256" }],
    outputs: [],
  },

  // emergencyCancelMatch(uint256 matchId)
  {
    type: "function",
    name: "emergencyCancelMatch",
    stateMutability: "nonpayable",
    inputs: [{ name: "id", type: "uint256" }],
    outputs: [],
  },

  // matches(uint256) returns (Match struct)
  {
    type: "function",
    name: "matches",
    stateMutability: "view",
    inputs: [{ name: "", type: "uint256" }],
    outputs: [
      { name: "host", type: "address" },
      { name: "token", type: "address" },
      { name: "entryFee", type: "uint256" },
      { name: "maxPlayers", type: "uint256" },
      { name: "prizePool", type: "uint256" },
      { name: "status", type: "uint8" },
      { name: "winner", type: "address" },
      { name: "createdAt", type: "uint256" },
      { name: "expiresAt", type: "uint256" },
    ],
  },

  // claimed(uint256) returns (bool)
  {
    type: "function",
    name: "claimed",
    stateMutability: "view",
    inputs: [{ name: "", type: "uint256" }],
    outputs: [{ name: "", type: "bool" }],
  },

  // nextMatchId() returns (uint256)
  {
    type: "function",
    name: "nextMatchId",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
  },

  // owner() returns (address)
  {
    type: "function",
    name: "owner",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "address" }],
  },

  // oracle() returns (address)
  {
    type: "function",
    name: "oracle",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "address" }],
  },

  // feeBps() returns (uint256)
  {
    type: "function",
    name: "feeBps",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
  },

  // feeRecipient() returns (address)
  {
    type: "function",
    name: "feeRecipient",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "address" }],
  },

  // accumulatedFees(address token) returns (uint256) - ✅ NEW SIGNATURE
  {
    type: "function",
    name: "accumulatedFees",
    stateMutability: "view",
    inputs: [{ name: "token", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
  },

  // allowedTokens(address) returns (bool)
  {
    type: "function",
    name: "allowedTokens",
    stateMutability: "view",
    inputs: [{ name: "", type: "address" }],
    outputs: [{ name: "", type: "bool" }],
  },

  // isPlayerInMatch(uint256, address) returns (bool)
  {
    type: "function",
    name: "isPlayerInMatch",
    stateMutability: "view",
    inputs: [
      { name: "", type: "uint256" },
      { name: "", type: "address" },
    ],
    outputs: [{ name: "", type: "bool" }],
  },

  // getPlayers(uint256) returns (address[])
  {
    type: "function",
    name: "getPlayers",
    stateMutability: "view",
    inputs: [{ name: "id", type: "uint256" }],
    outputs: [{ name: "", type: "address[]" }],
  },

  // setOracle(address)
  {
    type: "function",
    name: "setOracle",
    stateMutability: "nonpayable",
    inputs: [{ name: "o", type: "address" }],
    outputs: [],
  },

  // setFee(uint256)
  {
    type: "function",
    name: "setFee",
    stateMutability: "nonpayable",
    inputs: [{ name: "bps", type: "uint256" }],
    outputs: [],
  },

  // setAllowedToken(address, bool)
  {
    type: "function",
    name: "setAllowedToken",
    stateMutability: "nonpayable",
    inputs: [
      { name: "token", type: "address" },
      { name: "allowed", type: "bool" },
    ],
    outputs: [],
  },

  // withdrawFees(address token) - ✅ NEW SIGNATURE
  {
    type: "function",
    name: "withdrawFees",
    stateMutability: "nonpayable",
    inputs: [{ name: "token", type: "address" }],
    outputs: [],
  },

  // Events
  {
    type: "event",
    name: "MatchCreated",
    inputs: [
      { indexed: true, name: "matchId", type: "uint256" },
      { indexed: true, name: "host", type: "address" },
    ],
  },
  {
    type: "event",
    name: "PlayerJoined",
    inputs: [
      { indexed: true, name: "matchId", type: "uint256" },
      { indexed: true, name: "player", type: "address" },
    ],
  },
  {
    type: "event",
    name: "PlayerLeft",
    inputs: [
      { indexed: true, name: "matchId", type: "uint256" },
      { indexed: true, name: "player", type: "address" },
    ],
  },
  {
    type: "event",
    name: "MatchStarted",
    inputs: [
      { indexed: true, name: "matchId", type: "uint256" },
    ],
  },
  {
    type: "event",
    name: "MatchFinished",
    inputs: [
      { indexed: true, name: "matchId", type: "uint256" },
      { indexed: false, name: "winner", type: "address" },
    ],
  },
  {
    type: "event",
    name: "PrizeClaimed",
    inputs: [
      { indexed: true, name: "matchId", type: "uint256" },
      { indexed: false, name: "amount", type: "uint256" },
    ],
  },
  {
    type: "event",
    name: "MatchCancelled",
    inputs: [
      { indexed: true, name: "matchId", type: "uint256" },
    ],
  },
  {
    type: "event",
    name: "RefundClaimed",
    inputs: [
      { indexed: true, name: "matchId", type: "uint256" },
      { indexed: true, name: "player", type: "address" },
      { indexed: false, name: "amount", type: "uint256" },
    ],
  },
  {
    type: "event",
    name: "FeesWithdrawn",
    inputs: [
      { indexed: true, name: "token", type: "address" },
      { indexed: true, name: "recipient", type: "address" },
      { indexed: false, name: "amount", type: "uint256" },
    ],
  },
] as const;
