'use client'

import { useEffect } from 'react'
import { useAccount, useConnect, useDisconnect } from 'wagmi'
import { Button } from '@/components/ui/Button'
import { useFarcasterAuth } from '@/hooks/useFarcasterAuth'

export function FarcasterWalletButton() {
    const { address, isConnected } = useAccount()
    const { connect, connectors } = useConnect()
    const { disconnect } = useDisconnect()
    const { isAuthenticated, signIn, isLoading: authLoading, checkExistingAuth } = useFarcasterAuth()

    useEffect(() => {
        checkExistingAuth()
    }, [checkExistingAuth])

    // Auto-connect wallet after authentication
    useEffect(() => {
        if (isAuthenticated && !isConnected && connectors.length > 0) {
            connect({ connector: connectors[0] })
        }
    }, [isAuthenticated, isConnected, connect, connectors])

    if (!isAuthenticated) {
        return (
            <Button
                variant="primary"
                size="lg"
                onClick={signIn}
                disabled={authLoading}
                className="border-4 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all bg-[#A8E6CF] text-black font-bold rounded-2xl disabled:opacity-50"
            >
                {authLoading ? 'Signing in...' : '🔐 Sign in with Farcaster'}
            </Button>
        )
    }

    if (isConnected && address) {
        return (
            <div className="flex flex-col gap-2">
                <div className="px-4 py-2 border-4 border-black rounded-2xl bg-[#FFD3B6] shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                    <p className="font-bold text-sm">
                        {address.slice(0, 6)}...{address.slice(-4)}
                    </p>
                </div>
                <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => disconnect()}
                    className="border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] transition-all bg-white text-black font-medium rounded-lg"
                >
                    Disconnect
                </Button>
            </div>
        )
    }

    return (
        <Button
            variant="primary"
            size="lg"
            onClick={() => connectors.length > 0 && connect({ connector: connectors[0] })}
            className="border-4 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all bg-[#C7CEEA] text-black font-bold rounded-2xl"
        >
            Connect Wallet
        </Button>
    )
}
