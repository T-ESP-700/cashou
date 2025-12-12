# Cashou Authentication Guide

## Overview

Cashou uses **Bearer Token authentication** for API security. This guide explains how to authenticate and make secure requests to the backend API from various clients (Bruno, Mobile app, etc.).

## Authentication Architecture

### Technology Stack
- **Better-Auth**: Authentication framework handling user registration, login, and session management
- **Bearer Tokens**: Issued upon successful authentication, used for subsequent API requests
- **tRPC**: Type-safe API layer that validates Bearer tokens for protected routes

### Flow
1. User registers or logs in via `/api/auth/sign-up/email` or `/api/auth/sign-in/email`
2. Backend returns a JWT token
3. Client stores the token securely
4. Client includes token in `Authorization: Bearer <token>` header for all protected requests
5. Backend validates token and grants access to protected resources

## Endpoints

### Authentication Endpoints (Better-Auth)

#### Sign Up
```bash
POST /api/auth/sign-up/email
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "securepassword123",
  "name": "John Doe"
}
```

**Response:**
```json
{
  "user": {
    "id": "user_id",
    "email": "user@example.com",
    "name": "John Doe"
  },
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

#### Sign In
```bash
POST /api/auth/sign-in/email
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "securepassword123"
}
```

**Response:**
```json
{
  "user": {
    "id": "user_id",
    "email": "user@example.com",
    "name": "John Doe"
  },
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

### Protected Endpoints (tRPC)

All tRPC endpoints under `/api/trpc/*` require authentication via Bearer token.

#### Example: Get All Users
```bash
GET /api/trpc/user.getAll
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Response:**
```json
{
  "result": {
    "data": [
      {
        "id": "user_id",
        "email": "user@example.com",
        "name": "John Doe",
        "points": 100,
        "levelId": 1
      }
    ]
  }
}
```

## Client Integration

### 1. Bruno API Testing

#### Setup
1. Open Bruno and navigate to the Cashou collection
2. Set the `dev` environment (already configured in `bruno/cashou/environments/dev.bru`)

#### Login Process
1. Run the **LOGIN** request (`bruno/cashou/Users/LOGIN.bru`)
2. The token is automatically saved to the `auth_token` environment variable
3. All subsequent requests inherit Bearer authentication

#### Manual Token Setup
If needed, you can manually set the token:
1. Go to Environments > dev
2. Set `auth_token` variable to your token value

#### Testing Protected Routes
All requests in the collection are configured with `auth: inherit`, which automatically uses the Bearer token from the environment.

Example:
```
GET {{base_url}}/api/trpc/user.getAll
Authorization: Bearer {{auth_token}}
```

### 2. Mobile Application (React Native / Expo)

#### Token Storage
The mobile app uses `AsyncStorage` to securely store the authentication token.

```typescript
import { tokenStorage } from '@/lib/token-storage';

// Save token after login
await tokenStorage.setToken(token);

// Retrieve token
const token = await tokenStorage.getToken();

// Remove token on logout
await tokenStorage.removeToken();
```

#### Authentication Flow

**Login:**
```typescript
const response = await fetch(`${API_BASE_URL}/api/auth/sign-in/email`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email, password }),
});

const data = await response.json();

if (data.token) {
  await tokenStorage.setToken(data.token);
}
```

**Making Authenticated Requests:**
```typescript
import { trpcClient } from '@/lib/trpc';

// trpcClient automatically includes Bearer token
const users = await trpcClient.user.getAll.query();
```

The tRPC client is configured to automatically include the Bearer token:

```typescript
// lib/trpc.ts
export const trpcClient = createTRPCClient<AppRouter>({
  links: [
    httpBatchLink({
      url: API_URL,
      async headers() {
        const token = await tokenStorage.getToken();
        return token ? { authorization: `Bearer ${token}` } : {};
      },
    }),
  ],
});
```

### 3. cURL Examples

#### Sign Up
```bash
curl -X POST http://localhost:3000/api/auth/sign-up/email \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "password123",
    "name": "Test User"
  }'
```

#### Sign In
```bash
curl -X POST http://localhost:3000/api/auth/sign-in/email \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "password123"
  }'
```

#### Access Protected Route
```bash
# Save the token from login response
TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."

# Use Bearer token for protected requests
curl -X GET http://localhost:3000/api/trpc/user.getAll \
  -H "Authorization: Bearer $TOKEN"
```

## Security Best Practices

### Token Storage
- **Mobile**: Use `AsyncStorage` (React Native) or `SecureStore` (Expo) for token storage
- **Web**: Use `httpOnly` cookies (not implemented yet) or secure localStorage with proper XSS protection
- **Never**: Store tokens in plain text or commit them to version control

### Token Handling
- **Expiration**: Tokens expire after 7 days (configurable in `packages/@cashou/auth/src/server.ts`)
- **Refresh**: Implement token refresh logic before expiration
- **Logout**: Always clear tokens from storage on logout

### HTTPS
- In production, **always** use HTTPS to prevent token interception
- Development: HTTP is acceptable on localhost only

## Troubleshooting

### 401 Unauthorized Error
**Cause**: Missing or invalid token

**Solutions**:
1. Ensure you're logged in and have a valid token
2. Check that the Authorization header is properly formatted: `Bearer <token>`
3. Verify token hasn't expired (check timestamp)
4. Re-login to get a fresh token

### 403 Forbidden Error
**Cause**: Valid token but insufficient permissions

**Solutions**:
1. Check if the route requires admin privileges
2. Verify your user role in the database
3. Contact admin for permission escalation

### Network Errors (Mobile)
**Cause**: Cannot reach backend server

**Solutions**:
1. Verify backend is running: `bun run dev`
2. Check mobile device is on same network as backend
3. Update `EXPO_PUBLIC_API_URL` in `apps/mobile/.env` with correct IP address
4. For Android emulator, use `10.0.2.2:3000` instead of `localhost:3000`
5. For iOS simulator, use `localhost:3000`
6. For physical devices, use your computer's local IP address

## Environment Variables

### Backend
```bash
# apps/backend/.env
BETTER_AUTH_URL=http://localhost:3000
BETTER_AUTH_SECRET=your-secret-key-here
CASHOU_DB_URL=postgresql://user:password@localhost:5432/cashou_db
```

### Mobile
```bash
# apps/mobile/.env
EXPO_PUBLIC_API_URL=http://10.79.216.231:3000
EXPO_PUBLIC_AUTH_URL=http://10.79.216.231:3000/api/auth
EXPO_PUBLIC_DEV_MODE=true
```

**Note**: Replace IP addresses with your actual network configuration.

## API Reference

### Protected Routes (Require Bearer Token)

#### User Routes
- `GET /api/trpc/user.getAll` - List all users (admin)
- `GET /api/trpc/user.getById` - Get user by ID
- `POST /api/trpc/user.create` - Create new user (admin)
- `POST /api/trpc/user.update` - Update user
- `POST /api/trpc/user.delete` - Delete user (admin)
- `POST /api/trpc/user.updateProfile` - Update own profile

#### Other Protected Routes
All tRPC routes follow the same pattern and require Bearer authentication.

### Public Routes (No Authentication Required)
- `POST /api/auth/sign-up/email` - User registration
- `POST /api/auth/sign-in/email` - User login
- `GET /health` - Health check

## Development Tips

### Testing Authentication in Bruno
1. Use the **LOGIN** request first to authenticate
2. Bruno automatically saves the token for subsequent requests
3. Check environment variables to see current token value
4. Token persists across Bruno sessions

### Mobile Development
1. Use Expo DevTools to inspect network requests
2. Check console logs for authentication errors
3. Use `console.log(await tokenStorage.getToken())` to verify token storage
4. Clear app data to reset authentication state during testing

### Backend Development
1. Check server logs for authentication errors
2. Verify `BETTER_AUTH_URL` matches your server configuration
3. Use `bun run dev` for hot reload during development
4. Test with cURL before integrating with clients

## Migration from Cookie-Based Auth

If you previously used cookie-based authentication:

1. **Update client code**: Replace cookie handling with Bearer token storage
2. **Clear cookies**: Remove any existing authentication cookies
3. **Re-authenticate**: Login again to get a new Bearer token
4. **Update headers**: Change from cookie-based to `Authorization: Bearer <token>`

The backend now supports both cookies (fallback) and Bearer tokens, but Bearer tokens are preferred for mobile and API clients.

## Support

For issues or questions:
1. Check server logs: `bun run dev` output
2. Verify environment variables are correctly set
3. Test with cURL to isolate client-side issues
4. Review this guide for common solutions

## Related Files

- Backend tRPC context: `apps/backend/src/trpc/index.ts`
- Better-Auth config: `packages/@cashou/auth/src/server.ts`
- Mobile token storage: `apps/mobile/lib/token-storage.ts`
- Mobile tRPC client: `apps/mobile/lib/trpc.ts`
- Bruno collection: `bruno/cashou/`
