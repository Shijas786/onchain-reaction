
import "dotenv/config";
import { DbConnection } from "../lib/spacetimedb/generated";
import { Lobby } from "../lib/spacetimedb/generated/types";

const SPACETIMEDB_CONFIG = {
    host: process.env.NEXT_PUBLIC_SPACETIMEDB_HOST || "wss://maincloud.spacetimedb.com",
    moduleName: process.env.NEXT_PUBLIC_SPACETIMEDB_MODULE || "chain-reaction",
};

async function main() {
    console.log("🔍 Debugging SpacetimeDB Lobbies...");

    await new Promise<void>((resolve, reject) => {
        const builder = DbConnection.builder()
            .withUri(SPACETIMEDB_CONFIG.host)
            .onConnect(async (conn: DbConnection) => {
                console.log("✅ Connected to SpacetimeDB");

                // Subscribe to lobby table
                conn.subscriptionBuilder()
                    .onApplied((ctx: any) => {
                        console.log("Subscription applied. Scanning all lobbies...");

                        const lobbies = Array.from(ctx.db.lobby.iter()) as Lobby[];
                        console.log(`Found ${lobbies.length} total lobbies in DB.`);

                        const targetMatches = [33, 34, 35, 36, 37, 38];

                        targetMatches.forEach(matchId => {
                            // Fix: Convert both to string for safe comparison to avoid BigInt/number type errors
                            const lobby = lobbies.find((l: Lobby) => String(l.matchId) === String(matchId));

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
            .onConnectError((_: any, err: any) => {
                console.error("Connection error:", err);
                reject(err);
            });

        builder.build();
    });
}

main().catch(console.error);
