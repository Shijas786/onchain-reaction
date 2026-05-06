"use client";

import {
  DbConnection,
  tables,
  reducers,
  type EventContext,
  type ReducerEventContext,
  type SubscriptionEventContext,
  type ErrorContext,
} from "./generated";
import { Lobby, LobbyPlayer, GameState, GameMove } from "./generated/types";

export const SPACETIMEDB_CONFIG = {
  host: process.env.NEXT_PUBLIC_SPACETIMEDB_HOST || "wss://maincloud.spacetimedb.com",
  moduleName: process.env.NEXT_PUBLIC_SPACETIMEDB_MODULE || "chain-reaction",
};

let dbConnection: DbConnection | null = null;
let connectionPromise: Promise<DbConnection> | null = null;
let isIntentionalDisconnect = false;

export type { EventContext, ReducerEventContext, SubscriptionEventContext, ErrorContext };
export { tables, reducers, Lobby, LobbyPlayer, GameState, GameMove };

export function getDbConnection(): DbConnection | null {
  return dbConnection;
}

export async function connectToSpacetimeDB(): Promise<DbConnection> {
  if (dbConnection) {
    return dbConnection;
  }

  if (connectionPromise) {
    return connectionPromise;
  }

  connectionPromise = new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error("Connection timeout"));
    }, 15000);

    // Get stored credentials or generate new
    const storedToken = typeof window !== "undefined" ? localStorage.getItem("spacetimedb_token") : null;

    const builder = DbConnection.builder()
      .withUri(SPACETIMEDB_CONFIG.host)
      .onConnect((conn, identity, token) => {
        clearTimeout(timeout);
        console.log("Connected to SpacetimeDB", identity.toHexString());

        // Store the token for reconnection
        if (typeof window !== "undefined" && token) {
          localStorage.setItem("spacetimedb_token", token);
        }

        dbConnection = conn;
        resolve(conn);
      })
      .onConnectError((ctx, err) => {
        clearTimeout(timeout);
        console.error("SpacetimeDB connection error:", err);

        // If we have a stored token and connection failed, try again without it
        // (token might be invalid after database clear)
        if (storedToken && typeof window !== "undefined") {
          console.log("Retrying connection without stored token...");
          localStorage.removeItem("spacetimedb_token");
          connectionPromise = null;

          // Retry without token
          setTimeout(() => {
            connectToSpacetimeDB().then(resolve).catch(reject);
          }, 1000);
        } else {
          reject(err);
        }
      })
      .onDisconnect((ctx) => {
        console.log("Disconnected from SpacetimeDB");
        dbConnection = null;
        connectionPromise = null;
        
        if (!isIntentionalDisconnect && typeof window !== "undefined") {
          let retries = 0;
          const MAX_RETRIES = 5;
          let backoff = 1000;
          
          const attemptReconnect = () => {
            if (retries >= MAX_RETRIES) {
              console.error("Max reconnect retries reached");
              return;
            }
            retries++;
            console.log(`Attempting to reconnect (retry ${retries})...`);
            
            connectToSpacetimeDB().catch(() => {
              backoff = Math.min(backoff * 2, 10000);
              setTimeout(attemptReconnect, backoff);
            });
          };
          
          setTimeout(attemptReconnect, backoff);
        }
        
        isIntentionalDisconnect = false;
      });

    // Use stored credentials if available
    if (storedToken) {
      builder.withToken(storedToken);
    }


    builder.build();
  });

  return connectionPromise;
}

export function disconnectFromSpacetimeDB(): void {
  if (dbConnection) {
    isIntentionalDisconnect = true;
    dbConnection.disconnect();
    dbConnection = null;
    connectionPromise = null;
  }
}

export function isConnected(): boolean {
  return dbConnection !== null;
}
