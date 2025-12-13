# Device Pairing API

The Device Pairing API implements an OAuth 2.0 Device Authorization Grant (RFC 8628) flow for authenticating devices without keyboard input, such as smart TVs, streaming devices, and mobile applications.

## Overview

**Use cases:**
- Android TV authentication
- Smart TV applications
- Set-top boxes and streaming devices
- Mobile device pairing
- Any device with limited input capabilities

**Flow summary:**
1. Device generates a short code (e.g., "A8F2K9")
2. User visits pairing URL on their phone/computer
3. User enters code and authorizes the device
4. Device receives JWT token for authenticated API access

::: tip Why Device Pairing?
Traditional username/password authentication is difficult on devices with remote controls or limited keyboards. Device pairing lets users authenticate using their phone or computer while the code is displayed on the TV screen.
:::

## Pairing Flow

```
┌─────────────┐                                    ┌──────────────┐
│   Device    │                                    │   Backend    │
│  (TV/App)   │                                    │  HD Homey    │
└──────┬──────┘                                    └──────┬───────┘
       │                                                  │
       │ 1. POST /api/auth/device/code                   │
       │    { deviceName, deviceType }                   │
       ├────────────────────────────────────────────────>│
       │                                                  │
       │ 2. { code: "A8F2K9", pairingUrl, expiresAt }   │
       │<─────────────────────────────────────────────────┤
       │                                                  │
       │ Display: "Go to tv.example.com/pair"           │
       │          "Enter code: A8F2K9"                   │
       │                                                  │
       │ 3. Poll: GET /api/auth/device/poll?code=A8F2K9 │
       │    (repeat every 3-5 seconds)                   │
       ├────────────────────────────────────────────────>│
       │                                                  │
       │ 4. { status: "pending" }                        │
       │<─────────────────────────────────────────────────┤
       │                                                  │
       │           User opens pairingUrl on phone        │
       │           and authorizes the device             │
       │                                                  │
       │ 5. Poll again...                                │
       ├────────────────────────────────────────────────>│
       │                                                  │
       │ 6. { status: "authorized",                      │
       │      token: "eyJhbG...",                         │
       │      user: { id, username, role } }             │
       │<─────────────────────────────────────────────────┤
       │                                                  │
       │ 7. Store token, use for API requests            │
       │    Authorization: Bearer eyJhbG...              │
       │                                                  │
```

## Endpoints

### Generate Device Code

**`POST /api/auth/device/code`**

Generate a new device code for pairing.

**Authentication**: None required (public endpoint)

**Request Body**:
```json
{
  "deviceName": "Living Room TV",
  "deviceType": "tv"
}
```

**Request Fields**:
- `deviceName` (string, required): Human-readable device name (max 100 characters)
- `deviceType` (string, required): Device type - one of: `"tv"`, `"tablet"`, `"phone"`

**Response** (`201 Created`):
```json
{
  "code": "A8F2K9",
  "deviceName": "Living Room TV",
  "deviceType": "tv",
  "pairingUrl": "https://tv.example.com/pair",
  "expiresAt": "2025-12-13T12:05:00.000Z"
}
```

**Response Fields**:
- `code` (string): 6-character alphanumeric code (uppercase, no ambiguous characters)
- `deviceName` (string): Echo of device name from request
- `deviceType` (string): Echo of device type from request
- `pairingUrl` (string): Full URL where users should enter the code
- `expiresAt` (string): ISO 8601 timestamp when code expires (5 minutes from creation)

**Error Responses**:
- `400 Bad Request`: Missing or invalid fields
  ```json
  {
    "error": "Invalid device type. Must be one of: tv, tablet, phone"
  }
  ```

**Example - cURL**:
```bash
curl -X POST https://tv.example.com/api/auth/device/code \
  -H "Content-Type: application/json" \
  -d '{
    "deviceName": "Living Room TV",
    "deviceType": "tv"
  }'
```

**Example - JavaScript**:
```javascript
const response = await fetch('https://tv.example.com/api/auth/device/code', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    deviceName: 'Living Room TV',
    deviceType: 'tv'
  })
});

const data = await response.json();
console.log('Enter code:', data.code);
console.log('Visit:', data.pairingUrl);
```

**Example - Python**:
```python
import requests

response = requests.post('https://tv.example.com/api/auth/device/code', json={
    'deviceName': 'Living Room TV',
    'deviceType': 'tv'
})

data = response.json()
print(f"Enter code: {data['code']}")
print(f"Visit: {data['pairingUrl']}")
```

---

### Poll Authorization Status

**`GET /api/auth/device/poll?code={code}`**

Poll to check if a device code has been authorized by the user.

**Authentication**: None required (public endpoint)

**Query Parameters**:
- `code` (string, required): The 6-character device code

**Response - Pending** (`200 OK`):
```json
{
  "status": "pending",
  "expiresAt": "2025-12-13T12:05:00.000Z"
}
```

**Response - Authorized** (`200 OK`):
```json
{
  "status": "authorized",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "user123",
    "username": "john_doe",
    "role": "viewer"
  },
  "authorizedAt": "2025-12-13T12:03:45.123Z"
}
```

**Response - Denied** (`200 OK`):
```json
{
  "status": "denied"
}
```

**Response Fields**:
- `status` (string): One of: `"pending"`, `"authorized"`, `"denied"`, `"expired"`
- `token` (string, only if authorized): JWT token for authenticated API requests
- `user` (object, only if authorized): User information
  - `id` (string): User ID
  - `username` (string): Username
  - `role` (string): User role (`"admin"` or `"viewer"`)
- `authorizedAt` (string, only if authorized): ISO 8601 timestamp of authorization
- `expiresAt` (string, only if pending): ISO 8601 timestamp when code expires

**Error Responses**:
- `400 Bad Request`: Missing code parameter
  ```json
  {
    "error": "Missing device code"
  }
  ```
- `404 Not Found`: Invalid or unknown code
  ```json
  {
    "error": "Device code not found"
  }
  ```
- `410 Gone`: Code has expired
  ```json
  {
    "status": "expired"
  }
  ```

**Polling Recommendations**:
- Start polling immediately after generating code
- Poll every 3-5 seconds
- Stop polling when status is `"authorized"`, `"denied"`, or `"expired"`
- Implement exponential backoff for errors (network failures, 5xx responses)
- Show countdown timer to user based on `expiresAt`

**Example - cURL**:
```bash
curl "https://tv.example.com/api/auth/device/poll?code=A8F2K9"
```

**Example - JavaScript (with polling)**:
```javascript
async function pollForAuthorization(code) {
  while (true) {
    const response = await fetch(
      `https://tv.example.com/api/auth/device/poll?code=${code}`
    );
    
    const data = await response.json();
    
    if (data.status === 'authorized') {
      // Store token for API requests
      localStorage.setItem('authToken', data.token);
      console.log('Authorized as:', data.user.username);
      return data;
    }
    
    if (data.status === 'denied' || data.status === 'expired') {
      console.error('Authorization failed:', data.status);
      return null;
    }
    
    // Wait 3 seconds before polling again
    await new Promise(resolve => setTimeout(resolve, 3000));
  }
}
```

**Example - Python (with polling)**:
```python
import requests
import time

def poll_for_authorization(code):
    while True:
        response = requests.get(
            f'https://tv.example.com/api/auth/device/poll',
            params={'code': code}
        )
        data = response.json()
        
        if data['status'] == 'authorized':
            # Store token for API requests
            token = data['token']
            print(f"Authorized as: {data['user']['username']}")
            return token
        
        if data['status'] in ['denied', 'expired']:
            print(f"Authorization failed: {data['status']}")
            return None
        
        # Wait 3 seconds before polling again
        time.sleep(3)
```

---

### Validate Device Code

**`GET /api/auth/device/validate?code={code}`**

Validate a device code without authorizing it. Useful for checking code validity before showing authorization UI.

**Authentication**: None required (public endpoint)

**Query Parameters**:
- `code` (string, required): The 6-character device code

**Response** (`200 OK`):
```json
{
  "valid": true,
  "deviceName": "Living Room TV",
  "deviceType": "tv",
  "status": "pending",
  "createdAt": "2025-12-13T12:00:00.000Z",
  "expiresAt": "2025-12-13T12:05:00.000Z"
}
```

**Response Fields**:
- `valid` (boolean): Whether the code exists and is not expired
- `deviceName` (string): Name of the device requesting pairing
- `deviceType` (string): Type of device (`"tv"`, `"tablet"`, `"phone"`)
- `status` (string): Current status (`"pending"`, `"authorized"`, `"denied"`)
- `createdAt` (string): ISO 8601 timestamp when code was created
- `expiresAt` (string): ISO 8601 timestamp when code expires

**Error Responses**:
- `400 Bad Request`: Missing code parameter
  ```json
  {
    "error": "Missing device code"
  }
  ```
- `404 Not Found`: Invalid or unknown code
  ```json
  {
    "valid": false,
    "error": "Device code not found"
  }
  ```
- `410 Gone`: Code has expired
  ```json
  {
    "valid": false,
    "error": "Device code has expired"
  }
  ```

**Example - cURL**:
```bash
curl "https://tv.example.com/api/auth/device/validate?code=A8F2K9"
```

**Example - JavaScript**:
```javascript
const response = await fetch(
  'https://tv.example.com/api/auth/device/validate?code=A8F2K9'
);
const data = await response.json();

if (data.valid) {
  console.log(`Authorize ${data.deviceName}?`);
} else {
  console.error('Invalid code:', data.error);
}
```

---

### Authorize Device

**`POST /api/auth/device/authorize`**

Authorize a device code, granting the device access to the user's account.

**Authentication**: Session-based (user must be logged in)

**Request Body**:
```json
{
  "code": "A8F2K9",
  "authorize": true
}
```

**Request Fields**:
- `code` (string, required): The 6-character device code
- `authorize` (boolean, required): `true` to authorize, `false` to deny

**Response - Authorized** (`200 OK`):
```json
{
  "success": true,
  "deviceName": "Living Room TV",
  "deviceType": "tv"
}
```

**Response - Denied** (`200 OK`):
```json
{
  "success": true,
  "denied": true
}
```

**Error Responses**:
- `400 Bad Request`: Invalid request
  ```json
  {
    "error": "Missing device code or authorize field"
  }
  ```
- `401 Unauthorized`: User not logged in
  ```json
  {
    "error": "Authentication required"
  }
  ```
- `404 Not Found`: Invalid code
  ```json
  {
    "error": "Device code not found"
  }
  ```
- `409 Conflict`: Code already processed
  ```json
  {
    "error": "Device code already authorized"
  }
  ```
- `410 Gone`: Code expired
  ```json
  {
    "error": "Device code has expired"
  }
  ```

**Example - cURL**:
```bash
# First login and save session
curl -X POST https://tv.example.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"password"}' \
  -c cookies.txt

# Then authorize device
curl -X POST https://tv.example.com/api/auth/device/authorize \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d '{
    "code": "A8F2K9",
    "authorize": true
  }'
```

**Example - JavaScript**:
```javascript
// User must be logged in first
const response = await fetch('https://tv.example.com/api/auth/device/authorize', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  credentials: 'include', // Include session cookie
  body: JSON.stringify({
    code: 'A8F2K9',
    authorize: true
  })
});

const data = await response.json();
if (data.success) {
  console.log('Device authorized:', data.deviceName);
}
```

---

## Device Code Format

Device codes are designed for easy manual entry:

- **Length**: 6 characters
- **Character set**: Uppercase alphanumeric (A-Z, 0-9)
- **Excluded characters**: Ambiguous characters removed
  - No `O` (looks like `0`)
  - No `I` (looks like `1`)
  - No `L` (looks like `1` or `I`)
  - No `0` (looks like `O`)
  - No `1` (looks like `I` or `L`)
- **Examples**: `A8F2K9`, `B3G7M4`, `C9H5N8`

This design minimizes user error when entering codes via remote control or phone keyboard.

---

## Security Considerations

### Code Expiration
- Device codes expire 5 minutes after creation
- Expired codes cannot be used
- Polling expired codes returns `410 Gone`

### One-Time Use
- Codes can only be authorized once
- After authorization or denial, the code cannot be reused
- Attempting to reuse returns `409 Conflict`

### Rate Limiting
Consider implementing rate limiting for code generation:
- Limit codes per IP address per hour
- Limit codes per device type globally
- Prevent abuse of code generation endpoint

### Token Security
- JWT tokens should be stored securely on the device
- Tokens include user ID, username, and role
- Tokens should be transmitted over HTTPS only
- Consider implementing token refresh mechanism for long-lived devices

### Audit Trail
The database stores:
- IP address of device that created code
- User agent string
- Authorization timestamp
- Which user authorized the device
- Device name and type

---

## Integration Guide

### Android TV Integration

**Step 1: Generate Code**
```kotlin
// Generate device code
val response = api.post("auth/device/code") {
    setBody(mapOf(
        "deviceName" to "Living Room TV",
        "deviceType" to "tv"
    ))
}
val data = response.body<DeviceCodeResponse>()
```

**Step 2: Display Code**
```kotlin
// Show code on TV screen
Text(
    text = "Go to ${data.pairingUrl}\nEnter code: ${data.code}",
    fontSize = 32.sp
)

// Show countdown timer
val timeRemaining = data.expiresAt - System.currentTimeMillis()
Text("Code expires in ${timeRemaining / 1000} seconds")
```

**Step 3: Poll for Authorization**
```kotlin
// Poll every 3 seconds
val scope = CoroutineScope(Dispatchers.IO)
scope.launch {
    while (true) {
        val pollResponse = api.get("auth/device/poll?code=${data.code}")
        val pollData = pollResponse.body<PollResponse>()
        
        when (pollData.status) {
            "authorized" -> {
                // Store token and navigate to main screen
                preferences.edit()
                    .putString("auth_token", pollData.token)
                    .apply()
                navigateToMainScreen()
                break
            }
            "denied", "expired" -> {
                showError("Authorization failed")
                break
            }
            "pending" -> {
                // Continue polling
                delay(3000)
            }
        }
    }
}
```

**Step 4: Use Token**
```kotlin
// Include token in API requests
val client = HttpClient {
    install(Auth) {
        bearer {
            loadTokens {
                BearerTokens(
                    accessToken = preferences.getString("auth_token", "")!!,
                    refreshToken = ""
                )
            }
        }
    }
}
```

---

## Web Interface

HD Homey provides a built-in web interface for device pairing at `/pair`:

**Features:**
- Enter 6-character device code
- Shows device name and type before authorization
- One-click authorize or deny
- Success confirmation page
- Responsive design for mobile and desktop

**User Flow:**
1. User visits `https://tv.example.com/pair` (from TV screen instruction)
2. Enters 6-character code (e.g., "A8F2K9")
3. Sees: "Authorize Living Room TV?"
4. Clicks "Authorize" or "Deny"
5. Redirects to success page

**For Developers:**
You can customize the pairing URL in environment variables or implement your own pairing UI that calls the authorization endpoint.

---

## Testing

### Manual Testing Flow

1. **Generate Code:**
   ```bash
   curl -X POST http://localhost:3000/api/auth/device/code \
     -H "Content-Type: application/json" \
     -d '{"deviceName": "Test TV", "deviceType": "tv"}'
   ```

2. **Validate Code:**
   ```bash
   curl "http://localhost:3000/api/auth/device/validate?code=A8F2K9"
   ```

3. **Visit Pairing Page:**
   - Open `http://localhost:3000/pair` in browser
   - Enter the code from step 1
   - Click "Authorize"

4. **Poll for Token:**
   ```bash
   curl "http://localhost:3000/api/auth/device/poll?code=A8F2K9"
   ```

5. **Use Token:**
   ```bash
   curl http://localhost:3000/api/lineup \
     -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
   ```

### Automated Testing

HD Homey includes comprehensive unit tests for device pairing:

```bash
npm test -- device
```

**Test coverage includes:**
- Code generation and validation
- Polling flow (pending → authorized/denied/expired)
- Authorization with session
- Error cases (missing params, expired codes, etc.)
- Concurrent polling requests
- Database constraints and race conditions

---

## Troubleshooting

### Code Not Working
- **Check expiration**: Codes expire in 5 minutes
- **Verify format**: Must be exactly 6 uppercase alphanumeric characters
- **Case sensitive**: `a8f2k9` won't work, must be `A8F2K9`

### Polling Returns 404
- Code may have expired (check `expiresAt` timestamp)
- Code may have been mistyped
- Generate a new code

### Authorization Fails
- User must be logged in to authorize
- Check browser session cookies are enabled
- Verify `BETTER_AUTH_URL` is set correctly in environment

### Token Not Working
- Verify token is being sent in `Authorization: Bearer {token}` header
- Check token hasn't expired (JWT expiration time)
- Ensure HTTPS is used in production (tokens should never be sent over HTTP)

---

## Related Documentation

- [User Management](/features/user-management) - User roles and authentication
- [API Reference](/api/) - Other API endpoints
- [Stream Security](/features/stream-security) - Stream token generation
- [Troubleshooting](/troubleshooting/) - Common issues

---

## Need Help?

- [GitHub Issues](https://github.com/shaunburdick/hd-homey/issues) - Report bugs or request features
- [Contributing Guide](/contributing/) - Help improve HD Homey
