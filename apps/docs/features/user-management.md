# User Management

Manage user accounts and control access to HD Homey with role-based permissions.

## Overview

HD Homey supports two user roles:

| Role | Permissions |
|------|-------------|
| **Admin** | Full access - manage tuners, channels, users, and settings |
| **Viewer** | Read-only - browse and watch channels only |

## User Roles Explained

### Administrator
Full system access including:
- Add/edit/delete tuners
- Manage user accounts
- Change application settings
- Regenerate stream secrets
- View all features

### Viewer
Limited to content consumption:
- Browse channels
- Watch streams
- Change own password
- View tuner/channel information

::: tip First User
The first account created during initial setup automatically becomes an administrator.
:::

## Managing Users

### Creating Users

**Manual Creation** (Admin only):

1. Navigate to **Users** → **Add User**
2. Fill in user details:
   - Name (display name)
   - Username (login credential)
   - Password (minimum 8 characters)
   - Role (Admin or Viewer)
3. Click **"Add User"**

**Via Invitation** (Recommended):

See [User Invitations](/features/user-invitations) for the secure invitation link method.

### Viewing Users

Navigate to **Users** to see all accounts:

**Display Information**:
- Name and username
- Role (Admin/Viewer)
- Account status (Active/Inactive)
- Creation date

### Editing Users

Admins can modify existing user accounts:

1. Navigate to **Users**
2. Click user to edit
3. Update:
   - Name
   - Username
   - Role
   - Active status
4. Click **"Update User"**

::: warning Password Changes
Passwords can only be changed by the user themselves via the Profile page, not by administrators.
:::

### Deactivating Users

Temporarily disable access without deleting accounts:

1. Navigate to **Users**
2. Edit the user
3. Set **Status** to **Inactive**
4. Save changes

Inactive users cannot sign in but their account data is preserved.

## Password Management

### User Password Changes

Any user can change their own password:

1. Navigate to **Profile** (click username in nav)
2. Enter current password
3. Enter new password (8+ characters)
4. Confirm new password
5. Click **"Change Password"**

### Admin Cannot Reset Passwords

For security, administrators cannot reset user passwords. If a user forgets their password:
- **Current**: Admin must create a new account or manually reset via database
- **Future**: Password reset feature planned

## Security Best Practices

### Strong Passwords

Require users to use strong passwords:
- Minimum 8 characters (enforced)
- Mix of letters, numbers, symbols (recommended)
- No common passwords (not enforced - user responsibility)

### Regular Reviews

Periodically review user accounts:
- Deactivate unused accounts
- Verify role assignments are appropriate
- Remove ex-users promptly

### Admin Account Protection

- Use strong, unique passwords for admin accounts
- Limit number of admin accounts to essential personnel
- Don't share admin credentials

## Troubleshooting

### Cannot Create User

**Common Issues**:
- Username already exists (must be unique)
- Password too short (8 characters minimum)
- Not signed in as admin
- Form validation errors

### User Cannot Sign In

**Check**:
- Account is Active (not Inactive)
- Username spelled correctly
- Password is correct (case-sensitive)
- `AUTH_SECRET` environment variable set correctly

### Role Changes Not Taking Effect

**Solution**:
- User must sign out and sign in again
- Role changes require new session

## Next Steps

- **[User Invitations](/features/user-invitations)** - Secure invitation link system
- **[Quick Start Guide](/getting-started/quick-start)** - Initial admin account creation
- **[Stream Security](/features/stream-security)** - Understanding access control
