#!/bin/bash
#
# HD Homey - Transcoding Feature Verification Script
# ====================================================
# This script validates that the video transcoding feature is properly installed
# and configured. Run this after deployment to verify everything is working.
#
# Usage: ./verify-transcoding.sh
#

set -e

echo "🎬 HD Homey - Transcoding Feature Verification"
echo "=============================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if running in Docker or locally
if [ -f /.dockerenv ]; then
    DOCKER_CMD=""
    echo "📦 Running inside Docker container"
else
    if command -v docker &> /dev/null && docker ps --filter "name=hd-homey" --format "{{.Names}}" | grep -q "hd-homey"; then
        DOCKER_CMD="docker exec hd-homey"
        echo "📦 Running via Docker (container: hd-homey)"
    else
        DOCKER_CMD=""
        echo "💻 Running locally"
    fi
fi
echo ""

# Test 1: Check FFmpeg availability
echo "Test 1: Checking FFmpeg availability..."
if $DOCKER_CMD ffmpeg -version &> /dev/null; then
    VERSION=$($DOCKER_CMD ffmpeg -version | head -n1)
    echo -e "${GREEN}✓ FFmpeg is installed${NC}"
    echo "  $VERSION"
else
    echo -e "${RED}✗ FFmpeg is NOT installed${NC}"
    echo "  Install: apk add ffmpeg (Alpine) or apt-get install ffmpeg (Debian)"
    exit 1
fi
echo ""

# Test 2: Check for H.264 codec support
echo "Test 2: Checking H.264 codec support..."
if $DOCKER_CMD ffmpeg -codecs 2>&1 | grep -q "h264"; then
    echo -e "${GREEN}✓ H.264 codec available${NC}"
else
    echo -e "${RED}✗ H.264 codec NOT available${NC}"
    echo "  FFmpeg needs to be compiled with libx264 support"
    exit 1
fi
echo ""

# Test 3: Check for AAC codec support
echo "Test 3: Checking AAC audio codec support..."
if $DOCKER_CMD ffmpeg -codecs 2>&1 | grep -q "aac"; then
    echo -e "${GREEN}✓ AAC codec available${NC}"
else
    echo -e "${RED}✗ AAC codec NOT available${NC}"
    echo "  FFmpeg needs AAC encoder support"
    exit 1
fi
echo ""

# Test 4: Check transcoding directory
echo "Test 4: Checking transcoding directory..."
TRANSCODE_DIR="${HD_HOMEY_TRANSCODE_DIR:-./data/transcoding}"
if [ "$DOCKER_CMD" != "" ]; then
    TRANSCODE_DIR="/app/data/transcoding"
fi

if $DOCKER_CMD test -d "$TRANSCODE_DIR"; then
    echo -e "${GREEN}✓ Transcoding directory exists${NC}"
    echo "  Location: $TRANSCODE_DIR"
    # Check if writable
    if $DOCKER_CMD test -w "$TRANSCODE_DIR"; then
        echo -e "${GREEN}✓ Directory is writable${NC}"
    else
        echo -e "${YELLOW}⚠ Directory may not be writable${NC}"
    fi
else
    echo -e "${YELLOW}⚠ Transcoding directory does not exist yet${NC}"
    echo "  It will be created automatically on first transcode"
    echo "  Location: $TRANSCODE_DIR"
fi
echo ""

# Test 5: Check TypeScript files exist
echo "Test 5: Checking transcoding implementation files..."
FILES=(
    "src/lib/transcoding/ffmpeg.ts"
    "src/lib/transcoding/session-manager.ts"
    "src/lib/transcoding/hls-server.ts"
    "src/lib/transcoding/transcode.ts"
    "src/lib/transcoding/types.ts"
    "src/components/video-player.tsx"
)

ALL_EXIST=true
for file in "${FILES[@]}"; do
    if [ -f "$file" ]; then
        echo -e "${GREEN}✓${NC} $file"
    else
        echo -e "${RED}✗${NC} $file"
        ALL_EXIST=false
    fi
done

if [ "$ALL_EXIST" = false ]; then
    echo ""
    echo -e "${RED}Some implementation files are missing!${NC}"
    exit 1
fi
echo ""

# Test 6: Check API routes exist
echo "Test 6: Checking API route files..."
ROUTES=(
    "src/app/api/transcode/[tunerId]/[channelId]/playlist.m3u8/route.ts"
    "src/app/api/transcode/[tunerId]/[channelId]/[segment]/route.ts"
    "src/app/api/transcode/status/route.ts"
)

ALL_EXIST=true
for route in "${ROUTES[@]}"; do
    if [ -f "$route" ]; then
        echo -e "${GREEN}✓${NC} $route"
    else
        echo -e "${RED}✗${NC} $route"
        ALL_EXIST=false
    fi
done

if [ "$ALL_EXIST" = false ]; then
    echo ""
    echo -e "${RED}Some API route files are missing!${NC}"
    exit 1
fi
echo ""

# Test 7: Check dependencies
echo "Test 7: Checking Node.js dependencies..."
if [ -f "package.json" ]; then
    if grep -q '"hls.js"' package.json; then
        echo -e "${GREEN}✓ hls.js dependency present${NC}"
    else
        echo -e "${RED}✗ hls.js dependency missing${NC}"
        ALL_EXIST=false
    fi
else
    echo -e "${YELLOW}⚠ Cannot find package.json${NC}"
fi
echo ""

# Test 8: Check if server is running (if applicable)
echo "Test 8: Checking if HD Homey is running..."
if command -v curl &> /dev/null; then
    if curl -s -o /dev/null -w "%{http_code}" http://localhost:3000 | grep -q "200\|302\|401"; then
        echo -e "${GREEN}✓ HD Homey server is running on port 3000${NC}"
        
        # Try to access the transcode status API
        echo ""
        echo "Test 9: Testing transcode status API..."
        STATUS_CODE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/api/transcode/status)
        if [ "$STATUS_CODE" = "200" ]; then
            echo -e "${GREEN}✓ Transcode status API is accessible${NC}"
        elif [ "$STATUS_CODE" = "401" ] || [ "$STATUS_CODE" = "403" ]; then
            echo -e "${YELLOW}⚠ Transcode status API requires authentication (expected)${NC}"
        else
            echo -e "${YELLOW}⚠ Transcode status API returned HTTP $STATUS_CODE${NC}"
        fi
    else
        echo -e "${YELLOW}⚠ HD Homey server is not running on port 3000${NC}"
        echo "  Start with: npm run dev (or docker compose up)"
    fi
else
    echo -e "${YELLOW}⚠ curl not available, skipping server check${NC}"
fi
echo ""

# Summary
echo "=============================================="
echo "✅ Verification Complete!"
echo ""
echo "Summary:"
echo "  - FFmpeg is installed and functional"
echo "  - Required codecs (H.264, AAC) are available"
echo "  - All implementation files are present"
echo "  - API routes are in place"
echo ""
echo "Next steps:"
echo "  1. Start HD Homey: docker compose up -d (or npm run dev)"
echo "  2. Login to the web interface"
echo "  3. Navigate to any channel page"
echo "  4. Click 'Watch in Browser' button"
echo "  5. Video should start playing within 5 seconds"
echo ""
echo "For troubleshooting, check:"
echo "  - Logs: docker compose logs -f hd-homey"
echo "  - Transcoding dir: $TRANSCODE_DIR"
echo "  - Documentation: README.md (Troubleshooting section)"
echo ""
echo "Happy streaming! 🎉"
