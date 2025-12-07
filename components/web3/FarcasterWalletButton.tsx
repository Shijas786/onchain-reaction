'use client'

import { useEffect } from 'react'
import { useAccount, useConnect, useDisconnect } from 'wagmi'
import { Button } from '@/components/ui/Button'
import { useFarcasterAuth } from '@/hooks/useFarcasterAuth'
import { useFarcaster } from '@/context/FarcasterProvider'

export function FarcasterWalletButton() {
    const { address, isConnected } = useAccount()
    const { connect, connectors } = useConnect()
    const { disconnect } = useDisconnect()
    const { isAuthenticated, signIn, isLoading: authLoading, checkExistingAuth } = useFarcasterAuth()
    const { user, isInMiniApp } = useFarcaster()

    useEffect(() => {
        checkExistingAuth()
    }, [checkExistingAuth])

    // Auto-connect wallet after authentication
    useEffect(() => {
        if (isAuthenticated && !isConnected && connectors.length > 0) {
            connect({ connector: connectors[0] })
        }
    }, [isAuthenticated, isConnected, connect, connectors])

    // If wallet is already connected, show connected state (handles Base app case)
    if (isConnected && address) {
        return (
            <div className="flex flex-col gap-2">
                <div className="px-4 py-2 border-4 border-black rounded-2xl bg-[#FFD3B6] shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                    {/* Show Farcaster profile if available */}
                    {isInMiniApp && user ? (
                        <div className="flex items-center gap-2">
                            {user.pfpUrl && (
                                <img
                                    src={user.pfpUrl}
                                    alt={user.displayName || user.username || 'User'}
                                    className="w-8 h-8 rounded-full border-2 border-black"
                                />
                            )}
                            <div className="flex flex-col">
                                <p className="font-bold text-sm">
                                    {user.displayName || user.username || 'Farcaster User'}
                                </p>
                                {user.username && user.displayName && (
                                    <p className="text-xs opacity-70">@{user.username}</p>
                                )}
                            </div>
                        </div>
                    ) : (
                        /* Fallback to wallet address */
                        <p className="font-bold text-sm">
                            {address.slice(0, 6)}...{address.slice(-4)}
                        </p>
                    )}
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

    // If not authenticated and not connected, show sign-in button
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

    // Fallback: show connect wallet button
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
