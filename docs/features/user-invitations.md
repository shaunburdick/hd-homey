# User Invitations

Generate secure invitation links that allow new users to create their own accounts without requiring manual admin setup.

## Overview

The invitation system enables:
- One-time-use invitation links
- Role specification (Admin or Viewer)
- 30-day expiration
- Self-service account creation
- Optional notes for tracking

## How It Works

### Admin Creates Invitation

1. Admin generates invitation with specified role
2. Unique, cryptographically secure link is created
3. Admin shares link with intended user
4. Link expires in 30 days

### User Accepts Invitation

1. User visits invitation link
2. Enters name, username, and password
3. Account is created with pre-assigned role
4. Invitation is marked as used (cannot be reused)
5. User signs in with new credentials

## Managing Invitations

### Creating Invitations

**Admin only**:

1. Navigate to **Settings** → **Invitations** tab
2. Click **"Generate Invitation"**
3. Select role:
   - **Admin**: Full system access
   - **Viewer**: Watch-only access
4. Optional: Add note (e.g., "For John - Marketing")
5. Click **"Generate"**
6. Copy invitation link
7. Share via email, chat, or secure channel

::: tip Add Notes
Use the note field to track who invitations are for, making it easier to manage multiple invitations.
:::

### Viewing Invitations

All admins can view all invitations (regardless of who created them):

**Display Information**:
- Status (Pending, Used, Expired, Revoked)
- Note/label
- Role
- Created by (which admin)
- Creation and expiration dates
- Used by (if redeemed)

### Revoking Invitations

Any admin can revoke any unused invitation:

1. Navigate to **Settings** → **Invitations**
2. Find invitation to revoke
3. Click **"Revoke"**
4. Invitation becomes invalid immediately

::: warning Cannot Revoke Used Invitations
Once an invitation has been used to create an account, it cannot be revoked. To remove access, deactivate the user account instead.
:::

## Invitation Status

| Status | Icon | Description |
|--------|------|-------------|
| **Pending** | 🟢 | Valid, unused invitation |
| **Used** | ✅ | Successfully redeemed |
| **Expired** | ⏰ | 30 days passed, no longer valid |
| **Revoked** | 🚫 | Manually invalidated by admin |

## Security

### Token Generation

Invitations use cryptographically secure tokens:
- 32 bytes of random data (256 bits entropy)
- URL-safe base64 encoding
- Virtually impossible to guess

### Validation

When an invitation is used:
- Token existence verified
- Expiration checked (30 days from creation)
- Usage status checked (one-time use only)
- Revocation status checked

### Rate Limiting

Invitation validation endpoint is rate-limited:
- Maximum 10 requests per minute per IP
- Prevents brute-force token guessing

## Expiration

### Fixed Duration

All invitations expire exactly **30 days** after creation.

### Expired Invitations

When an invitation expires:
- Link becomes invalid
- User sees clear "expired" error message
- Admin must generate new invitation
- Old invitation remains in list (historical record)

### No Extension

Expired invitations cannot be extended or renewed. Create a new invitation instead.

## Troubleshooting

### Invitation Link Not Working

**Check**:
- Link hasn't expired (30 days)
- Link hasn't been used already
- Link wasn't revoked by admin
- URL copied completely (no truncation)

### "Already Used" Error

**Cause**: Invitation was redeemed by someone else

**Solution**:
- Generate new invitation
- Share new link with intended user
- Consider revoking old invitation if shared incorrectly

### Account Creation Fails

**Common Issues**:
- Username already exists (choose different username)
- Password too short (minimum 8 characters)
- Form validation errors

**Solutions**:
- Read error messages carefully
- Choose unique username
- Use password meeting requirements
- Invitation remains valid if account creation fails (try again)

### Cannot Generate Invitation

**Cause**: Not signed in as admin

**Solution**:
- Sign in with administrator account
- Only admins can create invitations

## Best Practices

### Sharing Links

**Secure channels**:
- Email (if encrypted)
- Direct message in secure chat
- Password manager (for family sharing)
- In-person (show QR code)

**Avoid**:
- Public forums
- Social media
- Unencrypted channels
- Sharing with untrusted parties

### Tracking Invitations

Use notes to identify invitations:
```
✅ "John Doe - Marketing team"
✅ "Family member - viewer access"
✅ "Remote worker - admin needed"
❌ "Invitation 1"
❌ "Test"
```

### Regular Review

Periodically review invitations:
- Revoke unused pending invitations (if no longer needed)
- Check which invitations were accepted
- Verify correct roles assigned

### Role Assignment

Choose roles carefully:
- **Viewer**: Default for most users (safer)
- **Admin**: Only for trusted users who need full access
- Can change user role later if needed

## Invitation URL Format

```
https://your-hd-homey-domain.com/invite/[32-byte-token]
```

Example:
```
https://tuner.example.com/invite/qPPC0ee59KLI0ea0-aTH0ui19aPI1Oeyr_aowdPpufl6Q
```

Tokens are URL-safe and can be shared directly.

## Next Steps

- **[User Management](/features/user-management)** - Managing created accounts
- **[Quick Start Guide](/getting-started/quick-start)** - Initial admin account setup
- **[Security Best Practices](/features/stream-security)** - Understanding HD Homey security
