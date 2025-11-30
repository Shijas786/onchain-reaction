"use client";

import { useEffect, useState } from "react";
import { useParams, useSearchParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { DoodleBackground } from "@/components/ui/DoodleBackground";
import { motion } from "framer-motion";

interface Player {
    id: string;
    name: string;
    avatar: string;
    isHost: boolean;
    farcasterHandle?: string;
}

export default function LobbyPage() {
    const params = useParams();
    const searchParams = useSearchParams();
    const router = useRouter();
    const roomId = params.id as string;
    const isHost = searchParams.get("host") === "true";

    const [players, setPlayers] = useState<Player[]>([]);

    useEffect(() => {
        // Mock initial players
        const initialPlayers: Player[] = [
            {
                id: "1",
                name: "You",
                avatar: "https://ui-avatars.com/api/?name=You&background=random",
                isHost: isHost,
                farcasterHandle: "@you"
            }
        ];

        if (!isHost) {
            // If joining, assume host is already there
            initialPlayers.unshift({
                id: "host",
                name: "Host Player",
                avatar: "https://ui-avatars.com/api/?name=Host&background=random",
                isHost: true,
                farcasterHandle: "@host"
            });
        }

        setPlayers(initialPlayers);

        // Simulate a joiner after a few seconds if hosting
        if (isHost) {
            const timer = setTimeout(() => {
                setPlayers(prev => [
                    ...prev,
                    {
                        id: "2",
                        name: "Joiner One",
                        avatar: "https://ui-avatars.com/api/?name=Joiner&background=random",
                        isHost: false,
                        farcasterHandle: "@joiner"
                    }
                ]);
            }, 3000);
            return () => clearTimeout(timer);
        }
    }, [isHost]);

    const handleStartGame = () => {
        router.push(`/online/game/${roomId}?host=${isHost}`);
    };

    return (
        <main className="flex min-h-screen flex-col items-center justify-center p-8 relative overflow-hidden">
            <DoodleBackground />

            <div className="w-full max-w-2xl relative z-10 space-y-8">
                <div className="text-center space-y-2">
                    <h1 className="text-4xl font-black text-slate-800">Lobby</h1>
                    <div className="inline-block bg-white/50 backdrop-blur-md px-6 py-2 rounded-full border border-slate-200">
                        <span className="text-slate-500 font-bold mr-2">ROOM ID:</span>
                        <span className="text-2xl font-mono font-black text-blue-600 tracking-widest">{roomId}</span>
                    </div>
                </div>

                <div className="bg-white/90 backdrop-blur-sm p-8 rounded-3xl shadow-xl border border-slate-200">
                    <h2 className="text-xl font-bold text-slate-700 mb-6 flex items-center gap-2">
                        <span>Players</span>
                        <span className="bg-blue-100 text-blue-600 px-2 py-1 rounded-lg text-xs">{players.length}/4</span>
                    </h2>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {players.map((player) => (
                            <motion.div
                                key={player.id}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="flex items-center gap-4 p-4 bg-slate-50 rounded-2xl border border-slate-100"
                            >
                                <img
                                    src={player.avatar}
                                    alt={player.name}
                                    className="w-12 h-12 rounded-full border-2 border-white shadow-sm"
                                />
                                <div>
                                    <div className="font-bold text-slate-800 flex items-center gap-2">
                                        {player.name}
                                        {player.isHost && (
                                            <span className="bg-yellow-100 text-yellow-700 text-[10px] px-2 py-0.5 rounded-full uppercase tracking-wider font-bold">HOST</span>
                                        )}
                                    </div>
                                    <div className="text-sm text-slate-400 font-medium">{player.farcasterHandle}</div>
                                </div>
                            </motion.div>
                        ))}

                        {/* Empty Slots */}
                        {Array.from({ length: Math.max(0, 4 - players.length) }).map((_, i) => (
                            <div key={`empty-${i}`} className="flex items-center gap-4 p-4 border-2 border-dashed border-slate-200 rounded-2xl opacity-50">
                                <div className="w-12 h-12 rounded-full bg-slate-100 animate-pulse" />
                                <div className="space-y-2">
                                    <div className="w-24 h-4 bg-slate-100 rounded animate-pulse" />
                                    <div className="w-16 h-3 bg-slate-100 rounded animate-pulse" />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="flex flex-col gap-4 items-center">
                    {isHost ? (
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
                                <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0s' }} />
                                <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
                                <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }} />
                                <span>Waiting for host to start...</span>
                            </div>
                        </div>
                    )}

                    <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => router.push('/online')}
                        className="bg-white/80 text-slate-600 hover:bg-white shadow-none"
                    >
                        Leave Room
                    </Button>
                </div>
            </div>
        </main>
    );
}
