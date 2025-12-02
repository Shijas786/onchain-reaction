Onchain Reaction

Chain Reaction… but on-chain, realtime, and with USDC on the line.

This is a multiplayer Chain Reaction (Orbs) game that runs partly on-chain and partly on SpacetimeDB.
You place orbs, things explode, people rage-quit, winner takes the USDC pot. Works on Base and Arbitrum.

If you just want to play:
→ create match → join → place orbs → survive.
If you're a dev: keep reading.

🎮 TL;DR: What the Game Actually Is

You click a cell → an orb goes in.

When a cell hits its limit, it explodes and sends orbs to neighbors.

Colors flip, huge chain reactions happen, someone cries.

Last player with orbs wins the entire USDC entry pool.

Cell limits:

Cell Type	Capacity Before Boom
Corners	1
Edges	2
Center	3

That's it. Same rules as the classic mobile game — just turned into a Web3 deathmatch.

✨ What the App Actually Does
✔ Real-time online matches

SpacetimeDB handles turns, animations, eliminations — zero lag.

✔ On-chain USDC stakes

Create a match → set entry fee → players deposit → winner claims on-chain.

✔ Base + Arbitrum support

One repo, two contracts.
Arb = fast. Base = cheap.

✔ Local multiplayer

Old-school: 2–5 players on the same device.

✔ Clean UI

Doodle-ish board, smooth orbs, not the usual Web3 trash UI.

✔ Oracle service

A tiny background worker that finalizes SpacetimeDB games on-chain.

✔ Connect with AppKit

WalletConnect-based. Works on mobile, desktop, anything.

🛠 Tech Stack (as it is, not sugar-coated)

Frontend

Next.js (App Router)

React + Typescript

Tailwind

Framer Motion

Wagmi + Viem

Reown AppKit (WalletConnect v2, painless setup)

Backend

SpacetimeDB (Rust) → realtime game logic

Solidity contracts → deposits, payouts, escrow

Node oracle → listens to SpacetimeDB, writes to chain

Infra

Vercel (frontend)

Render (oracle)

Base + Arbitrum (contracts)

USDC (stable prize token)

📁 Repo Structure (developer-friendly version)
app/                # UI routes (Next.js)
 ├── local/         # offline multiplayer
 ├── online/        # online lobby + matches
 ├── profile/       # your matches + prizes
 └── api/           # serverless endpoints
components/         # UI + game components
contracts/          # Solidity contracts
spacetimedb-module/ # Rust realtime engine
backend/            # oracle
lib/                # utils, game logic, contract hooks
scripts/            # helpers (oracle runner, etc.)


If you're lost, look at components/game/* and lib/gameLogic.ts.

🚀 Running Locally (real steps, not fluff)

Clone it:

git clone <repo-url>
cd onchain-reaction-1


Install:
 
npm install

 
Add .env.local:

NEXT_PUBLIC_PROJECT_ID=walletconnect_project_id
NEXT_PUBLIC_SPACETIMEDB_HOST=xxxx
NEXT_PUBLIC_SPACETIMEDB_MODULE=xxxx
RPC_URL_BASE=https://mainnet.base.org
RPC_URL_ARBITRUM=https://arb1.arbitrum.io/rpc
ORACLE_PRIVATE_KEY=0xabc...


Run:
 
npm run dev


Now open:
http://localhost:3000

Good. If it crashes → your .env is wrong.

🎮 Playing Online Matches

1. Connect Wallet

2. Create Match

Choose Base or Arbitrum

Set entry fee (USDC)

Approve + deposit

3. Join Match

Send match ID to friends

They deposit USDC too

4. Play

Turn-based, real-time

SpacetimeDB syncs everything

5. Winner claims
Contract releases full prize to the final player standing.

🏗 How This All Works (simplified)
SpacetimeDB (off-chain but authoritative)

Tracks players

Tracks board

Validates moves

Triggers chain reactions

Detects winner

Think of it as "match engine".

Smart Contract (on-chain, money logic)

Holds everyone's USDC entry fee

Oracle calls finishMatch(matchId, winner)

Winner can withdraw prize

Oracle (bridge between them)

Polls SpacetimeDB for finished games

Calls contract with winner

That's it

No magic, no VRF, no randomness.

🔥 Deployment Quick Notes
Vercel (frontend)

Connect repo

Add envs

Push → auto deploy

Contracts

Deploy Base version

Deploy Arbitrum version

Update lib/contracts.ts

SpacetimeDB
spacetimedb login
spacetimedb publish <module-name>

Oracle

Deploy to Render / Railway / server

Set private key

Set RPCs

If oracle stops, games don't settle.
If contract is wrong, money is stuck.
If SpacetimeDB dies, matches freeze.
This is Web3. Don't screw deployments.

⚠️ Security (basic realism)

OZ contracts

No upgradeability

Owner restricted to oracle stuff only

Entry fees locked until finishMatch

Never expose private key

This isn't audited — use tiny stakes only.

🤝 Want to Contribute?

PRs are welcome if they're not stupid.
Open an issue if you're stuck.
