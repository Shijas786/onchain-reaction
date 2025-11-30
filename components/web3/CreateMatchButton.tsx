"use client";

import { useState } from "react";
import { useWriteContract, useWaitForTransactionReceipt, useAccount, usePublicClient } from "wagmi";
import ChainOrbArenaAbi from "@/abi/ChainOrbArena.json";
import { ARENA_ADDRESSES, parseUSDC, ENTRY_FEE_OPTIONS, MAX_PLAYERS_OPTIONS, getChainName, CHAIN_IDS } from "@/lib/contracts";
import { decodeEventLog } from "viem";
import { generateRoomCode, formatRoomCode } from "@/lib/roomCode";
import { motion, AnimatePresence } from "framer-motion";

interface CreateMatchButtonProps {
  onMatchCreated?: (matchId: number, chainId: number, roomCode?: string) => void;
}

export function CreateMatchButton({ onMatchCreated }: CreateMatchButtonProps) {
  const { address, chainId: connectedChainId } = useAccount();
  const publicClient = usePublicClient();
  
  const [selectedChain, setSelectedChain] = useState<number>(CHAIN_IDS.BASE);
  const [entryFee, setEntryFee] = useState<string>("5");
  const [customEntryFee, setCustomEntryFee] = useState<string>("");
  const [useCustomFee, setUseCustomFee] = useState<boolean>(false);
  const [maxPlayers, setMaxPlayers] = useState<number>(4);
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [txHash, setTxHash] = useState<`0x${string}` | undefined>();
  const [showRoomCode, setShowRoomCode] = useState(false);
  const [roomCode, setRoomCode] = useState<string>("");
  const [createdMatchId, setCreatedMatchId] = useState<number | null>(null);

  const arenaAddress = ARENA_ADDRESSES[selectedChain];

  const { writeContractAsync, isPending } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash: txHash,
  });

  async function handleCreate() {
    if (!address || !publicClient) return;
    
    setError(null);
    
    // Validate entry fee
    const feeToUse = useCustomFee ? customEntryFee : entryFee;
    const feeNum = parseFloat(feeToUse);
    
    if (!feeToUse || isNaN(feeNum) || feeNum <= 0) {
      setError("Please enter a valid entry fee");
      return;
    }
    
    if (feeNum > 10000) {
      setError("Entry fee cannot exceed $10,000 USDC");
      return;
    }
    
    setIsCreating(true);
    
    try {
      const entryFeeWei = parseUSDC(feeToUse);
      
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
        const newRoomCode = generateRoomCode();
        setRoomCode(newRoomCode);
        setCreatedMatchId(matchId);
        setShowRoomCode(true);
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
        <label className="text-sm font-bold text-slate-700">Entry Fee (USDC)</label>
        <div className="grid grid-cols-4 gap-2">
          {ENTRY_FEE_OPTIONS.map((option) => (
            <button
              key={option.value}
              onClick={() => {
                setEntryFee(option.value);
                setUseCustomFee(false);
              }}
              disabled={isProcessing}
              className={`px-3 py-2 rounded-xl font-bold text-sm transition-all ${
                entryFee === option.value && !useCustomFee
                  ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/25'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200 disabled:opacity-50'
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
        {/* Custom Entry Fee */}
        <div className="space-y-1">
          <button
            onClick={() => setUseCustomFee(!useCustomFee)}
            disabled={isProcessing}
            className={`w-full px-3 py-2 rounded-xl font-bold text-sm transition-all ${
              useCustomFee
                ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/25'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200 disabled:opacity-50'
            }`}
          >
            {useCustomFee ? '✓ Custom Amount' : '💵 Custom Amount'}
          </button>
          {useCustomFee && (
            <div className="relative">
              <input
                type="number"
                min="0.01"
                max="10000"
                step="0.01"
                value={customEntryFee}
                onChange={(e) => {
                  const val = e.target.value;
                  if (val === '' || (!isNaN(parseFloat(val)) && parseFloat(val) >= 0)) {
                    setCustomEntryFee(val);
                  }
                }}
                placeholder="Enter custom amount"
                disabled={isProcessing}
                className="w-full bg-white border-2 border-blue-300 rounded-xl px-4 py-3 font-bold text-slate-800 placeholder:text-slate-400 focus:ring-2 focus:ring-blue-400 focus:border-blue-500 outline-none disabled:opacity-50"
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 font-bold">USDC</span>
            </div>
          )}
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
          <span className="font-bold text-slate-700">
            ${useCustomFee ? (customEntryFee || "0") : entryFee} USDC
          </span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-slate-500">Max Prize Pool</span>
          <span className="font-bold text-emerald-600">
            ${(useCustomFee ? (parseFloat(customEntryFee) || 0) : Number(entryFee)) * maxPlayers} USDC
          </span>
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

      {isSuccess && !showRoomCode && (
        <p className="text-xs text-emerald-500 text-center bg-emerald-50 px-3 py-2 rounded-xl">
          ✓ Match created! Redirecting to lobby...
        </p>
      )}

      {/* Room Code Modal */}
      <AnimatePresence>
        {showRoomCode && roomCode && createdMatchId && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
            onClick={() => {
              setShowRoomCode(false);
              onMatchCreated?.(createdMatchId, selectedChain);
            }}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl border border-slate-200"
            >
              <div className="text-center space-y-6">
                <div className="text-6xl">🎮</div>
                <div>
                  <h2 className="text-2xl font-black text-slate-800 mb-2">
                    Match Created!
                  </h2>
                  <p className="text-slate-500 text-sm">
                    Share this room code with other players
                  </p>
                </div>

                {/* Room Code Display */}
                <div className="bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 rounded-2xl p-6 shadow-lg">
                  <p className="text-slate-200 text-xs font-bold mb-2 uppercase tracking-wider">
                    Room Code
                  </p>
                  <p className="text-5xl font-black text-white tracking-widest mb-2 font-mono">
                    {formatRoomCode(roomCode)}
                  </p>
                  <p className="text-slate-200 text-xs">
                    Match #{createdMatchId} • {getChainName(selectedChain)}
                  </p>
                </div>

                {/* Copy Button */}
                <button
                  onClick={async () => {
                    try {
                      await navigator.clipboard.writeText(roomCode);
                      // Show temporary success message
                      const btn = document.getElementById('copy-btn');
                      if (btn) {
                        btn.textContent = '✓ Copied!';
                        setTimeout(() => {
                          if (btn) btn.textContent = '📋 Copy Code';
                        }, 2000);
                      }
                    } catch (err) {
                      console.error('Failed to copy:', err);
                    }
                  }}
                  id="copy-btn"
                  className="w-full px-6 py-3 bg-slate-100 hover:bg-slate-200 rounded-xl font-bold text-slate-700 transition-all"
                >
                  📋 Copy Code
                </button>

                {/* Actions */}
                <div className="flex gap-3">
                  <button
                    onClick={() => {
                      setShowRoomCode(false);
                      onMatchCreated?.(createdMatchId, selectedChain, roomCode);
                    }}
                    className="flex-1 px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-xl font-bold shadow-lg hover:shadow-xl transition-all"
                  >
                    Go to Lobby
                  </button>
                  <button
                    onClick={() => setShowRoomCode(false)}
                    className="px-6 py-3 bg-slate-100 hover:bg-slate-200 rounded-xl font-bold text-slate-700 transition-all"
                  >
                    Close
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

