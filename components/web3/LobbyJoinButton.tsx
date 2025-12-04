"use client";

import { useState, useEffect } from "react";
import { useWriteContract, useWaitForTransactionReceipt, useReadContract, useAccount, useSwitchChain, usePublicClient } from "wagmi";
import { onchainReactionAbi } from "@/lib/onchainReaction";
import ERC20Abi from "@/abi/ERC20.json";
import { USDC_ADDRESSES, parseUSDC, parseTokenAmount } from "@/lib/contracts";
import { useLobby } from "@/hooks/useSpacetimeDB";
import { useSpacetimeConnection } from "@/hooks/useSpacetimeDB";

interface LobbyJoinButtonProps {
  chainId: number;
  arenaAddress: `0x${string}`;
  matchId: number;
  entryFee: string; // Human readable e.g. "5" for $5 USDC
  lobbyId?: string; // Room code for SpacetimeDB lobby
  onSuccess?: () => void;
  tokenAddress?: `0x${string}`;
  tokenSymbol?: string;
  tokenDecimals?: number;
}

export function LobbyJoinButton({
  chainId,
  arenaAddress,
  matchId,
  entryFee,
  lobbyId,
  onSuccess,
  tokenAddress,
  tokenSymbol = 'USDC',
  tokenDecimals = 6
}: LobbyJoinButtonProps) {
  const { address, chainId: connectedChainId } = useAccount();
  const { switchChainAsync } = useSwitchChain();
  const publicClient = usePublicClient();
  const { isConnected: isSpacetimeConnected } = useSpacetimeConnection();
  const { joinLobby, confirmDeposit } = useLobby(lobbyId || null);
  const [step, setStep] = useState<'check' | 'approve' | 'join' | 'done'>('check');
  const [txHash, setTxHash] = useState<`0x${string}` | undefined>();
  const [error, setError] = useState<string | null>(null);

  const usdcAddress = USDC_ADDRESSES[chainId];
  const targetTokenAddress = tokenAddress || usdcAddress;
  const entryFeeWei = parseTokenAmount(entryFee, tokenDecimals);

  // Check current allowance
  const { data: allowance, refetch: refetchAllowance } = useReadContract({
    address: targetTokenAddress,
    abi: ERC20Abi,
    functionName: "allowance",
    args: [address, arenaAddress],
    chainId,
  });

  // Check USDC balance
  const { data: balance } = useReadContract({
    address: targetTokenAddress,
    abi: ERC20Abi,
    functionName: "balanceOf",
    args: [address],
    chainId,
  });

  const { writeContractAsync, isPending } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash: txHash,
  });

  // Determine step based on allowance
  useEffect(() => {
    if (step === 'done') return;

    if (allowance !== undefined) {
      const currentAllowance = BigInt(allowance as string);
      if (currentAllowance >= entryFeeWei) {
        setStep('join');
      } else {
        setStep('approve');
      }
    }
  }, [allowance, entryFeeWei, step]);

  // Handle successful transaction
  useEffect(() => {
    if (isSuccess && txHash && address && lobbyId) {
      if (step === 'approve') {
        // Approval done, move to join
        refetchAllowance();
        setTxHash(undefined);
        setStep('join');
      } else if (step === 'join') {
        // Join on-chain done, now join SpacetimeDB lobby
        (async () => {
          try {
            if (isSpacetimeConnected) {
              // Join SpacetimeDB lobby
              const joined = await joinLobby(lobbyId, address, `Player ${address.slice(0, 6)}...${address.slice(-4)}`);
              if (joined) {

                // Confirm deposit
                await confirmDeposit(lobbyId, address);

              }
            }
          } catch (err) {
            console.error('[LobbyJoinButton] Failed to join SpacetimeDB:', err);
            // Continue anyway - player is on-chain
          }
          setStep('done');
          onSuccess?.();
        })();
      }
    }
  }, [isSuccess, txHash, step, refetchAllowance, onSuccess, address, lobbyId, isSpacetimeConnected, joinLobby, confirmDeposit]);

  async function handleApprove() {
    setError(null);

    // Switch chain if needed
    if (connectedChainId !== chainId) {
      try {
        await switchChainAsync({ chainId });
      } catch (err) {
        console.error('Failed to switch chain:', err);
        setError("Please switch to the correct network to continue.");
        return;
      }
    }

    try {
      // For Base, always reset existing allowance to 0 first (required by Base USDC)
      if (chainId === 8453) { // 8453 is Base
        try {
          const currentAllowance = BigInt(allowance ? String(allowance) : "0");
          if (currentAllowance > BigInt(0)) {
            const resetHash = await writeContractAsync({
              address: targetTokenAddress,
              abi: ERC20Abi,
              functionName: "approve",
              args: [arenaAddress, BigInt(0)],
              chainId,
            });
            // Wait for reset to confirm
            if (publicClient) {
              await publicClient.waitForTransactionReceipt({ hash: resetHash });
            }
          }
        } catch (resetErr) {
          console.warn('[LobbyJoinButton] Allowance reset failed or not needed:', resetErr);
        }
      }

      const hash = await writeContractAsync({
        address: targetTokenAddress,
        abi: ERC20Abi,
        functionName: "approve",
        args: [arenaAddress, entryFeeWei],
        chainId,
      });
      setTxHash(hash);
    } catch (e: any) {
      console.error(e);
      setError(e?.shortMessage || e?.message || "Approval failed");
    }
  }

  async function handleJoin() {
    setError(null);

    // Validate matchId
    if (!matchId || matchId < 0 || isNaN(matchId)) {
      setError("Invalid match ID. Please refresh the page.");
      return;
    }

    // Switch chain if needed
    if (connectedChainId !== chainId) {
      try {
        await switchChainAsync({ chainId });
      } catch (err) {
        console.error('Failed to switch chain:', err);
        setError("Please switch to the correct network to continue.");
        return;
      }
    }

    try {
      const hash = await writeContractAsync({
        address: arenaAddress,
        abi: onchainReactionAbi,
        functionName: "joinMatch",
        args: [BigInt(matchId)],
        chainId,
      });
      setTxHash(hash);
    } catch (e: any) {
      console.error(e);
      setError(e?.shortMessage || e?.message || "Join failed");
    }
  }

  const hasInsufficientBalance = balance !== undefined && BigInt(balance as string) < entryFeeWei;
  const isProcessing = isPending || isConfirming;

  if (!address) {
    return (
      <div className="text-center">
        <p className="text-sm text-slate-500">Connect wallet to join</p>
      </div>
    );
  }

  if (hasInsufficientBalance) {
    return (
      <div className="flex flex-col gap-2">
        <button
          disabled
          className="px-6 py-3 rounded-2xl bg-red-100 text-red-600 text-sm font-bold cursor-not-allowed"
        >
          Insufficient {tokenSymbol} Balance
        </button>
        <p className="text-xs text-slate-500 text-center">
          Need {entryFee} {tokenSymbol} to join
        </p>
      </div>
    );
  }

  if (step === 'done') {
    return (
      <div className="flex flex-col gap-2">
        <div className="px-6 py-3 rounded-2xl bg-emerald-100 text-emerald-700 text-sm font-bold text-center">
          ✓ Joined Successfully!
        </div>
        <p className="text-xs text-emerald-600 text-center">
          Waiting for other players…
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {/* Step indicator */}
      <div className="flex items-center justify-center gap-2 text-xs text-slate-500">
        <span className={step === 'approve' ? 'text-blue-600 font-bold' : ''}>
          1. Approve {tokenSymbol}
        </span>
        <span>→</span>
        <span className={step === 'join' ? 'text-blue-600 font-bold' : ''}>
          2. Join Match
        </span>
      </div>

      {step === 'approve' && (
        <button
          onClick={handleApprove}
          disabled={isProcessing}
          className="px-6 py-3 rounded-2xl bg-gradient-to-r from-blue-500 to-blue-600 text-white text-sm font-bold shadow-lg shadow-blue-500/25 disabled:opacity-60 transition-all hover:shadow-blue-500/40"
        >
          {isPending && "Confirm in wallet..."}
          {isConfirming && `Approving ${tokenSymbol}...`}
          {!isPending && !isConfirming && `Approve ${entryFee} ${tokenSymbol}`}
        </button>
      )}

      {step === 'join' && (
        <button
          onClick={handleJoin}
          disabled={isProcessing}
          className="px-6 py-3 rounded-2xl bg-gradient-to-r from-emerald-500 to-emerald-600 text-white text-sm font-bold shadow-lg shadow-emerald-500/25 disabled:opacity-60 transition-all hover:shadow-emerald-500/40"
        >
          {isPending && "Confirm in wallet..."}
          {isConfirming && "Joining lobby..."}
          {!isPending && !isConfirming && `Join Match (${entryFee} ${tokenSymbol})`}
        </button>
      )}

      {error && (
        <p className="text-xs text-red-500 text-center bg-red-50 px-3 py-2 rounded-xl">
          {error}
        </p>
      )}
    </div>
  );
}

  );
}

