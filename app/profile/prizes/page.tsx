"use client";

import { useState, useEffect } from "react";
import { useAccount } from "wagmi";
import { useRouter } from "next/navigation";
import { PrizeCard } from "@/components/web3/ClaimPrizeButton";
import { DoodleBackground } from "@/components/ui/DoodleBackground";
import { Button } from "@/components/ui/Button";
import { motion } from "framer-motion";

interface Prize {
  id: string;
  chainId: number;
  matchId: number;
  arenaAddress: string;
  prizePool: string;
  entryFee: string;
  maxPlayers: number;
  createdAt: string;
}

export default function PrizesPage() {
  const { address, isConnected } = useAccount();
  const router = useRouter();
  const [prizes, setPrizes] = useState<Prize[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchPrizes() {
      if (!address) {
        setIsLoading(false);
        return;
      }

      try {
        const res = await fetch(`/api/my-prizes?wallet=${address}`);
        const data = await res.json();

        if (data.error) {
          setError(data.error);
        } else {
          setPrizes(data.prizes || []);
        }
      } catch (e) {
        console.error("Failed to fetch prizes:", e);
        setError("Failed to load prizes");
      } finally {
        setIsLoading(false);
      }
    }

    fetchPrizes();
  }, [address]);

  const handlePrizeClaimed = (prizeId: string) => {
    setPrizes(prev => prev.filter(p => p.id !== prizeId));
  };

  return (
    <main className="flex min-h-screen flex-col items-center p-8 relative overflow-hidden">
      <DoodleBackground />

      <div className="w-full max-w-2xl relative z-10 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-black text-slate-800">Rewards History</h1>
            <p className="text-slate-500 text-sm">Claim your winnings from matches</p>
          </div>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => router.push("/")}
            className="bg-white/80 text-slate-600 hover:bg-white shadow-none"
          >
            Back
          </Button>
        </div>

        {/* Wallet Connection Status */}
        <div className="bg-white/90 backdrop-blur-sm rounded-2xl p-4 border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-sm text-slate-600">Wallet</span>
            {isConnected ? (
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-emerald-500" />
                <span className="text-sm font-mono font-bold text-slate-800">
                  {address?.slice(0, 6)}...{address?.slice(-4)}
                </span>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-slate-300" />
                <span className="text-sm text-slate-500">Not connected</span>
              </div>
            )}
          </div>
          {isConnected && (
            <div className="mt-3">
              <appkit-button />
            </div>
          )}
        </div>

        {/* Content */}
        <div className="bg-white/90 backdrop-blur-sm rounded-3xl p-6 border border-slate-200 shadow-xl min-h-[300px]">
          {!isConnected ? (
            <div className="flex flex-col items-center justify-center h-64 gap-4">
              <div className="text-6xl">🎮</div>
              <p className="text-slate-600 text-center">
                Connect your wallet to view<br />unclaimed prizes
              </p>
              <div className="mt-2">
                <appkit-button />
              </div>
            </div>
          ) : isLoading ? (
            <div className="flex flex-col items-center justify-center h-64 gap-4">
              <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
              <p className="text-slate-500 text-sm">Loading prizes...</p>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center h-64 gap-4">
              <div className="text-5xl">😕</div>
              <p className="text-red-500 text-sm">{error}</p>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => window.location.reload()}
              >
                Try Again
              </Button>
            </div>
          ) : prizes.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 gap-4">
              <div className="text-6xl">🏆</div>
              <p className="text-slate-600 text-center">
                No unclaimed prizes yet.<br />
                <span className="text-slate-400">Go win some matches!</span>
              </p>
              <Button
                variant="primary"
                size="sm"
                onClick={() => router.push("/online")}
                className="mt-2"
              >
                Play Online
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-bold text-slate-700">Unclaimed Prizes</h2>
                <span className="bg-emerald-100 text-emerald-700 px-3 py-1 rounded-full text-xs font-bold">
                  {prizes.length} available
                </span>
              </div>

              {prizes.map((prize, index) => (
                <motion.div
                  key={prize.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                >
                  <PrizeCard
                    prize={prize}
                    onClaimed={() => handlePrizeClaimed(prize.id)}
                  />
                </motion.div>
              ))}
            </div>
          )}
        </div>

        {/* Info Box */}
        <div className="bg-blue-50/80 backdrop-blur-sm rounded-2xl p-4 border border-blue-100">
          <div className="flex gap-3">
            <div className="text-2xl">💡</div>
            <div className="text-sm text-blue-800">
              <p className="font-bold">How Prize Claims Work</p>
              <p className="text-blue-600 mt-1">
                When you win a match, the prize pool is held in an escrow smart contract.
                Click &quot;Claim&quot; to transfer your winnings directly to your wallet.
              </p>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}

