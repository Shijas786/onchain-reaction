
import { createPublicClient, http, parseAbi } from 'viem';
import { base } from 'viem/chains';

const ARENA_ADDRESS = '0x7B04eb09b6748097067c7C9d97C545ADDFD7C97E';

const abi = parseAbi([
    'function matches(uint256) view returns (address host, address token, uint256 entryFee, uint256 maxPlayers, uint256 prizePool, uint8 status, address winner, uint256 createdAt, uint256 expiresAt)'
]);

const client = createPublicClient({
    chain: base,
    transport: http()
});

const STATUS_MAP = [
    'Pending',
    'Live',
    'Finished',
    'PaidOut',
    'Cancelled'
];

async function main() {
    console.log('Querying matches 33-38 on Base...');

    for (let i = 33; i <= 38; i++) {
        await new Promise(r => setTimeout(r, 1000)); // Add delay
        try {
            const data = await client.readContract({
                address: ARENA_ADDRESS,
                abi: abi,
                functionName: 'matches',
                args: [BigInt(i)]
            });

            console.log(`\nMatch #${i}:`);
            console.log(`  Host: ${data[0]}`);
            console.log(`  Token: ${data[1]}`);
            console.log(`  Entry Fee: ${data[2]}`);
            console.log(`  Max Players: ${data[3]}`);
            console.log(`  Prize Pool: ${data[4]}`);
            console.log(`  Status: ${STATUS_MAP[data[5]]} (${data[5]})`);
            console.log(`  Winner: ${data[6]}`);
            console.log(`  Created At: ${new Date(Number(data[7]) * 1000).toISOString()}`);
            console.log(`  Expires At: ${new Date(Number(data[8]) * 1000).toISOString()}`);

        } catch (error) {
            console.error(`Error fetching match #${i}:`, error);
        }
    }
}

main();
