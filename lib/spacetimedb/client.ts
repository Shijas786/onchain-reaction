// Placeholder SpacetimeDB client helpers.
// The real SpacetimeDB SDK requires generated bindings and a running backend.
// Until that service is available we expose lightweight stubs so the app can
// build and run without a live database connection.

export type MockIdentity = {
  toHexString: () => string;
};

export type MockSpacetimeClient = {
  connect: () => void;
  disconnect: () => void;
  isConnected: () => boolean;
};

const mockIdentity: MockIdentity = {
  toHexString: () => "0xmock-identity",
};

const mockClient: MockSpacetimeClient = {
  connect: () => {
    // no-op
  },
  disconnect: () => {
    // no-op
  },
  isConnected: () => true,
};

let connected = false;

export function getSpacetimeClient(): MockSpacetimeClient {
  return mockClient;
}

export async function connectToSpacetimeDB(): Promise<MockSpacetimeClient> {
  connected = true;
  return mockClient;
}

export function disconnectFromSpacetimeDB(): void {
  connected = false;
}

export function getCurrentIdentity(): MockIdentity | null {
  return connected ? mockIdentity : null;
}

export function isConnected(): boolean {
  return connected;
}

