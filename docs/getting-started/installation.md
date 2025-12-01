# Installation

HD Homey can be installed using Docker (recommended), or from source for development purposes.

## Prerequisites

Before installing HD Homey, ensure you have:

- An [HDHomeRun device](https://www.silicondust.com/hdhomerun/) on your local network
- Network connectivity between HD Homey and your HDHomeRun device
- For Docker installations: [Docker](https://docs.docker.com/get-docker/) and [Docker Compose](https://docs.docker.com/compose/install/)
- For source installations: [Node.js 22+](https://nodejs.org/) and npm

## Docker Compose (Recommended)

Docker Compose is the recommended installation method for production deployments. It handles all dependencies and provides easy updates.

### Step 1: Create Configuration Files

Create a new directory for HD Homey and download the configuration files:

```bash
# Create directory
mkdir hd-homey && cd hd-homey

# Download compose.yml
curl -O https://raw.githubusercontent.com/shaunburdick/hd-homey/main/compose.yml

# Download .env-example
curl -O https://raw.githubusercontent.com/shaunburdick/hd-homey/main/.env-example
```

### Step 2: Configure Environment Variables

Create your `.env` file with a secure authentication secret:

```bash
# Copy example file
cp .env-example .env

# Generate a secure random secret (macOS/Linux)
sed -i "s/some-random-string/$(openssl rand -base64 32)/" .env

# Or manually edit .env and set AUTH_SECRET
```

**Required Variables:**
- `AUTH_SECRET` - Encryption key for session authentication (32+ characters)

**Optional Variables:**
- `HD_HOMEY_PROXY_HOST` - Your external URL (e.g., `https://tuner.example.com`)
- `HD_HOMEY_DB_PATH` - Database path (default: `./data/db/hd_homey.db`)
- `HD_HOMEY_TRANSCODE_DIR` - Transcoding directory (default: `/tmp/transcoding`)

See [Environment Variables](/config/environment-variables) for complete configuration options.

### Step 3: Start HD Homey

Launch the application using Docker Compose:

```bash
docker compose up -d
```

### Step 4: Verify Installation

Check that HD Homey is running:

```bash
# View logs
docker compose logs -f

# Look for: "✓ Ready in XXms"
```

Access HD Homey at `http://localhost:3000` (or your configured hostname) and create your first admin account.

::: tip
The first user created automatically becomes an administrator.
:::

## Docker Run

For a simpler single-container deployment without Docker Compose:

```bash
# Create a volume for persistent data
docker volume create hd-homey-data

# Run HD Homey
docker run -d \
  --name hd-homey \
  -p 3000:3000 \
  -v hd-homey-data:/app/data \
  -e AUTH_SECRET=$(openssl rand -base64 32) \
  -e HD_HOMEY_PROXY_HOST=https://tuner.example.com \
  ghcr.io/shaunburdick/hd-homey:latest

# View logs
docker logs -f hd-homey
```

## From Source

Install from source for development or if you prefer not to use Docker.

### Step 1: Clone Repository

```bash
git clone https://github.com/shaunburdick/hd-homey.git
cd hd-homey
```

### Step 2: Install Dependencies

```bash
npm ci
```

### Step 3: Configure Environment

```bash
# Copy example environment file
cp .env-example .env

# Edit .env and set AUTH_SECRET
# Generate with: openssl rand -base64 32
```

### Step 4: Start Development Server

```bash
npm run dev
```

The application will be available at `http://localhost:3000`.

::: warning FFmpeg Required
Source installations require [FFmpeg](https://ffmpeg.org/download.html) to be installed and available in your PATH with H.264 and AAC codec support for video transcoding.
:::

### Production Build

To create a production build from source:

```bash
# Build the application
npm run build

# Start production server
npm start
```

## Updating HD Homey

### Docker Compose Update

```bash
# Pull latest image
docker compose pull

# Restart with new image
docker compose up -d

# View logs to confirm successful update
docker compose logs -f
```

### Docker Run Update

```bash
# Stop and remove old container
docker stop hd-homey
docker rm hd-homey

# Pull latest image
docker pull ghcr.io/shaunburdick/hd-homey:latest

# Start new container (use same docker run command as installation)
```

### Source Update

```bash
# Pull latest code
git pull origin main

# Install updated dependencies
npm ci

# Restart development server
npm run dev
```

## Uninstalling

### Docker Compose

```bash
# Stop and remove containers
docker compose down

# Remove data volumes (WARNING: This deletes your database!)
docker compose down -v

# Remove downloaded files
cd .. && rm -rf hd-homey
```

### Docker Run

```bash
# Stop and remove container
docker stop hd-homey
docker rm hd-homey

# Remove volume (WARNING: This deletes your database!)
docker volume rm hd-homey-data
```

### Source Installation

```bash
# Remove the cloned directory
rm -rf hd-homey
```

## Next Steps

- [Quick Start Guide](/getting-started/quick-start) - Complete the initial setup
- [Your First Stream](/getting-started/first-stream) - Add a tuner and watch live TV
- [Environment Variables](/config/environment-variables) - Advanced configuration options
