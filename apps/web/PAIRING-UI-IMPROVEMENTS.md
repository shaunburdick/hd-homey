# Device Pairing UI Improvements

**Date**: December 13, 2025  
**Commit**: `6a18e98`  
**Status**: ✅ Complete - Build passing, lint clean

## Summary

Refactored the device pairing pages (`/pair`, `/pair/success`) to match HD Homey's design system and provide comprehensive error handling.

## Before vs After

### Before
- ❌ Inline styles with hardcoded values
- ❌ Generic error messages ("Failed to validate code")
- ❌ Inconsistent layout (plain container, no icon)
- ❌ No accessibility considerations
- ❌ Poor error handling (catch blocks with no context)
- ❌ No user guidance (helper text, explanations)

### After
- ✅ Design system components (Card, Button, PageContainer)
- ✅ Specific, actionable error messages
- ✅ Consistent layout matching signin page
- ✅ Full accessibility (ARIA labels, roles, descriptions)
- ✅ Comprehensive error handling with logging
- ✅ Clear user guidance and helper text

---

## Changes by File

### 1. `/pair/page.tsx` - Main Pairing Page

**Design System Integration**:
```tsx
// Before: Plain container
<main className="container">
    <h1>Pair Device</h1>
    <Suspense fallback={<p>Loading...</p>}>
        <PairDeviceForm />
    </Suspense>
</main>

// After: Matches signin page layout
<main className="flex items-center justify-center p-6" style={{ minHeight: '100vh' }}>
    <PageContainer maxWidth="sm">
        <div className="text-center" style={{ marginBottom: 'var(--space-8)' }}>
            <Image src="/icon.png" alt="HD Homey" width={64} height={64} />
            <h1>Pair Device</h1>
            <p className="text-secondary">Authorize a new device to access HD Homey</p>
        </div>
        <PairDeviceForm />
        <p className="mt-5 text-center text-sm text-tertiary">
            Only authorize devices you trust
        </p>
    </PageContainer>
</main>
```

**Features**:
- HD Homey icon at top (consistent branding)
- Centered layout with max-width
- Full viewport height with flex centering
- Helper text at bottom
- Better Suspense fallback

---

### 2. `/pair/pair-form.tsx` - Code Entry & Authorization Form

#### Error Handling Improvements

**Before**:
```tsx
catch {
    setError('Failed to validate code');  // Generic
}
```

**After**:
```tsx
catch (err) {
    Logger.error({ err }, 'Error validating device code');
    setError('Network error. Please check your connection and try again.');
}

// Plus status-specific errors:
if (response.status === 404) {
    setError('This code does not exist. Please check the code and try again.');
} else if (response.status === 410) {
    setError('This code has expired. Please generate a new code on your device.');
} else if (response.status === 409) {
    setError('This code has already been used. Please generate a new code on your device.');
}
```

**Error Messages by Status**:
| Status | User Message |
|--------|--------------|
| 400 | "Invalid code format. Code must be exactly 6 alphanumeric characters." |
| 401 | "Your session has expired. Please sign in again." (with redirect) |
| 404 | "This code does not exist. Please check the code and try again." |
| 409 | "This code has already been used. Please generate a new code on your device." |
| 410 | "This code has expired. Please generate a new code on your device." |
| Network | "Network error. Please check your connection and try again." |
| Unknown | Server error message or "Unable to validate code. Please try again." |

#### Code Entry Form

**Before**:
```tsx
<form style={{ maxWidth: '400px', margin: '2rem auto' }}>
    <p>Enter the 6-character code shown on your device:</p>
    <label htmlFor="code">
        Device Code:
        <input
            id="code"
            type="text"
            value={code}
            maxLength={6}
            placeholder="A8F2K9"
            style={{
                textTransform: 'uppercase',
                letterSpacing: '0.2em',
                fontSize: '1.5rem',
                textAlign: 'center',
            }}
        />
    </label>
    {error && <p style={{ color: 'var(--nc-ac-1, red)' }}>{error}</p>}
    <button type="submit" disabled={loading || code.length !== 6}>
        {loading ? 'Validating...' : 'Continue'}
    </button>
</form>
```

**After**:
```tsx
<Card>
    <form onSubmit={handleSubmit} className="space-y-6">
        <div>
            <h2 className="text-xl font-semibold mb-2">Enter Device Code</h2>
            <p className="text-secondary text-sm">
                Enter the 6-character code shown on your device to authorize it.
            </p>
        </div>

        {error && (
            <div role="alert" className="rounded p-4" style={{
                backgroundColor: 'var(--color-error-bg)',
                border: '1px solid var(--color-error)',
                color: 'var(--color-error)',
            }}>
                {error}
            </div>
        )}

        <div>
            <label htmlFor="code" className="block text-sm font-medium mb-2">
                Device Code
            </label>
            <input
                id="code"
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                maxLength={6}
                placeholder="A8F2K9"
                required
                pattern="[A-Z0-9]{6}"
                disabled={loading}
                className="w-full text-center text-2xl font-mono tracking-widest uppercase"
                aria-describedby="code-help"
                autoFocus
            />
            <p id="code-help" className="mt-2 text-sm text-tertiary">
                The code is case-insensitive and expires after 5 minutes.
            </p>
        </div>

        <Button
            type="submit"
            loading={loading}
            disabled={loading || code.length !== 6}
            className="w-full"
        >
            {loading ? 'Validating...' : 'Continue'}
        </Button>
    </form>
</Card>
```

**Features**:
- Card component for consistent container styling
- Proper heading hierarchy (h2 for form title)
- Error display with colored background and border
- Helper text linked via `aria-describedby`
- Larger code input (text-2xl) with monospace font
- Auto-uppercase as user types
- Disabled state during loading
- Button component with loading indicator
- Auto-focus on code input

#### Authorization Confirmation Screen

**Before**:
```tsx
<div style={{ maxWidth: '500px', margin: '2rem auto', padding: '2rem', border: '1px solid var(--nc-bg-3)' }}>
    <p><strong>{user.username}</strong>, do you want to authorize this device?</p>
    <dl>
        <dt><strong>Device Name:</strong></dt>
        <dd>{deviceInfo.deviceName}</dd>
        <dt><strong>Device Type:</strong></dt>
        <dd style={{ textTransform: 'capitalize' }}>{deviceInfo.deviceType}</dd>
        <dt><strong>Code:</strong></dt>
        <dd><code>{code.toUpperCase()}</code></dd>
    </dl>
    {error && <p style={{ color: 'var(--nc-ac-1, red)' }}>{error}</p>}
    <div style={{ display: 'flex', gap: '1rem' }}>
        <button onClick={handleAuthorize} disabled={loading}>
            {loading ? 'Authorizing...' : 'Yes, Authorize'}
        </button>
        <button onClick={handleDeny} disabled={loading}>Cancel</button>
    </div>
</div>
```

**After**:
```tsx
<Card>
    <div className="space-y-6">
        <div>
            <h2 className="text-xl font-semibold mb-2">Authorize Device</h2>
            <p className="text-secondary">
                <strong>{user.username}</strong>, do you want to authorize this device?
            </p>
        </div>

        <dl className="space-y-3">
            <div>
                <dt className="text-sm font-medium text-tertiary">Device Name</dt>
                <dd className="mt-1 text-base">{deviceInfo.deviceName}</dd>
            </div>
            <div>
                <dt className="text-sm font-medium text-tertiary">Device Type</dt>
                <dd className="mt-1 text-base capitalize">{deviceInfo.deviceType}</dd>
            </div>
            <div>
                <dt className="text-sm font-medium text-tertiary">Code</dt>
                <dd className="mt-1">
                    <code className="px-2 py-1 bg-gray-100 dark:bg-gray-800 rounded font-mono text-lg">
                        {code.toUpperCase()}
                    </code>
                </dd>
            </div>
        </dl>

        {error && (
            <div role="alert" className="rounded p-4" style={{
                backgroundColor: 'var(--color-error-bg)',
                border: '1px solid var(--color-error)',
                color: 'var(--color-error)',
            }}>
                {error}
            </div>
        )}

        <div className="flex gap-3">
            <Button onClick={handleAuthorize} loading={loading} disabled={loading} className="flex-1">
                {loading ? 'Authorizing...' : 'Yes, Authorize'}
            </Button>
            <Button onClick={handleDeny} disabled={loading} variant="secondary" className="flex-1">
                Cancel
            </Button>
        </div>
    </div>
</Card>
```

**Features**:
- Card component wrapper
- Better typography hierarchy
- Styled device info list with consistent spacing
- Code displayed in styled badge (gray background, rounded)
- Button components with variants (primary + secondary)
- Loading states on buttons
- Flex layout with gap-3

---

### 3. `/pair/success/page.tsx` - Success Confirmation

**Before**:
```tsx
<main className="container">
    <h1>✓ Device Authorized</h1>
    <p>
        <strong>{decodeURIComponent(deviceName)}</strong> has been successfully authorized!
    </p>
    <p>You can now close this window and return to your device.</p>
    <Link href="/">Return to Home</Link>
</main>
```

**After**:
```tsx
<main className="flex items-center justify-center p-6" style={{ minHeight: '100vh' }}>
    <PageContainer maxWidth="sm">
        <div className="text-center" style={{ marginBottom: 'var(--space-8)' }}>
            <Image src="/icon.png" alt="HD Homey" width={64} height={64} className="rounded-lg" />
            <h1 className="mb-2" style={{ marginTop: 'var(--space-4)' }}>
                ✓ Device Authorized
            </h1>
            <p className="text-secondary text-base">Your device is ready to use</p>
        </div>

        <Card>
            <div className="space-y-4">
                <div className="text-center p-4 rounded" style={{
                    backgroundColor: 'var(--color-success-bg)',
                    border: '1px solid var(--color-success)',
                }}>
                    <p className="font-semibold" style={{ color: 'var(--color-success)' }}>
                        <strong>{decodeURIComponent(deviceName)}</strong> has been successfully authorized!
                    </p>
                </div>

                <div className="text-center space-y-2">
                    <p className="text-secondary">
                        You can now close this window and return to your device.
                    </p>
                    <p className="text-sm text-tertiary">
                        Your device will automatically connect and you can start streaming channels.
                    </p>
                </div>

                <div className="pt-4">
                    <Link href="/" className="block text-center px-4 py-2 rounded" style={{
                        backgroundColor: 'var(--color-primary)',
                        color: 'white',
                        textDecoration: 'none',
                    }}>
                        Return to Home
                    </Link>
                </div>
            </div>
        </Card>
    </PageContainer>
</main>
```

**Features**:
- Matches signin/pair page layout
- HD Homey icon at top
- Success banner with green background
- Clear instructions with helper text
- Styled link button
- Better spacing and typography

---

## Accessibility Improvements

### ARIA Labels & Roles
```tsx
// Error alerts
<div role="alert" className="rounded p-4" style={{
    backgroundColor: 'var(--color-error-bg)',
    border: '1px solid var(--color-error)',
    color: 'var(--color-error)',
}}>
    {error}
</div>

// Helper text linked to input
<input
    id="code"
    aria-describedby="code-help"
    ...
/>
<p id="code-help">The code is case-insensitive and expires after 5 minutes.</p>
```

### Keyboard Navigation
- Auto-focus on code input
- Full keyboard navigation support
- Button disabled states prevent interaction during loading

### Screen Reader Support
- Proper heading hierarchy (h1 → h2)
- Semantic HTML (dl/dt/dd for device info)
- Descriptive labels on all inputs
- Loading states announced via button text changes

---

## User Experience Improvements

### Visual Feedback
- **Loading states**: Buttons show "Validating..." / "Authorizing..." with spinner
- **Error states**: Red background banners with specific error messages
- **Success states**: Green background banner with checkmark
- **Code input**: Large, monospace, centered for easy reading
- **Device info**: Clear labels with consistent styling

### User Guidance
- **Helper text**: "The code is case-insensitive and expires after 5 minutes"
- **Instructions**: Clear step-by-step guidance
- **Error recovery**: Specific instructions on what to do (e.g., "generate a new code")
- **Security note**: "Only authorize devices you trust"

### Input Improvements
- **Auto-uppercase**: Code converts to uppercase as user types
- **Auto-focus**: Code input focused on page load
- **Validation**: Pattern attribute enforces 6 characters
- **Disabled states**: Form disabled during loading to prevent double submission

---

## Error Handling Flow

### Code Validation
```
User enters code → Client validation (6 chars, alphanumeric)
                 ↓
            Fetch /api/auth/device/validate?code=XXX
                 ↓
         Success: Show authorization screen
         Error:   Show specific error message
         Network: Log error + show network error message
```

### Authorization
```
User clicks "Yes, Authorize" → POST /api/auth/device/authorize
                             ↓
                    Success: Redirect to success page
                    401:     Redirect to signin
                    Error:   Show specific error message
                    Network: Log error + show network error message
```

---

## Testing Recommendations

### Manual Tests
1. **Valid code flow**:
   - Enter valid 6-char code
   - Verify authorization screen shows device info
   - Click "Yes, Authorize"
   - Verify success page shows

2. **Invalid code**:
   - Enter non-existent code → Should show "This code does not exist"
   - Verify error styling (red background)

3. **Expired code**:
   - Use code older than 5 minutes → Should show "This code has expired"

4. **Already used code**:
   - Use code twice → Second attempt should show "already been used"

5. **Network error**:
   - Disable network mid-request → Should show "Network error"
   - Verify error logged to console

6. **Session expiration**:
   - Expire session during authorization → Should redirect to signin with returnTo

7. **Accessibility**:
   - Tab navigation through form
   - Screen reader announcements
   - Error alerts read aloud

### Automated Tests (Future)
- Unit tests for error message mapping
- Integration tests for form submission
- E2E tests for full pairing flow

---

## Code Quality

### TypeScript
```tsx
interface DeviceInfo {
    deviceName: string;
    deviceType: string;
    expiresAt: string;
}
```

### Error Logging
```tsx
catch (err) {
    Logger.error({ err }, 'Error validating device code');
    setError('Network error. Please check your connection and try again.');
}
```

### Graceful Error Handling
```tsx
const data = await response.json().catch(() => ({ error: 'Failed to validate code' }));
```

---

## Build & Lint Status

✅ **Build**: Successful  
✅ **Lint**: No errors  
✅ **TypeScript**: No errors  
✅ **Tests**: N/A (no test changes)

---

## Files Changed

```
apps/web/src/app/pair/page.tsx           (+58, -20 lines)
apps/web/src/app/pair/pair-form.tsx      (+247, -176 lines)
apps/web/src/app/pair/success/page.tsx   (+64, -24 lines)
```

**Total**: +369 lines, -220 lines

---

## Next Steps (Optional)

### Future Enhancements
1. **Add unit tests** for error handling logic
2. **Add E2E tests** for pairing flow
3. **QR code support** for easier code entry
4. **Device management** page to revoke access
5. **Usage tracking** (when was device last used)
6. **Push notifications** when device is authorized (optional)

### Known Limitations
- No "Edit" functionality in context menu (placeholder)
- No device revocation from web UI
- No device list/management page
- Code expiration is fixed at 5 minutes (server-side)

---

## Summary

✅ **Design system aligned** - Matches signin page layout  
✅ **Error handling improved** - Specific, actionable messages  
✅ **Accessibility enhanced** - ARIA labels, keyboard navigation  
✅ **UX polished** - Better visual feedback and guidance  
✅ **Code quality** - TypeScript, logging, clean formatting  

The device pairing pages now provide a professional, accessible, and user-friendly experience that matches the rest of the HD Homey application.
