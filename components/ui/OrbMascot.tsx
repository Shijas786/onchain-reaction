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
            <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                className="absolute w-full h-full rounded-full border border-slate-400/20 border-t-blue-400/80 border-r-blue-400/80"
            />
            <motion.div
                animate={{ rotate: -360 }}
                transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
                className="absolute w-48 h-48 rounded-full border border-slate-400/20 border-b-purple-400/80 border-l-purple-400/80"
            />

            {/* Main Sphere */}
            <motion.div
                animate={{ y: [0, -10, 0] }}
                transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                className="relative w-32 h-32 rounded-full bg-gradient-to-br from-slate-800 via-blue-900 to-slate-900 shadow-2xl flex items-center justify-center overflow-hidden border border-blue-500/30"
            >
                {/* Surface Shine */}
                <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/10 to-white/30 rounded-full" />

                {/* Inner Core Pulse */}
                <motion.div
                    animate={{ scale: [0.8, 1.1, 0.8], opacity: [0.6, 1, 0.6] }}
                    transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                    className="w-12 h-12 rounded-full bg-blue-400 blur-md"
                />

                {/* Core Highlight */}
                <div className="absolute w-8 h-8 rounded-full bg-white blur-lg opacity-80" />
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
