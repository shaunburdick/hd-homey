# API Reference

HD Homey provides APIs for programmatic access to channel lineups and stream authentication. These APIs enable integration with external applications and media players.

## Overview

HD Homey implements HDHomeRun-compatible APIs plus custom endpoints for stream security:

- **Lineup API**: HDHomeRun-compatible channel discovery
- **Stream Authentication API**: Custom token-based stream access
- **REST APIs**: Standard CRUD operations for resources

## Available APIs

### HDHomeRun Lineup API
HDHomeRun-compatible endpoint for channel discovery and device integration.

[View Lineup API Documentation →](/api/lineup-endpoint)

**Use cases:**
- Plex DVR integration
- Channels DVR setup
- Custom client applications
- Third-party media servers

**Endpoint**: `GET /api/lineup`

### Stream Authentication API
Custom API for generating secure stream access tokens.

[View Stream Authentication Documentation →](/api/stream-authentication)

**Use cases:**
- External player authentication
- Custom client development
- Secure URL generation
- Token management

**Endpoints**:
- `POST /api/streams/token` - Generate stream token
- `GET /api/streams/validate` - Validate token

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

- [Lineup Endpoint](/api/lineup-endpoint) - HDHomeRun compatibility
- [Stream Authentication](/api/stream-authentication) - Token generation and validation

## Need Help?

- [Troubleshooting](/troubleshooting/) - Common API issues
- [GitHub Issues](https://github.com/shaunburdick/hd-homey/issues) - Report bugs or request features
- [Contributing](/contributing/) - Help improve HD Homey
