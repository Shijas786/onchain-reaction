⚡ Onchain Reaction

Chain Reaction but with real money, real wallets, and real explosions.
Runs on Base + Arbitrum, uses SpacetimeDB for realtime turns, and connects wallets through Reown (WalletConnect AppKit) so users don’t suffer.

🔐 Wallet Connection (Reown AppKit)

The app uses Reown AppKit — basically WalletConnect but actually usable:

Connect from any wallet (MetaMask, Coinbase, Rabby, OKX, Uniswap, etc.)

Mobile ↔ desktop linking works smoothly

No weird popups or broken providers

Same experience on Farcaster Frames (when embedded)

Easy network switching between Base & Arbitrum

Stable session — doesn’t disconnect mid-match like raw WalletConnect

It’s wired up in:

app/providers.tsx
components/web3/AppKitProvider.tsx


You don’t need to touch anything unless you want to add custom themes or restrict supported wallets.

That’s it. It works, it’s stable, and it doesn’t pollute window.ethereum like half the crypto wallets do.

Full README (WITH Reown section included cleanly)

Use this version for your repo:

⚡ Onchain Reaction

A Chain Reaction (Orbs) multiplayer game that runs partly on-chain and partly in SpacetimeDB.
Winner gets the USDC pool. Supports Base, Arbitrum, and full wallet connection via Reown (WalletConnect AppKit).

🎮 TL;DR

Place orbs → cells explode → chain reactions happen → colors flip

Last player alive wins all the USDC

Realtime sync via SpacetimeDB

Deposits + claims handled by Base/Arbitrum smart contracts

Works on mobile + desktop, wallets via Reown

🔐 Wallets (Reown AppKit)

This app uses Reown AppKit for wallet connection — because plain Metamask injection is garbage when you also want to support mobile, WalletConnect, Farcaster Frames, and multiple browser extensions.

Why Reown works here:

Works universally across wallets

No “window.ethereum override” issues

Clean UI modal

Proper chain switching

Mobile QR connections are stable

Zero custom setup needed

Perfect for embedding inside Farcaster mini-apps

If a user can’t connect their wallet with Reown, it’s on their wallet — not on you.

✨ Features

🔥 2–5 player online matches

💰 Real USDC entry fees & prize pool

⚡ Realtime gameplay via SpacetimeDB

🔗 Base + Arbitrum contract support

🖥️ Smooth doodle-style 3D-ish board

🤝 Reown AppKit wallet connection (multi-wallet support)

🎯 Local multiplayer mode

🤖 Oracle auto-settles winners on-chain

🛠 Tech Stack
Frontend

Next.js (App Router)

React / TS

Tailwind

Framer Motion

Reown AppKit (WalletConnect)

Wagmi + viem

Backend

SpacetimeDB (Rust)

Solidity contracts

Oracle service (Node.js)

Infra

Vercel (frontend)

Render (oracle)

Base / Arbitrum (contracts)

📁 Repo Structure
app/
 ├─ local/        # offline matches
 ├─ online/       # online multiplayer
 ├─ profile/      # prizes, history
 ├─ api/          
components/
contracts/
lib/
spacetimedb-module/  # Rust real-time logic
backend/             # oracle
scripts/

🚀 Run it Locally
npm install
npm run dev


Add .env.local:

NEXT_PUBLIC_PROJECT_ID=<reown project id>
NEXT_PUBLIC_SPACETIMEDB_HOST=<host>
NEXT_PUBLIC_SPACETIMEDB_MODULE=<module>
RPC_URL_BASE=https://mainnet.base.org
RPC_URL_ARBITRUM=https://arb1.arbitrum.io/rpc
ORACLE_PRIVATE_KEY=0x...


Open → http://localhost:3000

🎮 Online Match Flow

Connect wallet (Reown modal pops up)

Create match

Choose Base / Arbitrum

Set entry fee

Approve USDC

Share match ID

Everyone joins

Game starts automatically

Winner claims USDC on-chain

🏆 Contracts

OnchainReactionBase.sol → Base

OnchainReactionArbitrum.sol → Arbitrum

Both store the pot, enforce deposits, and allow the winner to claim.

🔧 Oracle

Small Node script watching SpacetimeDB → calls finishMatch() on contract.

Lives in backend/.

🧱 Deployment Notes

Vercel for frontend

Render/Railway for oracle

SpacetimeDB via CLI

Contracts via Remix or Foundry

Make sure oracle runs 24/7 or matches won’t settle on-chain.

⚠️ Security Notes

This is not audited.
Use low-stakes USDC only.
