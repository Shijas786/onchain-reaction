// config/index.tsx
'use client'

import { createConfig, cookieStorage, createStorage, http } from 'wagmi'
import { base, arbitrum } from 'wagmi/chains'
import { farcasterFrame } from '@farcaster/miniapp-wagmi-connector'

// Define supported networks: Base and Arbitrum for USDC gaming
export const networks = [base, arbitrum] as const

// Create wagmi config with Farcaster connector only
export const config = createConfig({
  chains: [base, arbitrum],
  connectors: [farcasterFrame()],
  storage: createStorage({ storage: cookieStorage }),
  ssr: true,
  transports: {
    [base.id]: http('https://base-mainnet.g.alchemy.com/v2/eTjwZLPVQJs7qTv3Inh338N4Uss_z7OT'),
    [arbitrum.id]: http(),
  },
})
