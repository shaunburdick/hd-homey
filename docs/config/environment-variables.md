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

# Optional - Auto-detection and defaults
HD_HOMEY_PROXY_HOST=                              # Auto-detects from request if blank
HD_HOMEY_DB_PATH=./data/db/hd_homey.db            # Full path to database file
HD_HOMEY_TRANSCODE_DIR=./data/transcoding         # Defaults to ${HD_HOMEY_DB_PATH}/transcoding
HD_HOMEY_STREAM_TOKEN_EXPIRY=43200                # 12 hours
FFMPEG_PATH=ffmpeg                                # Auto-detected from PATH
BETTER_AUTH_URL=http://localhost:3000             # Auto-detected if not set
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

**Default**: Auto-detected from incoming request headers (Host, X-Forwarded-Host, etc.)

**Required**: No - leave blank for auto-detection

**Example**:
```bash
# Auto-detect (recommended for most setups)
HD_HOMEY_PROXY_HOST=

# Explicit URL (for complex proxy configurations)
HD_HOMEY_PROXY_HOST=https://tuner.example.com
```

**When to set explicitly**:
- Running behind a reverse proxy with complex routing
- Auto-detection returns incorrect URLs (e.g., internal IPs instead of external domain)
- Need consistent URLs regardless of how users access HD Homey

**When to leave blank (auto-detect)**:
- Local network access only
- Simple reverse proxy setups where headers are forwarded correctly
- Single access point (one domain/IP)

::: tip Auto-Detection Behavior
HD Homey automatically detects your external URL from:
1. `X-Forwarded-Host` header (if `AUTH_TRUST_HOST=true`)
2. `Host` header from the request
3. Request protocol (http/https)

This works for most configurations including simple reverse proxies. Only set `HD_HOMEY_PROXY_HOST` if you experience issues with stream URLs.
:::

::: tip Reverse Proxy Setup
When using a reverse proxy:
1. Leave `HD_HOMEY_PROXY_HOST` blank to use auto-detection
2. Set `AUTH_TRUST_HOST=true` to trust proxy headers
3. Configure proxy to forward `Host` and `X-Forwarded-Host` headers
4. Ensure WebSocket support for future features
5. Use HTTPS with valid SSL certificates for security
:::

### HD_HOMEY_DB_PATH

**Purpose**: Full path to the SQLite database file.

**Format**: Filesystem path to database file (relative or absolute)

**Default**: `./data/db/hd_homey.db`

**Example**:
```bash
# Relative path (default)
HD_HOMEY_DB_PATH=./data/db/hd_homey.db

# Absolute path
HD_HOMEY_DB_PATH=/app/data/db/hd_homey.db

# Custom location
HD_HOMEY_DB_PATH=/var/lib/hd-homey/database.db
```

**Database directory**: The parent directory will be created automatically if it doesn't exist.

**Important**:
- Must specify the full path including filename (not just directory)
- Parent directory must be writable by the application
- Database file will be created on first run
- Should be backed up regularly
- Use Docker volumes for persistence in containers

::: warning Path Change in v1.0.0-beta.3+
Prior versions used `HD_HOMEY_DB_PATH` as a directory path. Starting in v1.0.0-beta.3, this variable must include the full database filename (e.g., `/path/to/hd_homey.db`).
:::

### HD_HOMEY_TRANSCODE_DIR

**Purpose**: Directory for temporary transcoding output (HLS segments).

**Format**: Filesystem path (relative or absolute)

**Default**: `${HD_HOMEY_DB_PATH}/transcoding` (parent directory of database + `/transcoding`)

**Required**: No - uses default if not specified

**Example**:
```bash
# Custom location
HD_HOMEY_TRANSCODE_DIR=/tmp/transcoding

# Will default to:
# If HD_HOMEY_DB_PATH=./data/db/hd_homey.db
# Then HD_HOMEY_TRANSCODE_DIR=./data/db/transcoding
```

**Automatic Cleanup**:
- Segments are automatically deleted when transcoding session ends
- No manual cleanup required
- Directory is created automatically if it doesn't exist

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

```bash
# Then set in .env
HD_HOMEY_TRANSCODE_DIR=/tmp/transcoding
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

**Default**: `ffmpeg` (auto-detected from system PATH)

**Required**: No - FFmpeg is automatically detected if available in PATH

**Example**:
```bash
# Auto-detect (default - leave unset)
# FFMPEG_PATH=

# Explicit path if needed
FFMPEG_PATH=/usr/local/bin/ffmpeg

# Specific version
FFMPEG_PATH=/opt/ffmpeg-6.1/bin/ffmpeg
```

**Auto-Detection**:
HD Homey automatically searches for FFmpeg in:
1. System PATH environment variable
2. Common installation locations (`/usr/bin/ffmpeg`, `/usr/local/bin/ffmpeg`)
3. Docker images include FFmpeg pre-installed

**When to set explicitly**:
- FFmpeg installed in non-standard location
- Multiple FFmpeg versions installed (need specific one)
- Auto-detection fails

**Requirements**:
- FFmpeg version 4.0+ (5.0+ recommended)
- Compiled with H.264 (libx264) and AAC codecs
- Docker images include FFmpeg automatically

**Verification**:
```bash
# Check if FFmpeg is detected
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

**Docker users**: FFmpeg is pre-installed in HD Homey Docker images - no action needed.
:::

### BETTER_AUTH_URL

**Purpose**: Base URL for Better-Auth endpoints and authentication redirects.

**Format**: Full URL including protocol

**Default**: Auto-detected from request headers or falls back to `NEXTAUTH_URL`

**Required**: No - auto-detection works for most configurations

**Example**:
```bash
# Auto-detect (recommended - leave blank)
# BETTER_AUTH_URL=

# Explicit URL if auto-detection fails
BETTER_AUTH_URL=https://tuner.example.com
```

**Auto-Detection Order**:
1. `BETTER_AUTH_URL` environment variable (if set)
2. `NEXTAUTH_URL` environment variable (if set)
3. Auto-detect from request headers (Host, X-Forwarded-Host)
4. Fallback to `http://localhost:3000`

**When to set explicitly**:
- Running behind a reverse proxy with complex routing
- Better-Auth authentication redirects fail
- Need explicit control over authentication URLs
- Multiple domains pointing to same instance

**When to leave blank (auto-detect)**:
- Simple reverse proxy configurations
- Single access point (one domain)
- `HD_HOMEY_PROXY_HOST` is sufficient for most cases

::: tip Relationship to HD_HOMEY_PROXY_HOST
In most configurations, you don't need to set `BETTER_AUTH_URL` if `HD_HOMEY_PROXY_HOST` is configured correctly. Auto-detection will use the same URL as your stream proxy host.
:::

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

# Optional - Use defaults and auto-detection
# HD_HOMEY_PROXY_HOST=          # Auto-detect from request
# HD_HOMEY_DB_PATH=./data/db/hd_homey.db  # Default location
# BETTER_AUTH_URL=              # Auto-detect

LOG_LEVEL=info
```

### Remote Access with Reverse Proxy

```bash
# .env
AUTH_SECRET=xK8fN2mP9vQ7wR5tY3uI6oL1nM4bV0cZ

# Explicit external URL (or leave blank to auto-detect)
HD_HOMEY_PROXY_HOST=https://tuner.example.com

# Trust proxy headers for auto-detection
AUTH_TRUST_HOST=true

LOG_LEVEL=info
NODE_ENV=production
```

### Development Setup

```bash
# .env
AUTH_SECRET=dev-secret-not-for-production

# Custom paths for development
HD_HOMEY_DB_PATH=./dev-data/db/hd_homey.db
HD_HOMEY_TRANSCODE_DIR=./dev-data/transcoding

LOG_LEVEL=debug
NODE_ENV=development
```

### High-Performance Setup

```bash
# .env
AUTH_SECRET=xK8fN2mP9vQ7wR5tY3uI6oL1nM4bV0cZ

# Use tmpfs for transcoding (configure in docker-compose)
HD_HOMEY_TRANSCODE_DIR=/tmp/transcoding

# Increase transcode threads for faster encoding
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
1. **Try auto-detection first**: Leave `HD_HOMEY_PROXY_HOST` blank and ensure:
   - `AUTH_TRUST_HOST=true` if behind a reverse proxy
   - Proxy forwards `Host` or `X-Forwarded-Host` headers correctly
2. **If auto-detection fails**: Set `HD_HOMEY_PROXY_HOST` explicitly to your external URL
3. Restart HD Homey and verify stream URLs

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
