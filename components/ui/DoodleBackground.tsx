"use client";

import { useEffect, useRef } from "react";

interface Doodle {
    x: number;
    y: number;
    size: number;
    type: 'ethereum' | 'base' | 'farcaster' | 'arbitrum';
    color: string;
    rotation: number;
    rotationSpeed: number;
    vx: number;
    vy: number;
}

const COLORS = [
    "#FF9AA2", // Red
    "#C7CEEA", // Blue
    "#B5EAD7", // Green
    "#FFF7B1", // Yellow
    "#E0BBE4", // Purple
    "#FFDAC1", // Orange
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
        const doodleCount = 20; // Fewer items since they are logos

        for (let i = 0; i < doodleCount; i++) {
            doodles.push({
                x: Math.random() * width,
                y: Math.random() * height,
                size: 30 + Math.random() * 30,
                type: ['ethereum', 'base', 'farcaster', 'arbitrum'][Math.floor(Math.random() * 4)] as any,
                color: COLORS[Math.floor(Math.random() * COLORS.length)],
                rotation: Math.random() * Math.PI * 2,
                rotationSpeed: (Math.random() - 0.5) * 0.01,
                vx: (Math.random() - 0.5) * 0.3,
                vy: (Math.random() - 0.5) * 0.3,
            });
        }

        const drawDoodle = (ctx: CanvasRenderingContext2D, d: Doodle) => {
            ctx.save();
            ctx.translate(d.x, d.y);
            ctx.rotate(d.rotation);
            ctx.strokeStyle = d.color;
            ctx.lineWidth = 3;
            ctx.lineCap = "round";
            ctx.lineJoin = "round";

            const s = d.size;

            switch (d.type) {
                case 'ethereum':
                    // Diamond shape
                    ctx.beginPath();
                    ctx.moveTo(0, -s / 2);
                    ctx.lineTo(s / 3, 0);
                    ctx.lineTo(0, s / 2);
                    ctx.lineTo(-s / 3, 0);
                    ctx.closePath();
                    // Inner line
                    ctx.moveTo(0, -s / 2);
                    ctx.lineTo(0, s / 2);
                    ctx.stroke();
                    break;
                case 'base':
                    // Circle with ring
                    ctx.beginPath();
                    ctx.arc(0, 0, s / 2, 0, Math.PI * 2);
                    ctx.stroke();
                    ctx.beginPath();
                    ctx.arc(0, 0, s / 4, 0, Math.PI * 2);
                    ctx.stroke();
                    break;
                case 'farcaster':
                    // Rounded square with arch
                    ctx.beginPath();
                    // Rounded rect
                    const r = s / 6;
                    ctx.moveTo(-s / 2 + r, -s / 2);
                    ctx.lineTo(s / 2 - r, -s / 2);
                    ctx.quadraticCurveTo(s / 2, -s / 2, s / 2, -s / 2 + r);
                    ctx.lineTo(s / 2, s / 2 - r);
                    ctx.quadraticCurveTo(s / 2, s / 2, s / 2 - r, s / 2);
                    ctx.lineTo(-s / 2 + r, s / 2);
                    ctx.quadraticCurveTo(-s / 2, s / 2, -s / 2, s / 2 - r);
                    ctx.lineTo(-s / 2, -s / 2 + r);
                    ctx.quadraticCurveTo(-s / 2, -s / 2, -s / 2 + r, -s / 2);
                    ctx.stroke();
                    // Arch
                    ctx.beginPath();
                    ctx.arc(0, s / 4, s / 3, Math.PI, 0);
                    ctx.stroke();
                    break;
                case 'arbitrum':
                    // Shield/Triangle
                    ctx.beginPath();
                    ctx.moveTo(0, -s / 2);
                    ctx.lineTo(s / 2, 0);
                    ctx.lineTo(0, s / 2);
                    ctx.lineTo(-s / 2, 0);
                    ctx.closePath();
                    // Internal detail
                    ctx.moveTo(0, -s / 2);
                    ctx.lineTo(s / 4, 0);
                    ctx.lineTo(0, s / 4);
                    ctx.lineTo(-s / 4, 0);
                    ctx.closePath();
                    ctx.stroke();
                    break;
            }
            ctx.restore();
        };

        const render = () => {
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

                // Wrap around
                if (d.x < -50) d.x = width + 50;
                if (d.x > width + 50) d.x = -50;
                if (d.y < -50) d.y = height + 50;
                if (d.y > height + 50) d.y = -50;

                // Draw
                drawDoodle(ctx, d);
            });

            animationFrameId = requestAnimationFrame(render);
        };

        render();

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
