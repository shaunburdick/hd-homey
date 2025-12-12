# Video Transcoding

HD Homey automatically transcodes MPEG-2 streams from HDHomeRun devices into browser-compatible H.264/HLS format for universal playback.

## Overview

Most browsers cannot play MPEG-2 video natively. HD Homey solves this by:
- Detecting video format automatically
- Transcoding MPEG-2 to H.264 when needed
- Using HLS (HTTP Live Streaming) for delivery
- Sharing transcoding sessions between multiple viewers

## How It Works

### Automatic Format Detection

When you watch a channel:

1. HD Homey checks the source video codec
2. **If MPEG-2**: Starts transcoding to H.264/AAC
3. **If already H.264**: Proxies directly without transcoding
4. Video begins playing in your browser

No configuration needed - it's completely automatic.

### Transcoding Process

**For MPEG-2 streams**:

```
HDHomeRun (MPEG-2) → FFmpeg Transcoding → HLS (H.264/AAC) → Browser
```

**Technical Details**:
- Video: H.264 baseline profile @ 4Mbps
- Audio: AAC @ 192kbps
- Format: HLS with 2-second segments
- Latency: ~6-10 seconds behind live

## Shared Sessions

Multiple viewers watching the same channel share a single transcoding process.

**Benefits**:
- Reduced CPU usage
- Efficient resource utilization
- Supports more concurrent viewers

**How It Works**:
- First viewer starts transcoding
- Additional viewers join existing session
- Transcoding stops 30 seconds after last viewer disconnects

::: tip Resource Efficiency
3 people watching the same channel use the CPU of 1 transcoding session, not 3!
:::

## Browser Compatibility

### Supported Browsers

Works on all modern browsers:
- ✅ Chrome 90+ (desktop and mobile)
- ✅ Firefox 88+ (desktop and mobile)
- ✅ Safari 14+ (desktop and mobile)
- ✅ Edge 90+
- ✅ Opera

### Technology Used

- **HTML5 Video Player**: Standard browser video element
- **HLS.js**: JavaScript library for HLS playback
- **Native HLS**: Safari/iOS use built-in HLS support

## Performance

### Resource Usage

Typical usage per 1080p stream:
- **CPU**: 15-20% of one core
- **Memory**: ~100MB per session
- **Disk**: Temporary files (cleaned up automatically)

### Recommended Hardware

**For 3 concurrent 1080p streams**:
- 4-core CPU (modern Intel/AMD)
- 4GB RAM
- SSD recommended (not required)

**For 5+ concurrent streams**:
- 6+ core CPU
- 8GB RAM
- Consider hardware acceleration

## Temporary Files

### Storage Location

Transcoded segments stored temporarily:
- Default: `${HD_HOMEY_DB_PATH}/transcoding` (parent directory of database)
- Configurable via `HD_HOMEY_TRANSCODE_DIR`
- Recommended: tmpfs (RAM disk) for best performance

### Automatic Cleanup

Files are automatically removed:
- When transcoding session ends
- 30 seconds after last viewer disconnects
- No manual cleanup needed

## Troubleshooting

### Video Won't Play

**Check**:
1. FFmpeg is installed (`docker exec hd-homey ffmpeg -version`)
2. Transcoding directory is writable
3. Sufficient CPU resources available
4. Browser console for errors (F12 → Console)

**Solutions**:
- Refresh the page
- Check HD Homey logs for transcoding errors
- Verify HDHomeRun stream is accessible

### Audio Issues

**Symptoms**: Choppy, missing, or distorted audio

**Solutions**:
- Update to HD Homey 1.0.0-beta.3+ (audio bugs fixed)
- Check source stream has audio
- Verify browser audio settings

### High CPU Usage

**Causes**:
- Multiple concurrent streams
- Insufficient CPU resources
- Software encoding (no hardware acceleration)

**Solutions**:
- Reduce number of concurrent viewers
- Upgrade server CPU
- Enable hardware acceleration (if available)
- Lower video quality in settings (future feature)

### Playback Stops After Time

**Possible Causes**:
- Network interruption to HDHomeRun
- Transcoding process crashed
- Stream token expired

**Solutions**:
- Refresh the page to restart
- Check HDHomeRun device connectivity
- Review HD Homey logs for errors

## Configuration

### Environment Variables

Control transcoding behavior:

```bash
# Transcoding output directory (optional - defaults to ${HD_HOMEY_DB_PATH}/transcoding)
HD_HOMEY_TRANSCODE_DIR=/tmp/transcoding

# FFmpeg binary path (optional - auto-detected from PATH)
# FFMPEG_PATH=/usr/bin/ffmpeg

# Number of threads per transcode (default: 2)
FFMPEG_THREADS=2
```

See [Environment Variables](/config/environment-variables) for details.

### Future Settings

Planned configuration options:
- Quality presets (Low/Medium/High)
- Hardware acceleration toggle
- Maximum concurrent sessions
- Custom bitrates and resolutions

## Technical Details

### FFmpeg Command

HD Homey uses FFmpeg with these key parameters:
- Preset: `ultrafast` (low CPU usage)
- Tune: `zerolatency` (minimize latency)
- Profile: `baseline` (maximum compatibility)
- GOP size: 30 frames (stable keyframes)

### HLS Configuration

- Segment duration: 2 seconds
- Playlist size: 10 segments
- Auto-delete old segments
- Program date time enabled

## Next Steps

- **[Channel Management](/features/channel-management)** - Accessing channels
- **[Environment Variables](/config/environment-variables)** - Transcoding configuration
- **[Troubleshooting](/troubleshooting/)** - General troubleshooting
