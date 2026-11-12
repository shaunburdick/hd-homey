# API Reference

HD Homey exposes JSON endpoints for its web interface, the Android app, and external players. Everything documented here exists in `apps/web/src/app/api/` — if a route is not listed, it is not implemented.

::: warning HDHomeRun emulation is not implemented
HD Homey does not serve `/discover.json`, `/lineup.json`, `/lineup_status.json`, or `/device.xml`, so it cannot be added to Plex or Jellyfin as a tuner device. Track that work in [issue #40](https://github.com/shaunburdick/hd-homey/issues/40).
:::

## Authentication

Three schemes are in use:

| Scheme | Applies to | How it travels |
|--------|-----------|----------------|
| Session cookie | Every route except the public and token routes | Better-Auth session cookie, set by signing in at `/users/signin` |
| Stream token | Channel streams, HLS playlists and segments | `?token=` query parameter, HMAC-SHA256, bound to one tuner and channel |
| None | `/api/health`, `/api/auth/*`, `/pair` | — |

Stream tokens are generated with `POST /api/stream-token` while holding a session. They expire after `HD_HOMEY_STREAM_TOKEN_EXPIRY` seconds (default 12 hours) and are only valid for the tuner and channel they were issued for. There is no long-lived API key: anything acting on a user's behalf needs a session, which is why external players take a copied URL rather than a credential.

## Endpoints

### System

| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| `GET` | `/api/health` | None | Liveness and build metadata |

`GET /api/health` returns:

```json
{
  "status": "ok",
  "timestamp": "2026-06-20T13:00:00.000Z",
  "version": "1.0.0-beta.6",
  "commit": "b8590cf",
  "branch": "main",
  "buildDate": "2026-06-20T12:55:53.650Z",
  "environment": "production"
}
```

`commit` may carry a `-dirty` suffix in development. `branch` is `null` on a detached HEAD.

### Tuners and channels

| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| `GET` | `/api/tuners` | Session | All active tuners |
| `GET` | `/api/tuners/{id}` | Session | One tuner: `id`, `name`, `is_active` |
| `POST` | `/api/tuners/{id}` | Admin | Update a tuner from form data |
| `GET` | `/api/tuners/{id}/channels` | Session | Stored channels for a tuner |
| `GET` | `/api/tuners/{id}/poll` | Session | Re-read the device lineup and store changes |
| `GET` | `/api/preferences/channels?tunerId={id}` | Session | The signed-in user's favourites and hidden channels |

Responses wrap their payload in `data`:

```json
{
  "data": [
    {
      "id": 1,
      "name": "Garage",
      "path": "192.168.1.50",
      "is_active": true
    }
  ]
}
```

`/api/tuners/{id}/poll` talks to the device, so it takes as long as the tuner's lineup request and is rate-limited only by the client.

### Streaming

| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| `POST` | `/api/stream-token` | Session | Mint a stream token |
| `GET` | `/tuners/{id}/channel/{channelId}/stream?token={token}` | Stream token | Raw MPEG-TS passthrough |
| `GET` | `/api/transcode/{tunerId}/{channelId}/playlist.m3u8?token={token}` | Stream token | HLS playlist |
| `GET` | `/api/transcode/{tunerId}/{channelId}/{segment}?token={token}` | Stream token | HLS segment |

Mint a token:

```bash
curl -X POST http://localhost:3000/api/stream-token \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d '{"tunerId": 1, "channelId": 5}'
```

```json
{ "token": "MToxOjE3...", "expiresAt": 1750428800, "tunerId": 1, "channelId": 5 }
```

Then use it in the URL:

```bash
# Raw MPEG-TS — works in VLC and other players that accept a transport stream
curl -o channel.ts "http://localhost:3000/tuners/1/channel/5/stream?token=$TOKEN"

# HLS — what the in-browser player uses
curl "http://localhost:3000/api/transcode/1/5/playlist.m3u8?token=$TOKEN"
```

Transcoding must be enabled in settings for the HLS routes to work; when it is off, the playlist route returns `503 Transcoding not enabled` and `/tuners/{id}/channel/{channelId}/watch` tells the user playback is unavailable. Segment and playlist responses also accept `Access-Control-Allow-Origin: *`, which is what lets a player on another origin fetch them.

### Transcoding sessions

| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| `GET` | `/api/transcode/status` | Admin | Active sessions and viewer counts |
| `DELETE` | `/api/transcode/status?sessionId={id}` | Admin | Stop one session |

### Signal and tuning

| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| `GET` | `/api/signal/{tunerId}/stream` | Session | Server-Sent Events stream of signal readings |
| `POST` | `/api/signal/{tunerId}/tune` | Admin | Tune a physical slot to a channel |
| `POST` | `/api/signal/{tunerId}/clear` | Admin | Release a physical slot |

Tune and clear take a channel guide number and the physical slot resource:

```bash
curl -X POST http://localhost:3000/api/signal/1/tune \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d '{"guideNumber": "5.1", "resource": "tuner0", "force": false}'
```

A `409` means viewers are streaming from that tuner; pass `"force": true` to interrupt them. A `502` means the device did not answer the native control protocol on port 65001.

### Device pairing

| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| `POST` | `/api/auth/device/code` | None | Start pairing; returns a six-character code |
| `GET` | `/api/auth/device/validate?code={code}` | None | Check a code is still pending |
| `POST` | `/api/auth/device/authorize` | Session | Approve a code |

::: warning Token exchange is incomplete
Approving a code marks it `authorized` in the database, but no endpoint issues a token to the waiting device yet. The Android app expects `GET /api/auth/device/poll`, which does not exist. Do not build against the pairing flow until that lands.
:::

See [Device Pairing API](/api/device-pairing) for the full flow.

## Error format

Handlers return one of two shapes. Newer routes use the structured form:

```json
{ "error": "Not Found", "message": "Tuner 7 not found" }
```

Older ones return a bare string body with the status code, for example `Unauthorized`. Check the status code first and treat the body as a hint.

## Rate limiting and CORS

HD Homey does not implement rate limiting. If you expose it to the internet, do it at the reverse proxy.

CORS is wide open only on the stream and HLS routes; every other endpoint is same-origin. Browsers must send credentials for session routes, so cross-origin clients need a stream token instead.

## Versioning

Routes are unversioned. Breaking changes are called out in [CHANGELOG.md](https://github.com/shaunburdick/hd-homey/blob/main/CHANGELOG.md) and, where they affect the Android app, accompany an app release.
