# Tuner Connection Validation - Usage Guide

## Feature Description

The Tuner Connection Validation feature adds a "Test Connection" button to both the new tuner and edit tuner forms. This allows administrators to verify that a tuner URL points to a valid HDHomeRun device before saving the configuration.

## Benefits

- **Reduce Configuration Errors**: Catch invalid URLs before saving to database
- **Immediate Feedback**: Know instantly if your tuner is reachable
- **Better UX**: No need to save → refresh → see error → edit → save again
- **Network Troubleshooting**: Clear error messages help diagnose network issues

## How to Use

### Adding a New Tuner

1. Navigate to **Tuners** → **Add New Tuner**
2. Enter a **Tuner Name** (e.g., "Living Room HDHomeRun")
3. Enter a **Tuner URL** (e.g., `http://192.168.1.100`)
4. Click the **"Test Connection"** button
5. Wait for validation result:
   - ✅ **Success**: Green alert showing "Successfully connected! Found X channels"
   - ❌ **Error**: Red alert with specific error message
6. Optionally adjust the URL and test again
7. Click **"Add Tuner"** to save (works regardless of test result)

### Editing an Existing Tuner

1. Navigate to a tuner detail page
2. Click **"Edit Tuner"**
3. Modify the **Path (URL)** field
4. Click **"Test Connection"** to verify the new URL
5. Review the validation result
6. Click **"Update Tuner"** to save changes

## Success Messages

### Successful Connection
```
✓ Successfully connected! Found 42 channels
```

Indicates:
- URL is reachable
- Device responded with valid HDHomeRun lineup
- Shows number of channels available on the device

## Error Messages

### Invalid URL Format
```
✗ Invalid URL format
Please provide a valid URL (e.g., http://192.168.1.100)
```

**Cause**: URL doesn't follow proper format  
**Solution**: Ensure URL starts with `http://` or `https://` and includes valid hostname/IP

### Connection Timeout
```
✗ Connection timeout
Could not reach the tuner. Please check the URL and your network connection.
```

**Cause**: Device didn't respond within 5 seconds  
**Solution**: 
- Verify device is powered on
- Check IP address is correct
- Verify network connectivity
- Check firewall rules

### Connection Failed
```
✗ Connection failed
Could not connect to the tuner. Please verify the URL is correct and the device is powered on.
```

**Cause**: Network refused connection or host not found  
**Solution**:
- Verify IP address or hostname
- Check device is on same network
- Ensure device is powered on
- Check network cables

### Invalid Response
```
✗ Invalid response from device
Device did not return a valid channel lineup
```

**Cause**: URL points to non-HDHomeRun device  
**Solution**: Verify URL points to HDHomeRun device (not router, computer, etc.)

### Tuner URL is Required
```
✗ Tuner URL is required
No path provided
```

**Cause**: URL field is empty  
**Solution**: Enter a tuner URL before testing

## Important Notes

### Non-Blocking Feature
- Testing is **optional** - you can skip it and save directly
- Failed test does **not prevent** form submission
- Useful for:
  - Temporarily offline devices
  - Devices not yet on network
  - Advanced configuration scenarios

### Button States
- **Disabled** when:
  - URL field is empty
  - Test is running
  - Form is submitting
- **Loading** state shows "Testing..." during validation

### Network Requirements
- Server must be able to reach tuner URL
- Typically requires same network or VPN
- Port 80 (HTTP) must be accessible on tuner
- `/lineup.json` endpoint must be available

## Troubleshooting

### Test Keeps Timing Out
1. Ping the device from server: `ping 192.168.1.100`
2. Check if device is on correct network
3. Verify no firewall blocking port 80
4. Try accessing `http://192.168.1.100/lineup.json` in browser

### Test Says "Invalid Response"
1. Access the URL in browser - should see JSON array
2. Verify it's an HDHomeRun device (not other HTTP server)
3. Check device firmware is up to date

### Test Works but Refresh Channels Fails
- Test only validates `/lineup.json` endpoint
- Refresh Channels does full update - may fail for other reasons
- Check tuner detail page for specific error messages

## API Response Format

The validation returns a structured response:

```typescript
interface ValidationResult {
  success: boolean;      // true if validation passed
  message: string;       // User-friendly message
  channelCount?: number; // Number of channels found (on success)
  error?: string;        // Detailed error message (on failure)
}
```

## Security Considerations

- Validation runs **server-side only** (not in browser)
- No credentials are sent during validation
- Server must have network access to tuner
- Admin privileges required to test connections

---

For technical implementation details, see [IMPLEMENTATION-SUMMARY.md](./IMPLEMENTATION-SUMMARY.md)
