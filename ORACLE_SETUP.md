# Oracle Setup Guide

This guide explains how to set up and run the SpacetimeDB Oracle that bridges finished games to the blockchain.

## What the Oracle Does

When a Chain Reaction game finishes in SpacetimeDB, the oracle:
1. Detects the finished game with a winner
2. Calls `finishMatch(matchId, winner)` on the ChainOrbArena contract
3. This makes the prize pool claimable by the winner

## Files Created

1. **`lib/onchainReaction.ts`** - Minimal ABI for frontend UI (only needed functions)
2. **`lib/tokens.ts`** - Token addresses per chain (USDC, JESSE)
3. **`lib/onchainReactionClient.ts`** - Helper functions for contract interactions
4. **`scripts/spacetimeOracle.ts`** - The oracle worker script
5. **`scripts/README.md`** - Detailed oracle documentation

## Quick Start

### 1. Set Up Environment Variables

Add to your `.env.local` or `.env`:

```env
ORACLE_PRIVATE_KEY=0x...your_oracle_wallet_private_key

# Optional RPC URLs (uses defaults if not set)
RPC_URL_BASE=https://mainnet.base.org
RPC_URL_ARBITRUM=https://arb1.arbitrum.io/rpc
```

### 2. Install Dependencies

```bash
npm install
```

This installs `tsx` (for running TypeScript) and `dotenv` (for environment variables).

### 3. Set Up Oracle Wallet

1. Create a new wallet or use an existing one for the oracle
2. Fund it with ETH on both Base and Arbitrum for gas fees
3. Make sure this wallet address is set as the oracle in your ChainOrbArena contract:
   - Either during deployment
   - Or by calling `setOracle(oracleAddress)` as the owner

### 4. Run the Oracle

```bash
npm run oracle
```

The oracle will:
- Connect to SpacetimeDB
- Subscribe to finished games
- Process each finished game and call `finishMatch()` on-chain
- Log all activities

## Production Deployment

For production, run the oracle as a persistent service:

### Option 1: PM2 (Recommended)

```bash
npm install -g pm2
pm2 start npm --name "oracle" -- run oracle
pm2 save
pm2 startup
```

### Option 2: Docker

Create a `Dockerfile.oracle`:

```dockerfile
FROM node:20
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
CMD ["npm", "run", "oracle"]
```

### Option 3: systemd Service

Create `/etc/systemd/system/oracle.service`:

```ini
[Unit]
Description=Chain Reaction Oracle
After=network.target

[Service]
Type=simple
User=your-user
WorkingDirectory=/path/to/onchain-reaction-1
Environment=NODE_ENV=production
ExecStart=/usr/bin/npm run oracle
Restart=always

[Install]
WantedBy=multi-user.target
```

Then:
```bash
sudo systemctl enable oracle
sudo systemctl start oracle
```

## Monitoring

The oracle logs:
- ✅ Successful settlements
- ❌ Errors
- 🎯 New finished games
- 📡 Connection status

Monitor:
- Oracle wallet balance (needs ETH for gas)
- Failed transactions (may need retry logic)
- SpacetimeDB connection stability

## SpacetimeDB Schema Note

Currently, the `lobby` table doesn't track if a match has been settled on-chain. To avoid duplicate settlements, the oracle:

1. Checks on-chain match status before settling
2. Skips if already finalized

To improve this, consider adding to your SpacetimeDB Rust module:
- `settled_onchain: bool` field
- `settlement_tx_hash: Option<String>` field
- A reducer to mark as settled after successful settlement

## Troubleshooting

### "Missing ORACLE_PRIVATE_KEY"
- Add `ORACLE_PRIVATE_KEY=0x...` to your `.env` file

### "Transaction reverted"
- Check oracle address is authorized in contract
- Verify contract addresses are correct
- Check gas price is reasonable

### "Connection timeout"
- Verify SpacetimeDB host URL
- Check network connectivity
- Verify module name is correct

### Games not being detected
- Check SpacetimeDB logs - are games finishing?
- Verify lobby status is set to "finished"
- Ensure winner_address is set

## Next Steps

1. ✅ Oracle script created
2. ⚠️ Add `settled_onchain` field to SpacetimeDB lobby table (optional)
3. ⚠️ Set oracle address in ChainOrbArena contract
4. ⚠️ Deploy oracle as a persistent service
5. ⚠️ Set up monitoring/alerting
6. ⚠️ Test end-to-end flow

