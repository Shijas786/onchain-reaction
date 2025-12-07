'use client'

import { useCallback } from 'react'
import sdk from '@farcaster/miniapp-sdk'
import { useFarcaster } from '@/context/FarcasterProvider'

export function useFarcasterNotifications() {
    const { isInMiniApp } = useFarcaster()

    const showNotification = useCallback(async (message: string) => {
        if (!isInMiniApp) {
            console.log('Not in miniapp, notification skipped:', message)
            return false
        }

        try {
            await sdk.actions.showToast({
                message,
                type: 'info'
            })
            return true
        } catch (error) {
            console.error('Failed to show notification:', error)
            return false
        }
    }, [isInMiniApp])

    const showSuccess = useCallback(async (message: string) => {
        if (!isInMiniApp) {
            console.log('Not in miniapp, success notification skipped:', message)
            return false
        }

        try {
            await sdk.actions.showToast({
                message,
                type: 'success'
            })
            return true
        } catch (error) {
            console.error('Failed to show success notification:', error)
            return false
        }
    }, [isInMiniApp])

    const showError = useCallback(async (message: string) => {
        if (!isInMiniApp) {
            console.log('Not in miniapp, error notification skipped:', message)
            return false
        }

        try {
            await sdk.actions.showToast({
                message,
                type: 'error'
            })
            return true
        } catch (error) {
            console.error('Failed to show error notification:', error)
            return false
        }
    }, [isInMiniApp])

    return {
        showNotification,
        showSuccess,
        showError,
        isInMiniApp
    }
}
