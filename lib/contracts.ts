// Contract addresses and chain configuration
import { base, arbitrum } from 'viem/chains'

// Chain IDs
export const CHAIN_IDS = {
  BASE: 8453,
  ARBITRUM: 42161,
} as const

// USDC addresses per chain (6 decimals)
export const USDC_ADDRESSES: Record<number, `0x${string}`> = {
  [CHAIN_IDS.BASE]: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913', // Base USDC
  [CHAIN_IDS.ARBITRUM]: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831', // Arbitrum USDC
}

export const BASE_JESSE = "0x50F88fe97f72CD3E75b9Eb4f747F59BcEBA80d59";

// ChainOrbArena contract addresses per chain
export const ARENA_ADDRESSES: Record<number, `0x${string}`> = {
  [CHAIN_IDS.BASE]: '0x7B04eb09b6748097067c7C9d97C545ADDFD7C97E', // Base mainnet
  [CHAIN_IDS.ARBITRUM]: '0x859Bf3A3DD44D7607A7121ab1807F6BF90d7E86c', // Arbitrum mainnet
}

// Chain config for viem
export const CHAIN_CONFIG: Record<number, typeof base | typeof arbitrum> = {
  [CHAIN_IDS.BASE]: base,
  [CHAIN_IDS.ARBITRUM]: arbitrum,
}

// Helper to get chain name
export const getChainName = (chainId: number): string => {
  switch (chainId) {
    case CHAIN_IDS.BASE:
      return 'Base'
    case CHAIN_IDS.ARBITRUM:
      return 'Arbitrum'
    default:
      return 'Unknown'
  }
}

// Token decimals
export const USDC_DECIMALS = 6
export const JESSE_DECIMALS = 18

// Token configuration
export const TOKENS = {
  USDC: {
    symbol: 'USDC',
    decimals: USDC_DECIMALS,
    addresses: USDC_ADDRESSES,
  },
  JESSE: {
    symbol: 'JESSE',
    decimals: JESSE_DECIMALS,
    addresses: {
      [CHAIN_IDS.BASE]: BASE_JESSE,
    },
  },
} as const

// Convert human readable amount to wei
export const parseTokenAmount = (amount: string | number, decimals: number): bigint => {
  const num = typeof amount === 'string' ? parseFloat(amount) : amount
  if (isNaN(num) || !isFinite(num) || num < 0) {
    return BigInt(0)
  }
  // Handle decimals carefully to avoid precision loss with floats
  const [integerPart, fractionalPart = ''] = String(num).split('.')
  const paddedFraction = fractionalPart.padEnd(decimals, '0').slice(0, decimals)
  return BigInt(`${integerPart}${paddedFraction}`)
}

// Convert wei to human readable amount
export const formatTokenAmount = (amount: bigint | string | number, decimals: number): string => {
  const value = typeof amount === 'bigint' ? amount : BigInt(amount)
  const divisor = BigInt(10) ** BigInt(decimals)
  const integerPart = value / divisor
  const fractionalPart = value % divisor
  const paddedFraction = fractionalPart.toString().padStart(decimals, '0')
  // Remove trailing zeros
  const formattedFraction = paddedFraction.replace(/0+$/, '')
  return formattedFraction ? `${integerPart}.${formattedFraction}` : `${integerPart}`
}

// Legacy helpers for backward compatibility (deprecate later)
export const parseUSDC = (amount: string | number) => parseTokenAmount(amount, USDC_DECIMALS)
export const formatUSDC = (amount: bigint | string | number) => formatTokenAmount(amount, USDC_DECIMALS)

// Default entry fee options
export const ENTRY_FEE_OPTIONS = [
  { label: '0.01', value: '0.01' },
  { label: '1', value: '1' },
  { label: '5', value: '5' },
  { label: '10', value: '10' },
]

// Max players range
export const MAX_PLAYERS_OPTIONS = [2, 3, 4, 5, 6, 7, 8]

