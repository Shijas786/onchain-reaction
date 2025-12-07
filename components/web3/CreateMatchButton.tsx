"use client";

import { useState, useEffect } from "react";
import { useWriteContract, useWaitForTransactionReceipt, useAccount, usePublicClient, useReadContract, useSwitchChain } from "wagmi";
import { onchainReactionAbi } from "@/lib/onchainReaction";
import ERC20Abi from "@/abi/ERC20.json";
import { ARENA_ADDRESSES, parseUSDC, ENTRY_FEE_OPTIONS, MAX_PLAYERS_OPTIONS, getChainName, CHAIN_IDS, USDC_ADDRESSES, TOKENS, parseTokenAmount, formatTokenAmount } from "@/lib/contracts";
import { decodeEventLog } from "viem";
import { generateRoomCode, formatRoomCode } from "@/lib/roomCode";
import { motion, AnimatePresence } from "framer-motion";
import { useSpacetimeConnection } from "@/hooks/useSpacetimeDB";
import { getDbConnection } from "@/lib/spacetimedb/client";
import { useFarcaster } from "@/context/FarcasterProvider";

interface CreateMatchButtonProps {
  onMatchCreated?: (matchId: number, chainId: number, roomCode?: string) => void;
}

export function CreateMatchButton({ onMatchCreated }: CreateMatchButtonProps) {
  const { address, chainId: connectedChainId } = useAccount();
  const publicClient = usePublicClient();
  const { isConnected: isSpacetimeConnected } = useSpacetimeConnection();
  const { user: farcasterUser, isInMiniApp } = useFarcaster();

  const [selectedChain, setSelectedChain] = useState<number>(CHAIN_IDS.BASE);
  const [selectedToken, setSelectedToken] = useState<keyof typeof TOKENS>('USDC');
  const [entryFee, setEntryFee] = useState<string>("0.01");
  const [customEntryFee, setCustomEntryFee] = useState<string>("");
  const [useCustomFee, setUseCustomFee] = useState<boolean>(false);
  const [maxPlayers, setMaxPlayers] = useState<number>(4);
  const [step, setStep] = useState<'check' | 'approve' | 'create'>('check');
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [txHash, setTxHash] = useState<`0x${string}` | undefined>();
  const [showRoomCode, setShowRoomCode] = useState(false);
  const [roomCode, setRoomCode] = useState<string>("");
  const [createdMatchId, setCreatedMatchId] = useState<number | null>(null);

  const arenaAddress = ARENA_ADDRESSES[selectedChain];
  const tokenConfig = TOKENS[selectedToken];
  const tokenAddress = tokenConfig.addresses[selectedChain as keyof typeof tokenConfig.addresses];
  const feeToUse = useCustomFee ? customEntryFee : entryFee;

  // Helper function to safely parse entry fee
  const getEntryFeeWei = (): bigint => {
    if (!feeToUse) return BigInt(0);
    const num = parseFloat(feeToUse);
    if (isNaN(num) || !isFinite(num) || num <= 0) return BigInt(0);
    return parseTokenAmount(feeToUse, tokenConfig.decimals);
  };

  // Helper to safely convert to BigInt
  const safeBigInt = (value: unknown): bigint | null => {
    try {
      if (value === undefined || value === null) return null;
      const str = String(value);
      if (str === 'undefined' || str === 'null' || str === 'NaN') return null;
      return BigInt(str);
    } catch {
      return null;
    }
  };

  // Helper to safely compare BigInt values
  const safeCompare = (a: unknown, b: bigint, op: 'lt' | 'gte' | 'eq' = 'gte'): boolean => {
    const aBigInt = safeBigInt(a);
    if (aBigInt === null) return false;
    try {
      switch (op) {
        case 'lt': return aBigInt < b;
        case 'gte': return aBigInt >= b;
        case 'eq': return aBigInt === b;
        default: return false;
      }
    } catch {
      return false;
    }
  };

  const entryFeeWei = getEntryFeeWei();

  // Check current USDC allowance
  const { data: allowance, refetch: refetchAllowance } = useReadContract({
    address: tokenAddress,
    abi: ERC20Abi,
    functionName: "allowance",
    args: [address, arenaAddress],
    chainId: selectedChain,
    query: {
      enabled: !!address && !!feeToUse,
    },
  });

  // Check USDC balance
  const { data: balance } = useReadContract({
    address: tokenAddress,
    abi: ERC20Abi,
    functionName: "balanceOf",
    args: [address],
    chainId: selectedChain,
    query: {
      enabled: !!address,
    },
  });

  const { writeContractAsync, isPending } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash: txHash,
  });

  // Reset step when fee or chain changes
  useEffect(() => {
    setStep('check');
  }, [feeToUse, selectedChain]);

  // Determine step based on allowance
  useEffect(() => {
    if (feeToUse && entryFeeWei > BigInt(0) && allowance !== undefined) {
      const currentAllowance = safeBigInt(allowance);
      if (currentAllowance !== null && currentAllowance >= entryFeeWei) {
        if (step !== 'create') {
          setStep('create');
        }
      } else if (entryFeeWei > BigInt(0) && step !== 'approve') {
        setStep('approve');
      }
    }
  }, [allowance, entryFeeWei, step, feeToUse]);

  // Handle successful approval
  useEffect(() => {
    if (isSuccess && txHash && step === 'approve') {
      setIsCreating(false); // Reset creating state after approval succeeds

      const checkAllowance = async () => {
        // Wait a bit for the RPC to index the event
        await new Promise(resolve => setTimeout(resolve, 2000));

        // Refetch allowance multiple times to ensure we get the latest value
        let attempts = 0;
        const maxAttempts = 3;

        const checkAllowanceValue = async () => {
          attempts++;
          const { data: newAllowance } = await refetchAllowance();
          const currentAllowance = safeBigInt(newAllowance);

          if (currentAllowance !== null && currentAllowance >= entryFeeWei) {
            setTxHash(undefined);
            setStep('create');
            return true;
          }

          // If not sufficient and we have more attempts, retry
          if (attempts < maxAttempts) {
            await new Promise(resolve => setTimeout(resolve, 1500));
            return checkAllowanceValue();
          }

          return false;
        };

        await checkAllowanceValue();
      };

      checkAllowance();
    }
  }, [isSuccess, txHash, step, refetchAllowance, entryFeeWei]);

  const { switchChainAsync } = useSwitchChain();

  async function handleApprove() {
    if (!address || !feeToUse) return;

    setError(null);

    // Validate entry fee
    const feeNum = parseFloat(feeToUse);
    if (!feeToUse || isNaN(feeNum) || feeNum <= 0) {
      setError("Please enter a valid entry fee");
      return;
    }

    // Switch chain if needed
    if (connectedChainId !== selectedChain) {
      try {
        await switchChainAsync({ chainId: selectedChain });
      } catch (err) {
        console.error('Failed to switch chain:', err);
        setError("Please switch to the correct network to continue.");
        return;
      }
    }

    setIsCreating(true);

    try {
      // Base USDC requires resetting allowance to 0 before setting new approval if existing allowance doesn't match
      const currentAllowance = safeBigInt(allowance);
      const hasExistingAllowance = currentAllowance !== null && currentAllowance > BigInt(0);
      const allowanceMismatch = hasExistingAllowance && currentAllowance !== entryFeeWei;

      // For Base, reset existing allowance to 0 first if it doesn't match (required by Base USDC)
      if (selectedChain === CHAIN_IDS.BASE && allowanceMismatch) {
        try {
          const resetHash = await writeContractAsync({
            address: tokenAddress,
            abi: ERC20Abi,
            functionName: "approve",
            args: [arenaAddress, BigInt(0)],
            chainId: selectedChain,
          });
          // Wait for reset to confirm
          if (publicClient) {
            await publicClient.waitForTransactionReceipt({ hash: resetHash });
          }
        } catch (resetErr) {
          console.warn('[CreateMatchButton] Allowance reset failed or not needed:', resetErr);
        }
      }

      // Approve only the exact amount needed
      const hash = await writeContractAsync({
        address: tokenAddress,
        abi: ERC20Abi,
        functionName: "approve",
        args: [arenaAddress, entryFeeWei],
        chainId: selectedChain,
      });
      setTxHash(hash);
      // Don't set setIsCreating(false) here - wait for transaction confirmation
    } catch (e: any) {
      console.error('[CreateMatchButton] Approval error:', e);
      const errorMessage = e?.shortMessage || e?.message || "";
      const isUserRejection =
        errorMessage.toLowerCase().includes("user rejected") ||
        errorMessage.toLowerCase().includes("user rejected the request") ||
        e?.name === "UserRejectedRequestError";

      const isSimulationError =
        errorMessage.toLowerCase().includes("simulation failed") ||
        errorMessage.toLowerCase().includes("execution reverted") ||
        errorMessage.includes("#1002");

      if (isUserRejection) {
        setError("Transaction was cancelled. Please try again when ready.");
      } else if (isSimulationError && selectedChain === CHAIN_IDS.BASE) {
        setError(`Base transaction failed. Please check your ${selectedToken} balance and try resetting allowance to 0 if needed.`);
      } else if (isSimulationError) {
        setError(`Approval failed. Please check your ${selectedToken} balance and try again.`);
      } else {
        setError(e?.shortMessage || e?.message || "Approval failed. Please try again.");
      }
      setIsCreating(false);
    }
  }

  async function handleCreate() {
    if (!address || !publicClient) return;

    // Clear any previous errors
    setError(null);

    // Validate entry fee
    const feeNum = parseFloat(feeToUse);

    if (!feeToUse || isNaN(feeNum) || feeNum <= 0) {
      setError("Please enter a valid entry fee");
      return;
    }

    // Switch chain if needed
    if (connectedChainId !== selectedChain) {
      try {
        await switchChainAsync({ chainId: selectedChain });
      } catch (err) {
        console.error('Failed to switch chain:', err);
        setError("Please switch to the correct network to continue.");
        return;
      }
    }

    if (feeNum > 10000) {
      setError(`Entry fee cannot exceed 10,000 ${selectedToken}`);
      return;
    }

    // Validate max players (contract requires 2-8, but UI limits to 5)
    if (maxPlayers < 2 || maxPlayers > 5) {
      setError("Max players must be between 2 and 5");
      return;
    }

    // Validate entryFeeWei is valid and not zero
    if (entryFeeWei === BigInt(0) || isNaN(Number(entryFeeWei))) {
      setError("Invalid entry fee. Please enter a valid amount.");
      return;
    }

    // Double-check allowance before creating
    if (allowance !== undefined) {
      try {
        const currentAllowance = BigInt(allowance as string);
        if (currentAllowance < entryFeeWei) {
          setError(`Insufficient ${selectedToken} allowance. Please approve first.`);
          setStep('approve');
          return;
        }
      } catch (err) {
        console.error('Error checking allowance:', err);
        setError("Error checking allowance. Please try again.");
        return;
      }
    }

    // Check balance
    if (balance === undefined) {
      setError("Verifying balance... Please try again in a moment.");
      return;
    }

    try {
      const currentBalance = BigInt(balance as string);
      if (currentBalance < entryFeeWei) {
        // We can't use formatUSDC here easily without importing it, so just use generic message
        // or import formatUSDC if available. It is available in imports!
        // But wait, imports are at top of file.
        // Let's assume formatUSDC is imported or we just show the values.
        setError(`Insufficient ${selectedToken} balance. Need ${feeToUse} ${selectedToken}.`);
        return;
      }
    } catch (err) {
      setError("Error checking balance. Please try again.");
      return;
    }

    setIsCreating(true);

    try {
      const hash = await writeContractAsync({
        address: arenaAddress,
        abi: onchainReactionAbi,
        functionName: "createMatch",
        args: [tokenAddress, entryFeeWei, BigInt(maxPlayers)],
        chainId: selectedChain,
      });

      setTxHash(hash);

      // Wait for receipt to get matchId from event
      const receipt = await publicClient.waitForTransactionReceipt({ hash });

      // Find MatchCreated event
      const matchCreatedLog = receipt.logs.find(log => {
        try {
          const decoded = decodeEventLog({
            abi: onchainReactionAbi,
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
          abi: onchainReactionAbi,
          data: matchCreatedLog.data,
          topics: matchCreatedLog.topics,
        });
        const matchId = Number((decoded.args as any).matchId);
        const newRoomCode = generateRoomCode();
        setRoomCode(newRoomCode);
        setCreatedMatchId(matchId);

        // Create SpacetimeDB lobby
        if (isSpacetimeConnected && address) {
          try {
            const conn = getDbConnection();
            if (conn) {
              const arenaAddress = ARENA_ADDRESSES[selectedChain];
              const entryFeeWei = parseTokenAmount(useCustomFee ? customEntryFee : entryFee, tokenConfig.decimals);

              // Prepare host name with Farcaster data if available
              let hostName: string;
              if (isInMiniApp && farcasterUser) {
                // Encode Farcaster data in JSON format (same as joiners)
                hostName = JSON.stringify({
                  displayName: farcasterUser.displayName || farcasterUser.username || `Player ${address.slice(0, 6)}`,
                  username: farcasterUser.username,
                  pfpUrl: farcasterUser.pfpUrl,
                  fid: farcasterUser.fid
                });
              } else {
                // Fallback to address-based name
                hostName = address.slice(0, 6) + "..." + address.slice(-4);
              }

              conn.reducers.createLobby({
                chainId: selectedChain,
                matchId: BigInt(matchId),
                arenaAddress,
                hostAddress: address,
                entryFee: entryFeeWei.toString(),
                maxPlayers,
                hostName,
                lobbyId: newRoomCode,
              });

            }
          } catch (err) {
            console.error('[CreateMatchButton] Failed to create SpacetimeDB lobby:', err);
            // Continue anyway - match is created on-chain
          }
        }

        setShowRoomCode(true);
      }

    } catch (e: any) {
      console.error(e);

      // Check if user rejected the transaction
      const errorMessage = e?.shortMessage || e?.message || "";
      const isUserRejection =
        errorMessage.toLowerCase().includes("user rejected") ||
        errorMessage.toLowerCase().includes("user rejected the request") ||
        e?.name === "UserRejectedRequestError";

      const isAllowanceError =
        errorMessage.toLowerCase().includes("transfer amount exceeds allowance") ||
        errorMessage.toLowerCase().includes("allowance") ||
        errorMessage.toLowerCase().includes("insufficient allowance");

      const isTokenError =
        errorMessage.toLowerCase().includes("token not allowed") ||
        errorMessage.toLowerCase().includes("not allowed");

      const isValidationError =
        errorMessage.toLowerCase().includes("entry must") ||
        errorMessage.toLowerCase().includes("players 2-8") ||
        errorMessage.toLowerCase().includes("execution reverted");

      if (isUserRejection) {
        setError("Transaction was cancelled. Please try again when ready.");
      } else if (isAllowanceError) {
        setError(`${selectedToken} approval required. Please approve ${selectedToken} first.`);
        setStep('approve');
      } else if (isTokenError) {
        setError(`This token is not supported. Please use ${selectedToken}.`);
      } else if (isValidationError) {
        setError("Invalid match parameters. Please check entry fee (must be > 0) and max players (2-5).");
      } else {
        // Show more detailed error for debugging
        const detailedError = errorMessage || e?.message || "Failed to create match";
        setError(`${detailedError}. Please check your balance and try again.`);
      }
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
              className={`flex-1 px-4 py-3 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 ${selectedChain === chainId
                ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/25'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
            >
              {chainId === CHAIN_IDS.BASE && (
                <img
                  src="/assets/base.jpg"
                  alt="Base"
                  className="w-5 h-5 rounded-full"
                />
              )}
              {chainId === CHAIN_IDS.ARBITRUM && (
                <img
                  src="/assets/arbitrum.jpg"
                  alt="Arbitrum"
                  className="w-5 h-5 rounded-full"
                />
              )}
              {getChainName(chainId)}
            </button>
          ))}
        </div>
      </div>

      {/* Token Selection */}
      <div className="space-y-2">
        <label className="text-sm font-bold text-slate-700">Token</label>
        <div className="flex gap-2">
          {(Object.keys(TOKENS) as Array<keyof typeof TOKENS>)
            .filter(token => TOKENS[token].addresses[selectedChain as keyof typeof TOKENS[typeof token]['addresses']])
            .map((token) => (
              <button
                key={token}
                onClick={() => setSelectedToken(token)}
                className={`flex-1 px-4 py-3 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 ${selectedToken === token
                  ? 'bg-purple-500 text-white shadow-lg shadow-purple-500/25'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
              >
                {token === 'USDC' && (
                  <img
                    src="/assets/usdc.png"
                    alt="USDC"
                    className="w-5 h-5 rounded-full"
                  />
                )}
                {token === 'JESSE' && (
                  <img
                    src="/assets/jesse.jpg"
                    alt="JESSE"
                    className="w-5 h-5 rounded-full"
                  />
                )}
                ${token}
              </button>
            ))}
        </div>
      </div>

      {/* Entry Fee */}
      <div className="space-y-2">
        <label className="text-sm font-bold text-slate-700">Entry Fee ({selectedToken})</label>
        <div className="grid grid-cols-4 gap-2">
          {ENTRY_FEE_OPTIONS.map((option) => (
            <button
              key={option.value}
              onClick={() => {
                setEntryFee(option.value);
                setUseCustomFee(false);
              }}
              disabled={isProcessing}
              className={`px-3 py-2 rounded-xl font-bold text-sm transition-all ${entryFee === option.value && !useCustomFee
                ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/25'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200 disabled:opacity-50'
                }`}
            >
              ${option.label} {selectedToken}
            </button>
          ))}
        </div>
        {/* Custom Entry Fee */}
        <div className="space-y-1">
          <button
            onClick={() => setUseCustomFee(!useCustomFee)}
            disabled={isProcessing}
            className={`w-full px-3 py-2 rounded-xl font-bold text-sm transition-all ${useCustomFee
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
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 font-bold">{selectedToken}</span>
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
              className={`w-10 h-10 rounded-xl font-bold text-sm transition-all ${maxPlayers === num
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
            {useCustomFee ? (customEntryFee || "0") : entryFee} {selectedToken}
          </span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-slate-500">Max Prize Pool</span>
          <span className="font-bold text-emerald-600">
            {(useCustomFee ? (parseFloat(customEntryFee) || 0) : Number(entryFee)) * maxPlayers} {selectedToken}
          </span>
        </div>
      </div>

      {/* Check balance */}
      {balance !== undefined && entryFeeWei > BigInt(0) && safeCompare(balance, entryFeeWei, 'lt') && (
        <div className="flex flex-col gap-2">
          <button
            disabled
            className="w-full px-6 py-4 rounded-2xl bg-red-100 text-red-600 text-sm font-bold cursor-not-allowed"
          >
            Insufficient {selectedToken} Balance
          </button>
          <p className="text-xs text-slate-500 text-center">
            Need {feeToUse} {selectedToken} to create match
          </p>
        </div>
      )}

      {/* Step indicator */}
      {balance !== undefined && entryFeeWei > BigInt(0) && safeCompare(balance, entryFeeWei, 'gte') && step !== 'check' && (
        <div className="flex items-center justify-center gap-2 text-xs text-slate-500">
          <span className={step === 'approve' ? 'text-blue-600 font-bold' : ''}>
            1. Approve {selectedToken}
          </span>
          <span>→</span>
          <span className={step === 'create' ? 'text-blue-600 font-bold' : ''}>
            2. Create Match
          </span>
        </div>
      )}

      {/* Approval Button */}
      {step === 'approve' && balance !== undefined && entryFeeWei > BigInt(0) && safeCompare(balance, entryFeeWei, 'gte') && (
        <button
          onClick={handleApprove}
          disabled={isProcessing}
          className="w-full px-6 py-4 rounded-2xl bg-gradient-to-r from-blue-500 to-blue-600 text-white font-bold shadow-lg shadow-blue-500/25 disabled:opacity-60 transition-all hover:shadow-blue-500/40"
        >
          {isPending && "Confirm in wallet..."}
          {isConfirming && `Approving ${selectedToken}...`}
          {!isPending && !isConfirming && `Approve ${feeToUse} ${selectedToken}`}
        </button>
      )}

      {/* Create Button - Show when step is 'create' and balance is sufficient */}
      {step === 'create' && balance !== undefined && entryFeeWei > BigInt(0) && safeCompare(balance, entryFeeWei, 'gte') && (
        <button
          onClick={handleCreate}
          disabled={isProcessing || (allowance !== undefined && !safeCompare(allowance, entryFeeWei, 'gte'))}
          className="w-full px-6 py-4 rounded-2xl bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 text-white font-bold shadow-lg disabled:opacity-60 transition-all hover:shadow-xl"
        >
          {isPending && "Confirm in wallet..."}
          {isConfirming && "Creating match..."}
          {!isPending && !isConfirming && (allowance !== undefined && !safeCompare(allowance, entryFeeWei, 'gte') ? `Waiting for approval...` : "Create Match")}
        </button>
      )}

      {/* Show message if allowance check is pending */}
      {step === 'create' && (allowance === undefined || !safeCompare(allowance, entryFeeWei, 'gte')) && balance !== undefined && entryFeeWei > BigInt(0) && safeCompare(balance, entryFeeWei, 'gte') && (
        <div className="text-center p-3 bg-amber-50 rounded-xl border border-amber-200">
          <p className="text-xs text-amber-700">
            {allowance === undefined ? `Checking ${selectedToken} approval...` : `Approval confirmed! You can create the match now.`}
          </p>
        </div>
      )}

      {/* Fallback create button if balance check not ready - but still check allowance */}
      {(!balance || step === 'check') && (
        <button
          onClick={handleCreate}
          disabled={isProcessing || (allowance !== undefined && !safeCompare(allowance, entryFeeWei, 'gte'))}
          className="w-full px-6 py-4 rounded-2xl bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 text-white font-bold shadow-lg disabled:opacity-60 transition-all hover:shadow-xl"
        >
          {isPending && "Confirm in wallet..."}
          {isConfirming && "Creating match..."}
          {!isPending && !isConfirming && "Create Match"}
        </button>
      )}

      {error && (
        <div className="text-xs text-red-500 text-center bg-red-50 px-3 py-2 rounded-xl flex items-center justify-between gap-2">
          <span className="flex-1">{error}</span>
          <button
            onClick={() => setError(null)}
            className="text-red-400 hover:text-red-600 font-bold"
            aria-label="Dismiss error"
          >
            ×
          </button>
        </div>
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

