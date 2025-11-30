"use client";

import React, { useRef, useEffect, useState, useMemo, useCallback } from "react";
import { Board, Cell, PlayerColor } from "@/types/game";
import { getMaxCapacity, getNeighbors } from "@/lib/gameLogic";
import { soundManager } from "@/lib/sound";

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
const MIN_CANVAS_WIDTH = 800;
const MIN_CANVAS_HEIGHT = 600;
const MAX_CANVAS_WIDTH = 1200;
const MAX_CANVAS_HEIGHT = 1000;
const PADDING = 100; // Padding around board

const ORB_RADIUS = 18;

const COLORS: Record<PlayerColor, string> = {
    red: "#FF9AA2",   // Pastel Red
    blue: "#C7CEEA",  // Pastel Blue
    green: "#B5EAD7", // Pastel Green
    yellow: "#FFF7B1",// Pastel Yellow
    purple: "#E0BBE4",// Pastel Purple
    orange: "#FFDAC1",// Pastel Orange
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
    
    // Calculate dynamic canvas size and cell size based on board dimensions
    const { canvasWidth, canvasHeight, cellSize } = useMemo(() => {
        // Calculate required world space
        const worldWidth = cols * BASE_CELL_SIZE;
        const worldHeight = rows * BASE_CELL_SIZE;
        
        // Calculate required canvas size with padding
        const requiredWidth = Math.min(MAX_CANVAS_WIDTH, Math.max(MIN_CANVAS_WIDTH, worldWidth + PADDING * 2));
        const requiredHeight = Math.min(MAX_CANVAS_HEIGHT, Math.max(MIN_CANVAS_HEIGHT, worldHeight + PADDING * 2));
        
        // Calculate scale factor if board is too large
        const widthScale = (requiredWidth - PADDING * 2) / worldWidth;
        const heightScale = (requiredHeight - PADDING * 2) / worldHeight;
        const scale = Math.min(widthScale, heightScale, 1); // Don't scale up, only down
        
        const finalCellSize = BASE_CELL_SIZE * scale;
        
        return {
            canvasWidth: requiredWidth,
            canvasHeight: requiredHeight,
            cellSize: finalCellSize,
        };
    }, [rows, cols]);
    const [hoverCell, setHoverCell] = useState<{ r: number; c: number } | null>(null);

    // Animation State
    const particlesRef = useRef<{ x: number; y: number; z: number; vx: number; vy: number; vz: number; color: string; life: number }[]>([]);
    const flyingOrbsRef = useRef<{ r: number; c: number; tr: number; tc: number; color: PlayerColor; progress: number }[]>([]);
    const explodingCellsRef = useRef<{ r: number; c: number; timeLeft: number }[]>([]);

    // Helper: Project 3D world coordinates (x, y, z) to 2D screen coordinates (sx, sy)
    // World Origin (0,0,0) is at the center of the board.
    // x: right, y: down (on board), z: up (height)
    const project = (x: number, y: number, z: number, canvasWidth: number, canvasHeight: number) => {
        // 1. Center the board coordinates
        // The board goes from -Width/2 to +Width/2

        // 2. Apply Tilt (Rotate around X axis)
        // y_rot = y * cos(theta) - z * sin(theta)
        // z_rot = y * sin(theta) + z * cos(theta)
        const cosT = Math.cos(TILT_ANGLE);
        const sinT = Math.sin(TILT_ANGLE);

        const y_rot = y * cosT - z * sinT;
        const z_rot = y * sinT + z * cosT;

        // 3. Apply Perspective
        // scale = FOV / (FOV + z_depth)
        // We move the scene away by CAMERA_Z
        const z_depth = z_rot + CAMERA_Z;
        const scale = FOV / z_depth;

        const sx = x * scale + canvasWidth / 2;
        const sy = (y_rot + CAMERA_Y_OFFSET) * scale + canvasHeight / 2;

        return { x: sx, y: sy, scale, depth: z_depth };
    };

    // Helper: Unproject 2D screen coordinates to 3D world coordinates (assuming z=0 plane)
    const unproject = (sx: number, sy: number, canvasWidth: number, canvasHeight: number) => {
        const cx = canvasWidth / 2;
        const cy = canvasHeight / 2;

        const dx = sx - cx;
        const dy = sy - cy;

        const cosT = Math.cos(TILT_ANGLE);
        const sinT = Math.sin(TILT_ANGLE);

        // We need to solve for y_world given z_world = 0
        // y_screen = (y_rot + CAMERA_Y_OFFSET) * scale + cy
        // scale = FOV / (y_rot + CAMERA_Z) (since z_world=0, z_rot = y_world * sinT)

        // Let Y = y_world
        // y_rot = Y * cosT
        // z_rot = Y * sinT
        // scale = FOV / (Y * sinT + CAMERA_Z)

        // dy = (Y * cosT + CAMERA_Y_OFFSET) * (FOV / (Y * sinT + CAMERA_Z))
        // dy * (Y * sinT + CAMERA_Z) = FOV * (Y * cosT + CAMERA_Y_OFFSET)
        // dy * Y * sinT + dy * CAMERA_Z = FOV * Y * cosT + FOV * CAMERA_Y_OFFSET
        // Y * (dy * sinT - FOV * cosT) = FOV * CAMERA_Y_OFFSET - dy * CAMERA_Z
        // Y = (FOV * CAMERA_Y_OFFSET - dy * CAMERA_Z) / (dy * sinT - FOV * cosT)

        const Y = (FOV * CAMERA_Y_OFFSET - dy * CAMERA_Z) / (dy * sinT - FOV * cosT);

        // Now find scale to get X
        const z_rot = Y * sinT;
        const scale = FOV / (z_rot + CAMERA_Z);

        // sx = X * scale + cx  =>  dx = X * scale
        const X = dx / scale;

        return { x: X, y: Y };
    };

    useEffect(() => {
        if (explosionQueue.length > 0) {
            // Play sound for the batch
            soundManager.playExplosion();

            explosionQueue.forEach(({ row, col }) => {
                const cell = board[row][col];
                const color = cell.owner || 'red';

                explodingCellsRef.current.push({ r: row, c: col, timeLeft: 300 });

                const neighbors = getNeighbors(row, col);
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
                        x: (col - cols / 2 + 0.5) * cellSize,
                        y: (row - rows / 2 + 0.5) * cellSize,
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
    }, [explosionQueue, clearExplosionQueue, board, rows, cols, cellSize]);

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
        ctx.lineWidth = 3; // Thick outline
        ctx.stroke();

        // White "Shine" Mark (Cartoon reflection)
        ctx.strokeStyle = "rgba(255, 255, 255, 0.8)";
        ctx.lineWidth = 2;
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
        const radius = ORB_RADIUS * scale;

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

        const render = (time: number) => {
            const dt = time - lastTime;
            lastTime = time;

            const width = canvas.width;
            const height = canvas.height;

            ctx.clearRect(0, 0, width, height);

            // --- Draw Board Background ---
            const xMin = -cols / 2 * cellSize;
            const xMax = cols / 2 * cellSize;
            const yMin = -rows / 2 * cellSize;
            const yMax = rows / 2 * cellSize;

            const pTL = project(xMin, yMin, 0, width, height);
            const pTR = project(xMax, yMin, 0, width, height);
            const pBR = project(xMax, yMax, 0, width, height);
            const pBL = project(xMin, yMax, 0, width, height);

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
            ctx.lineWidth = 4;
            ctx.stroke();

            // --- Draw Grid ---
            ctx.strokeStyle = "rgba(255, 255, 255, 0.3)"; // White grid lines
            ctx.lineWidth = 2;
            ctx.lineCap = "round";
            ctx.shadowBlur = 0;

            // Vertical Lines
            for (let c = 0; c <= cols; c++) {
                const xWorld = (c - cols / 2) * cellSize;
                const yStart = -rows / 2 * cellSize;
                const yEnd = rows / 2 * cellSize;

                const p1 = project(xWorld, yStart, 0, width, height);
                const p2 = project(xWorld, yEnd, 0, width, height);

                ctx.beginPath();
                ctx.moveTo(p1.x, p1.y);
                ctx.lineTo(p2.x, p2.y);
                ctx.stroke();
            }

            // Horizontal Lines
            for (let r = 0; r <= rows; r++) {
                const yWorld = (r - rows / 2) * cellSize;
                const xStart = -cols / 2 * cellSize;
                const xEnd = cols / 2 * cellSize;

                const p1 = project(xStart, yWorld, 0, width, height);
                const p2 = project(xEnd, yWorld, 0, width, height);

                ctx.beginPath();
                ctx.moveTo(p1.x, p1.y);
                ctx.lineTo(p2.x, p2.y);
                ctx.stroke();
            }

            ctx.shadowBlur = 0; // Reset shadow for orbs

            // --- Draw Static Orbs ---
            for (let r = 0; r < rows; r++) {
                for (let c = 0; c < cols; c++) {
                    const isExploding = explodingCellsRef.current.some(ec => ec.r === r && ec.c === c);
                    if (isExploding) continue;

                    // Defensive check for board dimensions
                    if (!board || !board[r] || !board[r][c]) continue;
                    const cell = board[r][c];
                    if (cell.count > 0 && cell.owner) {
                        const xWorld = (c - cols / 2 + 0.5) * cellSize;
                        const yWorld = (r - rows / 2 + 0.5) * cellSize;

                        const p = project(xWorld, yWorld, 0, width, height);
                        drawOrbGroup(ctx, p.x, p.y, p.scale, cell.owner, cell.count);
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
                    const startX = (orb.c - cols / 2 + 0.5) * cellSize;
                    const startY = (orb.r - rows / 2 + 0.5) * cellSize;
                    const endX = (orb.tc - cols / 2 + 0.5) * cellSize;
                    const endY = (orb.tr - rows / 2 + 0.5) * cellSize;

                    const currX = startX + (endX - startX) * orb.progress;
                    const currY = startY + (endY - startY) * orb.progress;
                    const arcHeight = 50 * Math.sin(orb.progress * Math.PI);
                    const currZ = arcHeight;

                    const p = project(currX, currY, currZ, width, height);
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

                const proj = project(p.x, p.y, p.z, width, height);

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
    }, [board, drawOrbGroup, drawOrbShape, rows, cols, cellSize, canvasWidth, canvasHeight]);

    const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
        if (animating) return;

        const rect = canvasRef.current?.getBoundingClientRect();
        if (!rect) return;

        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        // Map screen X/Y to Canvas internal resolution
        // (Assuming canvas width/height matches display size for now, or use scale)
        // If canvas is styled with CSS width/height, we need to scale.
        const scaleX = canvasRef.current!.width / rect.width;
        const scaleY = canvasRef.current!.height / rect.height;

        const sx = x * scaleX;
        const sy = y * scaleY;

        const worldPos = unproject(sx, sy, canvasRef.current!.width, canvasRef.current!.height);

        // Convert World Pos to Row/Col
        // xWorld = (c - COLS/2 + 0.5) * cellSize  <-- Wait, grid lines are at integers
        // Grid lines: (c - COLS/2) * cellSize
        // So cell 0 is from -COLS/2 to -COLS/2 + 1

        const c = Math.floor(worldPos.x / cellSize + cols / 2);
        const r = Math.floor(worldPos.y / cellSize + rows / 2);

        if (r >= 0 && r < rows && c >= 0 && c < cols) {
            onCellClick(r, c);
        }
    };

    return (
        <div className="flex justify-center items-center p-4">
            <canvas
                ref={canvasRef}
                width={canvasWidth}
                height={canvasHeight}
                onClick={handleCanvasClick}
                className="cursor-pointer touch-none"
                style={{
                    maxWidth: '100%',
                    height: 'auto',
                    background: 'transparent', // Let parent bg show
                    borderRadius: '24px',
                    border: '4px solid #000000', // Comic border
                    boxShadow: '8px 8px 0px rgba(0,0,0,0.1)' // Flat shadow
                }}
            />
        </div>
    );
};
