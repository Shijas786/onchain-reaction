"use client";

import { useState } from "react";
import { useWriteContract, useWaitForTransactionReceipt, useAccount, usePublicClient } from "wagmi";
import ChainOrbArenaAbi from "@/abi/ChainOrbArena.json";
import { ARENA_ADDRESSES, parseUSDC, ENTRY_FEE_OPTIONS, MAX_PLAYERS_OPTIONS, getChainName, CHAIN_IDS } from "@/lib/contracts";
import { decodeEventLog } from "viem";

interface CreateMatchButtonProps {
  onMatchCreated?: (matchId: number, chainId: number) => void;
}

export function CreateMatchButton({ onMatchCreated }: CreateMatchButtonProps) {
  const { address, chainId: connectedChainId } = useAccount();
  const publicClient = usePublicClient();
  
  const [selectedChain, setSelectedChain] = useState<number>(CHAIN_IDS.BASE);
  const [entryFee, setEntryFee] = useState<string>("5");
  const [maxPlayers, setMaxPlayers] = useState<number>(4);
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [txHash, setTxHash] = useState<`0x${string}` | undefined>();

  const arenaAddress = ARENA_ADDRESSES[selectedChain];

  const { writeContractAsync, isPending } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash: txHash,
  });

  async function handleCreate() {
    if (!address || !publicClient) return;
    
    setError(null);
    setIsCreating(true);
    
    try {
      const entryFeeWei = parseUSDC(entryFee);
      
      const hash = await writeContractAsync({
        address: arenaAddress,
        abi: ChainOrbArenaAbi,
        functionName: "createMatch",
        args: [entryFeeWei, BigInt(maxPlayers)],
        chainId: selectedChain,
      });
      
      setTxHash(hash);
      
      // Wait for receipt to get matchId from event
      const receipt = await publicClient.waitForTransactionReceipt({ hash });
      
      // Find MatchCreated event
      const matchCreatedLog = receipt.logs.find(log => {
        try {
          const decoded = decodeEventLog({
            abi: ChainOrbArenaAbi,
            data: log.data,
            topics: log.topics,
          });
          return decoded.eventName === 'MatchCreated';
        } catch {
          return false;
        }
      });
      
      if (matchCreatedLog) {
        const decoded = decodeEventLog({
          abi: ChainOrbArenaAbi,
          data: matchCreatedLog.data,
          topics: matchCreatedLog.topics,
        });
        const matchId = Number((decoded.args as any).matchId);
        onMatchCreated?.(matchId, selectedChain);
      }
      
    } catch (e: any) {
      console.error(e);
      setError(e?.shortMessage || e?.message || "Failed to create match");
    } finally {
      setIsCreating(false);
    }
  }

  if (!address) {
    return (
      <div className="text-center p-4">
        <p className="text-sm text-slate-500">Connect wallet to create a match</p>
      </div>
    );
  }

  const isProcessing = isPending || isConfirming || isCreating;

  return (
    <div className="space-y-4">
      {/* Chain Selection */}
      <div className="space-y-2">
        <label className="text-sm font-bold text-slate-700">Network</label>
        <div className="flex gap-2">
          {[CHAIN_IDS.BASE, CHAIN_IDS.ARBITRUM].map((chainId) => (
            <button
              key={chainId}
              onClick={() => setSelectedChain(chainId)}
              className={`flex-1 px-4 py-3 rounded-xl font-bold text-sm transition-all ${
                selectedChain === chainId
                  ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/25'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {getChainName(chainId)}
            </button>
          ))}
        </div>
      </div>

      {/* Entry Fee */}
      <div className="space-y-2">
        <label className="text-sm font-bold text-slate-700">Entry Fee</label>
        <div className="grid grid-cols-4 gap-2">
          {ENTRY_FEE_OPTIONS.map((option) => (
            <button
              key={option.value}
              onClick={() => setEntryFee(option.value)}
              className={`px-3 py-2 rounded-xl font-bold text-sm transition-all ${
                entryFee === option.value
                  ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/25'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      {/* Max Players */}
      <div className="space-y-2">
        <label className="text-sm font-bold text-slate-700">Max Players</label>
        <div className="flex gap-2 flex-wrap">
          {MAX_PLAYERS_OPTIONS.map((num) => (
            <button
              key={num}
              onClick={() => setMaxPlayers(num)}
              className={`w-10 h-10 rounded-xl font-bold text-sm transition-all ${
                maxPlayers === num
                  ? 'bg-purple-500 text-white shadow-lg shadow-purple-500/25'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {num}
            </button>
          ))}
        </div>
      </div>

      {/* Summary */}
      <div className="bg-slate-50 rounded-xl p-4 space-y-1">
        <div className="flex justify-between text-sm">
          <span className="text-slate-500">Network</span>
          <span className="font-bold text-slate-700">{getChainName(selectedChain)}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-slate-500">Entry Fee</span>
          <span className="font-bold text-slate-700">${entryFee} USDC</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-slate-500">Max Prize Pool</span>
          <span className="font-bold text-emerald-600">${Number(entryFee) * maxPlayers} USDC</span>
        </div>
      </div>

      {/* Create Button */}
      <button
        onClick={handleCreate}
        disabled={isProcessing}
        className="w-full px-6 py-4 rounded-2xl bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 text-white font-bold shadow-lg disabled:opacity-60 transition-all hover:shadow-xl"
      >
        {isPending && "Confirm in wallet..."}
        {isConfirming && "Creating match..."}
        {!isPending && !isConfirming && "Create Match"}
      </button>

      {error && (
        <p className="text-xs text-red-500 text-center bg-red-50 px-3 py-2 rounded-xl">
          {error}
        </p>
      )}

      {isSuccess && (
        <p className="text-xs text-emerald-500 text-center bg-emerald-50 px-3 py-2 rounded-xl">
          ✓ Match created! Redirecting to lobby...
        </p>
      )}
    </div>
  );
}

