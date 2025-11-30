// Contract addresses and chain configuration
import { base, arbitrum } from 'viem/chains'

// Chain IDs
export const CHAIN_IDS = {
  BASE: 8453,
  ARBITRUM: 42161,
} as const

// USDC addresses per chain (6 decimals)
export const USDC_ADDRESSES: Record<number, `0x${string}`> = {
  [CHAIN_IDS.BASE]: '0x833589FcD6EDB6E08F4C7c32D4f61a2E6a6211bE', // Base USDC
  [CHAIN_IDS.ARBITRUM]: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831', // Arbitrum USDC
}

export const BASE_JESSE = "0x50F88fe97f72CD3E75b9Eb4f747F59BcEBA80d59";

// ChainOrbArena contract addresses per chain
export const ARENA_ADDRESSES: Record<number, `0x${string}`> = {
  [CHAIN_IDS.BASE]: '0xCEeeA562C831f7688851f093d7012fAc8D8302D5', // Base mainnet
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

// USDC has 6 decimals
export const USDC_DECIMALS = 6

// Convert human readable USDC amount to wei (6 decimals)
export const parseUSDC = (amount: string | number): bigint => {
  const num = typeof amount === 'string' ? parseFloat(amount) : amount
  if (isNaN(num) || !isFinite(num) || num < 0) {
    return BigInt(0)
  }
  return BigInt(Math.floor(num * 10 ** USDC_DECIMALS))
}

// Convert wei to human readable USDC amount
export const formatUSDC = (amount: bigint | string | number): string => {
  const value = typeof amount === 'bigint' ? amount : BigInt(amount)
  return (Number(value) / 10 ** USDC_DECIMALS).toFixed(2)
}

// Default entry fee options in USDC
export const ENTRY_FEE_OPTIONS = [
  { label: '$1 USDC', value: '1' },
  { label: '$5 USDC', value: '5' },
  { label: '$10 USDC', value: '10' },
  { label: '$25 USDC', value: '25' },
]

// Max players range
export const MAX_PLAYERS_OPTIONS = [2, 3, 4, 5, 6, 7, 8]

