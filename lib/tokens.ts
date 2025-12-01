// Token addresses per chain

export const BASE_USDC = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913" as const;
export const BASE_JESSE = "0x50F88fe97f72CD3E75b9Eb4f747F59BcEBA80d59" as const;

export const ARB_USDC = "0xaf88d065e77c8cC2239327C5EDb3A432268e5831" as const;

// Helper to get token address by chain
export function getTokenAddress(chainId: number, token: "USDC" | "JESSE" = "USDC"): `0x${string}` {
  const isBase = chainId === 8453;
  const isArbitrum = chainId === 42161;

  if (isBase) {
    return token === "USDC" ? BASE_USDC : BASE_JESSE;
  }
  
  if (isArbitrum) {
    return ARB_USDC;
  }

  throw new Error(`Unsupported chain: ${chainId}`);
}


