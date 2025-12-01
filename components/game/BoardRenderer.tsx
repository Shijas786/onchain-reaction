"use client";

import React, { useRef, useEffect, useState, useMemo, useCallback } from "react";
import { Board, Cell, PlayerColor } from "@/types/game";
import { getMaxCapacity } from "@/lib/gameLogic";
import { soundManager } from "@/lib/sound";
import { ZoomPanPinch } from "@/components/ui/ZoomPanPinch";

interface BoardRendererProps {
    board: Board;
    rows: number;
    cols: number;
    onCellClick: (row: number, col: number) => void;
    animating: boolean;
    explosionQueue: { row: number; col: number }[];
    clearExplosionQueue: () => void;
}

// 3D Projection Constants
const BASE_CELL_SIZE = 50; // Base cell size in world units
const TILT_ANGLE = 0; // Radians (0 for top-down 2D)
const FOV = 800; // Field of view (focal length)
const CAMERA_Z = 600; // Distance from camera to center of board
const CAMERA_Y_OFFSET = 0; // Centered vertically
const ORB_RADIUS = 18;

const COLORS: Record<PlayerColor, string> = {
    red: "#FF9AA2",     // Pastel Red
    blue: "#C7CEEA",    // Pastel Blue
    green: "#B5EAD7",   // Pastel Green
    yellow: "#FFF7B1",  // Pastel Yellow
    purple: "#E0BBE4",  // Pastel Purple
    orange: "#FFDAC1",  // Pastel Orange
    pink: "#F8BBD0",    // Pastel Pink
    cyan: "#B2EBF2",    // Pastel Cyan
};

export const BoardRenderer: React.FC<BoardRendererProps> = ({
    board,
    rows,
    cols,
    onCellClick,
    animating,
    explosionQueue,
    clearExplosionQueue,
}) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
    const screenCellsRef = useRef<Array<Array<{ x1: number, y1: number, x2: number, y2: number }>>>([]);

    // Handle Window Resize
    useEffect(() => {
        const updateDimensions = () => {
            setDimensions({
                width: window.innerWidth,
                height: window.innerHeight,
            });
        };

        // Initial size
        updateDimensions();

        window.addEventListener("resize", updateDimensions);
        return () => window.removeEventListener("resize", updateDimensions);
    }, []);

    const [hoverCell, setHoverCell] = useState<{ r: number; c: number } | null>(null);

    // Animation State
    const particlesRef = useRef<{ x: number; y: number; z: number; vx: number; vy: number; vz: number; color: string; life: number }[]>([]);
    const flyingOrbsRef = useRef<{ r: number; c: number; tr: number; tc: number; color: PlayerColor; progress: number }[]>([]);
    const explodingCellsRef = useRef<{ r: number; c: number; timeLeft: number }[]>([]);

    // Calculate Scale to Fit Board
    const { scale, offsetX, offsetY } = useMemo(() => {
        if (dimensions.width === 0 || dimensions.height === 0) return { scale: 1, offsetX: 0, offsetY: 0 };

        const boardWidth = cols * BASE_CELL_SIZE;
        const boardHeight = rows * BASE_CELL_SIZE;

        // Add some padding
        const padding = 40;
        const availableWidth = dimensions.width - padding * 2;
        const availableHeight = dimensions.height - padding * 2;

        const scaleX = availableWidth / boardWidth;
        const scaleY = availableHeight / boardHeight;
        const finalScale = Math.min(scaleX, scaleY);

        return {
            scale: finalScale,
            offsetX: dimensions.width / 2,
            offsetY: dimensions.height / 2,
        };
    }, [dimensions, rows, cols]);


    // Helper: Project 3D world coordinates (x, y, z) to 2D screen coordinates (sx, sy)
    // World Origin (0,0,0) is at the center of the board.
    // x: right, y: down (on board), z: up (height)
    const project = (x: number, y: number, z: number) => {
        // 1. Center the board coordinates
        // The board goes from -Width/2 to +Width/2

        // 2. Apply Tilt (Rotate around X axis)
        // y_rot = y * cos(theta) - z * sin(theta)
        // z_rot = y * sin(theta) + z * cos(theta)
        const cosT = Math.cos(TILT_ANGLE);
        const sinT = Math.sin(TILT_ANGLE);

        const y_rot = y * cosT - z * sinT;
        const z_rot = y * sinT + z * cosT;

        const sx = x * scale + offsetX;
        const sy = (y_rot - z) * scale + offsetY; // Simple z-height effect

        return { x: sx, y: sy, scale: scale, depth: z_rot };
    };

    useEffect(() => {
        if (explosionQueue.length > 0) {
            // Play sound for the batch
            soundManager.playExplosion();

            explosionQueue.forEach(({ row, col }) => {
                const cell = board[row][col];
                const color = cell.owner || 'red';

                explodingCellsRef.current.push({ r: row, c: col, timeLeft: 300 });

                // Get neighbors with dynamic board dimensions
                const neighbors: { r: number; c: number }[] = [];
                if (row > 0) neighbors.push({ r: row - 1, c: col });
                if (row < rows - 1) neighbors.push({ r: row + 1, c: col });
                if (col > 0) neighbors.push({ r: row, c: col - 1 });
                if (col < cols - 1) neighbors.push({ r: row, c: col + 1 });
                neighbors.forEach(n => {
                    flyingOrbsRef.current.push({
                        r: row,
                        c: col,
                        tr: n.r,
                        tc: n.c,
                        color,
                        progress: 0
                    });
                });

                // Particles
                for (let i = 0; i < 8; i++) {
                    const angle = Math.random() * Math.PI * 2;
                    const speed = Math.random() * 5 + 2;
                    const vz = Math.random() * 4 + 2;
                    particlesRef.current.push({
                        x: (col - cols / 2 + 0.5) * BASE_CELL_SIZE,
                        y: (row - rows / 2 + 0.5) * BASE_CELL_SIZE,
                        z: 10,
                        vx: Math.cos(angle) * speed,
                        vy: Math.sin(angle) * speed,
                        vz: vz,
                        color: COLORS[color],
                        life: 1.0
                    });
                }
            });
            clearExplosionQueue();
        }
    }, [explosionQueue, clearExplosionQueue, board, rows, cols]);

    const drawOrbShape = useCallback((
        ctx: CanvasRenderingContext2D,
        x: number,
        y: number,
        scale: number,
        color: PlayerColor
    ) => {
        const radius = ORB_RADIUS * scale;
        const baseColor = COLORS[color];

        // Doodle Style: Solid Color + Black Outline
        ctx.fillStyle = baseColor;
        ctx.beginPath();
        ctx.arc(x, y, radius, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = "#000000";
        ctx.lineWidth = 3 * Math.max(0.5, scale); // Scale line width slightly
        ctx.stroke();

        // White "Shine" Mark (Cartoon reflection)
        ctx.strokeStyle = "rgba(255, 255, 255, 0.8)";
        ctx.lineWidth = 2 * Math.max(0.5, scale);
        ctx.beginPath();
        ctx.arc(x, y, radius * 0.7, Math.PI * 1.1, Math.PI * 1.6);
        ctx.stroke();
    }, []);

    const drawOrbGroup = useCallback((
        ctx: CanvasRenderingContext2D,
        cx: number,
        cy: number,
        scale: number,
        color: PlayerColor,
        count: number
    ) => {
        if (count === 1) {
            drawOrbShape(ctx, cx, cy, scale, color);
            return;
        }

        if (count === 2) {
            const angle = Date.now() / 800; // Slower rotation (was 300)
            const dist = 12 * scale;

            ctx.save();
            ctx.translate(cx, cy);

            const x1 = Math.cos(angle) * dist;
            const y1 = Math.sin(angle) * dist * 0.6; // Flatten Y for perspective effect

            const orbs = [
                { x: x1, y: y1, z: Math.sin(angle) },
                { x: -x1, y: -y1, z: -Math.sin(angle) }
            ].sort((a, b) => a.z - b.z);

            orbs.forEach(o => drawOrbShape(ctx, o.x, o.y, scale, color));

            ctx.restore();
            return;
        }

        if (count >= 3) {
            const angle = Date.now() / 600; // Slower rotation (was 200)
            const dist = 14 * scale;

            const angles = [0, (Math.PI * 2) / 3, (Math.PI * 4) / 3];
            const orbs = angles.map(a => {
                const finalAngle = a + angle;
                return {
                    x: Math.cos(finalAngle) * dist,
                    y: Math.sin(finalAngle) * dist * 0.6 // Flatten Y for perspective effect
                };
            }).sort((a, b) => a.y - b.y);

            orbs.forEach(o => {
                drawOrbShape(ctx, cx + o.x, cy + o.y, scale, color);
            });
            return;
        }
    }, [drawOrbShape]);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        let animationFrameId: number;
        let lastTime = performance.now();

        // Initialize screenCellsRef
        screenCellsRef.current = Array(rows).fill(null).map(() => Array(cols).fill(null));

        const render = (time: number) => {
            const dt = time - lastTime;
            lastTime = time;

            const width = dimensions.width;
            const height = dimensions.height;
            const dpr = window.devicePixelRatio || 1;

            // Ensure canvas buffer matches display size * DPR
            const displayWidth = Math.floor(width * dpr);
            const displayHeight = Math.floor(height * dpr);

            if (canvas.width !== displayWidth || canvas.height !== displayHeight) {
                canvas.width = displayWidth;
                canvas.height = displayHeight;
                // Important: Reset scale after resize
                ctx.scale(dpr, dpr);
            } else {
                // Reset transform to clear and redraw
                ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
            }

            ctx.clearRect(0, 0, width, height);

            // --- Draw Board Background ---
            const margin = BASE_CELL_SIZE * 0.1;
            const xMin = -cols / 2 * BASE_CELL_SIZE - margin;
            const xMax = cols / 2 * BASE_CELL_SIZE + margin;
            const yMin = -rows / 2 * BASE_CELL_SIZE - margin;
            const yMax = rows / 2 * BASE_CELL_SIZE + margin;

            const pTL = project(xMin, yMin, 0);
            const pTR = project(xMax, yMin, 0);
            const pBR = project(xMax, yMax, 0);
            const pBL = project(xMin, yMax, 0);

            ctx.fillStyle = "rgba(0, 0, 0, 0.85)"; // Semi-transparent Black Board
            ctx.beginPath();
            ctx.moveTo(pTL.x, pTL.y);
            ctx.lineTo(pTR.x, pTR.y);
            ctx.lineTo(pBR.x, pBR.y);
            ctx.lineTo(pBL.x, pBL.y);
            ctx.closePath();
            ctx.fill();

            // Board Border
            ctx.strokeStyle = "#000000";
            ctx.lineWidth = 4 * scale;
            ctx.stroke();

            // --- Draw Grid ---
            ctx.strokeStyle = "rgba(255, 255, 255, 0.3)"; // White grid lines
            ctx.lineWidth = 2 * scale;
            ctx.lineCap = "round";
            ctx.shadowBlur = 0;

            // Vertical Lines
            for (let c = 0; c <= cols; c++) {
                const xWorld = (c - cols / 2) * BASE_CELL_SIZE;
                const yStart = -rows / 2 * BASE_CELL_SIZE;
                const yEnd = rows / 2 * BASE_CELL_SIZE;

                const p1 = project(xWorld, yStart, 0);
                const p2 = project(xWorld, yEnd, 0);

                ctx.beginPath();
                ctx.moveTo(p1.x, p1.y);
                ctx.lineTo(p2.x, p2.y);
                ctx.stroke();
            }

            // Horizontal Lines
            for (let r = 0; r <= rows; r++) {
                const yWorld = (r - rows / 2) * BASE_CELL_SIZE;
                const xStart = -cols / 2 * BASE_CELL_SIZE;
                const xEnd = cols / 2 * BASE_CELL_SIZE;

                const p1 = project(xStart, yWorld, 0);
                const p2 = project(xEnd, yWorld, 0);

                ctx.beginPath();
                ctx.moveTo(p1.x, p1.y);
                ctx.lineTo(p2.x, p2.y);
                ctx.stroke();
            }

            ctx.shadowBlur = 0; // Reset shadow for orbs

            // --- Precompute Screen Rects & Draw Static Orbs ---
            for (let r = 0; r < rows; r++) {
                for (let c = 0; c < cols; c++) {
                    // Compute bounding box for hit testing
                    const xWorld = (c - cols / 2) * BASE_CELL_SIZE;
                    const yWorld = (r - rows / 2) * BASE_CELL_SIZE;
                    const p1 = project(xWorld, yWorld, 0);
                    const p2 = project(xWorld + BASE_CELL_SIZE, yWorld + BASE_CELL_SIZE, 0);

                    // Store logical coordinates
                    screenCellsRef.current[r][c] = {
                        x1: Math.min(p1.x, p2.x),
                        y1: Math.min(p1.y, p2.y),
                        x2: Math.max(p1.x, p2.x),
                        y2: Math.max(p1.y, p2.y)
                    };

                    const isExploding = explodingCellsRef.current.some(ec => ec.r === r && ec.c === c);
                    if (isExploding) continue;

                    // Defensive check for board dimensions
                    if (!board || !board[r] || !board[r][c]) continue;
                    const cell = board[r][c];
                    if (cell.count > 0 && cell.owner) {
                        // Ensure color is valid, fallback to red if not
                        const validColor: PlayerColor = COLORS[cell.owner] ? cell.owner : 'red';
                        const xCenter = (c - cols / 2 + 0.5) * BASE_CELL_SIZE;
                        const yCenter = (r - rows / 2 + 0.5) * BASE_CELL_SIZE;

                        const p = project(xCenter, yCenter, 0);
                        drawOrbGroup(ctx, p.x, p.y, p.scale, validColor, cell.count);
                    }
                }
            }

            // --- Draw Flying Orbs ---
            for (let i = flyingOrbsRef.current.length - 1; i >= 0; i--) {
                const orb = flyingOrbsRef.current[i];
                orb.progress += dt / 600;

                if (orb.progress >= 1) {
                    flyingOrbsRef.current.splice(i, 1);
                } else {
                    const startX = (orb.c - cols / 2 + 0.5) * BASE_CELL_SIZE;
                    const startY = (orb.r - rows / 2 + 0.5) * BASE_CELL_SIZE;
                    const endX = (orb.tc - cols / 2 + 0.5) * BASE_CELL_SIZE;
                    const endY = (orb.tr - rows / 2 + 0.5) * BASE_CELL_SIZE;

                    const currX = startX + (endX - startX) * orb.progress;
                    const currY = startY + (endY - startY) * orb.progress;
                    const arcHeight = 50 * Math.sin(orb.progress * Math.PI);
                    const currZ = arcHeight;

                    const p = project(currX, currY, currZ);
                    drawOrbShape(ctx, p.x, p.y, p.scale * 0.8, orb.color);
                }
            }

            // --- Draw Particles ---
            for (let i = particlesRef.current.length - 1; i >= 0; i--) {
                const p = particlesRef.current[i];
                p.life -= dt / 1000;
                if (p.life <= 0) {
                    particlesRef.current.splice(i, 1);
                    continue;
                }

                p.x += p.vx;
                p.y += p.vy;
                p.z += p.vz;
                p.vz -= 0.2; // Gravity

                if (p.z < 0) {
                    p.z = 0;
                    p.vz *= -0.5; // Bounce
                }

                const proj = project(p.x, p.y, p.z);

                ctx.globalAlpha = p.life;
                ctx.fillStyle = p.color;
                ctx.beginPath();
                ctx.arc(proj.x, proj.y, 3 * proj.scale, 0, Math.PI * 2);
                ctx.fill();
                ctx.globalAlpha = 1.0;
            }

            // Update Exploding Cells Timers
            for (let i = explodingCellsRef.current.length - 1; i >= 0; i--) {
                explodingCellsRef.current[i].timeLeft -= dt;
                if (explodingCellsRef.current[i].timeLeft <= 0) {
                    explodingCellsRef.current.splice(i, 1);
                }
            }

            animationFrameId = requestAnimationFrame(render);
        };

        render(performance.now());

        return () => cancelAnimationFrame(animationFrameId);
    }, [board, drawOrbGroup, drawOrbShape, rows, cols, dimensions, scale, offsetX, offsetY]);

    const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const rect = canvas.getBoundingClientRect();
        // Calculate logical click coordinates
        // rect.width is visual width. dimensions.width is logical width.
        // If unscaled, they match. If scaled by ZoomPanPinch, they differ.
        // We want coordinates relative to the logical canvas space (before DPR scaling).
        const scaleX = dimensions.width / rect.width;
        const scaleY = dimensions.height / rect.height;

        const x = (e.clientX - rect.left) * scaleX;
        const y = (e.clientY - rect.top) * scaleY;

        // Hit test against precomputed screen cells
        for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
                const cellRect = screenCellsRef.current[r]?.[c];
                if (cellRect) {
                    if (x >= cellRect.x1 && x <= cellRect.x2 && y >= cellRect.y1 && y <= cellRect.y2) {
                        onCellClick(r, c);
                        return;
                    }
                }
            }
        }
    };

    const [isMobile, setIsMobile] = useState(false);

    useEffect(() => {
        const checkMobile = () => {
            setIsMobile(window.innerWidth < 800);
        };
        checkMobile();
        window.addEventListener('resize', checkMobile);
        return () => window.removeEventListener('resize', checkMobile);
    }, []);

    return (
        <div className="w-screen h-screen overflow-hidden flex justify-center items-center bg-transparent">
            {isMobile ? (
                <canvas
                    ref={canvasRef}
                    onClick={handleCanvasClick}
                    style={{
                        width: "100vw",
                        height: "100vh",
                        touchAction: "none",
                        display: 'block',
                    }}
                />
            ) : (
                <ZoomPanPinch className="w-full h-full flex justify-center items-center">
                    <canvas
                        ref={canvasRef}
                        onClick={handleCanvasClick}
                        className="cursor-pointer block"
                        style={{
                            width: '100%',
                            height: '100%',
                            display: 'block',
                        }}
                    />
                </ZoomPanPinch>
            )}
        </div>
    );
};
