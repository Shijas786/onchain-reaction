
import "dotenv/config";
import { DbConnection, Lobby } from "../lib/spacetimedb/generated";

const SPACETIMEDB_CONFIG = {
    host: process.env.NEXT_PUBLIC_SPACETIMEDB_HOST || "wss://maincloud.spacetimedb.com",
    moduleName: process.env.NEXT_PUBLIC_SPACETIMEDB_MODULE || "chain-reaction",
};

async function main() {
    console.log("🔍 Debugging SpacetimeDB Lobbies...");

    await new Promise<void>((resolve, reject) => {
        const builder = DbConnection.builder()
            .withUri(SPACETIMEDB_CONFIG.host)
            .withModuleName(SPACETIMEDB_CONFIG.moduleName)
            .onConnect(async (conn) => {
                console.log("✅ Connected to SpacetimeDB");

                // Subscribe to lobby table
                conn.subscriptionBuilder()
                    .onApplied((ctx) => {
                        console.log("Subscription applied. Scanning all lobbies...");

                        const lobbies = Array.from(ctx.db.lobby.iter());
                        console.log(`Found ${lobbies.length} total lobbies in DB.`);

                        const targetMatches = [33, 34, 35, 36, 37, 38];

                        targetMatches.forEach(matchId => {
                            // Note: SpacetimeDB might store matchId as number or string, check both
                            // Also check if matchId is BigInt
                            const lobby = lobbies.find(l =>
                                l.matchId === matchId ||
                                Number(l.matchId) === matchId ||
                                String(l.matchId) === String(matchId)
                            );

                            if (lobby) {
                                console.log(`\nMatch #${matchId}: FOUND`);
                                console.log(`  ID: ${lobby.id}`);
                                console.log(`  Status: ${lobby.status}`);
                                console.log(`  Winner: ${lobby.winnerAddress}`);
                                console.log(`  Created: ${lobby.createdAt}`);
                            } else {
                                console.log(`\nMatch #${matchId}: NOT FOUND in SpacetimeDB`);
                            }
                        });

                        conn.disconnect();
                        resolve();
                    })
                    .subscribe(["SELECT * FROM lobby"]);
            })
            .onConnectError((_, err) => {
                console.error("Connection error:", err);
                reject(err);
            });

        builder.build();
    });
}

main().catch(console.error);
