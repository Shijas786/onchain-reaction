"use client";

import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { DoodleText } from "@/components/ui/DoodleText";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-8 bg-transparent relative overflow-hidden">
      {/* Wallet Connect Button - Top Right */}
      <div className="absolute top-4 right-4 z-20">
        <appkit-button />
      </div>

      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-30">
        <div className="absolute top-10 left-10 w-32 h-32 bg-[#FF9AA2] rounded-full blur-xl border-4 border-black" />
        <div className="absolute bottom-10 right-10 w-64 h-64 bg-[#C7CEEA] rounded-full blur-xl border-4 border-black" />
        <div className="absolute top-1/2 left-1/2 w-96 h-96 bg-[#FFF7B1] rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2" />
      </div>

      <div className="z-10 flex flex-col items-center gap-8">
        <DoodleText />

        <div className="text-center space-y-2">
          <p className="text-2xl font-medium text-slate-500">Orbs Edition</p>
        </div>

        <div className="flex flex-col gap-4 w-full max-w-xs">
          <Link href="/local" className="w-full">
            <Button
              variant="primary"
              size="lg"
              className="w-full border-4 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all bg-[#FF9AA2] text-black font-bold rounded-2xl"
            >
              Local Multiplayer
            </Button>
          </Link>
          <Link href="/online" className="w-full">
            <Button
              variant="secondary"
              size="lg"
              className="w-full border-4 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all bg-[#C7CEEA] text-black font-bold rounded-2xl"
            >
              Online Multiplayer 💰
            </Button>
          </Link>
          <Link href="/profile/prizes" className="w-full">
            <Button
              variant="success"
              size="md"
              className="w-full border-4 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all bg-[#B5EAD7] text-black font-bold rounded-2xl"
            >
              🏆 Rewards History
            </Button>
          </Link>
        </div>

        {/* Web3 Info */}
        <div className="text-center text-xs text-slate-400 mt-4">
          <p>Play for USDC on Base & Arbitrum</p>
        </div>
      </div>
    </main>
  );
}
