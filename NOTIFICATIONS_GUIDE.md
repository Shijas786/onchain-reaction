# Farcaster Miniapp Notifications Guide

## Overview
The `useFarcasterNotifications` hook provides easy-to-use popup notifications for your Farcaster miniapp.

## Installation
The hook is already created at `hooks/useFarcasterNotifications.ts`.

## Usage

### Basic Import
```tsx
import { useFarcasterNotifications } from '@/hooks/useFarcasterNotifications'
```

### In Your Component
```tsx
export function YourComponent() {
    const { showNotification, showSuccess, showError } = useFarcasterNotifications()

    const handleAction = async () => {
        // Show info notification
        await showNotification('Processing your request...')
        
        try {
            // Your logic here
            await someAsyncOperation()
            
            // Show success
            await showSuccess('Action completed successfully!')
        } catch (error) {
            // Show error
            await showError('Something went wrong!')
        }
    }

    return <button onClick={handleAction}>Do Something</button>
}
```

## Available Methods

### `showNotification(message: string)`
Shows an info notification (blue/neutral).
```tsx
await showNotification('Match starting...')
```

### `showSuccess(message: string)`
Shows a success notification (green).
```tsx
await showSuccess('Match created successfully!')
```

### `showError(message: string)`
Shows an error notification (red).
```tsx
await showError('Failed to join match')
```

## Example Use Cases

### 1. Match Creation
```tsx
const handleCreateMatch = async () => {
    await showNotification('Creating match...')
    
    try {
        const result = await createMatch(...)
        await showSuccess('Match created! ID: ' + result.matchId)
    } catch (error) {
        await showError('Failed to create match')
    }
}
```

### 2. Making a Move
```tsx
const handleMove = async (x: number, y: number) => {
    try {
        await makeMove(x, y)
        await showSuccess('Move made!')
    } catch (error) {
        await showError('Invalid move')
    }
}
```

### 3. Joining a Lobby
```tsx
const handleJoinLobby = async (lobbyId: string) => {
    await showNotification('Joining lobby...')
    
    try {
        await joinLobby(lobbyId)
        await showSuccess('Joined successfully!')
    } catch (error) {
        await showError('Could not join lobby')
    }
}
```

### 4. Claiming Prize
```tsx
const handleClaimPrize = async () => {
    await showNotification('Claiming your prize...')
    
    try {
        const tx = await claimPrize()
        await showSuccess('Prize claimed! 🎉')
    } catch (error) {
        await showError('Failed to claim prize')
    }
}
```

## Notes

- Notifications only work inside the Farcaster miniapp environment
- Outside the miniapp, messages are logged to console instead
- The hook automatically checks if you're in a miniapp before showing notifications
- All methods return `true` if successful, `false` if failed

## Integration Example

Here's how to add it to your existing components:

```tsx
// In CreateMatchButton.tsx
import { useFarcasterNotifications } from '@/hooks/useFarcasterNotifications'

export function CreateMatchButton() {
    const { showNotification, showSuccess, showError } = useFarcasterNotifications()
    
    const handleCreate = async () => {
        await showNotification('Creating match...')
        // ... rest of your logic
    }
    
    // ... rest of component
}
```
