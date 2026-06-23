# API Reference

::: warning Documentation In Progress
Detailed API endpoint documentation is being written. For now, refer to the source code in `src/app/api/` for implementation details.
:::

HD Homey provides APIs for programmatic access to channel lineups and stream authentication. These APIs enable integration with external applications and media players.

## Overview

HD Homey implements HDHomeRun-compatible APIs plus custom endpoints for stream security:

- **Lineup API**: HDHomeRun-compatible channel discovery
- **Stream Authentication API**: Custom token-based stream access
- **REST APIs**: Standard CRUD operations for resources

## Available APIs

### Health Check API
Simple health check endpoint for monitoring and infrastructure tooling.

**Use cases:**
- Docker health checks
- Monitoring systems (Prometheus, Datadog, etc.)
- Load balancer health probes
- CI/CD pipeline verification

**Endpoint**: `GET /api/health`

**Authentication**: None required (public endpoint)

**Response Format**: JSON
```json
{
  "status": "ok",
  "timestamp": "2025-12-06T13:00:00.000Z",
  "version": "1.0.0-beta.6",
  "commit": "a1b2c3d",
  "branch": "main",
  "buildDate": "2025-12-06T12:55:53.650Z",
  "environment": "production"
}
```

**Fields:**
- `status`: Always "ok" if server is responding
- `timestamp`: Current server time (ISO 8601)
- `version`: Semantic version (e.g., "1.0.0-beta.6")
- `commit`: Git commit SHA (7 characters, may include `-dirty` suffix in development)
- `branch`: Git branch name (null for detached HEAD)
- `buildDate`: Build timestamp (ISO 8601)
- `environment`: "production" or "development"

### HDHomeRun Lineup API
HDHomeRun-compatible endpoint for channel discovery and device integration.

**Use cases:**
- Plex DVR integration
- Channels DVR setup
- Custom client applications
- Third-party media servers

**Endpoint**: `GET /api/lineup.json` or `GET /api/lineup`

**Response Format**: XML (HDHomeRun-compatible)

### Stream Authentication API
Custom API for generating secure stream access tokens.

**Use cases:**
- External player authentication
- Custom client development
- Secure URL generation

**Authentication**: Session-based (cookies)

**Use cases:**
- External player authentication
- Custom client development
- Secure URL generation
- Token management

**Endpoints**:
- `POST /api/streams/token` - Generate stream token
- `GET /api/streams/validate` - Validate token

### Device Pairing API
OAuth 2.0 Device Authorization Grant (RFC 8628) for authenticating devices without keyboard input.

**Use cases:**
- Android TV authentication
- Smart TV applications
- Set-top boxes and streaming devices
- Mobile device pairing
- Any device with limited input capabilities

**How it works:**
1. Device generates a short code (e.g., "A8F2K9")
2. User visits pairing URL on their phone/computer
3. User enters code and authorizes the device
4. Device receives JWT token for authenticated API access

**Authentication**: Mixed (public code generation, session-based authorization)

**Endpoints**:
- `POST /api/auth/device/code` - Generate device code
- `GET /api/auth/device/poll` - Poll authorization status
- `GET /api/auth/device/validate` - Validate code
- `POST /api/auth/device/authorize` - Authorize device (requires login)

**Built-in UI**: `/pair` - Web interface for entering and authorizing codes

See [Device Pairing API](/api/device-pairing) for detailed documentation and integration guide.

## Authentication

### Session-Based Authentication
Web interface and most API endpoints use cookie-based sessions:

```bash
# Login first
curl -X POST https://tv.example.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username": "admin", "password": "password"}' \
  -c cookies.txt

# Use session cookie for subsequent requests
curl https://tv.example.com/api/lineup \
  -b cookies.txt
```

### Token-Based Authentication
Stream endpoints use HMAC-SHA256 tokens in URLs:

```bash
# Streams include tokens in URL
https://tv.example.com/api/channels/12.1/stream?token=abcdef123456

# Tokens are time-limited and device-specific
# Generate via Stream Authentication API
```

## Response Formats

### Lineup API (XML)
HDHomeRun-compatible XML format:

```xml
<Lineup>
  <Program>
    <GuideNumber>2.1</GuideNumber>
    <GuideName>PBS</GuideName>
    <URL>http://tv.example.com/api/channels/2.1/stream?token=...</URL>
  </Program>
</Lineup>
```

### REST APIs (JSON)
Standard JSON responses:

```json
{
  "success": true,
  "data": {
    "id": "123",
    "name": "Resource Name"
  }
}
```

### Error Responses
Consistent error format:

```json
{
  "success": false,
  "errors": {
    "field": ["Error message"]
  }
}
```

## Rate Limiting

Currently, HD Homey does not implement rate limiting. For production deployments, consider implementing rate limiting at the reverse proxy level (nginx, Caddy, etc.).

## CORS Policy

HD Homey restricts cross-origin requests for security:
- Same-origin requests allowed
- CORS headers set for specific trusted origins
- Credentials required for session-based auth

## API Versioning

Current API version: **v1**

APIs use URL-based versioning when needed:
- `/api/v1/resource` - Versioned endpoint
- `/api/resource` - Unversioned (current version)

Breaking changes will increment the version number.

## Code Examples

### Python
```python
import requests

# Login
session = requests.Session()
session.post('https://tv.example.com/api/auth/login', json={
    'username': 'admin',
    'password': 'password'
})

# Get lineup
lineup = session.get('https://tv.example.com/api/lineup')
print(lineup.text)
```

### JavaScript/Node.js
```javascript
// Login
const response = await fetch('https://tv.example.com/api/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ username: 'admin', password: 'password' }),
  credentials: 'include'
});

// Get lineup
const lineup = await fetch('https://tv.example.com/api/lineup', {
  credentials: 'include'
});
const data = await lineup.text();
console.log(data);
```

### cURL
```bash
# Login and save cookies
curl -X POST https://tv.example.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"password"}' \
  -c cookies.txt

# Get lineup with session
curl https://tv.example.com/api/lineup \
  -b cookies.txt
```

## SDK & Libraries

Currently, HD Homey does not provide official SDKs. The APIs are REST/HTTP-based and work with any HTTP client library.

Community contributions welcome for:
- Python SDK
- JavaScript/TypeScript SDK
- Go library
- Other language bindings

## API Reference Pages

Detailed documentation for each API:

- [Lineup Endpoint](/api/) - HDHomeRun compatibility
- [Stream Authentication](/api/) - Token generation and validation

## Need Help?

- [Troubleshooting](/troubleshooting/) - Common API issues
- [GitHub Issues](https://github.com/shaunburdick/hd-homey/issues) - Report bugs or request features
- [Contributing](/contributing/) - Help improve HD Homey
