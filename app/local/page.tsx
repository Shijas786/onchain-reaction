"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { PLAYER_COLORS, PlayerColor } from "@/types/game";
import { motion } from "framer-motion";

const PASTEL_COLORS: Record<PlayerColor, string> = {
    red: "#FF9AA2",
    blue: "#C7CEEA",
    green: "#B5EAD7",
    yellow: "#FFF7B1",
    purple: "#E0BBE4",
    orange: "#FFDAC1",
    pink: "#F8BBD0",
    cyan: "#B2EBF2",
};

export default function LocalSetup() {
    const [playerCount, setPlayerCount] = useState(2);
    const [selectedColors, setSelectedColors] = useState<PlayerColor[]>([]);
    const router = useRouter();

    // Initialize colors whenever player count changes
    useEffect(() => {
        setSelectedColors(prev => {
            const newColors = [...prev];
            // Ensure we have enough colors
            for (let i = 0; i < playerCount; i++) {
                if (!newColors[i]) {
                    // Find first unused color or default to index
                    const used = new Set(newColors.slice(0, i));
                    const nextColor = PLAYER_COLORS.find(c => !used.has(c)) || PLAYER_COLORS[i % PLAYER_COLORS.length];
                    newColors[i] = nextColor;
                }
            }
            return newColors.slice(0, playerCount);
        });
    }, [playerCount]);

    const cycleColor = (index: number) => {
        const currentColor = selectedColors[index];
        const currentIndex = PLAYER_COLORS.indexOf(currentColor);
        let nextIndex = (currentIndex + 1) % PLAYER_COLORS.length;
        let nextColor = PLAYER_COLORS[nextIndex];

        // Skip colors already used by other players
        const otherColors = new Set(selectedColors.filter((_, i) => i !== index));
        while (otherColors.has(nextColor)) {
            nextIndex = (nextIndex + 1) % PLAYER_COLORS.length;
            nextColor = PLAYER_COLORS[nextIndex];
            // Safety break if all colors used (shouldn't happen with max 5 players and 6 colors)
            if (nextColor === currentColor) break;
        }

        const newColors = [...selectedColors];
        newColors[index] = nextColor;
        setSelectedColors(newColors);
    };

    const startGame = () => {
        const colorParams = selectedColors.map((c, i) => `p${i}=${c}`).join('&');
        router.push(`/local/game?players=${playerCount}&${colorParams}`);
    };

    return (
        <main className="flex min-h-screen flex-col items-center justify-center p-8 bg-transparent">
            <div className="w-full max-w-md space-y-8">
                <div className="text-center">
                    <h1 className="text-4xl font-black text-slate-800 mb-2">Local Multiplayer</h1>
                    <p className="text-slate-500">Select number of players</p>
                </div>

                <div className="bg-white p-8 rounded-3xl border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
                    {/* Player Count Selector */}
                    <div className="flex justify-center items-center gap-4 mb-8">
                        <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => setPlayerCount(Math.max(2, playerCount - 1))}
                            disabled={playerCount <= 2}
                            className="w-12 h-12 !p-0 text-2xl border-4 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:translate-x-[2px] active:translate-y-[2px] active:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all bg-[#FF9AA2] text-black font-bold rounded-xl"
                        >
                            -
                        </Button>

                        <span className="text-4xl font-black text-slate-800 w-12 text-center">
                            {playerCount}
                        </span>

                        <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => setPlayerCount(Math.min(5, playerCount + 1))}
                            disabled={playerCount >= 5}
                            className="w-12 h-12 !p-0 text-2xl border-4 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:translate-x-[2px] active:translate-y-[2px] active:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all bg-[#B5EAD7] text-black font-bold rounded-xl"
                        >
                            +
                        </Button>
                    </div>

                    {/* Player Colors */}
                    <div className="grid grid-cols-3 gap-4 mb-8">
                        {selectedColors.map((color, i) => (
                            <motion.div
                                key={i}
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                className="flex flex-col items-center gap-2 cursor-pointer group"
                                onClick={() => cycleColor(i)}
                                whileHover={{ scale: 1.1 }}
                                whileTap={{ scale: 0.9 }}
                            >
                                <div className="relative">
                                    <div
                                        className="w-12 h-12 rounded-full border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-colors"
                                        style={{ backgroundColor: PASTEL_COLORS[color] }}
                                    />
                                    <div className="absolute -bottom-1 -right-1 bg-white border border-black rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3 h-3">
                                            <path d="M2.695 14.763l-1.262 3.154a.5.5 0 00.65.65l3.155-1.262a4 4 0 001.343-.885L17.5 5.5a2.121 2.121 0 00-3-3L3.58 13.42a4 4 0 00-.885 1.343z" />
                                        </svg>
                                    </div>
                                </div>
                                <span className="text-xs font-bold text-slate-400">P{i + 1}</span>
                            </motion.div>
                        ))}
                    </div>

                    <Button
                        variant="primary"
                        size="lg"
                        className="w-full border-4 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all bg-[#FFF7B1] text-black font-bold rounded-2xl mt-4"
                        onClick={startGame}
                    >
                        Start Game
                    </Button>
                </div>

                <div className="text-center">
                    <Button variant="secondary" size="sm" onClick={() => router.back()} className="bg-transparent text-slate-600 hover:bg-transparent shadow-none underline font-bold">
                        Back
                    </Button>
                </div>
            </div>
        </main>
    );
}
