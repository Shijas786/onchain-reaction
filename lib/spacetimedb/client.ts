// SpacetimeDB Client Configuration
// This file sets up the connection to your SpacetimeDB instance

import { SpacetimeDBClient, Identity } from "@clockworklabs/spacetimedb-sdk";

// SpacetimeDB connection configuration
// TODO: Update these values after deploying your module
export const SPACETIMEDB_CONFIG = {
  // The URL of your SpacetimeDB instance
  // For maincloud: wss://maincloud.spacetimedb.com
  // For local development: ws://localhost:3000
  host: process.env.NEXT_PUBLIC_SPACETIMEDB_HOST || "wss://maincloud.spacetimedb.com",
  
  // Your module name (set during `spacetime publish`)
  moduleName: process.env.NEXT_PUBLIC_SPACETIMEDB_MODULE || "chain-reaction",
  
  // Optional: Auth token for authenticated connections
  authToken: typeof window !== "undefined" ? localStorage.getItem("spacetimedb_token") : null,
};

// Singleton client instance
let clientInstance: SpacetimeDBClient | null = null;
let connectionPromise: Promise<SpacetimeDBClient> | null = null;

/**
 * Get or create the SpacetimeDB client instance
 */
export function getSpacetimeClient(): SpacetimeDBClient {
  if (!clientInstance) {
    clientInstance = new SpacetimeDBClient(
      SPACETIMEDB_CONFIG.host,
      SPACETIMEDB_CONFIG.moduleName
    );
  }
  return clientInstance;
}

/**
 * Connect to SpacetimeDB
 * Returns a promise that resolves when connected
 */
export async function connectToSpacetimeDB(): Promise<SpacetimeDBClient> {
  if (connectionPromise) {
    return connectionPromise;
  }

  const client = getSpacetimeClient();

  connectionPromise = new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error("Connection timeout"));
    }, 10000);

    client.onConnect((identity: Identity, token: string) => {
      clearTimeout(timeout);
      console.log("Connected to SpacetimeDB", identity.toHexString());
      
      // Store token for reconnection
      if (typeof window !== "undefined") {
        localStorage.setItem("spacetimedb_token", token);
      }
      
      resolve(client);
    });

    client.onError((error: Error) => {
      clearTimeout(timeout);
      console.error("SpacetimeDB connection error:", error);
      reject(error);
    });

    // Connect with stored token or generate new identity
    const token = SPACETIMEDB_CONFIG.authToken;
    if (token) {
      client.connect(token);
    } else {
      client.connect();
    }
  });

  return connectionPromise;
}

/**
 * Disconnect from SpacetimeDB
 */
export function disconnectFromSpacetimeDB(): void {
  if (clientInstance) {
    clientInstance.disconnect();
    clientInstance = null;
    connectionPromise = null;
  }
}

/**
 * Get current identity
 */
export function getCurrentIdentity(): Identity | null {
  return clientInstance?.identity || null;
}

/**
 * Check if connected
 */
export function isConnected(): boolean {
  return clientInstance?.isConnected() || false;
}

