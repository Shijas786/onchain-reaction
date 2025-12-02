"use client";

import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { DoodleText } from "@/components/ui/DoodleText";
import { HowToPlay } from "@/components/ui/HowToPlay";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-4 md:p-8 bg-transparent relative overflow-y-auto">
      {/* Wallet Connect Button - Top Right */}
      <div className="absolute top-4 right-4 z-20">
        <appkit-button />
      </div>

      {/* Background Image */}
      <div className="absolute inset-0 z-0">
        <img
          src="/homescreen-bg.jpg"
          alt="Background"
          className="w-full h-full object-cover opacity-50"
        />
      </div>

      <div className="z-10 flex flex-col items-center gap-8">
        <DoodleText />

        <div className="text-center space-y-2">

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

        {/* How to Play */}
        <div className="mt-4">
          <HowToPlay />
        </div>
      </div>
    </main>
  );
}
