import React from 'react';
import { motion } from 'framer-motion';

export const OrbMascot = () => {
    return (
        <motion.div
            animate={{ y: [0, -20, 0] }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
            className="relative w-48 h-48 rounded-full bg-gradient-to-br from-blue-300 to-blue-600 shadow-[0_0_40px_rgba(59,130,246,0.5)] flex items-center justify-center"
        >
            <div className="absolute top-4 left-4 w-12 h-12 rounded-full bg-white opacity-30 blur-sm" />

            {/* Face */}
            <div className="relative flex gap-8">
                <div className="w-8 h-12 bg-slate-900 rounded-full flex items-center justify-center">
                    <div className="w-3 h-4 bg-white rounded-full -mt-4 ml-2" />
                </div>
                <div className="w-8 h-12 bg-slate-900 rounded-full flex items-center justify-center">
                    <div className="w-3 h-4 bg-white rounded-full -mt-4 ml-2" />
                </div>
            </div>
            <div className="absolute bottom-10 w-8 h-4 border-b-4 border-slate-900 rounded-full" />
        </motion.div>
    );
};
