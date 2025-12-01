"use client";

import { useState } from "react";
import { useWriteContract, useWaitForTransactionReceipt, useReadContract } from "wagmi";
import ChainOrbArenaAbi from "@/abi/ChainOrbArena.json";
import { formatUSDC, getChainName } from "@/lib/contracts";

interface Prize {
  id: string;
  chainId: number;
  matchId: number;
  arenaAddress: string;
  prizePool: string;
}

interface ClaimPrizeButtonProps {
  prize: Prize;
  onSuccess?: () => void;
}

export function ClaimPrizeButton({ prize, onSuccess }: ClaimPrizeButtonProps) {
  const [txHash, setTxHash] = useState<`0x${string}` | undefined>();
  const [error, setError] = useState<string | null>(null);

  const { writeContractAsync, isPending } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash: txHash,
  });

  async function handleClaim() {
    setError(null);
    try {
      const hash = await writeContractAsync({
        address: prize.arenaAddress as `0x${string}`,
        abi: ChainOrbArenaAbi,
        functionName: "claimPrize",
        args: [BigInt(prize.matchId)],
        chainId: prize.chainId,
      });
      setTxHash(hash);
    } catch (e: any) {
      console.error(e);
      setError(e?.shortMessage || e?.message || "Claim failed");
    }
  }

  const { data: isClaimedOnChain } = useReadContract({
    address: prize.arenaAddress as `0x${string}`,
    abi: ChainOrbArenaAbi,
    functionName: "claimed",
    args: [BigInt(prize.matchId)],
    chainId: prize.chainId,
  });

  if (isSuccess || isClaimedOnChain) {
    onSuccess?.();
    return (
      <span className="px-4 py-2 rounded-xl bg-emerald-100 text-emerald-700 text-xs font-bold">
        ✓ Claimed
      </span>
    );
  }

  const isProcessing = isPending || isConfirming;

  // Calculate prize after 0.5% fee deduction
  const prizePoolBigInt = BigInt(prize.prizePool);
  const fee = (prizePoolBigInt * BigInt(50)) / BigInt(10000); // 0.5% = 50 basis points
  const netPrize = prizePoolBigInt - fee;

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        onClick={handleClaim}
        disabled={isProcessing}
        className="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-400 to-emerald-500 text-white text-xs font-bold shadow-md disabled:opacity-60 transition-all hover:shadow-lg"
      >
        {isPending && "Confirm..."}
        {isConfirming && "Claiming..."}
        {!isPending && !isConfirming && `Claim ${formatUSDC(netPrize.toString())} USDC`}
      </button>
      {error && (
        <span className="text-[10px] text-red-500">{error}</span>
      )}
    </div>
  );
}

// Prize card component for the prizes page
interface PrizeCardProps {
  prize: Prize;
  onClaimed?: () => void;
}

export function PrizeCard({ prize, onClaimed }: PrizeCardProps) {
  return (
    <div className="rounded-2xl border border-slate-200 p-4 flex items-center justify-between bg-gradient-to-r from-white to-slate-50 shadow-sm">
      <div className="space-y-1">
        <div className="text-sm font-bold text-slate-800">
          Match #{prize.matchId}
        </div>
        <div className="flex items-center gap-2">
          <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${prize.chainId === 8453
            ? 'bg-blue-100 text-blue-700'
            : 'bg-orange-100 text-orange-700'
            }`}>
            {getChainName(prize.chainId)}
          </span>
          <div className="flex flex-col gap-0.5">
            <span className="text-xs text-slate-500">
              Prize Pool: <span className="font-bold text-emerald-600">${formatUSDC(prize.prizePool)} USDC</span>
            </span>
            <span className="text-[10px] text-slate-400">
              After 0.5% fee: <span className="font-bold text-emerald-700">${formatUSDC((BigInt(prize.prizePool) - (BigInt(prize.prizePool) * BigInt(50) / BigInt(10000))).toString())} USDC</span>
            </span>
          </div>
        </div>
      </div>
      <ClaimPrizeButton prize={prize} onSuccess={onClaimed} />
    </div>
  );
}

