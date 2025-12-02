"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";

export function HowToPlay() {
    const [isOpen, setIsOpen] = useState(false);

    return (
        <>
            <motion.div
                onClick={() => setIsOpen(true)}
                whileHover={{ scale: 1.05 }}
                className="inline-flex items-center gap-1.5 cursor-pointer text-[#333] text-lg transition-transform duration-150 ease-out"
                style={{ fontFamily: 'var(--font-schoolbell), sans-serif' }}
            >
                <span>⚡</span>
                <span>How to Play?</span>
            </motion.div>

            <AnimatePresence>
                {isOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setIsOpen(false)}
                            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                        />

                        <motion.div
                            initial={{ opacity: 0, scale: 0.9, y: 20, rotate: -2 }}
                            animate={{ opacity: 1, scale: 1, y: 0, rotate: 0 }}
                            exit={{ opacity: 0, scale: 0.9, y: 20 }}
                            className="relative w-full max-w-md bg-white border-4 border-black rounded-3xl p-5 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] max-h-[85vh] overflow-y-auto"
                        >
                            <button
                                onClick={() => setIsOpen(false)}
                                className="absolute top-3 right-3 p-1 hover:bg-slate-100 rounded-full transition-colors border-2 border-transparent hover:border-black"
                            >
                                <X className="w-6 h-6" />
                            </button>

                            <div className="space-y-5">
                                <div className="text-center">
                                    <h2 className="text-2xl font-black text-black mb-2 transform -rotate-2 inline-block bg-[#FF9AA2] px-4 py-1 border-2 border-black rounded-lg shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                                        ⭐ How the Game Works
                                    </h2>
                                </div>

                                <div className="space-y-3 text-black font-bold text-sm leading-relaxed">
                                    <p>This is a chain-reaction strategy game played on a grid.</p>
                                    <p>Each turn, you place an orb in any empty cell or in a cell you already control.</p>

                                    <div className="bg-blue-50 p-3 rounded-xl border-2 border-black border-dashed">
                                        <p>When a cell reaches its max capacity, it explodes → sending orbs to the 4 neighboring cells.</p>
                                    </div>

                                    <p>Explosions capture those cells and turn them into your color.</p>
                                    <p>This can trigger chain reactions that spread across the board.</p>
                                    <p>If a player loses all their orbs, they are eliminated.</p>

                                    <div className="text-center font-black text-base text-purple-700 mt-2">
                                        Last player standing wins. 🏆
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <h3 className="text-lg font-black transform rotate-1 inline-block bg-[#C7CEEA] px-3 py-1 border-2 border-black rounded-lg">
                                        💡 Cell Capacity
                                    </h3>
                                    <ul className="space-y-1 list-disc pl-5 marker:text-black text-sm font-bold text-black">
                                        <li>Corner cells: max 1 → explode on 2nd orb</li>
                                        <li>Edge cells: max 2 → explode on 3rd orb</li>
                                        <li>Center cells: max 3 → explode on 4th orb</li>
                                    </ul>
                                </div>

                                <div className="bg-[#B5EAD7] p-3 rounded-2xl border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                                    <h3 className="text-lg font-black mb-1">🎯 Goal</h3>
                                    <p className="font-bold text-sm text-black">
                                        Use chain reactions to wipe out opponents and take over the entire board.
                                    </p>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </>
    );
}
