"use client";

import { motion } from "framer-motion";
import { useEffect, useState } from "react";

export function BackgroundAnimation() {
    const [isClient, setIsClient] = useState(false);

    useEffect(() => {
        setIsClient(true);
    }, []);

    if (!isClient) return null;

    return (
        <div className="absolute inset-0 overflow-hidden pointer-events-none bg-slate-50">
            {/* Hexagon Pattern Background */}
            <motion.div
                className="absolute inset-0 opacity-[0.03]"
                animate={{
                    backgroundPosition: ["0px 0px", "50px 50px"],
                }}
                transition={{
                    duration: 20,
                    repeat: Infinity,
                    ease: "linear",
                }}
                style={{
                    backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M30 0l25.98 15v30L30 60 4.02 45V15z' fill-opacity='0' stroke='%23000' stroke-width='2'/%3E%3C/svg%3E")`,
                    backgroundSize: "60px 60px",
                }}
            />

            {/* Floating Orbs */}
            <FloatingOrb
                color="#FF9AA2" // Red
                size={120}
                initialX="10%"
                initialY="20%"
                duration={7}
            />
            <FloatingOrb
                color="#C7CEEA" // Blue
                size={180}
                initialX="85%"
                initialY="15%"
                duration={8}
            />
            <FloatingOrb
                color="#B5EAD7" // Green
                size={150}
                initialX="15%"
                initialY="80%"
                duration={9}
            />
            <FloatingOrb
                color="#FFF7B1" // Yellow
                size={100}
                initialX="80%"
                initialY="75%"
                duration={6}
            />

            {/* Corner Clouds */}
            <CornerCloud position="top-left" />
            <CornerCloud position="top-right" />
            <CornerCloud position="bottom-left" />
            <CornerCloud position="bottom-right" />

            {/* Random Sparks/Lightning */}
            <Spark />
            <Spark delay={2} />
            <Spark delay={4} />
        </div>
    );
}

function FloatingOrb({
    color,
    size,
    initialX,
    initialY,
    duration,
}: {
    color: string;
    size: number;
    initialX: string;
    initialY: string;
    duration: number;
}) {
    return (
        <motion.div
            className="absolute rounded-full border-4 border-black"
            style={{
                width: size,
                height: size,
                backgroundColor: color,
                left: initialX,
                top: initialY,
            }}
            animate={{
                y: [0, -30, 0],
                x: [0, 20, 0],
                scale: [1, 1.05, 1],
                rotate: [0, 5, -5, 0],
            }}
            transition={{
                duration: duration,
                repeat: Infinity,
                ease: "easeInOut",
            }}
        />
    );
}

function CornerCloud({ position }: { position: "top-left" | "top-right" | "bottom-left" | "bottom-right" }) {
    const isLeft = position.includes("left");
    const isTop = position.includes("top");

    return (
        <motion.div
            className={`absolute ${isTop ? "-top-20" : "-bottom-20"} ${isLeft ? "-left-20" : "-right-20"} z-0`}
            animate={{
                x: isLeft ? [0, 10, 0] : [0, -10, 0],
                y: isTop ? [0, 10, 0] : [0, -10, 0],
            }}
            transition={{
                duration: 8,
                repeat: Infinity,
                ease: "easeInOut",
            }}
        >
            <svg
                width="300"
                height="300"
                viewBox="0 0 200 200"
                className={`${!isLeft ? "scale-x-[-1]" : ""} ${!isTop ? "scale-y-[-1]" : ""}`}
            >
                <path
                    d="M40,100 Q20,80 40,60 Q50,30 90,40 Q120,10 150,40 Q190,30 180,70 Q200,100 170,130 Q180,170 140,160 Q110,190 80,160 Q40,180 30,140 Q0,130 40,100 Z"
                    fill="white"
                    stroke="black"
                    strokeWidth="4"
                />
                {/* Explosion lines */}
                <motion.g
                    initial={{ opacity: 0.5, scale: 0.9 }}
                    animate={{ opacity: [0.5, 1, 0.5], scale: [0.9, 1.1, 0.9] }}
                    transition={{ duration: 2, repeat: Infinity }}
                >
                    <line x1="100" y1="100" x2="150" y2="50" stroke="black" strokeWidth="3" />
                    <line x1="100" y1="100" x2="50" y2="50" stroke="black" strokeWidth="3" />
                    <line x1="100" y1="100" x2="150" y2="150" stroke="black" strokeWidth="3" />
                </motion.g>
            </svg>
        </motion.div>
    );
}

function Spark({ delay = 0 }: { delay?: number }) {
    const [pos, setPos] = useState({ x: 0, y: 0, rot: 0 });

    useEffect(() => {
        const randomize = () => {
            setPos({
                x: Math.random() * 80 + 10, // 10-90%
                y: Math.random() * 80 + 10, // 10-90%
                rot: Math.random() * 360,
            });
        };
        randomize();
        const interval = setInterval(randomize, 4000);
        return () => clearInterval(interval);
    }, []);

    return (
        <motion.div
            className="absolute w-12 h-12 pointer-events-none"
            style={{
                left: `${pos.x}%`,
                top: `${pos.y}%`,
            }}
            animate={{
                opacity: [0, 1, 0],
                scale: [0.5, 1.5, 0.5],
                rotate: [pos.rot, pos.rot + 45],
            }}
            transition={{
                duration: 0.5,
                delay: delay,
                repeat: Infinity,
                repeatDelay: 3.5,
            }}
        >
            <svg viewBox="0 0 24 24" fill="none" stroke="#FFD700" strokeWidth="2">
                <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" fill="#FFD700" />
            </svg>
        </motion.div>
    );
}
