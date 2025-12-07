'use client'

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import sdk from '@farcaster/miniapp-sdk'

interface FarcasterUser {
    fid: number
    username: string
    displayName: string
    pfpUrl: string
}

interface FarcasterContextType {
    isSDKLoaded: boolean
    context: any | null
    isInMiniApp: boolean
    user: FarcasterUser | null
}

const FarcasterContext = createContext<FarcasterContextType>({
    isSDKLoaded: false,
    context: null,
    isInMiniApp: false,
    user: null,
})

export const useFarcaster = () => useContext(FarcasterContext)

interface FarcasterProviderProps {
    children: ReactNode
}

export function FarcasterProvider({ children }: FarcasterProviderProps) {
    const [isSDKLoaded, setIsSDKLoaded] = useState(false)
    const [context, setContext] = useState<any | null>(null)
    const [isInMiniApp, setIsInMiniApp] = useState(false)
    const [user, setUser] = useState<FarcasterUser | null>(null)

    useEffect(() => {
        const checkMiniAppEnvironment = async () => {
            try {
                if (sdk) {
                    setIsInMiniApp(true)
                    const farcasterContext = sdk.context
                    setContext(farcasterContext)

                    // Extract real user data from context
                    if (farcasterContext?.user) {
                        setUser({
                            fid: farcasterContext.user.fid,
                            username: farcasterContext.user.username,
                            displayName: farcasterContext.user.displayName,
                            pfpUrl: farcasterContext.user.pfpUrl
                        })
                    }

                    setIsSDKLoaded(true)
                }
            } catch (error) {
                console.error('Error initializing Farcaster SDK:', error)
                setIsInMiniApp(false)
                setIsSDKLoaded(false)
            }
        }

        checkMiniAppEnvironment()
    }, [])

    return (
        <FarcasterContext.Provider value={{ isSDKLoaded, context, isInMiniApp, user }}>
            {children}
        </FarcasterContext.Provider>
    )
}
