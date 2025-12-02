"use client";

import { useEffect } from "react";
import miniapp from "@farcaster/miniapp-sdk";

export default function MiniappPage() {
  useEffect(() => {
    miniapp.actions.ready();   // fixes splash sticking
  }, []);

  return (
    <main style={{ padding: 20 }}>
      <h1>Onchain Reaction</h1>
      <p>Mini App Loaded via new SDK</p>
    </main>
  );
}
