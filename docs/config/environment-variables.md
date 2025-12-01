# Environment Variables

HD Homey is configured using environment variables. This guide covers all available configuration options and how to use them.

## Setting Environment Variables

### Docker Compose

The recommended approach is to use a `.env` file:

```bash
# Create .env file from example
cp .env-example .env

# Edit .env file
nano .env
```

Example `.env` file:
```bash
# Required
AUTH_SECRET=your-secret-key-here

# Optional
HD_HOMEY_PROXY_HOST=https://tuner.example.com
HD_HOMEY_DB_PATH=./data/db
HD_HOMEY_TRANSCODE_DIR=/tmp/transcoding
HD_HOMEY_STREAM_TOKEN_EXPIRY=43200
FFMPEG_PATH=ffmpeg
LOG_LEVEL=info
NODE_ENV=production
```

Then reference in `compose.yml`:
```yaml
services:
  hd-homey:
    environment:
      - AUTH_SECRET=${AUTH_SECRET}
      - HD_HOMEY_PROXY_HOST=${HD_HOMEY_PROXY_HOST:-}
    # ... other config
```

### Docker Run

Pass variables directly with `-e` flags:

```bash
docker run -d \
  -e AUTH_SECRET=your-secret-key \
  -e HD_HOMEY_PROXY_HOST=https://tuner.example.com \
  -e LOG_LEVEL=debug \
  ghcr.io/shaunburdick/hd-homey:latest
```

### From Source

Create a `.env` file in the project root:

```bash
cp .env-example .env
nano .env
```

The `.env` file is automatically loaded by Next.js during development and production builds.

## Required Variables

### AUTH_SECRET

**Purpose**: Encryption key for Better-Auth session tokens and cryptographic operations.

**Format**: String, minimum 32 characters (base64 recommended)

**Example**:
```bash
AUTH_SECRET=xK8fN2mP9vQ7wR5tY3uI6oL1nM4bV0cZ
```

**Generation**:
```bash
# Generate a secure random secret
openssl rand -base64 32
```

**Security Notes**:
- ⚠️ **Never commit this to version control**
- ⚠️ **Keep this secret secure** - anyone with this value can forge session tokens
- ⚠️ **Changing this invalidates all existing sessions** - users will need to sign in again
- ✅ Use a different value for each environment (dev, staging, production)

::: danger Critical Security Requirement
`AUTH_SECRET` must be set before starting HD Homey. The application will not start without it. Never use the example value in production.
:::

## Optional Variables

### HD_HOMEY_PROXY_HOST

**Purpose**: External URL for HD Homey, used to generate stream URLs.

**Format**: Full URL including protocol (http:// or https://)

**Default**: Auto-detected from incoming requests

**Example**:
```bash
HD_HOMEY_PROXY_HOST=https://tuner.example.com
```

**When to set**:
- Running behind a reverse proxy (nginx, Caddy, Traefik)
- Accessing from remote networks
- Auto-detection returns incorrect URLs (e.g., internal IPs)

**When not needed**:
- Local network access only
- Auto-detection works correctly

::: tip Reverse Proxy Setup
When using a reverse proxy:
1. Set `HD_HOMEY_PROXY_HOST` to your external URL
2. Configure proxy to forward requests to HD Homey (port 3000)
3. Ensure WebSocket support for future features
4. Use HTTPS with valid SSL certificates for security
:::

### HD_HOMEY_DB_PATH

**Purpose**: Directory path for SQLite database storage.

**Format**: Filesystem path (relative or absolute)

**Default**: `./data/db`

**Example**:
```bash
HD_HOMEY_DB_PATH=./data/db
# Or absolute path
HD_HOMEY_DB_PATH=/app/data/db
```

**Database file**: HD Homey creates `hd_homey.db` inside this directory.

**Important**:
- Directory must exist or be creatable by the application
- Must have read/write permissions
- Should be backed up regularly
- Use Docker volumes for persistence in containers

### HD_HOMEY_TRANSCODE_DIR

**Purpose**: Directory for temporary transcoding output (HLS segments).

**Format**: Filesystem path

**Default**: `./data/transcoding`

**Example**:
```bash
HD_HOMEY_TRANSCODE_DIR=/tmp/transcoding
```

**Performance Optimization**:
For best performance, use a RAM-based filesystem (tmpfs):

```yaml
# compose.yml
volumes:
  - transcode-tmp:/tmp/transcoding

volumes:
  transcode-tmp:
    driver: local
    driver_opts:
      type: tmpfs
      device: tmpfs
      o: size=1g,uid=1001,gid=1001
```

**Benefits of tmpfs**:
- ✅ Faster read/write (in RAM)
- ✅ Automatic cleanup on restart
- ✅ Reduces disk I/O
- ⚠️ Requires adequate RAM (allocate ~100MB per concurrent 1080p stream)

### HD_HOMEY_STREAM_TOKEN_EXPIRY

**Purpose**: Validity duration for stream authentication tokens.

**Format**: Integer (seconds)

**Default**: `43200` (12 hours)

**Example**:
```bash
# 24 hours
HD_HOMEY_STREAM_TOKEN_EXPIRY=86400

# 1 hour
HD_HOMEY_STREAM_TOKEN_EXPIRY=3600

# 7 days
HD_HOMEY_STREAM_TOKEN_EXPIRY=604800
```

**Considerations**:
- **Shorter duration**: More secure, but users need to refresh URLs more frequently
- **Longer duration**: More convenient, but increases risk if URLs are leaked
- **Recommended**: 12-24 hours for most use cases

**Token regeneration**:
Users can generate new tokens anytime by visiting the channel details page.

### FFMPEG_PATH

**Purpose**: Path to the FFmpeg binary executable.

**Format**: Filesystem path to executable

**Default**: `ffmpeg` (assumes ffmpeg is in PATH)

**Example**:
```bash
# Default (ffmpeg in PATH)
FFMPEG_PATH=ffmpeg

# Custom path
FFMPEG_PATH=/usr/local/bin/ffmpeg

# Specific version
FFMPEG_PATH=/opt/ffmpeg-6.1/bin/ffmpeg
```

**Requirements**:
- FFmpeg version 4.0+ (5.0+ recommended)
- Compiled with H.264 (libx264) and AAC codecs
- Docker images include FFmpeg automatically

**Verification**:
```bash
# Docker
docker exec hd-homey ffmpeg -version

# Source install
ffmpeg -version
```

::: tip Installing FFmpeg
**Ubuntu/Debian**:
```bash
sudo apt update && sudo apt install ffmpeg
```

**macOS**:
```bash
brew install ffmpeg
```

**From source**:
See [FFmpeg Compilation Guide](https://trac.ffmpeg.org/wiki/CompilationGuide)
:::

### BETTER_AUTH_URL

**Purpose**: Base URL for Better-Auth endpoints.

**Format**: Full URL including protocol

**Default**: Auto-detected (same as `NEXTAUTH_URL` or from request headers)

**Example**:
```bash
BETTER_AUTH_URL=https://tuner.example.com
```

**When to set**:
- Better-Auth endpoints return incorrect URLs
- Running behind a reverse proxy with complex routing
- Authentication redirects fail

**Usually not needed** if `HD_HOMEY_PROXY_HOST` is set correctly.

### NEXTAUTH_URL

**Purpose**: Fallback for `BETTER_AUTH_URL` (legacy compatibility).

**Format**: Full URL including protocol

**Default**: Auto-detected

**Example**:
```bash
NEXTAUTH_URL=https://tuner.example.com
```

**Note**: `BETTER_AUTH_URL` takes precedence if both are set.

### NODE_ENV

**Purpose**: Runtime environment mode.

**Format**: String (`development`, `production`, `test`)

**Default**: `development`

**Example**:
```bash
NODE_ENV=production
```

**Effects**:
- `development`: Enables hot reloading, verbose logs, dev tools
- `production`: Optimized builds, reduced logging, performance mode
- `test`: Test environment configuration

**Docker default**: Set to `production` in Docker images.

### LOG_LEVEL

**Purpose**: Logging verbosity level.

**Format**: String (`trace`, `debug`, `info`, `warn`, `error`, `fatal`)

**Default**: `info`

**Example**:
```bash
# More verbose (for debugging)
LOG_LEVEL=debug

# Less verbose (production)
LOG_LEVEL=warn
```

**Log Levels**:
- `trace`: Extremely verbose (every function call)
- `debug`: Detailed debugging information
- `info`: General informational messages (default)
- `warn`: Warning messages (potential issues)
- `error`: Error messages (failures)
- `fatal`: Fatal errors (application crashes)

**Recommended**:
- **Development**: `debug`
- **Production**: `info` or `warn`
- **Troubleshooting**: `debug` or `trace`

### AUTH_TRUST_HOST

**Purpose**: Trust the `X-Forwarded-Host` header from reverse proxies.

**Format**: Boolean (`true`, `false`)

**Default**: `false`

**Example**:
```bash
AUTH_TRUST_HOST=true
```

**When to enable**:
- Running behind a reverse proxy (nginx, Caddy, Traefik)
- Proxy sets `X-Forwarded-Host` header correctly

**Security warning**: Only enable if you trust your reverse proxy. Malicious `X-Forwarded-Host` headers could redirect authentication to attacker-controlled domains.

### FFMPEG_THREADS

**Purpose**: Number of threads FFmpeg uses for transcoding.

**Format**: Integer (number of CPU threads)

**Default**: `2`

**Example**:
```bash
# Use 4 threads per transcoding session
FFMPEG_THREADS=4

# Use 1 thread (lowest CPU usage)
FFMPEG_THREADS=1
```

**Considerations**:
- More threads = faster transcoding startup, higher CPU usage
- Fewer threads = slower transcoding startup, lower CPU usage
- **Recommended**: 2-4 threads for most systems
- Total CPU usage = `FFMPEG_THREADS × concurrent_streams × 15-20%`

## Configuration Examples

### Local Network Only

```bash
# .env
AUTH_SECRET=xK8fN2mP9vQ7wR5tY3uI6oL1nM4bV0cZ
# HD_HOMEY_PROXY_HOST not set (auto-detect is fine)
LOG_LEVEL=info
```

### Remote Access with Reverse Proxy

```bash
# .env
AUTH_SECRET=xK8fN2mP9vQ7wR5tY3uI6oL1nM4bV0cZ
HD_HOMEY_PROXY_HOST=https://tuner.example.com
AUTH_TRUST_HOST=true
LOG_LEVEL=info
NODE_ENV=production
```

### Development Setup

```bash
# .env
AUTH_SECRET=dev-secret-not-for-production
HD_HOMEY_DB_PATH=./dev-data/db
HD_HOMEY_TRANSCODE_DIR=./dev-data/transcoding
LOG_LEVEL=debug
NODE_ENV=development
```

### High-Performance Setup

```bash
# .env
AUTH_SECRET=xK8fN2mP9vQ7wR5tY3uI6oL1nM4bV0cZ
HD_HOMEY_TRANSCODE_DIR=/tmp/transcoding  # tmpfs mount
FFMPEG_THREADS=4
LOG_LEVEL=warn
NODE_ENV=production
```

## Environment Variable Priority

When multiple methods set the same variable:

1. **Docker run `-e` flags** (highest priority)
2. **Docker Compose `environment:` section**
3. **`.env` file referenced by Docker Compose**
4. **Container's built-in defaults** (lowest priority)

## Verification

Check which environment variables are active:

```bash
# Docker Compose
docker compose exec hd-homey env | grep HD_HOMEY

# Docker Run
docker exec hd-homey env | grep HD_HOMEY
```

View configuration in the HD Homey UI:
- Navigate to **About** page
- Configuration summary is displayed (sensitive values hidden)

## Troubleshooting

### Changes Not Taking Effect

**Solution**: Restart the application after modifying environment variables.

```bash
# Docker Compose
docker compose restart

# Docker Run
docker restart hd-homey

# From source
# Stop dev server (Ctrl+C) and restart
npm run dev
```

### AUTH_SECRET Not Set Error

**Error**: "AUTH_SECRET environment variable is required"

**Solution**:
1. Verify `.env` file exists
2. Check `AUTH_SECRET` is set in `.env`
3. Ensure Docker Compose references `${AUTH_SECRET}`
4. Restart container

### Stream URLs Using Wrong Domain

**Problem**: Stream URLs contain internal IP instead of external domain

**Solution**:
1. Set `HD_HOMEY_PROXY_HOST` to your external URL
2. Set `AUTH_TRUST_HOST=true` if behind a reverse proxy
3. Restart HD Homey

## Security Best Practices

1. **Use strong AUTH_SECRET**
   - Minimum 32 characters
   - Random, cryptographically secure
   - Different for each environment

2. **Protect .env files**
   ```bash
   chmod 600 .env
   ```
   - Add `.env` to `.gitignore`
   - Never commit to version control

3. **Rotate secrets periodically**
   - Update `AUTH_SECRET` every 90 days
   - Regenerate stream secrets monthly (via Settings page)

4. **Use HTTPS for remote access**
   - Set `HD_HOMEY_PROXY_HOST` with `https://`
   - Configure reverse proxy with valid SSL certificates
   - Disable HTTP access from internet

5. **Minimize exposed variables**
   - Only set variables you need
   - Use defaults when appropriate
   - Document custom values for team members

## Next Steps

- **[Database Configuration](/config/database)** - Learn about database management and backups
- **[Installation Guide](/getting-started/installation)** - Return to installation instructions
- **[Troubleshooting](/troubleshooting/)** - Solve common configuration issues
