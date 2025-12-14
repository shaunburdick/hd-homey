# Backend API Testing Guide

Testing commands for the two new API endpoints implemented for Android Phase 2.

## Prerequisites

1. **HD Homey server running**: `npm run dev` or Docker container
2. **Valid session token**: Obtain from device pairing or web login
3. **Test data**: At least one tuner with channels scanned

## Getting a Session Token

**Important**: HD Homey uses Better-Auth with JWT sessions stored in **cookies**, not Bearer tokens. Use the `Cookie` header, not `Authorization: Bearer`.

### Option 1: Extract from Browser (Easiest)

1. Open HD Homey in browser: `http://localhost:3000`
2. Sign in with your credentials
3. Open browser DevTools (F12) → Application/Storage → Cookies
4. Find cookie named `better-auth.session_token`
5. Copy the value (this is your session token)

### Option 2: Use Device Pairing Flow

```bash
# Step 1: Request device code
curl -X POST http://localhost:3000/api/auth/device/code \
  -H "Content-Type: application/json" \
  -d '{"client_id": "android-tv-app", "scope": "openid profile"}'

# Response: { "device_code": "...", "user_code": "A8F2K9", "verification_uri": "...", "expires_in": 300 }

# Step 2: Authorize in browser
# Visit: http://localhost:3000/users/signin?device=true
# Enter the user_code from step 1

# Step 3: Poll for token
curl -X POST http://localhost:3000/api/auth/device/poll \
  -H "Content-Type: application/json" \
  -d '{"device_code": "<device_code_from_step_1>"}'

# Response: { "access_token": "<SESSION_TOKEN>", "token_type": "Bearer", "expires_in": 604800 }
```

---

## Testing POST /api/stream-token

### Test 1: Valid Request

```bash
# Replace <SESSION_TOKEN> with your actual token from browser cookies
# Replace tunerId=1 and channelId=1 with actual IDs from your database

curl -X POST http://localhost:3000/api/stream-token \
  -H "Content-Type: application/json" \
  -H "Cookie: better-auth.session_token=<SESSION_TOKEN>" \
  -d '{"tunerId": 1, "channelId": 1}'
```

**Expected Response (200)**:
```json
{
  "token": "MToxOjE3MzQyMDQ4MDA6YWJjZGVmZ2hpamtsbW5vcHFyc3R1dnd4eXow",
  "expiresAt": 1734204800,
  "tunerId": 1,
  "channelId": 1
}
```

### Test 2: Missing Authentication

```bash
curl -X POST http://localhost:3000/api/stream-token \
  -H "Content-Type: application/json" \
  -d '{"tunerId": 1, "channelId": 1}'
```

**Expected Response (401)**:
```json
{
  "error": "Unauthorized",
  "message": "Valid authentication token required"
}
```

### Test 3: Invalid Request Body

```bash
curl -X POST http://localhost:3000/api/stream-token \
  -H "Content-Type: application/json" \
  -H "Cookie: better-auth.session_token=<SESSION_TOKEN>" \
  -d '{"tunerId": "not-a-number", "channelId": 1}'
```

**Expected Response (400)**:
```json
{
  "error": "Bad Request",
  "message": "tunerId and channelId must be positive integers",
  "details": [...]
}
```

### Test 4: Tuner Not Found

```bash
curl -X POST http://localhost:3000/api/stream-token \
  -H "Content-Type: application/json" \
  -H "Cookie: better-auth.session_token=<SESSION_TOKEN>" \
  -d '{"tunerId": 999, "channelId": 1}'
```

**Expected Response (404)**:
```json
{
  "error": "Not Found",
  "message": "Tuner 999 not found"
}
```

### Test 5: Channel Not Found

```bash
curl -X POST http://localhost:3000/api/stream-token \
  -H "Content-Type: application/json" \
  -H "Cookie: better-auth.session_token=<SESSION_TOKEN>" \
  -d '{"tunerId": 1, "channelId": 999}'
```

**Expected Response (404)**:
```json
{
  "error": "Not Found",
  "message": "Channel 999 not found on tuner 1"
}
```

---

## Testing GET /api/preferences/channels

### Test 1: Get All Preferences

```bash
curl -X GET http://localhost:3000/api/preferences/channels \
  -H "Cookie: better-auth.session_token=<SESSION_TOKEN>"
```

**Expected Response (200)**:
```json
{
  "data": [
    {
      "channelId": 1,
      "tunerId": 1,
      "guideNumber": "2.1",
      "guideName": "CBS",
      "isFavorite": true,
      "isHidden": false,
      "updatedAt": 1734200000000
    },
    {
      "channelId": 5,
      "tunerId": 1,
      "guideNumber": "7.1",
      "guideName": "ABC",
      "isFavorite": true,
      "isHidden": false,
      "updatedAt": 1734201000000
    }
  ]
}
```

### Test 2: Filter by Tuner

```bash
curl -X GET "http://localhost:3000/api/preferences/channels?tunerId=1" \
  -H "Cookie: better-auth.session_token=<SESSION_TOKEN>"
```

**Expected Response (200)**: Same format as Test 1, but only channels for tuner 1

### Test 3: Missing Authentication

```bash
curl -X GET http://localhost:3000/api/preferences/channels
```

**Expected Response (401)**:
```json
{
  "error": "Unauthorized",
  "message": "Valid authentication token required"
}
```

### Test 4: Invalid tunerId

```bash
curl -X GET "http://localhost:3000/api/preferences/channels?tunerId=not-a-number" \
  -H "Cookie: better-auth.session_token=<SESSION_TOKEN>"
```

**Expected Response (400)**:
```json
{
  "error": "Bad Request",
  "message": "tunerId must be a positive integer"
}
```

### Test 5: User with No Preferences

```bash
# If authenticated user has no channel preferences set
curl -X GET http://localhost:3000/api/preferences/channels \
  -H "Cookie: better-auth.session_token=<SESSION_TOKEN>"
```

**Expected Response (200)**:
```json
{
  "data": []
}
```

---

## Testing with Postman

### Collection Setup

1. **Create Environment Variables**:
   - `base_url`: `http://localhost:3000`
   - `jwt_token`: Your session token from browser or device pairing

2. **Import as Collection**:

**POST /api/stream-token**:
- URL: `{{base_url}}/api/stream-token`
- Method: `POST`
- Headers: 
  - `Content-Type: application/json`
  - `Authorization: Bearer {{jwt_token}}`
- Body (JSON):
  ```json
  {
    "tunerId": 1,
    "channelId": 1
  }
  ```

**GET /api/preferences/channels**:
- URL: `{{base_url}}/api/preferences/channels`
- Method: `GET`
- Headers: 
  - `Authorization: Bearer {{jwt_token}}`
- Query Params (optional):
  - `tunerId`: `1`

---

## Setting Up Test Data

### Add Channel Preferences (via SQL)

If you need test data for preferences endpoint:

```sql
-- Mark channel 1 as favorite for user
INSERT INTO user_channel_preferences (user_id, channel_id, is_favorite, is_hidden, updated_at)
VALUES ('user-uuid-here', 1, 1, 0, cast(unixepoch('subsecond') * 1000 as integer));

-- Hide channel 5 for user
INSERT INTO user_channel_preferences (user_id, channel_id, is_favorite, is_hidden, updated_at)
VALUES ('user-uuid-here', 5, 0, 1, cast(unixepoch('subsecond') * 1000 as integer));
```

Or use the web UI:
1. Navigate to `/tuners/{id}` in HD Homey web app
2. Click the ⭐ icon to favorite a channel
3. Click the 👁️ icon to hide a channel

---

## Verification Checklist

### POST /api/stream-token
- [ ] Returns 200 with valid token for valid request
- [ ] Token is base64url encoded string
- [ ] expiresAt is Unix timestamp (seconds)
- [ ] Returns 401 without authentication
- [ ] Returns 400 for invalid tunerId/channelId
- [ ] Returns 404 for non-existent tuner
- [ ] Returns 404 for non-existent channel
- [ ] Returns 404 when channel doesn't belong to tuner

### GET /api/preferences/channels
- [ ] Returns 200 with array of preferences
- [ ] Only returns channels with isFavorite=true OR isHidden=true
- [ ] Omits channels without preferences
- [ ] Filters by tunerId when query param provided
- [ ] Returns 401 without authentication
- [ ] Returns 400 for invalid tunerId query param
- [ ] Returns empty array when user has no preferences
- [ ] updatedAt is Unix timestamp (milliseconds)

---

## Common Issues

### Issue: 401 Unauthorized
- **Cause**: Invalid or expired session token
- **Solution**: Get a fresh token from browser or device pairing

### Issue: 404 Not Found (tunerId/channelId)
- **Cause**: IDs don't exist in database or are soft-deleted
- **Solution**: Check database for valid IDs:
  ```sql
  SELECT id FROM tuners WHERE deleted_at IS NULL;
  SELECT id, fk_tuner FROM channels WHERE deleted_at IS NULL;
  ```

### Issue: Empty preferences array
- **Cause**: User has no channel preferences set
- **Solution**: Add preferences via web UI or SQL (see "Setting Up Test Data")

### Issue: CORS errors
- **Cause**: Testing from browser without proper CORS setup
- **Solution**: Use curl or Postman instead, or test from same origin

---

## Next Steps After Testing

1. **Verify both endpoints work correctly** ✅
2. **Merge backend branch to main**: `git merge 013-android-app-phase2-backend`
3. **Continue with Android Phase 2 implementation**
4. **Run `/speckit.tasks` to generate task breakdown**

---

**Last Updated**: December 14, 2025  
**Branch**: `013-android-app-phase2-backend`  
**Related Contracts**: 
- `specs/013-android-app-phase2/contracts/stream-token-api.yaml`
- `specs/013-android-app-phase2/contracts/preferences-api.yaml`
