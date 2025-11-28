# API Authentication Guide

## Overview

HD Homey provides REST API endpoints for programmatic access to tuner and channel data. All API routes require authentication except:
- `/api/auth/*` (Better‑Auth endpoints)
- `/api/transcode/*` (uses HMAC token authentication)

## Authentication Methods

### Session-Based Authentication (Primary)

API routes use **session cookie authentication**, the same method used by the web UI.

**Flow**:
1. Client signs in via API or web UI
2. Better‑Auth sets a session cookie
3. Client includes cookie in subsequent API requests
4. Proxy validates session before forwarding to API handler
5. API handler can check `session.user.role` for admin-only operations

**Advantages**:
- Same authentication as web UI
- Automatic CSRF protection
- Session management (revocation, expiry)
- No need to manage API keys

### Token-Based Authentication (Streaming Only)

Streaming endpoints (`/api/transcode/*`) use **HMAC token authentication** to avoid cookie issues in media players.

**Flow**:
1. Web UI generates HMAC token for specific stream
2. Token embedded in HLS playlist URL
3. Streaming endpoint validates token signature
4. No session required

## API Endpoints

### Authentication Endpoints

| Method | Path | Purpose | Body |
|--------|------|---------|------|
| POST | `/api/auth/sign-in/username` | Sign in with username/password | `{"username":"...", "password":"..."}` |
| POST | `/api/auth/sign-up/email` | Create new user (admin only in UI) | `{"username":"...", "password":"...", "name":"...", "email":"...", "role":"viewer"}` |
| POST | `/api/auth/sign-out` | Sign out (clears session) | N/A |
| GET | `/api/auth/get-session` | Get current session info | N/A |

### Tuner Endpoints

| Method | Path | Admin Required | Description |
|--------|------|----------------|-------------|
| GET | `/api/tuners` | No | List all active tuners |
| GET | `/api/tuners/[id]` | No | Get tuner details |
| POST | `/api/tuners/[id]` | **Yes** | Update tuner (name, path, active status) |
| GET | `/api/tuners/[id]/channels` | No | List channels for tuner |
| GET | `/api/tuners/[id]/poll` | No | Poll tuner for channel updates |

### Transcoding Endpoints

| Method | Path | Auth Method | Description |
|--------|------|-------------|-------------|
| GET | `/api/transcode/status` | Session | Get all active transcoding sessions |
| DELETE | `/api/transcode/status` | Session (admin via query param) | Stop transcoding session |
| GET | `/api/transcode/[tunerId]/[channelId]/playlist.m3u8` | **HMAC Token** | HLS playlist |
| GET | `/api/transcode/[tunerId]/[channelId]/[segment]` | **HMAC Token** | HLS segment |

## Usage Examples

### Example 1: Sign In and List Tuners

```bash
# Sign in and save session cookie
curl -c cookies.txt -X POST http://localhost:3000/api/auth/sign-in/username \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"your-password"}'

# Response (example):
# {"data":{"user":{"id":"...","username":"admin","role":"admin"},"session":{...}}}

# List tuners (authenticated)
curl -b cookies.txt http://localhost:3000/api/tuners

# Response (example):
# {"data":[{"id":1,"name":"Living Room","path":"http://192.168.1.100:5004",...}]}
```

### Example 2: Update Tuner (Admin Only)

```bash
# Sign in as admin
curl -c cookies.txt -X POST http://localhost:3000/api/auth/sign-in/username \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"your-password"}'

# Update tuner
curl -b cookies.txt -X POST http://localhost:3000/api/tuners/1 \
  -F "name=Updated Tuner Name" \
  -F "path=http://192.168.1.101:5004" \
  -F "is_active=on"

# Response: 302 redirect or success
```

### Example 3: Unauthenticated Request (Error)

```bash
# Try to access API without authentication
curl http://localhost:3000/api/tuners

# Response:
# {"error":"Unauthorized","message":"Authentication required. Please sign in."}
# Status: 401
```

### Example 4: Insufficient Permissions (Error)

```bash
# Sign in as viewer
curl -c viewer-cookies.txt -X POST http://localhost:3000/api/auth/sign-in/username \
  -H "Content-Type: application/json" \
  -d '{"username":"viewer","password":"viewer-password"}'

# Try admin-only operation
curl -b viewer-cookies.txt -X POST http://localhost:3000/api/tuners/1 \
  -F "name=Hacked Name"

# Response:
# {"error":"Forbidden","message":"Admin access required"}
# Status: 403
```

### Example 5: Get Session Info

```bash
# Sign in
curl -c cookies.txt -X POST http://localhost:3000/api/auth/sign-in/username \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"your-password"}'

# Get session info
curl -b cookies.txt http://localhost:3000/api/auth/get-session

# Response (example):
# {
#   "user": {
#     "id": "uuid-here",
#     "username": "admin",
#     "name": "Admin User",
#     "role": "admin",
#     "isActive": true
#   },
#   "session": {
#     "token": "...",
#     "expiresAt": "2025-12-05T12:00:00.000Z"
#   }
# }
```

### Example 6: Sign Out

```bash
# Sign out
curl -b cookies.txt -X POST http://localhost:3000/api/auth/sign-out

# Response: {"success":true}
# Session cookie is cleared

# Verify session is gone
curl -b cookies.txt http://localhost:3000/api/tuners
# Response: {"error":"Unauthorized",...}
```

## JavaScript/TypeScript Client

### Using Fetch API

```typescript
// Sign in
const signIn = async (username: string, password: string) => {
  const response = await fetch('http://localhost:3000/api/auth/sign-in/username', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
    credentials: 'include' // Important: include cookies
  });
  
  if (!response.ok) {
    throw new Error('Sign in failed');
  }
  
  return await response.json();
};

// Get tuners
const getTuners = async () => {
  const response = await fetch('http://localhost:3000/api/tuners', {
    credentials: 'include' // Important: include cookies
  });
  
  if (!response.ok) {
    throw new Error('Failed to fetch tuners');
  }
  
  return await response.json();
};

// Update tuner (admin only)
const updateTuner = async (id: number, data: FormData) => {
  const response = await fetch(`http://localhost:3000/api/tuners/${id}`, {
    method: 'POST',
    body: data,
    credentials: 'include'
  });
  
  if (!response.ok) {
    throw new Error('Failed to update tuner');
  }
  
  return response;
};

// Sign out
const signOut = async () => {
  const response = await fetch('http://localhost:3000/api/auth/sign-out', {
    method: 'POST',
    credentials: 'include'
  });
  
  return await response.json();
};
```

### Using Better‑Auth Client (Recommended)

```typescript
import { createAuthClient } from 'better-auth/client';

// Create client
const authClient = createAuthClient({
  baseURL: 'http://localhost:3000'
});

// Sign in
const { data, error } = await authClient.signIn.username({
  username: 'admin',
  password: 'your-password'
});

// Get session
const session = await authClient.getSession();
console.log(session.data?.user);

// Sign out
await authClient.signOut();

// For non-auth API calls, use fetch with credentials: 'include'
const response = await fetch('http://localhost:3000/api/tuners', {
  credentials: 'include'
});
```

## Error Handling

### HTTP Status Codes

- **200 OK**: Request succeeded
- **302 Found**: Redirect (after successful POST)
- **400 Bad Request**: Invalid input data
- **401 Unauthorized**: No valid session cookie
- **403 Forbidden**: Valid session but insufficient permissions
- **404 Not Found**: Resource does not exist
- **500 Internal Server Error**: Server error

### Error Response Format

```json
{
  "error": "Error type",
  "message": "Human-readable error message"
}
```

Or for validation errors:

```json
{
  "errors": [
    {
      "path": "field_name",
      "message": "Validation error message"
    }
  ]
}
```

## Security Considerations

### Session Security

- Sessions stored in database (not JWT-only)
- Session tokens are cryptographically secure random values
- Sessions expire after 7 days of inactivity
- Sessions can be revoked by admin
- CSRF protection via SameSite cookies

### Best Practices

1. **Always use HTTPS in production** - Session cookies should be secure
2. **Store credentials securely** - Never hardcode passwords
3. **Rotate sessions** - Sign out and sign in periodically
4. **Limit API rate** - Implement rate limiting for production
5. **Validate responses** - Check HTTP status codes and error messages
6. **Handle errors gracefully** - Show user-friendly error messages

### CORS

HD Homey currently does not enable CORS for API requests. If you need to access the API from a different origin (e.g., a separate frontend):

1. Add CORS middleware to Next.js
2. Configure `Access-Control-Allow-Origin` header
3. Enable `credentials: true` for cookie-based auth

## Migration from NextAuth

### Changes in v1.0.0-beta.3

- **Sign-in endpoint**: Changed from custom credentials flow to Better‑Auth endpoints
- **Session structure**: Session now includes more metadata (IP, user agent)
- **API authentication**: No changes - still uses session cookies via proxy
- **Error responses**: More consistent error format

### Updating Client Code

**Old (NextAuth)**:
```typescript
// Sign in was handled by web UI only
// API used session automatically
```

**New (Better‑Auth)**:
```typescript
// Sign in via API
await fetch('/api/auth/sign-in/username', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ username, password }),
  credentials: 'include'
});

// API usage unchanged - still uses session cookies
```

## Troubleshooting

### "Unauthorized" on every request

- Ensure `credentials: 'include'` is set in fetch options
- Check that cookies are enabled in your client
- Verify session cookie is being set (check browser DevTools → Application → Cookies)
- Try signing in again

### "Forbidden" on admin endpoints

- Verify your user has admin role: `GET /api/auth/get-session`
- Check that `session.user.role === 'admin'`
- Contact admin to update your role

### Session expires too quickly

- Session expires after 7 days by default
- Session is renewed on activity (every 24 hours)
- Check server logs for session errors

### CORS errors in browser

- HD Homey does not enable CORS by default
- For same-origin requests, CORS is not needed
- For cross-origin, configure CORS headers in server

---

**Last Updated**: 2025-11-28 (v1.0.0-beta.3 migration)
