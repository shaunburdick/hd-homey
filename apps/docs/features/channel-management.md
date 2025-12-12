# Channel Management

View and access all available TV channels from your configured HDHomeRun tuners.

## Overview

HD Homey automatically discovers channels from your HDHomeRun devices and makes them available for streaming. Channels are organized by tuner and sorted by guide number.

## Viewing Channels

### Channels List

Navigate to **Channels** to see all available channels from all tuners:

**Display Information**:
- Guide number (e.g., 2.1, 7.1)
- Channel name (e.g., CBS, ABC)
- HD/SD indicator
- Source tuner name

**Actions**:
- Click any channel to view details and streaming options
- Filter by tuner (if available)
- Sort by guide number (default)

### Channel Details

Click a channel to view its details page:

**Information Shown**:
- Channel name and number
- HD status
- Source tuner
- Stream URL (with authentication token)

**Available Actions**:
- **Watch in Browser** - Start video player
- **Copy Stream URL** - For external players (VLC, Plex)

## Channel Discovery

Channels are automatically discovered when:
- A new tuner is added to HD Homey
- An admin manually refreshes a tuner's lineup

**What Gets Discovered**:
- All channels available on the HDHomeRun device
- Guide numbers and station names
- HD/SD information
- Stream URLs

## Channel Updates

Channels can be updated in two ways:

### Automatic Updates
When a tuner is added, channels are automatically scanned.

### Manual Refresh
Admins can manually refresh a tuner's channel lineup:

1. Navigate to **Tuners**
2. Select the tuner to refresh
3. Click **"Refresh Channels"**

**What Happens**:
- New channels are added
- Missing channels are soft-deleted (hidden but data preserved)
- Existing channels are updated
- Takes ~5 seconds to complete

## Accessing Streams

### In-Browser Playback

1. Navigate to a channel's details page
2. Click **"Watch in Browser"**
3. Video player loads and begins streaming

Works on all modern browsers without plugins.

### External Players

For VLC, Plex, or other media applications:

1. Navigate to channel details page
2. Copy the stream URL
3. Paste into your media player

::: warning Token Expiration
Stream URLs include time-limited tokens (default: 12 hours). Generate a new URL from the channel page when tokens expire.
:::

## Troubleshooting

### Channel Not Playing

**Check**:
- Tuner is online and reachable
- HDHomeRun device has good antenna signal
- Stream token hasn't expired

**Solutions**:
- Refresh the channel page to get a new token
- Visit tuner details and check connection
- Test channel directly on HDHomeRun device

### Channels Missing

**Check**:
- HDHomeRun device has performed a channel scan
- Tuner connection is working
- Channels exist on HDHomeRun device

**Solutions**:
- Visit HDHomeRun web interface (`http://TUNER_IP`)
- Perform channel scan on device
- Refresh tuner lineup in HD Homey

### HD Channel Shows as SD

**Possible Causes**:
- Broadcaster transmitting in SD
- HDHomeRun detected incorrectly
- Signal quality issues

**Solutions**:
- Check HDHomeRun device directly
- Verify antenna and signal strength
- Refresh channel lineup

## Next Steps

- **[Video Transcoding](/features/video-transcoding)** - How streams are processed for browsers
- **[Stream Security](/features/stream-security)** - Understanding authentication tokens
- **[Tuner Management](/features/tuner-management)** - Managing HDHomeRun devices
