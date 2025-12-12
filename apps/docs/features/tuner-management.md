# Tuner Management

Tuner Management allows administrators to configure and monitor HDHomeRun devices, making their channel lineups available for streaming.

## Overview

HD Homey connects to HDHomeRun devices on your local network to:
- Discover available TV channels
- Provide access to live streams
- Manage multiple tuner devices from a single interface
- Automatically update channel lineups

::: tip What's a Tuner?
A **tuner** is your HDHomeRun device - a network-connected TV tuner that receives over-the-air broadcasts and makes them available via HTTP streams.
:::

## Features

### Add HDHomeRun Devices
- Configure one or more HDHomeRun tuners
- Automatic channel discovery on first add
- Support for all HDHomeRun models (Connect, Extend, etc.)

### View Channel Lineups
- Browse all channels from all tuners
- Channels sorted by guide number
- HD/SD indicators
- Direct links to streaming pages

### Refresh Channel Data
- Manually trigger lineup updates
- Soft-delete removed channels (data preserved)
- Add new channels automatically

### Edit Tuner Settings
- Update tuner name for easy identification
- Change network address if device moves
- View last scan timestamp

## Adding a Tuner

### Prerequisites

Before adding a tuner, ensure:
- Your HDHomeRun device is powered on and connected to your network
- HD Homey can reach the device (same network or routed connection)
- You know the device's IP address

::: tip Finding Your Tuner's IP
- HDHomeRun app (iOS/Android/desktop)
- Router's DHCP client list
- Network scan: `nmap -p 80 192.168.1.0/24`
- HDHomeRun discovery: http://my.hdhomerun.com
:::

### Step-by-Step

1. **Navigate to Tuners**
   - Sign in as an administrator
   - Click **"Tuners"** in the main navigation

2. **Click "Add Tuner"**
   - You'll be taken to the tuner creation form

3. **Fill in Details**:
   - **Tuner Name**: Friendly identifier (e.g., "Living Room", "Main Tuner")
     - Helps differentiate multiple tuners
     - Can be changed later
   
   - **Tuner URL**: Base URL of your HDHomeRun device
     - Format: `http://IP_ADDRESS` (no trailing slash)
     - Example: `http://192.168.1.100`
     - Do NOT include port numbers

4. **Save**
   - Click **"Add Tuner"**
   - HD Homey validates the connection
   - Automatic channel scan begins

5. **View Channels**
   - After successful creation, you're redirected to the tuner details page
   - Channel discovery typically takes 5-10 seconds
   - All discovered channels appear in the list

### Common Mistakes

::: danger Watch Out
- ❌ `http://192.168.1.100/` (trailing slash)
- ❌ `192.168.1.100` (missing protocol)
- ❌ `http://192.168.1.100:5004` (includes port)
- ✅ `http://192.168.1.100` (correct format)
:::

## Viewing Tuners

### Tuners List Page

Navigate to `/tuners` to see all configured tuners:

**Display Information**:
- Tuner name
- Network address (URL)
- Number of channels
- Last scanned timestamp
- Status indicator (active/inactive)

**Available Actions**:
- **View Details** - Click tuner name to see channels
- **Edit** - Modify name or URL (admin only)
- **Delete** - Soft-delete tuner (admin only)

### Tuner Details Page

Click any tuner to view its details at `/tuners/[id]`:

**Display Information**:
- Tuner name and URL
- Device information (if available)
- Complete channel lineup
- Last refresh timestamp

**Channel List Includes**:
- Guide number (e.g., 2.1, 7.1)
- Channel name (e.g., CBS, ABC)
- HD/SD indicator
- Link to channel details page

**Actions Available**:
- **Refresh Channels** - Trigger manual lineup update
- **Edit Tuner** - Modify settings
- **Watch Channel** - Click any channel to start streaming

## Refreshing Channel Lineups

Channels can appear or disappear based on reception conditions or broadcasting changes. Refresh the lineup to update your channel list.

### Automatic Refresh

HD Homey automatically scans for channels when:
- A tuner is first added to the system
- *(Future)* On a schedule (not yet implemented)

### Manual Refresh

Trigger a manual refresh:

1. **Navigate to tuner details page**: `/tuners/[id]`
2. **Click "Refresh Channels"** button
3. **Wait for completion**: Typically 5 seconds
4. **View updated list**: New channels appear, removed channels are hidden

### What Happens During Refresh

**HDHomeRun Communication**:
1. HD Homey requests `/lineup.json` from the tuner
2. HDHomeRun returns current channel lineup
3. Data is parsed and validated

**Database Updates**:
- **New channels**: Created and added to database
- **Existing channels**: Updated with latest information
- **Missing channels**: Soft-deleted (marked inactive)
- **Reappearing channels**: Reactivated

::: info Soft Deletes
Channels are never permanently deleted. If a channel disappears and later returns (e.g., reception issues), it's simply reactivated with all its historical data intact.
:::

### Refresh Limitations

- **Performance**: Refresh should complete within 5 seconds
- **Concurrent refreshes**: Last write wins if multiple admins refresh simultaneously
- **Network errors**: Existing channel data preserved if tuner unreachable

## Editing Tuners

Administrators can modify tuner settings after creation.

### What Can Be Edited

- **Tuner Name**: Change display name for better identification
- **Tuner URL**: Update network address if device IP changes
- **Status**: Activate/deactivate tuner

### What Cannot Be Edited

- **Tuner ID**: Internal identifier (permanent)
- **Creation timestamp**: Historical data
- **Channel associations**: Managed automatically

### Editing Process

1. **Navigate to tuner details**: `/tuners/[id]`
2. **Click "Edit Tuner"**
3. **Modify fields**:
   - Update name or URL as needed
   - Form shows current values
4. **Save changes**:
   - Click **"Update Tuner"**
   - Validation occurs server-side
   - Redirected to tuner details on success

### Validation Rules

**Tuner Name**:
- Required (cannot be empty)
- Maximum 255 characters
- Duplicate names allowed (path is unique identifier)

**Tuner URL**:
- Required (cannot be empty)
- Must be valid HTTP(S) URL
- Must be reachable from HD Homey server
- Protocol required (http:// or https://)

## Deleting Tuners

HD Homey uses **soft deletes** for tuners - they're marked inactive rather than permanently removed.

### Soft Delete Behavior

**When a tuner is deleted**:
- Set `deleted_at` timestamp
- Marked as inactive
- No longer appears in tuner lists
- Channels remain in database (also soft-deleted)
- All data preserved for recovery

**Why soft delete?**:
- Preserves historical data
- Enables recovery if deletion was accidental
- Maintains referential integrity
- Supports audit trails

### Deletion Process

1. **Navigate to tuner details**: `/tuners/[id]`
2. **Click "Delete Tuner"** (admin only)
3. **Confirm deletion** (if prompted)
4. **Tuner marked inactive**:
   - Removed from tuner list
   - Channels become unavailable
   - Data remains in database

::: warning Deletion Effects
Deleting a tuner makes all its channels unavailable for streaming. If you only need to temporarily disable a tuner, consider using the deactivation feature instead (if available in your version).
:::

### Recovery

To recover a deleted tuner:
- **Admin access required**: Direct database access or support tool
- **Data intact**: All tuner and channel information preserved
- **Simple recovery**: Clear `deleted_at` timestamp

## Channel Discovery

### How It Works

**Initial Discovery**:
1. Tuner is added to HD Homey
2. System immediately requests `/lineup.json` from HDHomeRun
3. Channel data is parsed and stored
4. Channels appear in tuner details and main channel list

**Lineup Format** (HDHomeRun API):
```json
[
  {
    "GuideNumber": "2.1",
    "GuideName": "CBS",
    "HD": 1,
    "URL": "http://192.168.1.100:5004/auto/v2.1"
  }
]
```

**Stored Data**:
- **Guide Number**: Channel number (e.g., 2.1)
- **Guide Name**: Station name (e.g., CBS)
- **HD Flag**: 1 for HD, 0 for SD
- **Stream URL**: Direct link to video stream

### Channel Organization

**Sorting**:
- Channels are sorted by guide number
- Natural sorting (2.1, 2.2, 10.1, not 10.1, 2.1, 2.2)
- Consistent across all views

**Grouping** (future enhancement):
- Currently: Channels grouped by tuner
- Future: Custom channel groups/favorites

## Troubleshooting

### Tuner Connection Failed

**Error**: "Failed to connect to tuner" or "Invalid tuner URL"

**Possible Causes**:
- Incorrect IP address
- HDHomeRun device powered off or disconnected
- Network firewall blocking connection
- HD Homey cannot reach device network
- URL format incorrect

**Solutions**:
1. Verify IP address is correct
2. Ensure device is powered on
3. Test connectivity: `curl http://YOUR_TUNER_IP/discover.json`
4. Check network routing (same subnet or proper routing configured)
5. Verify URL format: `http://IP_ADDRESS` (no trailing slash, no port)
6. Check firewall rules on both HD Homey and HDHomeRun network
7. Try accessing HDHomeRun web interface directly in browser

### No Channels Found

**Error**: Channel list is empty after adding tuner

**Possible Causes**:
- HDHomeRun hasn't been scanned
- Antenna not connected
- Poor reception in your area
- Channel scan failed on HDHomeRun device

**Solutions**:
1. Visit HDHomeRun web interface: `http://YOUR_TUNER_IP`
2. Navigate to "Channel Lineup"
3. Perform a channel scan on the device
4. Wait for scan to complete (can take 5-10 minutes)
5. Return to HD Homey and add tuner again
6. Or use "Refresh Channels" button on existing tuner

### Channel Refresh Fails

**Error**: "Failed to refresh channels" or timeout

**Possible Causes**:
- HDHomeRun device temporarily unreachable
- Network interruption
- HDHomeRun device rebooting
- Malformed response from device

**Solutions**:
1. Wait 30 seconds and try again
2. Verify HDHomeRun is reachable: `ping YOUR_TUNER_IP`
3. Check HD Homey logs for detailed error
4. Restart HDHomeRun device if necessary
5. Check network stability

### Channels Disappeared

**Symptom**: Channels that worked before are now missing

**Possible Causes**:
- Broadcasting changes (station went off-air)
- Reception issues (antenna, weather)
- HDHomeRun channel scan removed them
- Database issue

**Solutions**:
1. **Check HDHomeRun directly**: Visit `http://YOUR_TUNER_IP` and verify channels
2. **Refresh lineup**: Click "Refresh Channels" on tuner details page
3. **Rescan on HDHomeRun**: Perform new channel scan on device
4. **Check antenna**: Ensure proper connection and positioning
5. **Check reception**: Weather, obstructions can affect signal

::: tip Recovery
If channels disappeared due to reception issues and later return, simply refresh the channel lineup. Soft-deleted channels will be reactivated automatically.
:::

### Edit Fails with Validation Errors

**Error**: Form shows validation errors when editing tuner

**Common Issues**:
- Empty tuner name
- Invalid URL format
- URL not reachable

**Solutions**:
1. **Tuner name**: Ensure not empty, under 255 characters
2. **URL format**: Must start with `http://` or `https://`
3. **No trailing slash**: Remove `/` from end of URL
4. **Reachability**: Ensure HD Homey can connect to new URL before saving

## Technical Details

### Database Schema

**Tuners Table**:
- `id`: Primary key (auto-increment)
- `name`: Display name (string, 255 chars)
- `url`: Network address (string)
- `friendly_name`: Device model name (from discovery)
- `model_number`: Device model (from discovery)
- `tuner_count`: Number of tuners (from discovery)
- `created_at`: Creation timestamp
- `updated_at`: Last modification timestamp
- `deleted_at`: Soft delete timestamp (null if active)

**Relationships**:
- One tuner → Many channels (one-to-many)
- Foreign key: `channels.tuner_id` → `tuners.id`

### API Endpoints

**Tuner Operations**:
- `GET /api/tuners` - List all active tuners
- `POST /api/tuners` - Create new tuner (admin)
- `GET /api/tuners/[id]` - Get tuner details
- `PUT /api/tuners/[id]` - Update tuner (admin)
- `DELETE /api/tuners/[id]` - Soft-delete tuner (admin)
- `POST /api/tuners/[id]/poll` - Refresh channels (admin)

**HDHomeRun Integration**:
- Device discovery: `http://TUNER_IP/discover.json`
- Channel lineup: `http://TUNER_IP/lineup.json`
- Stream endpoint: `http://TUNER_IP:5004/auto/vX.X`

### Performance Considerations

**Tuner List Page**:
- Target load time: < 500ms
- Query optimization: Indexes on `deleted_at`
- Channel counts: Aggregated queries

**Channel Refresh**:
- Target completion: < 5 seconds
- HTTP timeout: 10 seconds
- Database transaction: Atomic updates

**Concurrent Operations**:
- Multiple users can view tuners simultaneously
- Refresh operations: Last write wins
- No locking required for read operations

## Best Practices

### Naming Conventions

**Recommended tuner names**:
- Location-based: "Living Room", "Bedroom", "Garage"
- Function-based: "Main Tuner", "Backup Tuner", "Test Tuner"
- Device-based: "HDHR-12345678", "HDHomeRun Connect"

**Avoid**:
- Generic names: "Tuner 1", "Device", "TV"
- Ambiguous names: "The tuner", "Default"
- Names that will become outdated: "New tuner"

### Network Configuration

**Static IP Recommended**:
- Assign static IP to HDHomeRun devices
- Prevents URL changes when DHCP lease renews
- Reduces administrative overhead

**Network Placement**:
- Same subnet as HD Homey (preferred)
- If different subnet: Ensure proper routing
- Minimize network hops for best streaming performance

### Maintenance Schedule

**Regular Tasks**:
- **Weekly**: Verify all tuners are reachable
- **Monthly**: Refresh channel lineups
- **After storms**: Rescan channels (reception changes)
- **After moving antenna**: Rescan channels

## Next Steps

- **[Channel Management](/features/channel-management)** - Learn about managing discovered channels
- **[Your First Stream](/getting-started/first-stream)** - Start watching live TV
- **[Video Transcoding](/features/video-transcoding)** - Understand how streams are processed

## References

- [HDHomeRun HTTP API Documentation](https://www.silicondust.com/hdhomerun/hdhomerun_http_development.pdf)
- [HDHomeRun Support](https://support.silicondust.com/)
- [Feature Specification: Tuner Management](https://github.com/shaunburdick/hd-homey/tree/main/.specs/features/001-tuner-management.md)
