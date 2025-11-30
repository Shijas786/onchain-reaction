# SpacetimeDB Module for Chain Reaction

This directory contains the SpacetimeDB server module for real-time multiplayer game state.

## Setup

### 1. Install SpacetimeDB CLI

```bash
# macOS/Linux
curl -sSf https://install.spacetimedb.com | sh

# Windows (PowerShell)
iwr https://windows.spacetimedb.com -useb | iex
```

### 2. Login to SpacetimeDB

```bash
spacetime login
```

### 3. Deploy the Module

```bash
cd spacetimedb
spacetime publish chain-reaction --project-path .
```

### 4. Generate Client Code

```bash
spacetime generate --lang typescript --out-dir ../lib/spacetimedb --project-path .
```

## Module Structure

- `module.ts` - Main SpacetimeDB module with tables and reducers
- Tables:
  - `Lobby` - Match lobbies with chain/contract info
  - `LobbyPlayer` - Players in each lobby
  - `GameState` - Current game board state
- Reducers:
  - `create_lobby` - Host creates a new lobby
  - `join_lobby` - Player joins existing lobby
  - `start_game` - Host starts the match
  - `make_move` - Player places an orb
  - `finish_game` - Mark winner and trigger contract sync

## Architecture

```
Frontend (Next.js)
    ↓ WebSocket
SpacetimeDB (Real-time state)
    ↓ Oracle wallet
Smart Contract (USDC escrow)
```

