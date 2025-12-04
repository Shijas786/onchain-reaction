"use client";

import {
  DbConnection,
  DbConnectionBuilder,
  tables,
  reducers,
  type EventContext,
  type ReducerEventContext,
  type SubscriptionEventContext,
  type ErrorContext,
  Lobby,
  LobbyPlayer,
  GameState,
  GameMove,
} from "./generated";

export const SPACETIMEDB_CONFIG = {
  host: process.env.NEXT_PUBLIC_SPACETIMEDB_HOST || "wss://maincloud.spacetimedb.com",
  moduleName: process.env.NEXT_PUBLIC_SPACETIMEDB_MODULE || "chain-reaction",
};

let dbConnection: DbConnection | null = null;
let connectionPromise: Promise<DbConnection> | null = null;

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
      .withModuleName(SPACETIMEDB_CONFIG.moduleName)
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
    dbConnection.disconnect();
    dbConnection = null;
    connectionPromise = null;
  }
}

export function isConnected(): boolean {
  return dbConnection !== null;
}
