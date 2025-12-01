"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAccount } from "wagmi";
import { Button } from "@/components/ui/Button";
import { motion, AnimatePresence } from "framer-motion";
import { DoodleBackground } from "@/components/ui/DoodleBackground";
import { CreateMatchButton } from "@/components/web3/CreateMatchButton";
import { ARENA_ADDRESSES, getChainName } from "@/lib/contracts";

type Tab = "join" | "create";

export default function OnlineMenu() {
  const [roomId, setRoomId] = useState("");
  const [activeTab, setActiveTab] = useState<Tab>("join");
  const router = useRouter();
  const { isConnected, address } = useAccount();

  const handleJoin = () => {
    if (roomId.trim()) {
      router.push(`/online/lobby/${roomId}`);
    }
  };

  const handleMatchCreated = (matchId: number, chainId: number, roomCode?: string) => {
    // Navigate to lobby with match details
    const arenaAddress = ARENA_ADDRESSES[chainId];
    const lobbyId = roomCode || matchId.toString();
    router.push(
      `/online/lobby/${lobbyId}?host=true&chainId=${chainId}&arena=${arenaAddress}&matchId=${matchId}`
    );
  };

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-8 relative overflow-hidden">
      <DoodleBackground />
      <div className="w-full max-w-md space-y-6 relative z-10">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-4xl font-black text-slate-800 mb-2">
            Online Arena
          </h1>
          <p className="text-slate-500">Play for USDC prizes</p>
        </div>

        {/* Wallet Connection */}
        <div className="bg-white/90 backdrop-blur-sm p-4 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-bold text-slate-600">Wallet</span>
            {isConnected ? (
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-xs font-mono text-slate-600">
                  {address?.slice(0, 6)}...{address?.slice(-4)}
                </span>
              </div>
            ) : (
              <span className="text-xs text-slate-400">Not connected</span>
            )}
          </div>
          <appkit-button />
        </div>

        {/* Main Card */}
        <div className="bg-white/90 backdrop-blur-sm rounded-3xl shadow-xl border border-slate-200 overflow-hidden">
          {/* Tabs */}
          <div className="flex border-b border-slate-200">
            <button
              onClick={() => setActiveTab("join")}
              className={`flex-1 px-6 py-4 font-bold text-sm transition-all ${activeTab === "join"
                  ? "bg-white text-blue-600 border-b-2 border-blue-500"
                  : "bg-slate-50 text-slate-500 hover:bg-slate-100"
                }`}
            >
              Join Match
            </button>
            <button
              onClick={() => setActiveTab("create")}
              className={`flex-1 px-6 py-4 font-bold text-sm transition-all ${activeTab === "create"
                  ? "bg-white text-purple-600 border-b-2 border-purple-500"
                  : "bg-slate-50 text-slate-500 hover:bg-slate-100"
                }`}
            >
              Create Match
            </button>
          </div>

          {/* Tab Content */}
          <div className="p-6">
            <AnimatePresence mode="wait">
              {activeTab === "join" ? (
                <motion.div
                  key="join"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  className="space-y-4"
                >
                  <p className="text-sm text-slate-500 text-center mb-4">
                    Enter a room code to join an existing match
                  </p>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Enter Room ID"
                      value={roomId}
                      onChange={(e) => setRoomId(e.target.value.toUpperCase())}
                      className="flex-1 bg-slate-100 border-none rounded-xl px-4 py-3 font-bold text-slate-800 placeholder:text-slate-400 focus:ring-2 focus:ring-blue-400 outline-none uppercase"
                      maxLength={10}
                    />
                    <Button
                      variant="primary"
                      onClick={handleJoin}
                      disabled={!roomId}
                    >
                      Join
                    </Button>
                  </div>

                  {!isConnected && (
                    <p className="text-xs text-amber-600 bg-amber-50 px-3 py-2 rounded-lg text-center">
                      Connect your wallet to deposit USDC and join matches
                    </p>
                  )}
                </motion.div>
              ) : (
                <motion.div
                  key="create"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                >
                  {isConnected ? (
                    <CreateMatchButton onMatchCreated={handleMatchCreated} />
                  ) : (
                    <div className="text-center py-8 space-y-4">
                      <div className="text-5xl">🔐</div>
                      <p className="text-slate-600">
                        Connect your wallet to create a match
                      </p>
                      <div className="pt-2">
                        <appkit-button />
                      </div>
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Quick Links */}
        <div className="flex gap-3 justify-center">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => router.push("/profile/prizes")}
            className="bg-white/80 text-emerald-600 hover:bg-white shadow-none"
          >
            🏆 My Prizes
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => router.push("/")}
            className="bg-white/80 text-slate-600 hover:bg-white shadow-none"
          >
            Back
          </Button>
        </div>

        {/* Info */}
        <div className="text-center text-xs text-slate-400 space-y-1">
          <p>Powered by Base & Arbitrum</p>
          <p>Entry fees in USDC • Winner takes all</p>
        </div>
      </div>
    </main>
  );
}
