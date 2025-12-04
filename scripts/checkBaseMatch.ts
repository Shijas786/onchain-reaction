
import { createPublicClient, http, parseAbi } from 'viem';
import { base } from 'viem/chains';

const ARENA_ADDRESS = '0x426E2cA323fA707bd1921ECcce0a27aD7804b2A2'; // OnchainReactionBaseV3
const HOST_ADDRESS = '0x6C31212a23040998E1D1c157ACe3982aBDBE3154';

const abi = parseAbi([
    'function isPlayerInMatch(uint256, address) view returns (bool)'
]);

const client = createPublicClient({
    chain: base,
    transport: http()
});

async function main() {
    console.log(`Checking Matches 33-38 on Base...`);
    console.log(`Arena: ${ARENA_ADDRESS}`);
    console.log(`Host: ${HOST_ADDRESS}`);

    for (let i = 33; i <= 38; i++) {
        await new Promise(r => setTimeout(r, 1000)); // Add delay
        const matchId = BigInt(i);
        try {
            const isPlayer = await client.readContract({
                address: ARENA_ADDRESS,
                abi: abi,
                functionName: 'isPlayerInMatch',
                args: [matchId, HOST_ADDRESS]
            });
            console.log(`Match ${matchId}: Host is player? ${isPlayer}`);
        } catch (error) {
            console.error(`Error checking match ${matchId}:`, error);
        }
    }
}

main();
