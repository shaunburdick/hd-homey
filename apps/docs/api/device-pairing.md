# Device Pairing API

Device pairing lets a device without a keyboard — a TV, a set-top box, the Android app — request access by showing a short code that the user approves on a phone or laptop.

::: warning The token exchange is incomplete
A device can request a code and a signed-in user can approve it. Nothing yet hands the device a credential after approval: the Android app calls `GET /api/auth/device/poll`, which is not implemented, and `POST /api/auth/device/authorize` only records the approval. Until that lands, a device that completes pairing cannot make authenticated requests.
:::

## Flow

```
┌─────────────┐                                    ┌──────────────┐
│   Device    │                                    │   Backend    │
└──────┬──────┘                                    └──────┬───────┘
       │ 1. POST /api/auth/device/code                   │
       │    { deviceName, deviceType }                   │
       ├────────────────────────────────────────────────>│
       │ 2. { code: "A8F2K9", pairingUrl, expiresAt }    │
       │<────────────────────────────────────────────────┤
       │                                                  │
       │ Display: "Go to tv.example.com/pair,            │
       │           enter code A8F2K9"                    │
       │                                                  │
       │   User opens pairingUrl, signs in, approves     │
       │   → POST /api/auth/device/authorize             │
       │                                                  │
       │ 3. GET /api/auth/device/validate?code=A8F2K9    │
       │    (repeat every 3-5 seconds)                   │
       ├────────────────────────────────────────────────>│
       │ 4. 409 once the code has been authorized        │
       │<────────────────────────────────────────────────┤
       │                                                  │
       │ 5. No token is issued yet — see the warning.     │
```

Codes are six characters from an alphabet without look-alike glyphs (`O`/`0`, `I`/`1` are excluded), expire after five minutes, and are single-use.

## `POST /api/auth/device/code`

Start a pairing request.

**Authentication**: none

**Request**:

```json
{ "deviceName": "Living Room TV", "deviceType": "tv" }
```

`deviceType` is one of `tv`, `tablet`, `phone`. `deviceName` is 1–100 characters.

**Response** `201 Created`:

```json
{
  "code": "A8F2K9",
  "expiresAt": "2026-06-20T18:30:00.000Z",
  "pairingUrl": "https://tv.example.com/pair?code=A8F2K9"
}
```

The pairing URL is built from the request's `Host` and `x-forwarded-proto` headers, so it is correct behind a reverse proxy as long as those headers are passed through.

## `GET /api/auth/device/validate?code={code}`

Check whether a code is still usable. This is the endpoint a device polls.

**Authentication**: none

| Status | Meaning |
|--------|---------|
| `200` | Still pending. Body: `{ "deviceName", "deviceType", "expiresAt" }` |
| `404` | No such code |
| `409` | Already authorized or denied. Body: `{ "error": "Code has already been authorized" }` |
| `410` | Expired |

There is no `status` field in the response — the HTTP status is the state. A poller should treat `409` as success and stop polling (and, once token issuance exists, collect its token there).

```bash
curl "http://localhost:3000/api/auth/device/validate?code=A8F2K9"
```

## `POST /api/auth/device/authorize`

Approve a code. This is what the `/pair` page calls after the user signs in.

**Authentication**: session cookie required. The approving user is recorded as `authorizedBy`.

**Request**:

```json
{ "code": "A8F2K9" }
```

**Response** `200 OK`: `{ "success": true }`. `404`, `409`, and `410` match the meanings above.

## Pairing UI

`/pair?code=A8F2K9` is the built-in screen. An unauthenticated visitor is redirected to sign-in and returned to the code afterwards. The page shows which device is asking and who is signed in before the user approves.

## Integrating a device

1. `POST /api/auth/device/code` and display the code and pairing URL.
2. Poll `GET /api/auth/device/validate` every 3–5 seconds.
3. Stop on `409` (approved), `410` (expired), or `404` (gone); back off on `5xx`.
4. Do not assume a token will appear in the poll response — it is not implemented yet.
