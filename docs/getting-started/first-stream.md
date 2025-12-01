# Your First Stream

This guide walks you through adding an HDHomeRun tuner and watching your first live TV stream in HD Homey.

## Prerequisites

Before you begin, ensure:

- ✅ HD Homey is installed and running
- ✅ You've created an admin account and are signed in
- ✅ Your HDHomeRun device is connected to the same network as HD Homey
- ✅ You know your HDHomeRun's IP address

::: tip Finding Your HDHomeRun IP
You can find your HDHomeRun's IP address using:
- The HDHomeRun app (iOS, Android, or desktop)
- Your router's DHCP client list
- Network scanning tool: `nmap -p 80 192.168.1.0/24`
- HDHomeRun discovery: `http://my.hdhomerun.com`
:::

## Step 1: Add Your First Tuner

1. **Navigate to Tuners**
   - Click **"Tuners"** in the main navigation menu
   - You'll see an empty list with an **"Add Tuner"** button

2. **Click "Add Tuner"**
   - You'll be taken to the tuner creation form

3. **Fill in tuner information**:
   - **Tuner Name**: Give your device a friendly name
     - Examples: "Living Room", "Main Tuner", "HDHR-12345678"
   - **Tuner URL**: Enter the base URL of your HDHomeRun
     - Format: `http://IP_ADDRESS` (no trailing slash)
     - Example: `http://192.168.1.100`

4. **Click "Add Tuner"**
   - HD Homey will validate the connection
   - If successful, you'll be redirected to the tuner list

::: warning Common Mistakes
- ❌ `http://192.168.1.100/` (trailing slash)
- ❌ `192.168.1.100` (missing http://)
- ❌ `http://192.168.1.100:5004` (don't include port)
- ✅ `http://192.168.1.100` (correct format)
:::

## Step 2: Discover Channels

After adding a tuner, HD Homey automatically discovers available channels.

1. **Wait for channel discovery**
   - This process typically takes 5-10 seconds
   - Channels are fetched from the HDHomeRun lineup

2. **View discovered channels**
   - Click on your tuner name to see details
   - Or navigate to **"Channels"** to see all channels from all tuners

3. **Channel information includes**:
   - Channel number (e.g., "2.1", "7.1")
   - Channel name (e.g., "CBS", "ABC")
   - HD/SD indicator
   - Source tuner

::: tip No Channels Found?
If no channels appear:
1. Verify your HDHomeRun has performed a channel scan
2. Visit your HDHomeRun's web interface: `http://YOUR_TUNER_IP`
3. Navigate to "Channel Lineup" and perform a scan
4. Return to HD Homey and add the tuner again
:::

## Step 3: Watch Your First Stream

Now for the exciting part - watching live TV!

### In-Browser Playback (Recommended)

1. **Go to the Home page or Channels page**
   - Click **"Home"** or **"Channels"** in the navigation

2. **Choose a channel**
   - Browse the list of available channels
   - Click on any channel to view its details

3. **Start watching**
   - On the channel details page, click **"Watch in Browser"**
   - The video player will load and begin streaming
   - Use standard controls: play/pause, volume, fullscreen

**That's it!** You're now watching live TV through HD Homey. 🎉

::: info How It Works
HD Homey automatically transcodes MPEG-2 streams from your HDHomeRun into H.264/HLS format for browser compatibility. Multiple viewers can watch the same channel efficiently by sharing a single transcoding session.
:::

### External Player (Advanced)

For use with VLC, Plex, or other media applications:

1. **Navigate to a channel's details page**
   - Click any channel from Home or Channels

2. **Copy the stream URL**
   - Look for the "Stream URL" section
   - Click the copy button next to the URL
   - The URL includes a time-limited authentication token (valid for 12 hours)

3. **Open in your media player**
   - **VLC**: Media → Open Network Stream → Paste URL
   - **Plex**: Settings → Live TV & DVR → Setup → (not recommended - use lineup API instead)
   - **Other**: Paste URL into any player that supports HTTP streams

::: tip Token Expiration
Stream URLs contain authentication tokens that expire after 12 hours (configurable). When a token expires, simply revisit the channel page to generate a new URL.
:::

## Step 4: Share Access with Viewers

Want to share your HD Homey with family members or friends?

### Create a Viewer Account

1. **Navigate to Users**
   - Click **"Users"** in the main navigation (admin only)

2. **Click "Add User"**

3. **Create viewer account**:
   - **Username**: Choose a username for the viewer
   - **Password**: Set a password (communicate this securely)
   - **Role**: Select **"Viewer"**

4. **Click "Add User"**

5. **Share access information**:
   - Send them your HD Homey URL (e.g., `http://your-server:3000`)
   - Provide their username and password
   - They can browse and watch channels, but cannot modify tuners or settings

### Invite Users (Email-Based)

If you've configured email invitations:

1. **Navigate to Users → Invitations tab**

2. **Click "Send Invitation"**

3. **Enter details**:
   - **Email address**: Recipient's email
   - **Role**: Admin or Viewer
   - **Expiration**: How long the invitation link remains valid

4. **Send invitation**
   - The user receives an email with a signup link
   - They create their own password
   - Their account is automatically created with the specified role

::: tip Viewer Permissions
Viewers can:
- ✅ Browse all channels
- ✅ Watch live streams
- ✅ Change their own password

Viewers cannot:
- ❌ Add or modify tuners
- ❌ Create or manage users
- ❌ Change application settings
- ❌ Regenerate stream secrets
:::

## Video Player Features

HD Homey's in-browser video player provides:

### Standard Controls
- **Play/Pause**: Click the video or use the play button
- **Volume**: Adjust or mute audio
- **Fullscreen**: Expand video to full screen
- **Progress bar**: Shows current playback position (limited for live streams)

### Live Streaming Features
- **Low latency**: ~6-10 seconds behind live
- **Automatic quality**: Streams at 4Mbps video / 192kbps audio
- **Shared sessions**: Multiple viewers share one transcoding process
- **Auto cleanup**: Transcoding stops when the last viewer disconnects

### Browser Compatibility
Works on all modern browsers:
- ✅ Chrome/Chromium (desktop and mobile)
- ✅ Firefox (desktop and mobile)
- ✅ Safari (desktop and mobile)
- ✅ Edge
- ✅ Opera

::: warning Performance Note
Each 1080p stream uses approximately 15-20% of one CPU core for transcoding. Ensure your server has adequate CPU resources for the number of concurrent viewers you expect.
:::

## Troubleshooting

### Tuner Connection Failed

**Error**: "Failed to connect to tuner" or "Invalid tuner URL"

**Solutions**:
1. Verify the IP address is correct
2. Ensure `http://` is included in the URL
3. Test connectivity: `curl http://YOUR_TUNER_IP/discover.json`
4. Check firewall rules on the HDHomeRun device
5. Confirm HD Homey can reach the tuner's network

### No Video Playback

**Error**: Video player loads but video doesn't start

**Solutions**:
1. Check browser console for errors (F12 → Console)
2. Verify FFmpeg is available: `docker exec hd-homey ffmpeg -version`
3. Check transcoding logs: `docker compose logs hd-homey | grep -i transcode`
4. Ensure adequate CPU resources
5. Try refreshing the page

### Audio Issues

**Error**: Video plays but audio is choppy or missing

**Solutions**:
- This should be resolved in HD Homey 1.0.0-beta.3+
- Verify you're running the latest version: Check **About** page
- Check browser audio settings (not muted, correct output device)
- Test direct HDHomeRun stream: `ffplay http://tuner:5004/auto/vX.X`

### Token Expired

**Error**: Stream URL returns 401 Unauthorized

**Solutions**:
- Revisit the channel details page to generate a new URL
- Copy the new URL with a fresh token
- Consider increasing `HD_HOMEY_STREAM_TOKEN_EXPIRY` in your environment variables

## Next Steps

Congratulations! You've successfully:
- ✅ Added your first HDHomeRun tuner
- ✅ Discovered channels
- ✅ Watched live TV in your browser
- ✅ (Optional) Created viewer accounts

### Learn More

- **[Tuner Management](/features/tuner-management)** - Add multiple tuners, edit settings, troubleshoot connections
- **[Channel Management](/features/channel-management)** - Refresh lineups, view channel details
- **[Video Transcoding](/features/video-transcoding)** - Understand how transcoding works and optimize performance
- **[User Management](/features/user-management)** - Advanced user account management
- **[Configuration](/config/environment-variables)** - Customize HD Homey settings

### Advanced Topics

- **[API Access](/api/)** - Integrate with Plex, Emby, or other DVR software
- **[Security](/features/stream-security)** - Manage stream authentication and tokens
- **[Remote Access](/troubleshooting/)** - Expose HD Homey to the internet securely

## Getting Help

If you encounter issues not covered here:

- **[Troubleshooting Guide](/troubleshooting/)** - Comprehensive troubleshooting steps
- **[GitHub Issues](https://github.com/shaunburdick/hd-homey/issues)** - Report bugs or request features
- **[GitHub Discussions](https://github.com/shaunburdick/hd-homey/discussions)** - Ask questions and get community help

Enjoy your live TV streaming with HD Homey! 📺
