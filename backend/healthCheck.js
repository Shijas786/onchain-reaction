import { createPublicClient, http } from 'viem';
import { base, arbitrum } from 'viem/chains';
import { onchainReactionAbi } from '../lib/onchainReaction.js';

const CHAIN_CONFIG = {
    8453: { chain: base, rpc: 'https://mainnet.base.org' },
    42161: { chain: arbitrum, rpc: 'https://arb1.arbitrum.io/rpc' }
};

const ARENA_ADDRESSES = {
    8453: '0x426E2cA323fA707bd1921ECcce0a27aD7804b2A2',
    42161: '0x752267f970b1ddCF936F4EabA2d605B2d05167Eb'
};

/**
 * Health check: Compare blockchain state with expected state
 */
export async function checkMatchHealth(chainId, matchId) {
    const config = CHAIN_CONFIG[chainId];
    if (!config) {
        return { healthy: false, error: 'Invalid chain' };
    }

    const publicClient = createPublicClient({
        chain: config.chain,
        transport: http(config.rpc),
    });

    const arenaAddress = ARENA_ADDRESSES[chainId];

    try {
        const match = await publicClient.readContract({
            address: arenaAddress,
            abi: onchainReactionAbi,
            functionName: 'matches',
            args: [BigInt(matchId)],
        });

        const [host, token, entryFee, maxPlayers, prizePool, status, winner, createdAt, expiresAt] = match;

        const now = Math.floor(Date.now() / 1000);
        const isExpired = Number(expiresAt) < now;
        const statusNames = ['Pending', 'Live', 'Finished', 'PaidOut', 'Cancelled'];

        // Health checks
        const issues = [];

        // Issue 1: Expired but still Pending/Live
        if (isExpired && (status === 0 || status === 1)) {
            issues.push({
                type: 'EXPIRED',
                severity: 'HIGH',
                message: `Match expired ${Math.floor((now - Number(expiresAt)) / 60)}m ago but still ${statusNames[status]}`,
                action: 'CANCEL'
            });
        }

        // Issue 2: Live for too long (>30 minutes)
        if (status === 1) {
            const liveMinutes = Math.floor((now - Number(createdAt)) / 60);
            if (liveMinutes > 30) {
                issues.push({
                    type: 'STUCK_LIVE',
                    severity: 'MEDIUM',
                    message: `Match has been Live for ${liveMinutes} minutes`,
                    action: 'INVESTIGATE'
                });
            }
        }

        // Issue 3: Finished but not paid out for >1 hour
        if (status === 2) {
            const finishedMinutes = Math.floor((now - Number(createdAt)) / 60);
            if (finishedMinutes > 60) {
                issues.push({
                    type: 'UNCLAIMED_PRIZE',
                    severity: 'LOW',
                    message: `Prize unclaimed for ${finishedMinutes} minutes`,
                    action: 'NOTIFY_WINNER'
                });
            }
        }

        return {
            healthy: issues.length === 0,
            matchId,
            chainId,
            status: statusNames[status],
            issues,
            details: {
                host,
                prizePool: prizePool.toString(),
                winner,
                isExpired,
                createdAt: Number(createdAt),
                expiresAt: Number(expiresAt)
            }
        };

    } catch (error) {
        return {
            healthy: false,
            matchId,
            chainId,
            error: error.message
        };
    }
}

/**
 * Run health check on recent matches
 */
export async function runHealthCheck() {
    console.log('\n[HealthCheck] Starting health check...');

    const unhealthyMatches = [];

    for (const chainId of [8453, 42161]) {
        const config = CHAIN_CONFIG[chainId];
        const publicClient = createPublicClient({
            chain: config.chain,
            transport: http(config.rpc),
        });

        try {
            const nextMatchId = await publicClient.readContract({
                address: ARENA_ADDRESSES[chainId],
                abi: onchainReactionAbi,
                functionName: 'nextMatchId',
            });

            // Check last 10 matches
            const startId = Math.max(1, Number(nextMatchId) - 10);

            for (let id = Number(nextMatchId) - 1; id >= startId; id--) {
                await new Promise(r => setTimeout(r, 500)); // Rate limit

                const health = await checkMatchHealth(chainId, id);

                if (!health.healthy && health.issues) {
                    unhealthyMatches.push(health);

                    console.log(`[HealthCheck] ⚠️  Chain ${chainId}, Match ${id}:`);
                    health.issues.forEach(issue => {
                        console.log(`  - [${issue.severity}] ${issue.message}`);
                        console.log(`    Action: ${issue.action}`);
                    });
                }
            }

        } catch (error) {
            console.error(`[HealthCheck] Error on chain ${chainId}:`, error.message);
        }
    }

    if (unhealthyMatches.length === 0) {
        console.log('[HealthCheck] All matches healthy ✅');
    } else {
        console.log(`\n[HealthCheck] Found ${unhealthyMatches.length} unhealthy matches`);
    }

    return unhealthyMatches;
}
