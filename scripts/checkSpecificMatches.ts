import { createPublicClient, http } from 'viem';
import { base } from 'viem/chains';
import { onchainReactionAbi } from '../lib/onchainReaction';
import { ARENA_ADDRESSES, CHAIN_IDS } from '../lib/contracts';

async function checkSpecificMatches() {
    const matchIds = [15, 14, 13];

    console.log('🔍 Checking specific matches on Base...\n');
    console.log(`Contract: ${ARENA_ADDRESSES[CHAIN_IDS.BASE]}\n`);
    console.log('='.repeat(80));

    const publicClient = createPublicClient({
        chain: base,
        transport: http('https://mainnet.base.org'),
    });

    for (const id of matchIds) {
        console.log(`\n📊 Match #${id}`);
        console.log('-'.repeat(80));

        try {
            // Add delay to avoid rate limiting
            await new Promise(r => setTimeout(r, 2000));

            const match = await publicClient.readContract({
                address: ARENA_ADDRESSES[CHAIN_IDS.BASE],
                abi: onchainReactionAbi,
                functionName: 'matches',
                args: [BigInt(id)],
            }) as any;

            const [host, token, entryFee, maxPlayers, prizePool, status, winner, createdAt, expiresAt] = match;

            const statusNames = ['Pending', 'Live', 'Finished', 'PaidOut', 'Cancelled'];
            const statusText = statusNames[status] || 'Unknown';

            console.log(`Host:        ${host}`);
            console.log(`Status:      ${statusText} (${status})`);
            console.log(`Prize Pool:  ${prizePool.toString()}`);
            console.log(`Max Players: ${maxPlayers}`);
            console.log(`Winner:      ${winner}`);
            console.log(`Created:     ${new Date(Number(createdAt) * 1000).toLocaleString()}`);
            console.log(`Expires:     ${new Date(Number(expiresAt) * 1000).toLocaleString()}`);

            // Get players
            await new Promise(r => setTimeout(r, 1000));
            const players = await publicClient.readContract({
                address: ARENA_ADDRESSES[CHAIN_IDS.BASE],
                abi: onchainReactionAbi,
                functionName: 'getPlayers',
                args: [BigInt(id)],
            }) as string[];

            console.log(`Players:     ${players.length}/${maxPlayers}`);
            players.forEach((p, idx) => console.log(`  ${idx + 1}. ${p}`));

            // Analysis
            if (status === 1) { // Live
                const now = Date.now() / 1000;
                const expired = now > Number(expiresAt);
                console.log(`\n⚠️  MATCH IS LIVE`);
                console.log(`   Expired: ${expired ? 'YES - Should be cancelled' : 'NO - Still valid'}`);
                console.log(`   Action: ${expired ? 'Emergency cancel recommended' : 'Check SpacetimeDB for game progress'}`);
            } else if (status === 0) { // Pending
                const now = Date.now() / 1000;
                const expired = now > Number(expiresAt);
                console.log(`\n⏳ MATCH IS PENDING`);
                console.log(`   Expired: ${expired ? 'YES - Can be cancelled' : 'NO - Waiting for players'}`);
            } else if (status === 3) { // PaidOut
                console.log(`\n✅ MATCH COMPLETED - Prize claimed by ${winner}`);
            } else if (status === 2) { // Finished
                console.log(`\n🏁 MATCH FINISHED - Waiting for prize claim`);
            } else if (status === 4) { // Cancelled
                console.log(`\n❌ MATCH CANCELLED`);
            }

        } catch (error: any) {
            console.log(`❌ Error: ${error.message}`);
            if (error.message.includes('rate limit')) {
                console.log('   Waiting 5 seconds before retry...');
                await new Promise(r => setTimeout(r, 5000));
            }
        }
    }

    console.log('\n' + '='.repeat(80));
}

checkSpecificMatches().catch(console.error);
