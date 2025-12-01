"use client";

import { useEffect, useRef } from "react";

interface Doodle {
    x: number;
    y: number;
    size: number;
    type: 'cloud' | 'bubble' | 'arrow' | 'star' | 'circle';
    color: string;
    rotation: number;
    rotationSpeed: number;
    vx: number;
    vy: number;
    pulseOffset: number;
}

const COLORS = [
    "#FF9AA2", // Red
    "#C7CEEA", // Blue
    "#B5EAD7", // Green
    "#FFF7B1", // Yellow
    "#E0BBE4", // Purple
    "#FFDAC1", // Orange
    "#B2EBF2", // Cyan
];

export const DoodleBackground = () => {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        let width = window.innerWidth;
        let height = window.innerHeight;
        let animationFrameId: number;

        const resize = () => {
            width = window.innerWidth;
            height = window.innerHeight;
            canvas.width = width;
            canvas.height = height;
        };
        window.addEventListener("resize", resize);
        resize();

        // Initialize Doodles
        const doodles: Doodle[] = [];
        const doodleCount = 25;

        for (let i = 0; i < doodleCount; i++) {
            doodles.push({
                x: Math.random() * width,
                y: Math.random() * height,
                size: 20 + Math.random() * 40,
                type: ['cloud', 'bubble', 'arrow', 'star', 'circle'][Math.floor(Math.random() * 5)] as any,
                color: COLORS[Math.floor(Math.random() * COLORS.length)],
                rotation: Math.random() * Math.PI * 2,
                rotationSpeed: (Math.random() - 0.5) * 0.02,
                vx: (Math.random() - 0.5) * 0.5,
                vy: (Math.random() - 0.5) * 0.5,
                pulseOffset: Math.random() * Math.PI * 2,
            });
        }

        const drawDoodle = (ctx: CanvasRenderingContext2D, d: Doodle, time: number) => {
            ctx.save();
            ctx.translate(d.x, d.y);
            ctx.rotate(d.rotation);

            // Pulse effect
            const scale = 1 + Math.sin(time * 2 + d.pulseOffset) * 0.1;
            ctx.scale(scale, scale);

            ctx.strokeStyle = d.color;
            ctx.lineWidth = 3;
            ctx.lineCap = "round";
            ctx.lineJoin = "round";

            const s = d.size;

            switch (d.type) {
                case 'cloud':
                    // Simple cloud shape (3 overlapping circles)
                    ctx.beginPath();
                    ctx.arc(-s / 2, 0, s / 3, 0, Math.PI * 2);
                    ctx.arc(0, -s / 3, s / 2.5, 0, Math.PI * 2);
                    ctx.arc(s / 2, 0, s / 3, 0, Math.PI * 2);
                    ctx.stroke();
                    // Fill slightly for "forming" look
                    ctx.fillStyle = `${d.color}20`; // Low opacity fill
                    ctx.fill();
                    break;

                case 'bubble':
                    // Circle with reflection
                    ctx.beginPath();
                    ctx.arc(0, 0, s / 2, 0, Math.PI * 2);
                    ctx.stroke();
                    // Reflection
                    ctx.beginPath();
                    ctx.arc(-s / 6, -s / 6, s / 8, 0, Math.PI * 2);
                    ctx.fillStyle = d.color;
                    ctx.fill();
                    break;

                case 'arrow':
                    // Arrow shape
                    ctx.beginPath();
                    ctx.moveTo(-s / 2, 0);
                    ctx.lineTo(s / 2, 0);
                    ctx.lineTo(s / 4, -s / 4);
                    ctx.moveTo(s / 2, 0);
                    ctx.lineTo(s / 4, s / 4);
                    ctx.stroke();
                    break;

                case 'star':
                    // 4-point star / sparkle
                    ctx.beginPath();
                    ctx.moveTo(0, -s / 2);
                    ctx.quadraticCurveTo(0, 0, s / 2, 0);
                    ctx.quadraticCurveTo(0, 0, 0, s / 2);
                    ctx.quadraticCurveTo(0, 0, -s / 2, 0);
                    ctx.quadraticCurveTo(0, 0, 0, -s / 2);
                    ctx.stroke();
                    break;

                case 'circle':
                    // Small decorative circles/dots
                    ctx.beginPath();
                    ctx.arc(0, 0, s / 4, 0, Math.PI * 2);
                    ctx.stroke();
                    break;
            }
            ctx.restore();
        };

        const render = (time: number) => {
            const t = time / 1000;
            ctx.clearRect(0, 0, width, height);

            // Optional: Draw faint grid or dots for "notebook" feel
            ctx.fillStyle = "#f0f0f0";
            for (let x = 0; x < width; x += 40) {
                for (let y = 0; y < height; y += 40) {
                    ctx.fillRect(x, y, 2, 2);
                }
            }

            doodles.forEach(d => {
                // Update
                d.x += d.vx;
                d.y += d.vy;
                d.rotation += d.rotationSpeed;

                // Wrap around with buffer
                const buffer = 100;
                if (d.x < -buffer) d.x = width + buffer;
                if (d.x > width + buffer) d.x = -buffer;
                if (d.y < -buffer) d.y = height + buffer;
                if (d.y > height + buffer) d.y = -buffer;

                // Draw
                drawDoodle(ctx, d, t);
            });

            animationFrameId = requestAnimationFrame(render);
        };

        requestAnimationFrame(render);

        return () => {
            window.removeEventListener("resize", resize);
            cancelAnimationFrame(animationFrameId);
        };
    }, []);

    return (
        <canvas
            ref={canvasRef}
            className="fixed inset-0 w-full h-full pointer-events-none z-[-1] bg-white"
        />
    );
};
