import { createWalletClient, createPublicClient, http } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
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
 * Auto-cancel an expired match
 */
export async function autoCancelMatch(chainId, matchId) {
    console.log(`[Recovery] Auto-cancelling match ${matchId} on chain ${chainId}...`);

    const oraclePk = process.env.ORACLE_PRIVATE_KEY;
    if (!oraclePk) {
        console.error('[Recovery] ORACLE_PRIVATE_KEY not set - cannot auto-cancel');
        return { success: false, error: 'No oracle key' };
    }

    const config = CHAIN_CONFIG[chainId];
    if (!config) {
        return { success: false, error: 'Invalid chain' };
    }

    try {
        const account = privateKeyToAccount(oraclePk);

        const walletClient = createWalletClient({
            account,
            chain: config.chain,
            transport: http(config.rpc),
        });

        const publicClient = createPublicClient({
            chain: config.chain,
            transport: http(config.rpc),
        });

        const arenaAddress = ARENA_ADDRESSES[chainId];

        // Cancel the match
        const hash = await walletClient.writeContract({
            address: arenaAddress,
            abi: onchainReactionAbi,
            functionName: 'emergencyCancelMatch',
            args: [BigInt(matchId)],
        });

        console.log(`[Recovery] Cancel tx sent: ${hash}`);

        // Wait for confirmation
        await publicClient.waitForTransactionReceipt({ hash });

        console.log(`[Recovery] ✅ Match ${matchId} auto-cancelled successfully`);
        return { success: true, txHash: hash };

    } catch (error) {
        console.error(`[Recovery] ❌ Failed to auto-cancel match ${matchId}:`, error.message);
        return { success: false, error: error.message };
    }
}

/**
 * Run auto-recovery for unhealthy matches
 */
export async function runAutoRecovery(unhealthyMatches) {
    if (!unhealthyMatches || unhealthyMatches.length === 0) {
        return { recovered: 0, failed: 0 };
    }

    console.log(`\n[Recovery] Starting auto-recovery for ${unhealthyMatches.length} matches...`);

    let recovered = 0;
    let failed = 0;

    for (const match of unhealthyMatches) {
        // Only auto-recover HIGH severity issues
        const highSeverityIssues = match.issues?.filter(i => i.severity === 'HIGH') || [];

        if (highSeverityIssues.length === 0) {
            console.log(`[Recovery] Match ${match.matchId} has no HIGH severity issues - skipping`);
            continue;
        }

        for (const issue of highSeverityIssues) {
            if (issue.action === 'CANCEL') {
                // Auto-cancel expired matches
                const result = await autoCancelMatch(match.chainId, match.matchId);

                if (result.success) {
                    recovered++;
                    console.log(`[Recovery] ✅ Recovered match ${match.matchId}`);
                } else {
                    failed++;
                    console.log(`[Recovery] ❌ Failed to recover match ${match.matchId}: ${result.error}`);
                }

                // Add delay between transactions
                await new Promise(r => setTimeout(r, 2000));
            }
        }
    }

    console.log(`\n[Recovery] Auto-recovery complete: ${recovered} recovered, ${failed} failed`);
    return { recovered, failed };
}

/**
 * Auto-cancel expired matches
 */
export async function autoCancelExpired(expiredMatches) {
    if (!expiredMatches || expiredMatches.length === 0) {
        return { cancelled: 0, failed: 0 };
    }

    console.log(`\n[Recovery] Auto-cancelling ${expiredMatches.length} expired matches...`);

    let cancelled = 0;
    let failed = 0;

    for (const match of expiredMatches) {
        // Only auto-cancel if expired for at least 5 minutes (safety buffer)
        if (match.expiredMinutes < 5) {
            console.log(`[Recovery] Match ${match.id} only expired ${match.expiredMinutes}m ago - waiting`);
            continue;
        }

        const result = await autoCancelMatch(match.chainId, match.id);

        if (result.success) {
            cancelled++;
            console.log(`[Recovery] ✅ Auto-cancelled expired match ${match.id}`);
        } else {
            failed++;
            console.log(`[Recovery] ❌ Failed to cancel match ${match.id}: ${result.error}`);
        }

        // Add delay between transactions
        await new Promise(r => setTimeout(r, 2000));
    }

    console.log(`\n[Recovery] Expiration recovery complete: ${cancelled} cancelled, ${failed} failed`);
    return { cancelled, failed };
}
