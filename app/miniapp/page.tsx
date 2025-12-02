"use client";

import { useEffect } from "react";
import sdk from "@farcaster/frame-sdk";

export default function MiniappPage() {
  useEffect(() => {
    sdk.actions.ready();   // fixes splash sticking
  }, []);

  return (
    <main style={{ padding: 20 }}>
      <h1>Onchain Reaction</h1>
      <p>Mini App Loaded</p>
    </main>
  );
}
