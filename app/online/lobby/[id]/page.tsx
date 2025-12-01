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
import { ARENA_ADDRESSES, CHAIN_IDS, getChainName, formatUSDC, parseUSDC, formatTokenAmount, BASE_JESSE } from "@/lib/contracts";
import { formatRoomCode } from "@/lib/roomCode";
import { useLobby } from "@/hooks/useSpacetimeDB";
import { useSpacetimeConnection } from "@/hooks/useSpacetimeDB";
import { getDbConnection } from "@/lib/spacetimedb/client";

interface Player {
  id: string;
  name: string;
  avatar: string;
  address: string;
  isHost: boolean;
  farcasterHandle?: string;
  hasDeposited?: boolean;
}

function LobbyContent() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const { address, isConnected } = useAccount();
  const { isConnected: isSpacetimeConnected } = useSpacetimeConnection();

  const roomCode = params.id as string;
  const matchIdParam = searchParams.get("matchId");

  // Only try to parse matchId if it's explicitly provided or if roomCode looks numeric
  // Otherwise default to -1 to indicate invalid/loading state
  const urlMatchId = matchIdParam
    ? parseInt(matchIdParam)
    : /^\d+$/.test(roomCode) ? parseInt(roomCode) : -1;

  const isHost = searchParams.get("host") === "true";
  const chainIdParam = searchParams.get("chainId");
  const arenaParam = searchParams.get("arena");

  const [players, setPlayers] = useState<Player[]>([]);
  const [hasJoined, setHasJoined] = useState(false);
  const [isStarting, setIsStarting] = useState(false);

  // SpacetimeDB lobby hook
  const {
    lobby: spacetimeLobby,
    players: spacetimePlayers,
    isHost: isSpacetimeHost,
    startGame: startSpacetimeGame,
    gameState: spacetimeGameState,
  } = useLobby(roomCode);

  // Use values from SpacetimeDB lobby if available, otherwise from URL params
  const chainId = spacetimeLobby?.chainId || (chainIdParam ? parseInt(chainIdParam) : CHAIN_IDS.BASE);
  const arenaAddress = (spacetimeLobby?.arenaAddress as `0x${string}`) || (arenaParam as `0x${string}`) || ARENA_ADDRESSES[chainId];

  // Use matchId from SpacetimeDB lobby if available, otherwise from URL
  const matchId = spacetimeLobby?.matchId
    ? Number(spacetimeLobby.matchId)
    : urlMatchId !== -1
      ? urlMatchId
      : -1;

  // Read match info from contract
  const { data: matchInfo, refetch: refetchMatch } = useReadContract({
    address: arenaAddress,
    abi: ChainOrbArenaAbi,
    functionName: "matches",
    args: [BigInt(matchId !== -1 ? matchId : 0)],
    chainId,
    query: {
      enabled: matchId !== -1,
    },
  });

  // Read players from contract
  const { data: contractPlayers, refetch: refetchPlayers } = useReadContract({
    address: arenaAddress,
    abi: ChainOrbArenaAbi,
    functionName: "getPlayers",
    args: [BigInt(matchId !== -1 ? matchId : 0)],
    chainId,
    query: {
      enabled: matchId !== -1,
    },
  });

  // Check if current user has joined
  const { data: isPlayerInMatch } = useReadContract({
    address: arenaAddress,
    abi: ChainOrbArenaAbi,
    functionName: "isPlayerInMatch",
    args: [BigInt(matchId !== -1 ? matchId : 0), address],
    chainId,
    query: {
      enabled: !!address && matchId !== -1,
    },
  });

  // Parse match info
  const match = matchInfo
    ? {
      host: (matchInfo as any)[0] as string,
      token: (matchInfo as any)[1] as `0x${string}`,
      entryFee: (matchInfo as any)[2] as bigint,
      maxPlayers: Number((matchInfo as any)[3]),
      prizePool: (matchInfo as any)[4] as bigint,
      status: Number((matchInfo as any)[5]),
      winner: (matchInfo as any)[6] as string,
    }
    : null;

  // Determine token details
  const tokenSymbol = match?.token?.toLowerCase() === BASE_JESSE.toLowerCase() ? 'JESSE' : 'USDC';
  const tokenDecimals = tokenSymbol === 'JESSE' ? 18 : 6;

  // Create SpacetimeDB lobby if it doesn't exist (for existing matches)
  useEffect(() => {
    if (isSpacetimeConnected && match && !spacetimeLobby && matchIdParam && address) {
      // Try to create lobby if match exists but SpacetimeDB lobby doesn't
      const conn = getDbConnection();
      if (conn) {
        try {
          conn.reducers.createLobby({
            chainId,
            matchId: BigInt(matchId),
            arenaAddress,
            hostAddress: match.host,
            entryFee: match.entryFee.toString(),
            maxPlayers: match.maxPlayers,
            hostName: match.host.slice(0, 6) + "..." + match.host.slice(-4),
            lobbyId: roomCode,
          });
          console.log('[LobbyPage] Created SpacetimeDB lobby for existing match');
        } catch (err) {
          console.error('[LobbyPage] Failed to create lobby (may already exist):', err);
        }
      }
    }
  }, [isSpacetimeConnected, match, spacetimeLobby, matchIdParam, address, chainId, arenaAddress, roomCode, matchId]);

  // Auto-confirm host deposit if needed (host pays on creation)
  const { confirmDeposit } = useLobby(roomCode);
  useEffect(() => {
    if (isSpacetimeConnected && spacetimeLobby && address && spacetimePlayers) {
      const hostPlayer = spacetimePlayers.find(p => p.address.toLowerCase() === spacetimeLobby.hostAddress.toLowerCase());
      if (hostPlayer && !hostPlayer.hasDeposited && hostPlayer.address.toLowerCase() === address.toLowerCase()) {
        console.log('[LobbyPage] Host has not deposited in SpacetimeDB. Confirming now...');
        confirmDeposit(roomCode, address);
      }
    }
  }, [isSpacetimeConnected, spacetimeLobby, address, spacetimePlayers, roomCode, confirmDeposit]);

  // Update players list - prefer SpacetimeDB data, fallback to contract
  useEffect(() => {
    if (spacetimePlayers && spacetimePlayers.length > 0) {
      // Use SpacetimeDB players
      const playerList: Player[] = spacetimePlayers.map((p) => ({
        id: p.id,
        name: p.name,
        avatar: p.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(p.name)}&background=random`,
        address: p.address,
        isHost: p.isHost,
        farcasterHandle: p.farcasterHandle || `${p.address.slice(0, 6)}...${p.address.slice(-4)}`,
        hasDeposited: p.hasDeposited,
      }));
      setPlayers(playerList);
    } else if (contractPlayers && Array.isArray(contractPlayers)) {
      // Fallback to contract data
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
  }, [spacetimePlayers, contractPlayers, match?.host]);

  // Check if user has joined
  useEffect(() => {
    if (isPlayerInMatch !== undefined) {
      setHasJoined(isPlayerInMatch as boolean);
    }
  }, [isPlayerInMatch]);

  // Watch for game start - redirect all players when status becomes "live"
  useEffect(() => {
    // Check SpacetimeDB lobby status (source of truth for game start)
    const lobbyStatus = spacetimeLobby?.status;

    // Check if current user is in the SpacetimeDB players list
    const isPlayerInSpacetimeLobby = address && spacetimePlayers?.some(
      p => p.address?.toLowerCase() === address.toLowerCase()
    );

    // Also check if gameState exists (indicates game has actually started)
    const hasGameState = !!spacetimeGameState;

    // Redirect when lobby status is "live" and player is in the lobby
    if (lobbyStatus === "live" && (hasJoined || isPlayerInSpacetimeLobby)) {
      console.log('[LobbyPage] Game started! Redirecting player to game page...', { lobbyStatus, hasGameState, hasJoined, isPlayerInSpacetimeLobby });
      router.push(`/online/game/${roomCode}?chainId=${chainId}&arena=${arenaAddress}`);
    }
  }, [spacetimeLobby?.status, spacetimeGameState, hasJoined, address, spacetimePlayers, roomCode, chainId, arenaAddress, router]);

  // Poll for updates
  useEffect(() => {
    const interval = setInterval(() => {
      refetchMatch();
      refetchPlayers();
    }, 5000);
    return () => clearInterval(interval);
  }, [refetchMatch, refetchPlayers]);

  const handleStartGame = async () => {
    if (!players || players.length < 2) {
      console.error('Need at least 2 players to start');
      alert('Need at least 2 players to start the game');
      return;
    }

    // Check if all players have deposited (use spacetimePlayers directly for accurate data)
    const allDeposited = spacetimePlayers?.every(p => p.hasDeposited) ?? false;
    if (!allDeposited && spacetimePlayers && spacetimePlayers.length > 0) {
      const undeposited = spacetimePlayers.filter(p => !p.hasDeposited).map(p => p.name).join(', ');
      console.error('Not all players have deposited:', undeposited);
      alert(`Cannot start: Waiting for deposits from: ${undeposited}`);
      return;
    }

    setIsStarting(true);
    try {
      // Start game in SpacetimeDB
      if (isSpacetimeConnected && startSpacetimeGame) {
        console.log('[LobbyPage] Starting game in SpacetimeDB...', {
          players: spacetimePlayers?.map(p => ({ name: p.name, hasDeposited: p.hasDeposited })) || [],
          lobbyStatus: spacetimeLobby?.status
        });
        const started = await startSpacetimeGame();
        if (!started) {
          console.error('Failed to start game in SpacetimeDB');
          setIsStarting(false);
          alert('Failed to start game. Please check console for details and try again.');
          return;
        }
        console.log('[LobbyPage] Game start command sent. Waiting for status to update...');
        // Don't navigate manually - let the useEffect handle redirect when status becomes "live"
        // The redirect will happen automatically via the useEffect that watches spacetimeLobby?.status
      } else {
        console.error('[LobbyPage] Cannot start game: not connected or startGame function missing');
        setIsStarting(false);
        alert('Cannot start game: Not connected to SpacetimeDB');
      }
    } catch (err) {
      console.error('Failed to start game:', err);
      setIsStarting(false);
      alert('Failed to start game. Please try again.');
    }
  };

  const handleJoinSuccess = () => {
    setHasJoined(true);
    refetchPlayers();
    refetchMatch();
  };

  const maxPlayers = match?.maxPlayers || 4;
  const entryFee = match?.entryFee ? formatTokenAmount(match.entryFee, tokenDecimals) : "...";
  const prizePool = match?.prizePool ? formatTokenAmount(match.prizePool, tokenDecimals) : "0";
  // Use SpacetimeDB lobby status if available (source of truth), otherwise fallback to contract status
  const lobbyStatus = spacetimeLobby?.status || (match?.status === 0 ? "waiting" : match?.status === 1 ? "live" : "finished");
  const statusText = lobbyStatus === "waiting" ? "Waiting" : lobbyStatus === "live" ? "Live" : "Finished";

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-8 relative overflow-hidden">
      <DoodleBackground />

      <div className="w-full max-w-2xl relative z-10 space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-4xl font-black text-slate-800">Match Lobby</h1>
          {/* Room Code Display */}
          <div className="inline-block bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 px-6 py-3 rounded-full shadow-lg">
            <p className="text-xs text-white/80 font-bold mb-1 uppercase tracking-wider">
              Room Code
            </p>
            <p className="text-3xl font-black text-white tracking-widest font-mono">
              {formatRoomCode(roomCode)}
            </p>
          </div>
          <div className="flex items-center justify-center gap-3 flex-wrap">
            <span
              className={`px-3 py-1 rounded-full text-xs font-bold ${chainId === CHAIN_IDS.BASE
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
              className={`px-3 py-1 rounded-full text-xs font-bold ${statusText === "Waiting"
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
              <p className="text-2xl font-black">${entryFee} {tokenSymbol}</p>
            </div>
            <div className="text-right">
              <p className="text-emerald-100 text-xs font-medium">Prize Pool</p>
              <p className="text-2xl font-black">${prizePool} {tokenSymbol}</p>
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
                className={`flex items-center gap-4 p-4 rounded-2xl border ${player.address.toLowerCase() === address?.toLowerCase()
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
                  {player.hasDeposited !== undefined && (
                    <div className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${player.hasDeposited
                      ? "bg-emerald-100 text-emerald-700"
                      : "bg-amber-100 text-amber-700"
                      }`}>
                      {player.hasDeposited ? "DEPOSITED" : "PENDING"}
                    </div>
                  )}
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
          ) : hasJoined || isHost || isSpacetimeHost ? (
            (isHost || isSpacetimeHost) && players.length >= 2 ? (
              <Button
                variant="primary"
                size="lg"
                className="w-full max-w-xs shadow-lg shadow-blue-500/20"
                onClick={handleStartGame}
                disabled={isStarting || !isSpacetimeConnected}
              >
                {isStarting ? "Starting..." : "Start Game"}
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
              {matchId !== -1 && (
                <LobbyJoinButton
                  chainId={chainId}
                  arenaAddress={arenaAddress}
                  matchId={matchId}
                  entryFee={entryFee}
                  lobbyId={roomCode}
                  onSuccess={handleJoinSuccess}
                  tokenAddress={match?.token}
                  tokenSymbol={tokenSymbol}
                  tokenDecimals={tokenDecimals}
                />
              )}
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
