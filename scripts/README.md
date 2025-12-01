# SpacetimeDB Oracle Script

This script listens for finished games in SpacetimeDB and automatically calls `finishMatch()` on-chain to finalize the match results.

## Overview

When a game finishes in SpacetimeDB:
1. The oracle detects the finished game (status = "finished" with a winner)
2. It checks if the match is already finalized on-chain
3. If not, it calls `finishMatch(matchId, winner)` on the ChainOrbArena contract
4. After successful on-chain finalization, the match can be claimed by the winner

## Setup

### 1. Environment Variables

Create a `.env` file in the project root with:

```env
# Required
ORACLE_PRIVATE_KEY=0x... # Private key of the oracle wallet (must be authorized in contract)

# SpacetimeDB (optional - defaults shown)
NEXT_PUBLIC_SPACETIMEDB_HOST=wss://maincloud.spacetimedb.com
NEXT_PUBLIC_SPACETIMEDB_MODULE=chain-reaction

# RPC URLs (optional - uses default public RPCs if not set)
RPC_URL_BASE=https://mainnet.base.org
RPC_URL_ARBITRUM=https://arb1.arbitrum.io/rpc
```

### 2. Install Dependencies

```bash
npm install
```

If `tsx` is not installed (for running TypeScript directly):

```bash
npm install --save-dev tsx
```

### 3. Deploy Oracle Wallet

The oracle wallet address must be authorized in the ChainOrbArena contract as the oracle role. This is set during contract deployment or via `setOracle()` function.

Ensure the oracle wallet has enough ETH for gas fees on Base and Arbitrum.

## Running the Oracle

### Development

```bash
npm run oracle
```

Or directly with tsx:

```bash
npx tsx scripts/spacetimeOracle.ts
```

### Production (Recommended)

Run as a persistent service using:
- PM2: `pm2 start scripts/spacetimeOracle.ts --interpreter tsx`
- systemd service
- Docker container
- VPS with screen/tmux

## How It Works

1. **Connection**: Connects to SpacetimeDB using the configured module
2. **Subscription**: Subscribes to the `lobby` table, filtering for finished games
3. **Monitoring**: Listens for:
   - Initial finished games on startup
   - Updates when lobbies change status to "finished"
4. **Processing**: For each finished lobby:
   - Validates the game has a winner
   - Checks if already finalized on-chain
   - Calls `finishMatch()` transaction
   - Waits for confirmation
5. **Error Handling**: Logs errors and continues processing other games

## SpacetimeDB Schema Requirements

The `lobby` table should have:
- `status`: "waiting" | "live" | "finished" | "cancelled"
- `winnerAddress`: Winner's wallet address (null until game ends)
- `matchId`: On-chain match ID
- `chainId`: Chain ID (8453 for Base, 42161 for Arbitrum)
- `arenaAddress`: ChainOrbArena contract address

**Note**: To track which games have been settled on-chain, you may want to add:
- `settledOnchain: bool` field
- `settlementTxHash: string | null` field
- A reducer to update these fields after successful settlement

## Troubleshooting

### Connection Issues
- Check SpacetimeDB host and module name
- Verify network connectivity
- Check firewall rules

### Transaction Failures
- Verify oracle wallet has ETH for gas
- Check oracle address is authorized in contract
- Verify contract addresses are correct
- Check RPC endpoints are working

### No Games Detected
- Verify games are finishing in SpacetimeDB
- Check lobby status is being set to "finished"
- Ensure winner address is being set
- Check subscription query is correct

## Monitoring

The script logs:
- ✅ Successful settlements
- ❌ Errors and failures
- 🎯 New finished games detected
- 📡 Connection status

For production, consider:
- Logging to a file
- Setting up alerts for failures
- Monitoring gas balance
- Tracking settlement metrics

## Security

⚠️ **Important**:
- Never commit `.env` file with private keys
- Use a dedicated oracle wallet (not your main wallet)
- Store private keys securely
- Consider using a hardware wallet with transaction signing
- Monitor oracle wallet balance
- Set up alerts for unauthorized access


