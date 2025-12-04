import dotenv from 'dotenv';
dotenv.config();

const STDB_HOST = "https://maincloud.spacetimedb.com";
const STDB_NAME = "chain-reaction";

async function clearTable(tableName: string) {
    try {
        console.log(`\n🗑️  Clearing table: ${tableName}...`);

        // First, get all rows
        const selectRes = await fetch(`${STDB_HOST}/database/sql/${STDB_NAME}`, {
            method: "POST",
            headers: { "Content-Type": "text/plain" },
            body: `SELECT * FROM ${tableName}`
        });

        if (!selectRes.ok) {
            console.log(`❌ Failed to query ${tableName}: ${selectRes.statusText}`);
            return;
        }

        const data = await selectRes.json();
        const rowCount = data.data ? data.data.length : 0;

        console.log(`   Found ${rowCount} rows in ${tableName}`);

        if (rowCount === 0) {
            console.log(`   ✅ Table ${tableName} is already empty`);
            return;
        }

        // Note: SpacetimeDB doesn't support DELETE via SQL endpoint
        // You need to use the SpacetimeDB CLI or dashboard to delete rows
        console.log(`   ⚠️  Cannot delete via SQL endpoint`);
        console.log(`   📋 Use SpacetimeDB dashboard or CLI to clear this table`);

    } catch (error: any) {
        console.error(`❌ Error clearing ${tableName}:`, error.message);
    }
}

async function main() {
    console.log('🔍 SpacetimeDB Cleanup Script');
    console.log(`Host: ${STDB_HOST}`);
    console.log(`Database: ${STDB_NAME}`);
    console.log('='.repeat(60));

    // Tables to clear
    const tables = ['lobby', 'game_state', 'player'];

    for (const table of tables) {
        await clearTable(table);
    }

    console.log('\n' + '='.repeat(60));
    console.log('\n📋 Manual Cleanup Instructions:');
    console.log('\n1. Go to SpacetimeDB dashboard:');
    console.log('   https://spacetimedb.com/');
    console.log('\n2. Navigate to your database: chain-reaction');
    console.log('\n3. For each table (lobby, game_state, player):');
    console.log('   - Click on the table');
    console.log('   - Select all rows');
    console.log('   - Click "Delete"');
    console.log('\nOR use SpacetimeDB CLI:');
    console.log('   spacetime sql chain-reaction "DELETE FROM lobby"');
    console.log('   spacetime sql chain-reaction "DELETE FROM game_state"');
    console.log('   spacetime sql chain-reaction "DELETE FROM player"');
    console.log('\n✅ This will ensure only V3 matches show in the UI');
}

main().catch(console.error);
