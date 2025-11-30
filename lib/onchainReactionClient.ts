// Frontend client helpers for OnchainReaction contract
// These are convenience wrappers around wagmi hooks

import { createPublicClient, createWalletClient, http } from "viem";
import { base, arbitrum } from "viem/chains";
import { privateKeyToAccount } from "viem/accounts";
import { onchainReactionAbi } from "./onchainReaction";

// For frontend, you'll usually be using wagmi hooks instead.
// This is more for server actions / scripts.
export function getPublicClient(chain: "base" | "arbitrum") {
  const chainConfig = chain === "base" ? base : arbitrum;
  
  return createPublicClient({
    chain: chainConfig,
    transport: http(),
  });
}

export function getWalletClient(chain: "base" | "arbitrum", privateKey?: `0x${string}`) {
  if (!privateKey) {
    throw new Error("Private key required for wallet client");
  }

  const account = privateKeyToAccount(privateKey);
  const chainConfig = chain === "base" ? base : arbitrum;

  return createWalletClient({
    chain: chainConfig,
    transport: http(),
    account,
  });
}

// UI Helper functions - these use wallet client directly
// In React, use wagmi hooks instead (useWriteContract, useReadContract)

export async function uiCreateMatch({
  chain,
  contract,
  token,
  entryFee,
  maxPlayers,
  walletClient,
}: {
  chain: "base" | "arbitrum";
  contract: `0x${string}`;
  token: `0x${string}`;
  entryFee: bigint;
  maxPlayers: number;
  walletClient: ReturnType<typeof getWalletClient>;
}) {
  const hash = await walletClient.writeContract({
    address: contract,
    abi: onchainReactionAbi,
    functionName: "createMatch",
    args: [token, entryFee, BigInt(maxPlayers)],
  });

  return hash;
}

export async function uiJoinMatch({
  chain,
  contract,
  matchId,
  walletClient,
}: {
  chain: "base" | "arbitrum";
  contract: `0x${string}`;
  matchId: bigint;
  walletClient: ReturnType<typeof getWalletClient>;
}) {
  const hash = await walletClient.writeContract({
    address: contract,
    abi: onchainReactionAbi,
    functionName: "joinMatch",
    args: [matchId],
  });

  return hash;
}

export async function uiLeaveMatch(params: {
  chain: "base" | "arbitrum";
  contract: `0x${string}`;
  matchId: bigint;
  walletClient: ReturnType<typeof getWalletClient>;
}) {
  const hash = await params.walletClient.writeContract({
    address: params.contract,
    abi: onchainReactionAbi,
    functionName: "leaveMatch",
    args: [params.matchId],
  });

  return hash;
}

export async function uiStartMatch(params: {
  chain: "base" | "arbitrum";
  contract: `0x${string}`;
  matchId: bigint;
  walletClient: ReturnType<typeof getWalletClient>;
}) {
  const hash = await params.walletClient.writeContract({
    address: params.contract,
    abi: onchainReactionAbi,
    functionName: "startMatch",
    args: [params.matchId],
  });

  return hash;
}

export async function uiClaimPrize(params: {
  chain: "base" | "arbitrum";
  contract: `0x${string}`;
  matchId: bigint;
  walletClient: ReturnType<typeof getWalletClient>;
}) {
  const hash = await params.walletClient.writeContract({
    address: params.contract,
    abi: onchainReactionAbi,
    functionName: "claimPrize",
    args: [params.matchId],
  });

  return hash;
}

export async function uiGetMatch({
  chain,
  contract,
  matchId,
  publicClient,
}: {
  chain: "base" | "arbitrum";
  contract: `0x${string}`;
  matchId: bigint;
  publicClient?: ReturnType<typeof getPublicClient>;
}) {
  const client = publicClient || getPublicClient(chain);

  const match = await client.readContract({
    address: contract,
    abi: onchainReactionAbi,
    functionName: "matches",
    args: [matchId],
  });

  return match as [
    string, // host
    string, // token
    bigint, // entryFee
    bigint, // maxPlayers
    bigint, // prizePool
    number, // status
    string, // winner
    bigint, // createdAt
    bigint, // expiresAt
  ];
}

export async function uiGetPlayers({
  chain,
  contract,
  matchId,
  publicClient,
}: {
  chain: "base" | "arbitrum";
  contract: `0x${string}`;
  matchId: bigint;
  publicClient?: ReturnType<typeof getPublicClient>;
}) {
  const client = publicClient || getPublicClient(chain);

  const players = await client.readContract({
    address: contract,
    abi: onchainReactionAbi,
    functionName: "getPlayers",
    args: [matchId],
  });

  return players as `0x${string}`[];
}

