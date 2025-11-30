"use client";

import { useEffect, useState, Suspense } from "react";
import { useParams, useSearchParams, useRouter } from "next/navigation";
import Image from "next/image";
import { useAccount, useReadContract } from "wagmi";
import { Button } from "@/components/ui/Button";
import { DoodleBackground } from "@/components/ui/DoodleBackground";
import { LobbyJoinButton } from "@/components/web3/LobbyJoinButton";
import { motion } from "framer-motion";
import ChainOrbArenaAbi from "@/abi/ChainOrbArena.json";
import { ARENA_ADDRESSES, CHAIN_IDS, getChainName, formatUSDC } from "@/lib/contracts";

interface Player {
  id: string;
  name: string;
  avatar: string;
  address: string;
  isHost: boolean;
  farcasterHandle?: string;
}

function LobbyContent() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const { address, isConnected } = useAccount();

  const matchId = parseInt(params.id as string);
  const isHost = searchParams.get("host") === "true";
  const chainIdParam = searchParams.get("chainId");
  const arenaParam = searchParams.get("arena");

  // Default to Base if not specified
  const chainId = chainIdParam ? parseInt(chainIdParam) : CHAIN_IDS.BASE;
  const arenaAddress = (arenaParam as `0x${string}`) || ARENA_ADDRESSES[chainId];

  const [players, setPlayers] = useState<Player[]>([]);
  const [hasJoined, setHasJoined] = useState(false);

  // Read match info from contract
  const { data: matchInfo, refetch: refetchMatch } = useReadContract({
    address: arenaAddress,
    abi: ChainOrbArenaAbi,
    functionName: "matches",
    args: [BigInt(matchId)],
    chainId,
  });

  // Read players from contract
  const { data: contractPlayers, refetch: refetchPlayers } = useReadContract({
    address: arenaAddress,
    abi: ChainOrbArenaAbi,
    functionName: "getPlayers",
    args: [BigInt(matchId)],
    chainId,
  });

  // Check if current user has joined
  const { data: isPlayerInMatch } = useReadContract({
    address: arenaAddress,
    abi: ChainOrbArenaAbi,
    functionName: "isPlayerInMatch",
    args: [BigInt(matchId), address],
    chainId,
    query: {
      enabled: !!address,
    },
  });

  // Parse match info
  const match = matchInfo
    ? {
        host: (matchInfo as any)[0] as string,
        entryFee: (matchInfo as any)[1] as bigint,
        maxPlayers: Number((matchInfo as any)[2]),
        prizePool: (matchInfo as any)[3] as bigint,
        status: Number((matchInfo as any)[4]),
        winner: (matchInfo as any)[5] as string,
      }
    : null;

  // Update players list from contract data
  useEffect(() => {
    if (contractPlayers && Array.isArray(contractPlayers)) {
      const playerList: Player[] = (contractPlayers as string[]).map((addr, i) => ({
        id: addr,
        name: `Player ${i + 1}`,
        avatar: `https://ui-avatars.com/api/?name=${addr.slice(0, 4)}&background=random`,
        address: addr,
        isHost: match?.host?.toLowerCase() === addr.toLowerCase(),
        farcasterHandle: `${addr.slice(0, 6)}...${addr.slice(-4)}`,
      }));
      setPlayers(playerList);
    }
  }, [contractPlayers, match?.host]);

  // Check if user has joined
  useEffect(() => {
    if (isPlayerInMatch !== undefined) {
      setHasJoined(isPlayerInMatch as boolean);
    }
  }, [isPlayerInMatch]);

  // Poll for updates
  useEffect(() => {
    const interval = setInterval(() => {
      refetchMatch();
      refetchPlayers();
    }, 5000);
    return () => clearInterval(interval);
  }, [refetchMatch, refetchPlayers]);

  const handleStartGame = async () => {
    // TODO: Call startMatch on contract and SpacetimeDB
    router.push(`/online/game/${matchId}?host=${isHost}&chainId=${chainId}&arena=${arenaAddress}`);
  };

  const handleJoinSuccess = () => {
    setHasJoined(true);
    refetchPlayers();
    refetchMatch();
  };

  const maxPlayers = match?.maxPlayers || 4;
  const entryFee = match?.entryFee ? formatUSDC(match.entryFee) : "...";
  const prizePool = match?.prizePool ? formatUSDC(match.prizePool) : "0";
  const statusText = match?.status === 0 ? "Waiting" : match?.status === 1 ? "Live" : "Finished";

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-8 relative overflow-hidden">
      <DoodleBackground />

      <div className="w-full max-w-2xl relative z-10 space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-4xl font-black text-slate-800">Match Lobby</h1>
          <div className="flex items-center justify-center gap-3">
            <span
              className={`px-3 py-1 rounded-full text-xs font-bold ${
                chainId === CHAIN_IDS.BASE
                  ? "bg-blue-100 text-blue-700"
                  : "bg-orange-100 text-orange-700"
              }`}
            >
              {getChainName(chainId)}
            </span>
            <span className="bg-slate-100 px-3 py-1 rounded-full text-xs font-bold text-slate-600">
              Match #{matchId}
            </span>
            <span
              className={`px-3 py-1 rounded-full text-xs font-bold ${
                statusText === "Waiting"
                  ? "bg-amber-100 text-amber-700"
                  : statusText === "Live"
                  ? "bg-emerald-100 text-emerald-700"
                  : "bg-slate-100 text-slate-600"
              }`}
            >
              {statusText}
            </span>
          </div>
        </div>

        {/* Prize Info */}
        <div className="bg-gradient-to-r from-emerald-500 to-teal-500 rounded-2xl p-4 shadow-lg shadow-emerald-500/20">
          <div className="flex items-center justify-between text-white">
            <div>
              <p className="text-emerald-100 text-xs font-medium">Entry Fee</p>
              <p className="text-2xl font-black">${entryFee} USDC</p>
            </div>
            <div className="text-right">
              <p className="text-emerald-100 text-xs font-medium">Prize Pool</p>
              <p className="text-2xl font-black">${prizePool} USDC</p>
            </div>
          </div>
        </div>

        {/* Players Card */}
        <div className="bg-white/90 backdrop-blur-sm p-6 rounded-3xl shadow-xl border border-slate-200">
          <h2 className="text-xl font-bold text-slate-700 mb-6 flex items-center gap-2">
            <span>Players</span>
            <span className="bg-blue-100 text-blue-600 px-2 py-1 rounded-lg text-xs">
              {players.length}/{maxPlayers}
            </span>
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {players.map((player, index) => (
              <motion.div
                key={player.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className={`flex items-center gap-4 p-4 rounded-2xl border ${
                  player.address.toLowerCase() === address?.toLowerCase()
                    ? "bg-blue-50 border-blue-200"
                    : "bg-slate-50 border-slate-100"
                }`}
              >
                <Image
                  src={player.avatar}
                  alt={player.name}
                  width={48}
                  height={48}
                  className="w-12 h-12 rounded-full border-2 border-white shadow-sm object-cover"
                  unoptimized
                />
                <div className="flex-1 min-w-0">
                  <div className="font-bold text-slate-800 flex items-center gap-2">
                    <span className="truncate">{player.name}</span>
                    {player.isHost && (
                      <span className="bg-yellow-100 text-yellow-700 text-[10px] px-2 py-0.5 rounded-full uppercase tracking-wider font-bold flex-shrink-0">
                        HOST
                      </span>
                    )}
                    {player.address.toLowerCase() === address?.toLowerCase() && (
                      <span className="bg-blue-100 text-blue-700 text-[10px] px-2 py-0.5 rounded-full uppercase tracking-wider font-bold flex-shrink-0">
                        YOU
                      </span>
                    )}
                  </div>
                  <div className="text-sm text-slate-400 font-mono truncate">
                    {player.farcasterHandle}
                  </div>
                </div>
              </motion.div>
            ))}

            {/* Empty Slots */}
            {Array.from({ length: Math.max(0, maxPlayers - players.length) }).map(
              (_, i) => (
                <div
                  key={`empty-${i}`}
                  className="flex items-center gap-4 p-4 border-2 border-dashed border-slate-200 rounded-2xl opacity-50"
                >
                  <div className="w-12 h-12 rounded-full bg-slate-100 animate-pulse" />
                  <div className="space-y-2">
                    <div className="w-24 h-4 bg-slate-100 rounded animate-pulse" />
                    <div className="w-16 h-3 bg-slate-100 rounded animate-pulse" />
                  </div>
                </div>
              )
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-4 items-center">
          {!isConnected ? (
            <div className="bg-white/90 backdrop-blur-sm rounded-2xl p-6 border border-slate-200 w-full max-w-sm text-center space-y-4">
              <p className="text-slate-600 text-sm">
                Connect your wallet to join this match
              </p>
              <appkit-button />
            </div>
          ) : hasJoined || isHost ? (
            isHost && players.length >= 2 ? (
              <Button
                variant="primary"
                size="lg"
                className="w-full max-w-xs shadow-lg shadow-blue-500/20"
                onClick={handleStartGame}
              >
                Start Game
              </Button>
            ) : (
              <div className="text-center p-4 bg-white/50 backdrop-blur-md rounded-2xl border border-white/50">
                <div className="flex items-center justify-center gap-3 text-slate-600 font-bold">
                  <div
                    className="w-2 h-2 bg-blue-500 rounded-full animate-bounce"
                    style={{ animationDelay: "0s" }}
                  />
                  <div
                    className="w-2 h-2 bg-blue-500 rounded-full animate-bounce"
                    style={{ animationDelay: "0.2s" }}
                  />
                  <div
                    className="w-2 h-2 bg-blue-500 rounded-full animate-bounce"
                    style={{ animationDelay: "0.4s" }}
                  />
                  <span>
                    {isHost
                      ? `Waiting for players (${players.length}/${maxPlayers})...`
                      : "Waiting for host to start..."}
                  </span>
                </div>
              </div>
            )
          ) : (
            <div className="bg-white/90 backdrop-blur-sm rounded-2xl p-6 border border-slate-200 w-full max-w-sm">
              <LobbyJoinButton
                chainId={chainId}
                arenaAddress={arenaAddress}
                matchId={matchId}
                entryFee={entryFee}
                onSuccess={handleJoinSuccess}
              />
            </div>
          )}

          <Button
            variant="secondary"
            size="sm"
            onClick={() => router.push("/online")}
            className="bg-white/80 text-slate-600 hover:bg-white shadow-none"
          >
            Leave Room
          </Button>
        </div>
      </div>
    </main>
  );
}

export default function LobbyPage() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-screen flex-col items-center justify-center">
          <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
        </main>
      }
    >
      <LobbyContent />
    </Suspense>
  );
}
