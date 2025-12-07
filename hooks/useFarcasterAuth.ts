'use client'

import { useState, useCallback } from 'react'
import sdk from '@farcaster/miniapp-sdk'
import { useFarcaster } from '@/context/FarcasterProvider'

interface SignInResult {
    signature: string
    message: string
}

interface FarcasterAuthState {
    isAuthenticated: boolean
    isLoading: boolean
    error: string | null
    signInResult: SignInResult | null
    userData: any | null
}

export function useFarcasterAuth() {
    const { isInMiniApp, context } = useFarcaster()

    const [authState, setAuthState] = useState<FarcasterAuthState>({
        isAuthenticated: false,
        isLoading: false,
        error: null,
        signInResult: null,
        userData: null,
    })

    const generateNonce = useCallback(() => {
        const array = new Uint8Array(16)
        crypto.getRandomValues(array)
        return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('')
    }, [])

    const signIn = useCallback(async () => {
        if (!isInMiniApp) {
            setAuthState(prev => ({
                ...prev,
                error: 'Not in Farcaster miniapp environment',
            }))
            return
        }

        setAuthState(prev => ({
            ...prev,
            isLoading: true,
            error: null,
        }))

        try {
            const nonce = generateNonce()

            const result = await sdk.actions.signIn({
                nonce,
                acceptAuthAddress: true,
            })

            setAuthState({
                isAuthenticated: true,
                isLoading: false,
                error: null,
                signInResult: result,
                userData: context?.user || null,
            })

            if (typeof window !== 'undefined') {
                localStorage.setItem('farcaster_auth', JSON.stringify({
                    signature: result.signature,
                    message: result.message,
                    timestamp: Date.now(),
                }))
            }

            return result
        } catch (error: any) {
            const errorMessage = error?.message || 'Sign-in failed'

            setAuthState(prev => ({
                ...prev,
                isLoading: false,
                error: errorMessage,
            }))

            throw error
        }
    }, [isInMiniApp, context, generateNonce])

    const signOut = useCallback(() => {
        setAuthState({
            isAuthenticated: false,
            isLoading: false,
            error: null,
            signInResult: null,
            userData: null,
        })

        if (typeof window !== 'undefined') {
            localStorage.removeItem('farcaster_auth')
        }
    }, [])

    const checkExistingAuth = useCallback(() => {
        if (typeof window === 'undefined') return

        const stored = localStorage.getItem('farcaster_auth')
        if (stored) {
            try {
                const parsed = JSON.parse(stored)
                const isValid = Date.now() - parsed.timestamp < 24 * 60 * 60 * 1000

                if (isValid) {
                    setAuthState({
                        isAuthenticated: true,
                        isLoading: false,
                        error: null,
                        signInResult: {
                            signature: parsed.signature,
                            message: parsed.message,
                        },
                        userData: context?.user || null,
                    })
                } else {
                    localStorage.removeItem('farcaster_auth')
                }
            } catch (error) {
                localStorage.removeItem('farcaster_auth')
            }
        }
    }, [context])

    return {
        ...authState,
        signIn,
        signOut,
        checkExistingAuth,
        isInMiniApp,
    }
}
