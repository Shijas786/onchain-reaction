"use client";

import React, { useRef, useEffect, useState, useMemo } from "react";
import { Board, Cell, PlayerColor, ROWS, COLS } from "@/types/game";
import { getMaxCapacity, getNeighbors } from "@/lib/gameLogic";
import { soundManager } from "@/lib/sound";

interface BoardRendererProps {
    board: Board;
    onCellClick: (row: number, col: number) => void;
    animating: boolean;
    explosionQueue: { row: number; col: number }[];
    clearExplosionQueue: () => void;
}

// 3D Projection Constants
const CELL_SIZE = 50; // Base cell size in world units
const TILT_ANGLE = 0; // Radians (0 for top-down 2D)
const FOV = 800; // Field of view (focal length)
const CAMERA_Z = 600; // Distance from camera to center of board
const CAMERA_Y_OFFSET = 0; // Centered vertically

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
    onCellClick,
    animating,
    explosionQueue,
    clearExplosionQueue,
}) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
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

                // Particles removed

            });
            clearExplosionQueue();
        }
    }, [explosionQueue, clearExplosionQueue, board]);

    const drawOrbShape = (ctx: CanvasRenderingContext2D, x: number, y: number, scale: number, color: PlayerColor) => {
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
    };

    const drawOrbGroup = (
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
            // We don't rotate the context because that would flatten the orbs.
            // Instead we calculate positions.

            const x1 = Math.cos(angle) * dist;
            const y1 = Math.sin(angle) * dist * 0.6; // Flatten Y for perspective effect

            // Sort by depth (y) to draw back first
            const orbs = [
                { x: x1, y: y1, z: Math.sin(angle) },
                { x: -x1, y: -y1, z: -Math.sin(angle) }
            ].sort((a, b) => a.z - b.z); // Draw back (negative z/y in 2d projection logic) first? 
            // Actually in our tilt, lower Y on screen is further back? No, higher Y is closer?
            // Let's just draw them.

            orbs.forEach(o => drawOrbShape(ctx, o.x, o.y, scale, color)); // Relative to cx, cy
            // Wait, drawOrbShape takes absolute coords.

            ctx.restore();

            // Let's redo this simply without context translate for clarity
            const xOff = Math.cos(angle) * dist;
            const yOff = Math.sin(angle) * dist; // We are in 2D screen space now

            // Simple orbit
            drawOrbShape(ctx, cx - xOff, cy - yOff, scale, color);
            drawOrbShape(ctx, cx + xOff, cy + yOff, scale, color);
            return;
        }

        if (count >= 3) {
            const angle = Date.now() / 600; // Slower rotation (was 200)
            const dist = 14 * scale;

            const angles = [0, (Math.PI * 2) / 3, (Math.PI * 4) / 3];
            // Sort by "y" to draw back ones first (pseudo depth sorting)
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
    };

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

            // Clear & Background
            // Use clearRect to let the CSS background show through, or fill with paper color
            ctx.clearRect(0, 0, width, height);

            // Optional: Draw a paper texture or just keep it clean
            // ctx.fillStyle = "#fdfbf7";
            // ctx.fillRect(0, 0, width, height);

            // --- Draw Board Background ---
            const xMin = -COLS / 2 * CELL_SIZE;
            const xMax = COLS / 2 * CELL_SIZE;
            const yMin = -ROWS / 2 * CELL_SIZE;
            const yMax = ROWS / 2 * CELL_SIZE;

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
            for (let c = 0; c <= COLS; c++) {
                const xWorld = (c - COLS / 2) * CELL_SIZE;
                const yStart = -ROWS / 2 * CELL_SIZE;
                const yEnd = ROWS / 2 * CELL_SIZE;

                const p1 = project(xWorld, yStart, 0, width, height);
                const p2 = project(xWorld, yEnd, 0, width, height);

                ctx.beginPath();
                ctx.moveTo(p1.x, p1.y);
                ctx.lineTo(p2.x, p2.y);
                ctx.stroke();
            }

            // Horizontal Lines
            for (let r = 0; r <= ROWS; r++) {
                const yWorld = (r - ROWS / 2) * CELL_SIZE;
                const xStart = -COLS / 2 * CELL_SIZE;
                const xEnd = COLS / 2 * CELL_SIZE;

                const p1 = project(xStart, yWorld, 0, width, height);
                const p2 = project(xEnd, yWorld, 0, width, height);

                ctx.beginPath();
                ctx.moveTo(p1.x, p1.y);
                ctx.lineTo(p2.x, p2.y);
                ctx.stroke();
            }

            ctx.shadowBlur = 0; // Reset shadow for orbs

            // --- Draw Static Orbs ---
            // We need to draw from back (top of screen) to front (bottom of screen) for correct occlusion
            // In our coordinate system, lower Y world is further back.

            for (let r = 0; r < ROWS; r++) {
                for (let c = 0; c < COLS; c++) {
                    const isExploding = explodingCellsRef.current.some(ec => ec.r === r && ec.c === c);
                    if (isExploding) continue;

                    const cell = board[r][c];
                    if (cell.count > 0 && cell.owner) {
                        const xWorld = (c - COLS / 2 + 0.5) * CELL_SIZE;
                        const yWorld = (r - ROWS / 2 + 0.5) * CELL_SIZE;

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
                    // Interpolate in World Space
                    const startX = (orb.c - COLS / 2 + 0.5) * CELL_SIZE;
                    const startY = (orb.r - ROWS / 2 + 0.5) * CELL_SIZE;
                    const endX = (orb.tc - COLS / 2 + 0.5) * CELL_SIZE;
                    const endY = (orb.tr - ROWS / 2 + 0.5) * CELL_SIZE;

                    // Add a parabolic arc for Z
                    const currX = startX + (endX - startX) * orb.progress;
                    const currY = startY + (endY - startY) * orb.progress;
                    const arcHeight = 50 * Math.sin(orb.progress * Math.PI); // Jump effect
                    const currZ = arcHeight;

                    const p = project(currX, currY, currZ, width, height);
                    drawOrbShape(ctx, p.x, p.y, p.scale * 0.8, orb.color);
                }
            }

            // --- Draw Particles (Removed) ---


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
    }, [board]);

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
        // xWorld = (c - COLS/2 + 0.5) * CELL_SIZE  <-- Wait, grid lines are at integers
        // Grid lines: (c - COLS/2) * CELL_SIZE
        // So cell 0 is from -COLS/2 to -COLS/2 + 1

        const c = Math.floor(worldPos.x / CELL_SIZE + COLS / 2);
        const r = Math.floor(worldPos.y / CELL_SIZE + ROWS / 2);

        if (r >= 0 && r < ROWS && c >= 0 && c < COLS) {
            onCellClick(r, c);
        }
    };

    return (
        <div className="flex justify-center items-center p-4">
            <canvas
                ref={canvasRef}
                width={800}
                height={600}
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
