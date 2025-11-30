"use client";

import React from "react";
import { motion } from "framer-motion";

export const DoodleText = () => {
    return (
        <div className="relative flex items-center justify-center p-8">
            <svg width="500" height="150" viewBox="0 0 500 150">
                {/* Define the rough filter */}
                <defs>
                    <filter id="doodle-filter">
                        <feTurbulence type="fractalNoise" baseFrequency="0.02" numOctaves="3" result="noise" />
                        <feDisplacementMap in="SourceGraphic" in2="noise" scale="3" />
                    </filter>
                </defs>

                {/* Text Group with Filter */}
                <g filter="url(#doodle-filter)">
                    {/* Shadow/Offset for 3D feel */}
                    <motion.text
                        x="50%"
                        y="50%"
                        textAnchor="middle"
                        dominantBaseline="middle"
                        className="text-5xl font-black fill-transparent stroke-slate-300"
                        strokeWidth="4"
                        style={{ fontFamily: '"Comic Sans MS", "Chalkboard SE", sans-serif' }}
                    >
                        CHAIN REACTION
                    </motion.text>

                    {/* Main Text */}
                    <motion.text
                        x="50%"
                        y="50%"
                        textAnchor="middle"
                        dominantBaseline="middle"
                        className="text-5xl font-black fill-transparent stroke-slate-800"
                        strokeWidth="2"
                        style={{ fontFamily: '"Comic Sans MS", "Chalkboard SE", sans-serif' }}
                        initial={{ strokeDasharray: 1000, strokeDashoffset: 1000 }}
                        animate={{ strokeDashoffset: 0 }}
                        transition={{ duration: 3, ease: "easeInOut", repeat: Infinity, repeatType: "reverse", repeatDelay: 1 }}
                    >
                        CHAIN REACTION
                    </motion.text>

                    {/* Color Fill Layer (Optional, maybe just outline is better for doodle) */}
                    <motion.text
                        x="50%"
                        y="50%"
                        textAnchor="middle"
                        dominantBaseline="middle"
                        className="text-5xl font-black fill-blue-400/20 stroke-none"
                        style={{ fontFamily: '"Comic Sans MS", "Chalkboard SE", sans-serif' }}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 2, duration: 1 }}
                    >
                        CHAIN REACTION
                    </motion.text>
                </g>
            </svg>
        </div>
    );
};
