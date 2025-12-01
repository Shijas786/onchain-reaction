"use client";

import React, { useRef, useState, useEffect } from "react";

interface ZoomPanPinchProps {
    children: React.ReactNode;
    className?: string;
    minScale?: number;
    maxScale?: number;
}

export const ZoomPanPinch: React.FC<ZoomPanPinchProps> = ({
    children,
    className = "",
    minScale = 1,
    maxScale = 4,
}) => {
    const [scale, setScale] = useState(1);
    const [position, setPosition] = useState({ x: 0, y: 0 });
    const containerRef = useRef<HTMLDivElement>(null);

    // State for gesture tracking
    const lastTouchRef = useRef<{ x: number; y: number } | null>(null);
    const lastDistRef = useRef<number | null>(null);
    const isDraggingRef = useRef(false);

    useEffect(() => {
        const container = containerRef.current;
        if (!container) return;

        const handleTouchStart = (e: TouchEvent) => {
            if (e.touches.length === 1) {
                lastTouchRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
                isDraggingRef.current = true;
            } else if (e.touches.length === 2) {
                const dist = Math.hypot(
                    e.touches[0].clientX - e.touches[1].clientX,
                    e.touches[0].clientY - e.touches[1].clientY
                );
                lastDistRef.current = dist;
                isDraggingRef.current = true;
            }
        };

        const handleTouchMove = (e: TouchEvent) => {
            if (!isDraggingRef.current) return;
            e.preventDefault(); // Prevent scrolling

            if (e.touches.length === 1 && lastTouchRef.current) {
                // Pan
                const dx = e.touches[0].clientX - lastTouchRef.current.x;
                const dy = e.touches[0].clientY - lastTouchRef.current.y;

                setPosition((prev) => ({
                    x: prev.x + dx,
                    y: prev.y + dy,
                }));

                lastTouchRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
            } else if (e.touches.length === 2 && lastDistRef.current) {
                // Pinch
                const dist = Math.hypot(
                    e.touches[0].clientX - e.touches[1].clientX,
                    e.touches[0].clientY - e.touches[1].clientY
                );

                const delta = dist - lastDistRef.current;
                const zoomFactor = delta * 0.005; // Sensitivity

                setScale((prevScale) => {
                    const newScale = Math.min(Math.max(prevScale + zoomFactor, minScale), maxScale);
                    return newScale;
                });

                lastDistRef.current = dist;
            }
        };

        const handleTouchEnd = () => {
            isDraggingRef.current = false;
            lastTouchRef.current = null;
            lastDistRef.current = null;
        };

        // Mouse Events
        const handleMouseDown = (e: MouseEvent) => {
            isDraggingRef.current = true;
            lastTouchRef.current = { x: e.clientX, y: e.clientY };
            container.style.cursor = "grabbing";
        };

        const handleMouseMove = (e: MouseEvent) => {
            if (!isDraggingRef.current || !lastTouchRef.current) return;
            e.preventDefault();

            const dx = e.clientX - lastTouchRef.current.x;
            const dy = e.clientY - lastTouchRef.current.y;

            setPosition((prev) => ({
                x: prev.x + dx,
                y: prev.y + dy,
            }));

            lastTouchRef.current = { x: e.clientX, y: e.clientY };
        };

        const handleMouseUp = () => {
            isDraggingRef.current = false;
            lastTouchRef.current = null;
            container.style.cursor = "grab";
        };

        const handleWheel = (e: WheelEvent) => {
            e.preventDefault();
            const zoomFactor = -e.deltaY * 0.001;
            setScale((prevScale) => {
                const newScale = Math.min(Math.max(prevScale + zoomFactor, minScale), maxScale);
                return newScale;
            });
        };

        // Add non-passive event listeners to prevent scrolling
        container.addEventListener("touchstart", handleTouchStart, { passive: false });
        container.addEventListener("touchmove", handleTouchMove, { passive: false });
        container.addEventListener("touchend", handleTouchEnd);
        container.addEventListener("touchcancel", handleTouchEnd);

        container.addEventListener("mousedown", handleMouseDown);
        window.addEventListener("mousemove", handleMouseMove);
        window.addEventListener("mouseup", handleMouseUp);
        container.addEventListener("wheel", handleWheel, { passive: false });

        return () => {
            container.removeEventListener("touchstart", handleTouchStart);
            container.removeEventListener("touchmove", handleTouchMove);
            container.removeEventListener("touchend", handleTouchEnd);
            container.removeEventListener("touchcancel", handleTouchEnd);

            container.removeEventListener("mousedown", handleMouseDown);
            window.removeEventListener("mousemove", handleMouseMove);
            window.removeEventListener("mouseup", handleMouseUp);
            container.removeEventListener("wheel", handleWheel);
        };
    }, [minScale, maxScale]);

    return (
        <div
            ref={containerRef}
            className={`relative overflow-hidden touch-none ${className}`}
            style={{ cursor: "grab" }}
        >
            <div
                style={{
                    transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`,
                    transformOrigin: "center center",
                    transition: "transform 0.1s ease-out",
                    width: "100%",
                    height: "100%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                }}
            >
                {children}
            </div>
        </div>
    );
};
