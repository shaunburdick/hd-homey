<img src="public/hd-homey.webp" alt="HD Homey" width="50%" height="auto" />

# HD Homey

[![Docker](https://github.com/shaunburdick/hd-homey/actions/workflows/docker.yml/badge.svg)](https://github.com/shaunburdick/hd-homey/actions/workflows/docker.yml)
[![Tests](https://github.com/shaunburdick/hd-homey/actions/workflows/test.yml/badge.svg)](https://github.com/shaunburdick/hd-homey/actions/workflows/test.yml)
![Version](https://img.shields.io/badge/version-1.0.0--beta.2-blue)

**A secure web proxy for [HDHomeRun](https://www.silicondust.com/hdhomerun/) devices that enables remote access to your live TV streams over the internet.**

> ⚠️ **Alpha Release**: This software is functional but under active development. Please report issues on [GitHub](https://github.com/shaunburdick/hd-homey/issues).

## Table of Contents

- [Quick Start](#quick-start)
- [Overview](#overview)
- [Features](#features)
- [Installation](#installation)
- [Configuration](#configuration)
- [Usage](#usage)
- [Troubleshooting](#troubleshooting)
- [Support](#support)
- [Development](#development)
- [License](#license)
- [Acknowledgments](#acknowledgments)

## Quick Start

Get up and running in minutes with Docker Compose:

```bash
# Download compose.yml and .env-example
curl -O https://raw.githubusercontent.com/shaunburdick/hd-homey/main/compose.yml
curl -O https://raw.githubusercontent.com/shaunburdick/hd-homey/main/.env-example

# Create your .env file with a secure authentication secret
cp .env-example .env
sed -i "s/some-random-string/$(openssl rand -base64 32)/" .env

# Start the application
docker compose up -d

# View logs
docker compose logs -f
```

Access HD Homey at **http://localhost:3000** and create your first admin account.

## Overview

HD Homey acts as a secure proxy between your HDHomeRun devices and remote viewers, providing:

- **Secure Authentication**: Role-based access control keeps your streams private
- **Remote Access**: Watch your live TV from anywhere with an internet connection
- **Multi-Device Support**: Manage multiple HDHomeRun tuners from a single interface
- **User Management**: Control who can access your streams with admin and viewer roles

**Built with**: Next.js 16, React 19, TypeScript, SQLite, Better-Auth, and Docker

## Features

### Core Functionality
- **Secure Authentication** - JWT session-based auth with scrypt password hashing (Better-Auth)
- **User Management** - Create and manage users with admin/viewer role permissions
- **Tuner Management** - Add and configure multiple HDHomeRun devices
- **Channel Discovery** - Automatic channel lineup scanning and updates
- **In-Browser Video Playback** - Watch live TV directly in your browser without external players
- **Real-Time Transcoding** - Automatic MPEG-2 to H.264/HLS conversion for browser compatibility
- **Stream Proxying** - Transparent video stream relay with URL rewriting
- **Signed Stream URLs** - Time-limited tokens (12 hours) for secure video access
- **Lineup API** - Modified lineup.json endpoint for remote client compatibility

### Video Transcoding
- **HLS Streaming** - HTTP Live Streaming for universal browser support
- **Accurate Viewer Tracking** - Server-side fingerprinting counts concurrent viewers per channel
- **Shared Sessions** - Multiple viewers share a single transcoding process (resource efficient)
- **Auto Cleanup** - Transcoding stops immediately when last viewer disconnects
- **High Quality** - 4Mbps video with 192kbps audio for excellent picture quality
- **Low Latency** - 2-second segments for minimal delay (~6-10 seconds total)
- **Smart Detection** - Only transcodes when necessary (MPEG-2 sources)
- **Universal Client Support** - Works with browsers, mobile apps, and media players (no cookies required)

### Security
- Password-protected access with secure session tokens
- Token-based stream authentication with HMAC-SHA256 signatures
- Admin-controlled stream secret regeneration
- Admin-only routes for configuration management
- Middleware-based route protection
- No sensitive data exposure to client components

## Installation

### Docker Compose (Recommended)

**Prerequisites**: Docker and Docker Compose installed

1. **Create a `compose.yml` file**:

```yaml
services:
  hd-homey:
    image: ghcr.io/shaunburdick/hd-homey:latest
    container_name: hd-homey
    ports:
      - "3000:3000"
    volumes:
      - hd-homey-data:/app/data
    environment:
      - NODE_ENV=production
      - AUTH_TRUST_HOST=true
      - AUTH_SECRET=${AUTH_SECRET}  # Generate with: openssl rand -base64 32
      - HD_HOMEY_PROXY_HOST=${HD_HOMEY_PROXY_HOST:-}  # Optional: https://your-domain.com
    restart: unless-stopped

volumes:
  hd-homey-data:
```

2. **Set required environment variables**:

```bash
# Required: Generate a secure random secret
export AUTH_SECRET=$(openssl rand -base64 32)

# Optional: Set your external URL for proper stream proxying
export HD_HOMEY_PROXY_HOST=https://tuner.example.com
```

3. **Start the service**:

```bash
docker compose up -d
```

4. **Verify it's running**:

```bash
docker compose logs -f
# Look for: "✓ Ready in XXms"
```

### Docker Run

For a simple Docker deployment without compose:

```bash
docker run -d \
  --name hd-homey \
  -p 3000:3000 \
  -v hd-homey-data:/app/data \
  -e AUTH_SECRET=$(openssl rand -base64 32) \
  -e HD_HOMEY_PROXY_HOST=https://tuner.example.com \
  ghcr.io/shaunburdick/hd-homey:latest
```

### From Source

**Prerequisites**: Node.js 22+ and npm

1. **Clone the repository**:
```bash
git clone https://github.com/shaunburdick/hd-homey.git
cd hd-homey
```

2. **Install dependencies**:
```bash
npm ci
```

3. **Configure environment**:
```bash
cp .env-example .env
# Edit .env and set AUTH_SECRET
```

4. **Run the development server**:
```bash
npm run dev
```

Access the application at http://localhost:3000

## Configuration

Configure HD Homey using environment variables:

### Required

| Variable | Description | Example |
|----------|-------------|---------|
| `AUTH_SECRET` | Encryption key for Better-Auth sessions (32+ chars) | Generate: `openssl rand -base64 32` |

### Optional

| Variable | Description | Default | Example |
|----------|-------------|---------|---------|
| `HD_HOMEY_PROXY_HOST` | External URL for stream proxying | Auto-detected | `https://tuner.example.com` |
| `HD_HOMEY_DB_PATH` | Database directory path | `./data/db` | `/data/db` |
| `HD_HOMEY_TRANSCODE_DIR` | Transcoding output directory | `./data/transcoding` | `/data/transcoding` |
| `HD_HOMEY_STREAM_TOKEN_EXPIRY` | Stream token validity in seconds | `43200` (12 hours) | `86400` (24 hours) |
| `FFMPEG_PATH` | Path to ffmpeg binary | `ffmpeg` (in PATH) | `/usr/bin/ffmpeg` |
| `BETTER_AUTH_URL` | Base URL for Better-Auth endpoints | Auto-detected | `https://tuner.example.com` |
| `NEXTAUTH_URL` | Fallback for `BETTER_AUTH_URL` | Auto-detected | `https://tuner.example.com` |
| `NODE_ENV` | Runtime environment | `development` | `production` |

### Notes

- **AUTH_SECRET**: Must be set and kept secret. Never commit to version control.
- **HD_HOMEY_PROXY_HOST**: Required if running behind a reverse proxy or if auto-detection fails.
- **Database**: Automatically created on first run via Drizzle migrations.
- **Transcoding**: FFmpeg is included in the Docker image. For source installs, ensure ffmpeg is in PATH with h264/aac codec support.

## Usage

### Initial Setup

1. **Access the application**: Navigate to `http://localhost:3000` (or your configured domain)

2. **Create admin account**: On first run, you'll be automatically redirected to create the initial administrator account.

   - Choose a strong username and password
   - This account will have full administrative privileges
   - Additional users can be created later

3. **Sign in**: Use your credentials to access the dashboard

### Adding HDHomeRun Devices

1. Navigate to **Tuners** from the main menu
2. Click **Add Tuner**
3. Enter:
   - **Name**: A friendly name (e.g., "Living Room Tuner")
   - **URL**: The base URL of your HDHomeRun device (e.g., `http://192.168.1.100`)
4. Click **Save**
5. The system will automatically discover available channels

### Managing Users

**Admin-only feature**

1. Navigate to **Users** from the main menu
2. Click **Add User** to create a new account
3. Set permissions:
   - **Admin**: Full access to configuration and user management
   - **Viewer**: Can browse and watch channels only
4. Edit or disable users as needed

### Watching Channels

#### In-Browser Playback (Recommended)

1. Navigate to the **Home** page or **Channels**
2. Browse available channels from all configured tuners
3. Click a channel to view the channel details page
4. Click **"Watch in Browser"** button
5. The video player will automatically start streaming

**Features**:
- Works on all modern browsers (Chrome, Firefox, Safari, Edge)
- No plugins or external players required
- Standard HTML5 video controls (play/pause, volume, fullscreen)
- Mobile-friendly responsive design
- Multiple viewers can watch the same channel efficiently (shared transcoding)

#### External Player (Advanced)

For use with VLC, Plex, or other media applications:

1. Navigate to a channel's details page
2. Copy the generated stream URL (includes authentication token)
3. Paste the URL into your media player

**Note**: Stream URLs include time-limited authentication tokens (default: 12 hours). If a token expires, simply revisit the channel page to generate a new URL.

### User Roles

| Role | Permissions |
|------|-------------|
| **Admin** | Full access: manage tuners, channels, users, and settings |
| **Viewer** | Read-only: browse and watch channels |

### Managing Stream Security

**Admin-only feature**

1. Navigate to **Settings** from the main menu
2. View the **Stream Authentication** section
3. Current stream secret is displayed (partial view for security)
4. Click **Regenerate Stream Secret** if you need to:
   - Invalidate all existing stream URLs immediately
   - Respond to a potential security incident
   - Rotate secrets as part of security policy

**Warning**: Regenerating the stream secret will require all users to get new URLs from channel pages.

### API Access

HD Homey provides a modified HDHomeRun lineup API for client compatibility:

- **Lineup endpoint**: `http://your-server:3000/lineup.json`
- **Stream URLs**: `/tuners/{id}/channel/{channelId}/stream?token={token}`
- **Token authentication**: Required for all stream access
- Compatible with Plex, Emby, and other DVR software

## Troubleshooting

### Common Issues

**Cannot access from remote network**
- Ensure `HD_HOMEY_PROXY_HOST` is set to your external URL
- Configure port forwarding on your router
- Verify firewall rules allow inbound traffic on port 3000

**Database errors on startup**
- Check volume permissions: `docker exec hd-homey ls -la /app/data`
- Ensure sufficient disk space
- Review logs: `docker compose logs hd-homey`

**Authentication not working**
- Verify `AUTH_SECRET` is set and persistent
- Check that cookies are enabled in your browser
- Try clearing browser cache/cookies

**Streams not playing**
- Verify HDHomeRun device is accessible from the container
- Check tuner URLs are correct (including http://)
- Test direct access to HDHomeRun from host: `curl http://your-tuner-ip/discover.json`

**In-browser video player issues**
- Check browser console for errors (F12 → Console tab)
- Verify ffmpeg is available: `docker exec hd-homey ffmpeg -version`
- Check transcoding logs: `docker compose logs hd-homey | grep -i transcode`
- Ensure sufficient CPU resources (each 1080p stream uses ~15-20% of one core)
- Try refreshing the page to restart the transcoding session

**Video plays but audio is choppy/missing**
- This should be resolved in the current version (fixed audio resampling bug)
- Check ffmpeg stderr logs for audio codec warnings
- Verify source stream has audio: `ffprobe http://tuner:5004/auto/vX.X`

**Multiple users can't watch the same channel**
- This should work automatically (shared sessions)
- Check session manager logs to verify session reuse
- Ensure transcoding directory is writable: `docker exec hd-homey ls -la /app/data/transcoding`

## Support

- **Issues**: [GitHub Issues](https://github.com/shaunburdick/hd-homey/issues)
- **Discussions**: [GitHub Discussions](https://github.com/shaunburdick/hd-homey/discussions)
- **Documentation**: See `.specs/` directory for detailed feature specifications

## Development

### Contributing

Contributions are welcome! Please:

1. Review [AGENTS.md](AGENTS.md) for development guidelines
2. Check [CHANGELOG.md](CHANGELOG.md) for recent changes
3. Follow the spec-driven development process (see `.specs/`)
4. Ensure tests pass: `npm test`
5. Submit pull requests to the `main` branch

### Tech Stack

- **Framework**: Next.js 16 (App Router)
- **UI Library**: React 19
- **Language**: TypeScript 5
- **Database**: SQLite + Drizzle ORM
- **Authentication**: Better-Auth 1.1.0 (username plugin)
- **Video**: FFmpeg + HLS.js
- **Testing**: Vitest + React Testing Library
- **Styling**: new.css

### Local Development

```bash
# Install dependencies
npm ci

# Run full test suite (lint + typecheck + unit tests)
npm test

# Run individual checks
npm run lint              # ESLint
npm run typecheck         # TypeScript type checking
npm run test:unit         # Unit tests only (exits when done)
npm run test:unit:watch   # Unit tests in watch mode
npm run test:coverage     # Unit tests with coverage report

# Start dev server
npm run dev
```

### Release Process

See [Releases section in AGENTS.md](AGENTS.md#releases) for detailed release instructions.

**Current version**: `1.0.0-alpha.5` (Alpha - under active development)

## License

AGPL-3.0-only - See [LICENSE](LICENSE) file for details

## Acknowledgments

- Built for [HDHomeRun](https://www.silicondust.com/hdhomerun/) devices by SiliconDust
- Powered by [Next.js](https://nextjs.org/) and [Better-Auth](https://www.better-auth.com/)

---

**Note**: This project is in alpha. Features and APIs may change. Not recommended for production use without thorough testing.
