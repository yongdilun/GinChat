# Protected Routing System for GinChatMobile

This guide explains how the protected routing system works in GinChatMobile and how to use it.

## Overview

The protected routing system automatically handles user authentication and navigation based on the user's authentication status. It ensures that:

1. **Authenticated users** cannot access login/signup/index pages (redirected to `/chats`)
2. **Unauthenticated users** cannot access protected pages like chats or chat details (redirected to `/login`)
3. **Loading states** are properly handled during authentication checks

## Components

### 1. ProtectedRoute Component (`src/components/ProtectedRoute.tsx`)

The main component that wraps the entire application and handles automatic redirections.

**Features:**
- Monitors authentication state changes
- Automatically redirects based on current route and auth status
- Shows loading spinner during auth checks
- Logs routing decisions for debugging

**Usage:**
```tsx
<ProtectedRoute>
  <Stack>
    {/* Your routes */}
  </Stack>
</ProtectedRoute>
```

### 2. AuthGuard Component (`src/components/AuthGuard.tsx`)

A more granular component for protecting specific routes or components.

**Features:**
- Can be used to protect individual components
- Customizable redirect destinations
- Optional fallback components
- Can be set to require or prevent authentication

**Usage:**
```tsx
// Require authentication
<AuthGuard requireAuth={true}>
  <ProtectedComponent />
</AuthGuard>

// Prevent access for authenticated users
<AuthGuard requireAuth={false}>
  <PublicOnlyComponent />
</AuthGuard>

// Custom redirect
<AuthGuard requireAuth={true} redirectTo="/custom-login">
  <ProtectedComponent />
</AuthGuard>

// Custom fallback component
<AuthGuard 
  requireAuth={true} 
  fallbackComponent={<CustomUnauthorizedScreen />}
>
  <ProtectedComponent />
</AuthGuard>
```

## Route Categories

### Public Routes (Unauthenticated Users Only)
- `/` (index) - Welcome page
- `/login` - Login page
- `/signup` - Registration page

### Protected Routes (Authenticated Users Only)
- `/(tabs)/chats` - Chat list
- `/chat/[id]` - Individual chat rooms

## How It Works

### 1. Application Startup
1. App loads with `AuthProvider` checking stored authentication data
2. `ProtectedRoute` component monitors auth state
3. Based on current route and auth status, appropriate redirections occur

### 2. Authentication Flow
```
Unauthenticated User:
├── Access public route → Allow
├── Access protected route → Redirect to /login
└── Login successful → Redirect to /(tabs)/chats

Authenticated User:
├── Access protected route → Allow
├── Access public route → Redirect to /(tabs)/chats
└── Logout → Redirect to /login
```

### 3. State Management
The system uses the `AuthContext` which provides:
- `isAuthenticated`: Boolean indicating auth status
- `isLoading`: Boolean for loading states
- `user`: Current user object
- `token`: Authentication token

## Implementation Details

### File Structure
```
src/
├── components/
│   ├── ProtectedRoute.tsx    # Main routing component
│   └── AuthGuard.tsx         # Granular protection component
├── contexts/
│   └── AuthContext.tsx       # Authentication state management
app/
├── _layout.tsx               # Root layout with ProtectedRoute
├── index.js                  # Welcome page
├── login.tsx                 # Login page
├── signup.tsx                # Registration page
├── (tabs)/
│   └── chats.tsx            # Protected chat list
└── chat/
    └── [id].tsx             # Protected individual chat
```

### Integration in Root Layout
```tsx
export default function RootLayout() {
  return (
    <AuthProvider>
      <WebSocketProvider>
        <ProtectedRoute>
          <Stack>
            {/* Routes */}
          </Stack>
        </ProtectedRoute>
      </WebSocketProvider>
    </AuthProvider>
  );
}
```

## Usage Examples

### Protecting a New Route
To add a new protected route, simply add it to the Stack in `_layout.tsx`. The `ProtectedRoute` will automatically handle protection:

```tsx
<Stack.Screen
  name="new-protected-page"
  options={{ headerShown: false }}
/>
```

### Creating a Custom Protected Component
```tsx
import { AuthGuard } from '../src/components/AuthGuard';

export default function CustomProtectedPage() {
  return (
    <AuthGuard requireAuth={true}>
      <View>
        <Text>This content is only visible to authenticated users</Text>
      </View>
    </AuthGuard>
  );
}
```

### Handling Loading States
The system automatically handles loading states, but you can also use them directly:

```tsx
import { useAuth } from '@/contexts/AuthContext';

export default function MyComponent() {
  const { isLoading, isAuthenticated } = useAuth();

  if (isLoading) {
    return <LoadingSpinner />;
  }

  return isAuthenticated ? <AuthenticatedView /> : <PublicView />;
}
```

## Debugging

The `ProtectedRoute` component logs detailed information about routing decisions:

```
[ProtectedRoute] Current route: (tabs)/chats
[ProtectedRoute] Current segments: ["(tabs)", "chats"]
[ProtectedRoute] Is authenticated: true
[ProtectedRoute] Is in auth group: true
[ProtectedRoute] Is public route: false
```

Enable these logs in development to understand routing behavior.

## Security Features

1. **Automatic Redirects**: Prevents manual URL manipulation
2. **Loading State Protection**: Prevents flashing of unauthorized content
3. **Token-based Authentication**: Uses secure token storage
4. **WebSocket Cleanup**: Properly disconnects WebSocket on logout
5. **State Persistence**: Maintains auth state across app restarts

## Best Practices

1. **Always wrap the app** with `ProtectedRoute` in the root layout
2. **Use AuthGuard** for component-level protection when needed
3. **Handle loading states** appropriately in your components
4. **Test all route combinations** during development
5. **Clear sensitive data** on logout (handled automatically)

## Troubleshooting

### Common Issues

1. **Infinite redirect loops**: Check that route names match exactly
2. **Auth state not updating**: Ensure AuthProvider wraps the entire app
3. **Routes not protecting**: Verify ProtectedRoute is properly integrated
4. **Loading stuck**: Check if auth check is completing successfully

### Debug Steps

1. Check console logs for routing decisions
2. Verify auth context values
3. Ensure proper import paths
4. Test authentication flow end-to-end

## Migration Notes

If migrating from an unprotected app:
1. Wrap your root layout with `ProtectedRoute`
2. Remove manual navigation logic from login/logout
3. Update any hardcoded route checks
4. Test all navigation flows thoroughly 