# Stream Security

HD Homey uses token-based authentication to secure video streams and prevent unauthorized access.

## Overview

All video streams require authentication through:
- **Session authentication**: Users must be signed in
- **Stream tokens**: Time-limited HMAC signatures for stream URLs
- **Secret-based signing**: Admin-controlled encryption key

This ensures only authorized users can access your TV streams.

## How Stream Tokens Work

### Token Generation

When you access a channel:

1. HD Homey generates a unique token for that stream
2. Token includes: tuner ID, channel ID, expiration time
3. Token is signed with stream secret (HMAC-SHA256)
4. Token is embedded in stream URL

### Token Validation

When the browser requests video:

1. HD Homey extracts token from URL
2. Verifies signature matches stream secret
3. Checks expiration time hasn't passed
4. Grants or denies access

::: tip No Cookies Required
Stream tokens work without cookies, making them compatible with media players, mobile apps, and other devices.
:::

## Token Expiration

### Default Duration

Stream URLs are valid for **12 hours** by default.

### Customizing Expiration

Change duration via environment variable:

```bash
# 24 hours
HD_HOMEY_STREAM_TOKEN_EXPIRY=86400

# 1 hour
HD_HOMEY_STREAM_TOKEN_EXPIRY=3600

# 7 days
HD_HOMEY_STREAM_TOKEN_EXPIRY=604800
```

### Getting New Tokens

When a token expires:
1. Return to the channel details page
2. New token is automatically generated
3. Copy the new stream URL

## Stream Secret Management

### What Is the Stream Secret?

The stream secret is a cryptographic key used to sign stream tokens:
- Unique to your HD Homey installation
- Generated automatically on first run
- Stored in the database
- Managed by administrators

### Viewing the Stream Secret

Admins can view (partial) stream secret:

1. Navigate to **Settings**
2. View **Stream Authentication** section
3. Secret is partially visible (first/last characters shown)

::: warning Keep Secret Secure
Never share your stream secret publicly. Anyone with this value can generate valid stream URLs.
:::

### Regenerating the Secret

Admins can regenerate the stream secret to invalidate all existing URLs:

1. Navigate to **Settings**
2. Find **Stream Authentication** section
3. Click **"Regenerate Stream Secret"**
4. Confirm action

**Effects**:
- ✅ All existing stream URLs become invalid immediately
- ✅ New tokens use new secret
- ⚠️ Users must get new URLs from channel pages

### When to Regenerate

Regenerate the stream secret when:
- Stream URLs have been leaked publicly
- Suspected unauthorized access
- Regular security rotation (every 90 days recommended)
- After removing an untrusted admin user

## Security Best Practices

### Protect Stream URLs

Stream URLs grant access to your content:
- Don't share publicly or on social media
- Don't post in forums or support tickets
- Use private/encrypted channels when sharing
- Regenerate secret if URLs are leaked

### Token Expiration Strategy

Choose expiration based on your security needs:

| Duration | Best For | Security Level |
|----------|----------|----------------|
| 1 hour | High security, frequent manual sharing | Highest |
| 12 hours (default) | Balanced convenience and security | High |
| 24 hours | Convenience, trusted users only | Medium |
| 7 days | Maximum convenience, low risk environment | Lower |

### Admin Access Control

- Limit admin accounts to trusted individuals
- Admin users can regenerate stream secrets
- Review admin accounts regularly
- Remove admin access when no longer needed

### Network Security

Additional security layers:
- Use HTTPS with reverse proxy for remote access
- Configure firewall rules to limit access
- Consider VPN for external access
- Monitor access logs for suspicious activity

## Troubleshooting

### 401 Unauthorized Error

**Symptoms**: Stream URL returns "Unauthorized" or 401 error

**Causes**:
- Token has expired
- Stream secret was regenerated
- Token signature invalid
- System clock skew

**Solutions**:
1. Get a new stream URL from channel details page
2. Check system time is accurate
3. Verify `AUTH_SECRET` environment variable is set

### Token Expires Too Quickly

**Symptoms**: Stream URLs stop working faster than expected

**Causes**:
- Incorrect `HD_HOMEY_STREAM_TOKEN_EXPIRY` value
- System time/timezone issues

**Solutions**:
1. Check `HD_HOMEY_STREAM_TOKEN_EXPIRY` environment variable
2. Verify system time is accurate (NTP sync recommended)
3. Increase expiration time if too short for your needs

### Stream Secret Regeneration Failed

**Symptoms**: Error when trying to regenerate secret

**Causes**:
- Database write error
- Permission issues

**Solutions**:
1. Check HD Homey logs for error details
2. Verify database is writable
3. Ensure sufficient disk space
4. Restart HD Homey and retry

## Technical Details

### Token Format

Stream tokens are HMAC-SHA256 signatures:

```
token = HMAC-SHA256(streamSecret, data)
data = tunerId + channelId + expirationTimestamp
```

**URL Format**:
```
/tuners/[tunerId]/channel/[channelId]/stream?token=[signature]
```

### Security Properties

- **Unforgeable**: Without stream secret, cannot create valid tokens
- **Time-limited**: Tokens expire automatically
- **Tamper-proof**: Modifying URL invalidates signature
- **Stateless**: No server-side session storage needed

### Implementation

- Signing: Node.js `crypto.createHmac('sha256', secret)`
- Validation: Constant-time comparison to prevent timing attacks
- Storage: Stream secret stored in `settings` table

## Next Steps

- **[User Management](/features/user-management)** - Managing user access
- **[Environment Variables](/config/environment-variables)** - Configure token expiration
- **[Channel Management](/features/channel-management)** - Accessing streams
