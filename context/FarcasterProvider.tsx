'use client'

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import sdk from '@farcaster/miniapp-sdk'

interface FarcasterContextType {
    isSDKLoaded: boolean
    context: any | null
    isInMiniApp: boolean
}

const FarcasterContext = createContext<FarcasterContextType>({
    isSDKLoaded: false,
    context: null,
    isInMiniApp: false,
})

export const useFarcaster = () => useContext(FarcasterContext)

interface FarcasterProviderProps {
    children: ReactNode
}

export function FarcasterProvider({ children }: FarcasterProviderProps) {
    const [isSDKLoaded, setIsSDKLoaded] = useState(false)
    const [context, setContext] = useState<any | null>(null)
    const [isInMiniApp, setIsInMiniApp] = useState(false)

    useEffect(() => {
        const checkMiniAppEnvironment = async () => {
            try {
                if (sdk) {
                    setIsInMiniApp(true)
                    const farcasterContext = sdk.context
                    setContext(farcasterContext)
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
        <FarcasterContext.Provider value={{ isSDKLoaded, context, isInMiniApp }}>
            {children}
        </FarcasterContext.Provider>
    )
}
