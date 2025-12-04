import { createPublicClient, http } from 'viem';
import { base, arbitrum } from 'viem/chains';
import { onchainReactionAbi } from '../lib/onchainReaction';
import { ARENA_ADDRESSES, CHAIN_IDS } from '../lib/contracts';

async function checkOnChainMatches() {
    console.log('🔍 Checking on-chain match status...\n');

    const chains = [
        { id: CHAIN_IDS.BASE, name: 'Base', chain: base, rpc: 'https://mainnet.base.org' },
        { id: CHAIN_IDS.ARBITRUM, name: 'Arbitrum', chain: arbitrum, rpc: 'https://arb1.arbitrum.io/rpc' }
    ];

    for (const { id, name, chain, rpc } of chains) {
        console.log(`\n${'='.repeat(80)}`);
        console.log(`📊 ${name} Chain (ID: ${id})`);
        console.log(`Contract: ${ARENA_ADDRESSES[id]}`);
        console.log('='.repeat(80));

        const publicClient = createPublicClient({
            chain,
            transport: http(rpc),
        });

        try {
            // Get next match ID to know how many matches exist
            const nextMatchId = await publicClient.readContract({
                address: ARENA_ADDRESSES[id],
                abi: onchainReactionAbi,
                functionName: 'nextMatchId',
            }) as bigint;

            console.log(`\n📈 Next Match ID: ${nextMatchId}`);
            console.log(`Total matches created: ${Number(nextMatchId) - 1}\n`);

            // Check last 5 matches
            const matchesToCheck = Math.min(5, Number(nextMatchId) - 1);

            for (let i = Number(nextMatchId) - 1; i > Number(nextMatchId) - 1 - matchesToCheck && i > 0; i--) {
                console.log(`\n--- Match #${i} ---`);

                try {
                    const match = await publicClient.readContract({
                        address: ARENA_ADDRESSES[id],
                        abi: onchainReactionAbi,
                        functionName: 'matches',
                        args: [BigInt(i)],
                    }) as any;

                    const [host, token, entryFee, maxPlayers, prizePool, status, winner, createdAt, expiresAt] = match;

                    const statusText = ['Pending', 'Live', 'Finished', 'PaidOut', 'Cancelled'][status] || 'Unknown';

                    console.log(`  Host: ${host}`);
                    console.log(`  Status: ${statusText} (${status})`);
                    console.log(`  Prize Pool: ${prizePool.toString()}`);
                    console.log(`  Max Players: ${maxPlayers}`);
                    console.log(`  Winner: ${winner}`);
                    console.log(`  Created: ${new Date(Number(createdAt) * 1000).toLocaleString()}`);
                    console.log(`  Expires: ${new Date(Number(expiresAt) * 1000).toLocaleString()}`);

                    // Get players
                    const players = await publicClient.readContract({
                        address: ARENA_ADDRESSES[id],
                        abi: onchainReactionAbi,
                        functionName: 'getPlayers',
                        args: [BigInt(i)],
                    }) as string[];

                    console.log(`  Players (${players.length}/${maxPlayers}):`);
                    players.forEach((p, idx) => console.log(`    ${idx + 1}. ${p}`));

                    // Highlight stuck matches
                    if (status === 1) { // Live
                        console.log(`  ⚠️  MATCH IS LIVE - Check if game is progressing in SpacetimeDB`);
                    }

                } catch (err: any) {
                    console.log(`  ❌ Error reading match: ${err.message}`);
                }
            }

        } catch (error: any) {
            console.error(`❌ Error checking ${name}:`, error.message);
        }
    }

    console.log(`\n${'='.repeat(80)}\n`);
}

checkOnChainMatches().catch(console.error);
