"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { motion } from "framer-motion";

export default function OnlineMenu() {
    const [roomId, setRoomId] = useState("");
    const router = useRouter();

    const handleJoin = () => {
        if (roomId.trim()) {
            router.push(`/online/game/${roomId}`);
        }
    };

    const handleCreate = () => {
        // Generate a random room ID or let the server handle it.
        // For now, we'll just generate a random 4-char code.
        const newRoomId = Math.random().toString(36).substring(2, 6).toUpperCase();
        router.push(`/online/game/${newRoomId}?host=true`);
    };

    return (
        <main className="flex min-h-screen flex-col items-center justify-center p-8 bg-slate-50">
            <div className="w-full max-w-md space-y-8">
                <div className="text-center">
                    <h1 className="text-4xl font-black text-slate-800 mb-2">Online Multiplayer</h1>
                    <p className="text-slate-500">Play with friends remotely</p>
                </div>

                <div className="bg-white p-8 rounded-3xl shadow-xl border border-slate-100 space-y-6">

                    <div className="space-y-4">
                        <Button
                            variant="primary"
                            size="lg"
                            className="w-full"
                            onClick={handleCreate}
                        >
                            Create Room
                        </Button>

                        <div className="relative flex py-2 items-center">
                            <div className="flex-grow border-t border-slate-200"></div>
                            <span className="flex-shrink mx-4 text-slate-400 text-sm font-bold">OR</span>
                            <div className="flex-grow border-t border-slate-200"></div>
                        </div>

                        <div className="flex gap-2">
                            <input
                                type="text"
                                placeholder="Enter Room ID"
                                value={roomId}
                                onChange={(e) => setRoomId(e.target.value.toUpperCase())}
                                className="flex-1 bg-slate-100 border-none rounded-xl px-4 py-3 font-bold text-slate-800 placeholder:text-slate-400 focus:ring-2 focus:ring-blue-400 outline-none uppercase"
                                maxLength={6}
                            />
                            <Button
                                variant="secondary"
                                onClick={handleJoin}
                                disabled={!roomId}
                            >
                                Join
                            </Button>
                        </div>
                    </div>
                </div>

                <div className="text-center">
                    <Button variant="secondary" size="sm" onClick={() => router.back()} className="bg-slate-200 text-slate-600 hover:bg-slate-300 shadow-none">
                        Back
                    </Button>
                </div>
            </div>
        </main>
    );
}
