import { createPublicClient, http } from 'viem';
import { base, arbitrum } from 'viem/chains';
import { onchainReactionAbi } from './abi.js';

const CHAIN_CONFIG = {
    8453: { chain: base, rpc: 'https://mainnet.base.org' },
    42161: { chain: arbitrum, rpc: 'https://arb1.arbitrum.io/rpc' }
};

const ARENA_ADDRESSES = {
    8453: '0x426E2cA323fA707bd1921ECcce0a27aD7804b2A2',
    42161: '0x752267f970b1ddCF936F4EabA2d605B2d05167Eb'
};

/**
 * Check for expired matches and return list of IDs to cancel
 */
export async function checkExpiredMatches(chainId) {
    console.log(`[Expiration] Checking chain ${chainId}...`);

    const config = CHAIN_CONFIG[chainId];
    if (!config) return [];

    const publicClient = createPublicClient({
        chain: config.chain,
        transport: http(config.rpc),
    });

    const arenaAddress = ARENA_ADDRESSES[chainId];
    const expiredMatches = [];

    try {
        // Get next match ID
        const nextMatchId = await publicClient.readContract({
            address: arenaAddress,
            abi: onchainReactionAbi,
            functionName: 'nextMatchId',
        });

        const now = Math.floor(Date.now() / 1000);

        // Check last 20 matches (adjust as needed)
        const startId = Math.max(1, Number(nextMatchId) - 20);

        for (let id = Number(nextMatchId) - 1; id >= startId; id--) {
            try {
                await new Promise(r => setTimeout(r, 500)); // Rate limit protection

                const match = await publicClient.readContract({
                    address: arenaAddress,
                    abi: onchainReactionAbi,
                    functionName: 'matches',
                    args: [BigInt(id)],
                });

                const [host, token, entryFee, maxPlayers, prizePool, status, winner, createdAt, expiresAt] = match;

                // Check if expired and still Pending or Live
                if ((status === 0 || status === 1) && Number(expiresAt) < now) {
                    const expiredMinutes = Math.floor((now - Number(expiresAt)) / 60);
                    console.log(`[Expiration] Match ${id} expired ${expiredMinutes} minutes ago (Status: ${status})`);

                    expiredMatches.push({
                        id,
                        chainId,
                        status,
                        expiresAt: Number(expiresAt),
                        expiredMinutes
                    });
                }
            } catch (err) {
                // Skip matches that don't exist or can't be read
                if (!err.message?.includes('rate limit')) {
                    continue;
                }
            }
        }

        console.log(`[Expiration] Found ${expiredMatches.length} expired matches on chain ${chainId}`);
        return expiredMatches;

    } catch (error) {
        console.error(`[Expiration] Error checking chain ${chainId}:`, error.message);
        return [];
    }
}

/**
 * Run expiration check for all chains
 */
export async function runExpirationCheck() {
    console.log('\n[Expiration] Starting expiration check...');

    const allExpired = [];

    for (const chainId of [8453, 42161]) {
        const expired = await checkExpiredMatches(chainId);
        allExpired.push(...expired);
    }

    if (allExpired.length > 0) {
        console.log(`\n[Expiration] Total expired matches: ${allExpired.length}`);
        allExpired.forEach(m => {
            console.log(`  - Chain ${m.chainId}, Match ${m.id}: Expired ${m.expiredMinutes}m ago`);
        });
    } else {
        console.log('[Expiration] No expired matches found ✅');
    }

    return allExpired;
}
