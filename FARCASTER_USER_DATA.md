# Using Farcaster User Data

## Overview
The `FarcasterProvider` now properly extracts and exposes real Farcaster user data from the SDK context.

## Available User Data

```tsx
import { useFarcaster } from '@/context/FarcasterProvider'

export function YourComponent() {
    const { user, isInMiniApp } = useFarcaster()
    
    if (isInMiniApp && user) {
        console.log(user.fid)          // Real FID (e.g., 242597)
        console.log(user.username)     // Real username (e.g., "ferno")
        console.log(user.displayName)  // Real display name
        console.log(user.pfpUrl)       // Profile picture URL
    }
}
```

## TypeScript Interface

```tsx
interface FarcasterUser {
    fid: number           // Farcaster ID
    username: string      // Username (e.g., "ferno")
    displayName: string   // Display name
    pfpUrl: string        // Profile picture URL
}
```

## Usage Examples

### 1. Display User Profile
```tsx
const { user } = useFarcaster()

return (
    <div>
        {user && (
            <>
                <img src={user.pfpUrl} alt={user.displayName} />
                <h2>{user.displayName}</h2>
                <p>@{user.username}</p>
                <p>FID: {user.fid}</p>
            </>
        )}
    </div>
)
```

### 2. Use FID for Game Logic
```tsx
const { user } = useFarcaster()

const createMatch = async () => {
    if (!user) return
    
    await createMatchWithFID({
        creatorFid: user.fid,
        creatorName: user.displayName
    })
}
```

### 3. Show User in Lobby
```tsx
const { user } = useFarcaster()

return (
    <div className="player-card">
        <img src={user?.pfpUrl} />
        <span>{user?.displayName}</span>
    </div>
)
```

### 4. Conditional Rendering
```tsx
const { user, isInMiniApp } = useFarcaster()

if (!isInMiniApp) {
    return <div>Please open in Farcaster app</div>
}

if (!user) {
    return <div>Loading user data...</div>
}

return <div>Welcome, {user.displayName}!</div>
```

## Full Context API

```tsx
const {
    isSDKLoaded,    // SDK initialization complete
    context,        // Raw Farcaster context
    isInMiniApp,    // Running in Farcaster miniapp
    user            // Extracted user data (NEW!)
} = useFarcaster()
```

## Notes

- `user` will be `null` if not in miniapp or if user data isn't available
- Always check `isInMiniApp` before using user data
- User data is automatically extracted when SDK loads
- Data includes: FID, username, display name, and profile picture URL
