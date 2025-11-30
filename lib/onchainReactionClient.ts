// src/lib/onchainReactionClient.ts

import { createPublicClient, createWalletClient, http } from "viem";
import { base, arbitrum } from "viem/chains";
import { privateKeyToAccount } from "viem/accounts";
import { onchainReactionAbi } from "./onchainReaction";

// for frontend, you'll usually be using wagmi hooks instead.
// this is more for server actions / scripts.
export function getPublicClient(chain: "base" | "arbitrum") {
  return createPublicClient({
    chain: chain === "base" ? base : arbitrum,
    transport: http(),
  });
}

export function getWalletClient(chain: "base" | "arbitrum") {
  // Use a dummy PK if not provided, or handle error
  const pk = process.env.NEXT_PUBLIC_DUMMY_PK as `0x${string}`;
  if (!pk) {
    console.warn("NEXT_PUBLIC_DUMMY_PK not set, wallet client will fail if used for signing");
  }

  const account = pk ? privateKeyToAccount(pk) : undefined;

  return createWalletClient({
    chain: chain === "base" ? base : arbitrum,
    transport: http(),
    account,
  });
}

export async function uiCreateMatch({
  chain,
  contract,
  token,
  entryFee,
  maxPlayers,
}: {
  chain: "base" | "arbitrum";
  contract: `0x${string}`; // OnchainReaction address on that chain
  token: `0x${string}`;
  entryFee: bigint;
  maxPlayers: number;
}) {
  const walletClient = getWalletClient(chain);
  if (!walletClient.account) throw new Error("No account configured for wallet client");

  const hash = await walletClient.writeContract({
    address: contract,
    abi: onchainReactionAbi,
    functionName: "createMatch",
    args: [token, entryFee, BigInt(maxPlayers)],
    account: walletClient.account,
  });

  return hash;
}

export async function uiJoinMatch({
  chain,
  contract,
  matchId,
}: {
  chain: "base" | "arbitrum";
  contract: `0x${string}`;
  matchId: bigint;
}) {
  const walletClient = getWalletClient(chain);
  if (!walletClient.account) throw new Error("No account configured for wallet client");

  const hash = await walletClient.writeContract({
    address: contract,
    abi: onchainReactionAbi,
    functionName: "joinMatch",
    args: [matchId],
    account: walletClient.account,
  });

  return hash;
}

export async function uiLeaveMatch(params: {
  chain: "base" | "arbitrum";
  contract: `0x${string}`;
  matchId: bigint;
}) {
  const walletClient = getWalletClient(params.chain);
  if (!walletClient.account) throw new Error("No account configured for wallet client");

  const hash = await walletClient.writeContract({
    address: params.contract,
    abi: onchainReactionAbi,
    functionName: "leaveMatch",
    args: [params.matchId],
    account: walletClient.account,
  });

  return hash;
}

export async function uiStartMatch(params: {
  chain: "base" | "arbitrum";
  contract: `0x${string}`;
  matchId: bigint;
}) {
  const walletClient = getWalletClient(params.chain);
  if (!walletClient.account) throw new Error("No account configured for wallet client");

  const hash = await walletClient.writeContract({
    address: params.contract,
    abi: onchainReactionAbi,
    functionName: "startMatch",
    args: [params.matchId],
    account: walletClient.account,
  });

  return hash;
}

export async function uiClaimPrize(params: {
  chain: "base" | "arbitrum";
  contract: `0x${string}`;
  matchId: bigint;
}) {
  const walletClient = getWalletClient(params.chain);
  if (!walletClient.account) throw new Error("No account configured for wallet client");

  const hash = await walletClient.writeContract({
    address: params.contract,
    abi: onchainReactionAbi,
    functionName: "claimPrize",
    args: [params.matchId],
    account: walletClient.account,
  });

  return hash;
}

export async function uiGetMatch({
  chain,
  contract,
  matchId,
}: {
  chain: "base" | "arbitrum";
  contract: `0x${string}`;
  matchId: bigint;
}) {
  const publicClient = getPublicClient(chain);

  const match = await publicClient.readContract({
    address: contract,
    abi: onchainReactionAbi,
    functionName: "matches",
    args: [matchId],
  });

  return match;
}
