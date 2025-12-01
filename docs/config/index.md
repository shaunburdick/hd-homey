# Configuration

HD Homey is designed to be simple to configure with sensible defaults. Most configuration happens through environment variables and the web interface.

## Configuration Methods

### Environment Variables
The primary method for configuring HD Homey behavior, security, and runtime options.

[View All Environment Variables →](/config/environment-variables)

Key variables you'll need:
- `AUTH_SECRET` - **Required** for session encryption
- `HD_HOMEY_PROXY_HOST` - Optional: Your external URL (auto-detects if blank)
- `HD_HOMEY_DB_PATH` - Optional: Database file path (default: `./data/db/hd_homey.db`)
- `HD_HOMEY_TRANSCODE_DIR` - Optional: Transcoding directory (auto-configured if blank)
- `FFMPEG_PATH` - Optional: FFmpeg location (auto-detected from PATH)

### Database Configuration
HD Homey uses SQLite for data storage with automatic migrations.

[Learn About Database Setup →](/config/database)

Covers:
- Database location and structure
- Backup strategies
- Migration management
- Maintenance tasks

### Web Interface Settings
Many features can be configured through the HD Homey web interface:

- **Tuner Settings**: Add/edit HDHomeRun devices
- **Channel Management**: Update channel lineups
- **User Management**: Create/modify user accounts
- **Transcoding Options**: Configure video encoding settings
- **Stream Security**: Manage stream token settings

## Configuration Examples

### Docker Compose (Recommended)

```yaml
services:
  hd-homey:
    image: ghcr.io/shaunburdick/hd-homey:latest
    environment:
      AUTH_SECRET: your-secret-here
      # HD_HOMEY_PROXY_HOST: https://tv.example.com  # Optional - auto-detects if blank
    volumes:
      - ./data:/app/data
    ports:
      - "3000:3000"
```

### Environment File (.env)

```bash
# Required
AUTH_SECRET=your-generated-secret

# Optional - Use defaults and auto-detection
# HD_HOMEY_PROXY_HOST=                    # Auto-detects from request
# HD_HOMEY_DB_PATH=./data/db/hd_homey.db  # Default location
# HD_HOMEY_TRANSCODE_DIR=                 # Defaults to ${HD_HOMEY_DB_PATH}/transcoding

NODE_ENV=production
LOG_LEVEL=info
```

Generate a secure `AUTH_SECRET`:
```bash
openssl rand -base64 32
```

## Advanced Configuration

### Reverse Proxy Setup

If you're deploying HD Homey behind a reverse proxy (nginx, Caddy, Traefik), make sure to:

1. Forward WebSocket connections for HLS streaming
2. Set appropriate timeout values for long-lived stream connections
3. Configure `AUTH_TRUST_HOST=true` for auto-detection (or set `HD_HOMEY_PROXY_HOST` explicitly)
4. Ensure `Host` and `X-Forwarded-Host` headers are forwarded correctly

### Network Configuration

HD Homey needs to communicate with:
- **HDHomeRun devices** on your local network (port 80 for device API)
- **Clients** accessing the web interface (port 3000 by default)
- **Stream viewers** for video delivery (same port as web interface)

## Configuration Best Practices

1. **Always use HTTPS in production** - Configure your reverse proxy for HTTPS
2. **Generate strong secrets** - Use `openssl rand -base64 32` for `AUTH_SECRET`
3. **Try auto-detection first** - Leave `HD_HOMEY_PROXY_HOST` blank for automatic URL detection
4. **Back up your database** - Regular backups of the SQLite database prevent data loss
5. **Use Docker volumes** - Persist data outside containers for easy upgrades
6. **Monitor disk space** - Transcoded streams can use significant disk space

## Troubleshooting Configuration

Common configuration issues:

- **Authentication loops**: Check `AUTH_SECRET` is set and persistent
- **Stream URLs broken**: Verify auto-detection works or set `HD_HOMEY_PROXY_HOST` explicitly
- **Database errors**: Ensure `HD_HOMEY_DB_PATH` parent directory is writable
- **Connection issues**: Confirm HDHomeRun devices are reachable from HD Homey host

[View Troubleshooting Guide →](/troubleshooting/)

## Next Steps

- [Install HD Homey](/getting-started/installation)
- [Explore Features](/features/)
- [API Documentation](/api/)
