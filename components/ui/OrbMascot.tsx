import React from 'react';
import { motion } from 'framer-motion';

export const OrbMascot = () => {
    return (
        <div className="relative w-64 h-64 flex items-center justify-center">
            {/* Outer Glow/Aura */}
            <motion.div
                animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.6, 0.3] }}
                transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                className="absolute inset-0 rounded-full bg-blue-500/30 blur-3xl"
            />

            {/* Orbiting Rings */}
            {/* Orbiting Rings - Doodle Style */}
            <motion.svg
                animate={{ rotate: 360 }}
                transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                className="absolute w-full h-full pointer-events-none"
                viewBox="0 0 200 200"
            >
                {/* Outer Blue Ring Doodle */}
                <path
                    d="M 100 10 C 150 5 195 50 190 100 C 185 150 150 195 100 190 C 50 185 5 150 10 100 C 15 50 50 15 100 10 Z"
                    fill="none"
                    stroke="rgba(96, 165, 250, 0.8)"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeDasharray="10 5"
                />
                <path
                    d="M 100 15 C 145 15 185 55 185 100 C 185 145 145 185 100 185 C 55 185 15 145 15 100 C 15 55 55 15 100 15"
                    fill="none"
                    stroke="rgba(148, 163, 184, 0.2)"
                    strokeWidth="1"
                />
            </motion.svg>

            <motion.svg
                animate={{ rotate: -360 }}
                transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
                className="absolute w-48 h-48 pointer-events-none"
                viewBox="0 0 200 200"
            >
                {/* Inner Purple Ring Doodle */}
                <path
                    d="M 100 10 C 160 15 185 60 180 100 C 175 160 140 185 100 180 C 40 175 15 140 20 100 C 25 40 60 15 100 10 Z"
                    fill="none"
                    stroke="rgba(192, 132, 252, 0.8)"
                    strokeWidth="2"
                    strokeLinecap="round"
                />
            </motion.svg>

            {/* Main Sphere */}
            {/* Main Sphere - Doodle Style */}
            <motion.div
                animate={{ y: [0, -10, 0] }}
                transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                className="relative w-32 h-32 flex items-center justify-center"
            >
                <svg viewBox="0 0 200 200" className="absolute inset-0 w-full h-full drop-shadow-xl">
                    {/* Scribble Fill */}
                    <path
                        d="M 100 20 C 140 15 190 60 180 100 C 175 150 140 190 100 180 C 50 175 10 140 20 100 C 25 50 60 25 100 20 Z"
                        fill="rgba(30, 58, 138, 0.9)"
                        stroke="none"
                    />
                    {/* Rough Outline */}
                    <path
                        d="M 100 20 C 140 15 190 60 180 100 C 175 150 140 190 100 180 C 50 175 10 140 20 100 C 25 50 60 25 100 20 Z"
                        fill="none"
                        stroke="rgba(96, 165, 250, 1)"
                        strokeWidth="3"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                    />
                    {/* Inner Scribble Highlight */}
                    <path
                        d="M 60 60 Q 80 40 100 60 T 140 60"
                        fill="none"
                        stroke="rgba(255, 255, 255, 0.3)"
                        strokeWidth="2"
                        strokeLinecap="round"
                    />
                </svg>

                {/* Inner Core Pulse - Doodle Style */}
                <motion.div
                    animate={{ scale: [0.8, 1.1, 0.8], opacity: [0.6, 1, 0.6] }}
                    transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                    className="relative z-10"
                >
                    <svg width="40" height="40" viewBox="0 0 100 100">
                        <path
                            d="M 50 10 C 80 10 90 40 90 50 C 90 80 60 90 50 90 C 20 90 10 60 10 50 C 10 20 20 10 50 10 Z"
                            fill="rgba(96, 165, 250, 1)"
                        />
                    </svg>
                </motion.div>
            </motion.div>

            {/* Floating Particles */}
            <motion.div
                animate={{ y: [-10, 10, -10], x: [-5, 5, -5] }}
                transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
                className="absolute top-10 right-10 w-3 h-3 rounded-full bg-purple-400 blur-[1px]"
            />
            <motion.div
                animate={{ y: [10, -10, 10], x: [5, -5, 5] }}
                transition={{ duration: 7, repeat: Infinity, ease: "easeInOut" }}
                className="absolute bottom-10 left-10 w-2 h-2 rounded-full bg-blue-400 blur-[1px]"
            />
        </div>
    );
};
