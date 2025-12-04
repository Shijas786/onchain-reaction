import dotenv from 'dotenv';
dotenv.config();

const STDB_HOST = "https://maincloud.spacetimedb.com";
const STDB_NAME = "chain-reaction";

async function checkDatabase() {
    console.log('🔍 Checking SpacetimeDB for stuck games...\n');
    console.log(`Host: ${STDB_HOST}`);
    console.log(`Database: ${STDB_NAME}\n`);
    console.log('='.repeat(80));

    try {
        // Check lobbies
        console.log('\n📋 LOBBIES:');
        const lobbyRes = await fetch(`${STDB_HOST}/database/sql/${STDB_NAME}`, {
            method: "POST",
            headers: { "Content-Type": "text/plain" },
            body: `SELECT * FROM lobby ORDER BY id DESC LIMIT 5`
        });

        if (lobbyRes.ok) {
            const lobbyData = await lobbyRes.json();
            console.log(JSON.stringify(lobbyData, null, 2));
        } else {
            console.log(`❌ Failed to query lobbies: ${lobbyRes.status} ${lobbyRes.statusText}`);
        }

        // Check game states
        console.log('\n\n🎮 GAME STATES:');
        const gameRes = await fetch(`${STDB_HOST}/database/sql/${STDB_NAME}`, {
            method: "POST",
            headers: { "Content-Type": "text/plain" },
            body: `SELECT * FROM game_state ORDER BY lobby_id DESC LIMIT 5`
        });

        if (gameRes.ok) {
            const gameData = await gameRes.json();
            console.log(JSON.stringify(gameData, null, 2));
        } else {
            console.log(`❌ Failed to query game_state: ${gameRes.status} ${gameRes.statusText}`);
        }

        // Check players
        console.log('\n\n👥 PLAYERS:');
        const playerRes = await fetch(`${STDB_HOST}/database/sql/${STDB_NAME}`, {
            method: "POST",
            headers: { "Content-Type": "text/plain" },
            body: `SELECT * FROM player ORDER BY lobby_id DESC LIMIT 10`
        });

        if (playerRes.ok) {
            const playerData = await playerRes.json();
            console.log(JSON.stringify(playerData, null, 2));
        } else {
            console.log(`❌ Failed to query players: ${playerRes.status} ${playerRes.statusText}`);
        }

        // Check board state
        console.log('\n\n🎲 BOARD STATE:');
        const boardRes = await fetch(`${STDB_HOST}/database/sql/${STDB_NAME}`, {
            method: "POST",
            headers: { "Content-Type": "text/plain" },
            body: `SELECT * FROM board_cell ORDER BY lobby_id DESC LIMIT 20`
        });

        if (boardRes.ok) {
            const boardData = await boardRes.json();
            console.log(JSON.stringify(boardData, null, 2));
        } else {
            console.log(`❌ Failed to query board_cell: ${boardRes.status} ${boardRes.statusText}`);
        }

    } catch (error: any) {
        console.error('❌ Error:', error.message);
    }

    console.log('\n' + '='.repeat(80));
    console.log('\n💡 If games are stuck, possible issues:');
    console.log('   1. Turn timeout not working');
    console.log('   2. Player disconnected mid-turn');
    console.log('   3. Invalid move blocking progress');
    console.log('   4. Game state not syncing properly');
    console.log('\n🔧 Solutions:');
    console.log('   - Check turnDeadline in game_state');
    console.log('   - Verify currentTurnPlayer is valid');
    console.log('   - Check if claimTimeout reducer is working');
    console.log('   - May need to manually advance turn or cancel match');
}

checkDatabase().catch(console.error);
