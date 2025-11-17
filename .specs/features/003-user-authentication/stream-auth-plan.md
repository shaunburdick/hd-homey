# Stream Authentication Implementation Plan

**Date**: 2025-11-16  
**Status**: Proposed  
**Related Spec**: SPEC-003 User Authentication

## Problem Statement

The current stream endpoint `/tuners/[id]/channel/[channel_id]/stream` is protected by NextAuth session-based authentication via layout checks. However, this doesn't work for external video players like VLC that:
1. Cannot handle authentication redirects
2. Don't support session cookies reliably
3. Need a direct, authenticated URL that can be pasted and played immediately

**Security Risk**: Without proper token-based authentication, stream URLs could potentially be accessed without proper authorization.

## Research Summary

Industry-standard solutions for securing video streams to external players use **signed URLs with expiring tokens**:

1. **HMAC-based signatures**: Cryptographically signed tokens using a secret key
2. **Time-limited validity**: Tokens expire after a short duration (5-30 minutes)
3. **Stateless verification**: Server validates signature without database lookup
4. **VLC compatible**: Works as simple query parameters in URLs

**Used by**: AWS CloudFront, Google Cloud Storage, Cloudflare Stream, Mux, BunnyCDN

## Proposed Solution

Implement **HMAC-SHA256 signed URLs** with expiring tokens for stream access.

### Architecture

```
User requests channel page (authenticated)
    ↓
Server fetches stream secret from database settings
    ↓
Server generates signed stream URL
    Token = base64(tunerId:channelId:expiresAt:hmac)
    HMAC signed with app-wide stream secret
    URL = /tuners/[tunerId]/channel/[channelId]/stream?token=...
    ↓
User copies URL to VLC
    ↓
VLC requests stream with token
    ↓
Server fetches stream secret from database settings
    ↓
Server validates token (signature + expiry using stream secret)
    ↓
If valid: Proxy stream from tuner
If invalid: 403 Forbidden
```

### Token Structure

```
Token components (joined with ':'):
- tunerId: Integer tuner ID
- channelId: Integer channel ID  
- expiresAt: Unix timestamp
- signature: HMAC-SHA256(tunerId:channelId:expiresAt, STREAM_SECRET)

Final token: base64url(tunerId:channelId:expiresAt:signature)

Note: STREAM_SECRET is stored in database settings table, not environment
```

### Token Lifecycle

1. **Generation**: When user visits channel detail page (authenticated)
2. **Validity**: 12 hours (configurable via env var)
3. **Verification**: On each stream request
4. **Expiration**: Token rejected after expires timestamp
5. **Key Rotation**: Admins can regenerate the global stream key from settings page

## Implementation Details

### 1. Environment Configuration

**New Environment Variables**:
```bash
# Token expiration in seconds (optional, default: 43200 = 12 hours)
HD_HOMEY_STREAM_TOKEN_EXPIRY=43200
```

**Note**: Stream secret stored in database settings table, not environment variables. Admins can regenerate from settings page.

### 2. Database Schema Update

**File**: `src/lib/database/schema.ts`

Add new `settings` table for application settings:
```typescript
export const settings = sqliteTable('settings', {
    key: text('key', { length: 255 }).primaryKey(),
    value: text('value').notNull(),
    created_at: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
    modified_at: integer('modified_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`)
});

export type Setting = typeof settings.$inferSelect;
```

**Migration**: `migrations/XXXX_add_settings_table.sql`
```sql
-- Create settings table for application configuration
CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY NOT NULL,
    value TEXT NOT NULL,
    created_at INTEGER NOT NULL DEFAULT (unixepoch()),
    modified_at INTEGER NOT NULL DEFAULT (unixepoch())
);

-- Generate initial stream secret
INSERT INTO settings (key, value) VALUES ('stream_secret', lower(hex(randomblob(32))));
```

### 3. Settings Management Module

**File**: `src/lib/settings.ts`

```typescript
import crypto from 'crypto';
import { getDb } from './database/db';
import { settings } from './database/schema';
import { eq } from 'drizzle-orm';
import Logger from './logger';

/**
 * Get a setting value from database
 */
export async function getSetting(key: string): Promise<string | null> {
  try {
    const db = await getDb();
    const setting = await db.query.settings.findFirst({
      where: eq(settings.key, key)
    });
    return setting?.value || null;
  } catch (err) {
    Logger.error({ err, key }, 'Failed to get setting');
    return null;
  }
}

/**
 * Set a setting value in database
 */
export async function setSetting(key: string, value: string): Promise<void> {
  try {
    const db = await getDb();
    await db
      .insert(settings)
      .values({ key, value })
      .onConflictDoUpdate({
        target: settings.key,
        set: { value, modified_at: new Date() }
      });
  } catch (err) {
    Logger.error({ err, key }, 'Failed to set setting');
    throw err;
  }
}

/**
 * Generate a random stream secret
 */
export function generateStreamSecret(): string {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * Get the current stream secret (generates one if missing)
 */
export async function getStreamSecret(): Promise<string> {
  let secret = await getSetting('stream_secret');
  
  if (!secret) {
    Logger.warn('Stream secret not found, generating new one');
    secret = generateStreamSecret();
    await setSetting('stream_secret', secret);
  }
  
  return secret;
}

/**
 * Regenerate the stream secret (invalidates all tokens)
 */
export async function regenerateStreamSecret(): Promise<string> {
  const newSecret = generateStreamSecret();
  await setSetting('stream_secret', newSecret);
  Logger.info('Stream secret regenerated');
  return newSecret;
}
```

### 4. Token Utility Module

**File**: `src/lib/stream-token.ts`

```typescript
import crypto from 'crypto';
import Config from './config';
import { getStreamSecret } from './settings';

interface StreamTokenData {
  tunerId: number;
  channelId: number;
  expiresAt: number;
}

/**
 * Generate a signed token for streaming
 */
export async function generateStreamToken(tunerId: number, channelId: number): Promise<string> {
  const secret = await getStreamSecret();
  const expiresAt = Math.floor(Date.now() / 1000) + Config.streamTokenExpiry;
  
  // Create signature
  const data = `${tunerId}:${channelId}:${expiresAt}`;
  const signature = crypto
    .createHmac('sha256', secret)
    .update(data)
    .digest('hex');
  
  // Combine and encode
  const token = `${tunerId}:${channelId}:${expiresAt}:${signature}`;
  return Buffer.from(token).toString('base64url');
}

/**
 * Verify and parse a stream token
 */
export async function verifyStreamToken(token: string): Promise<StreamTokenData | null> {
  try {
    const secret = await getStreamSecret();
    
    // Decode token
    const decoded = Buffer.from(token, 'base64url').toString('utf-8');
    const [tunerId, channelId, expiresAt, signature] = decoded.split(':');
    
    // Check expiration
    const now = Math.floor(Date.now() / 1000);
    const expiresAtNum = parseInt(expiresAt, 10);
    if (expiresAtNum < now) {
      return null; // Expired
    }
    
    // Verify signature
    const data = `${tunerId}:${channelId}:${expiresAt}`;
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(data)
      .digest('hex');
    
    // Use timing-safe comparison
    if (!crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expectedSignature)
    )) {
      return null; // Invalid signature
    }
    
    return {
      tunerId: parseInt(tunerId, 10),
      channelId: parseInt(channelId, 10),
      expiresAt: expiresAtNum
    };
  } catch (err) {
    return null; // Invalid token format
  }
}
```

### 5. Config Updates

**File**: `src/lib/config.ts`

Add:
```typescript
class ConfigClass {
  // ... existing config ...
  
  public get streamTokenExpiry(): number {
    // Default: 12 hours = 43200 seconds
    return parseInt(process.env.HD_HOMEY_STREAM_TOKEN_EXPIRY || '43200', 10);
  }
}
```

**Note**: Stream secret no longer in config - managed via database settings.

### 6. New Stream Route Handler

**Keep existing endpoint**: `/tuners/[id]/channel/[channel_id]/stream` (add token validation)

**File**: `src/app/(protected)/tuners/[id]/channel/[channel_id]/stream/route.tsx` (update existing route)

```typescript
import { NextRequest } from 'next/server';
import { and, eq, isNull } from 'drizzle-orm';
import { notFound } from 'next/navigation';
import { getDb } from '@/lib/database/db';
import { channels } from '@/lib/database/schema';
import { verifyStreamToken } from '@/lib/stream-token';
import Logger from '@/lib/logger';
import { HDTuner } from '@/lib/hdhr/tuner';

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string; channel_id: string }> }
) {
  try {
    const { id, channel_id } = await context.params;
    const token = req.nextUrl.searchParams.get('token');
    
    if (!token) {
      return new Response('Missing token', { status: 401 });
    }
    
    // Verify token (fetches secret from settings)
    const tokenData = await verifyStreamToken(token);
    if (!tokenData) {
      Logger.warn({ tunerId: id, channelId: channel_id }, 'Invalid or expired stream token');
      return new Response('Invalid or expired token', { status: 403 });
    }
    
    // Verify token matches requested resource
    if (tokenData.tunerId !== parseInt(id, 10) || 
        tokenData.channelId !== parseInt(channel_id, 10)) {
      Logger.warn({ 
        requested: { tunerId: id, channelId: channel_id },
        token: tokenData 
      }, 'Token resource mismatch');
      return new Response('Token does not match resource', { status: 403 });
    }
    
    // Get channel from database
    const db = await getDb();
    const channel = await db.query.channels.findFirst({
      where: and(
        eq(channels.id, tokenData.channelId),
        eq(channels.fk_tuner, tokenData.tunerId),
        isNull(channels.deleted_at)
      ),
      with: {
        tuners: true
      }
    });
    
    if (!channel || !channel.tuners) {
      notFound();
    }
    
    // Stream video
    const tuner = new HDTuner(channel.tuners.path);
    const stream = await tuner.stream(channel.guideNumber);
    
    return new Response(stream as never, {
      status: 200,
      headers: {
        'Content-Type': stream.headers['content-type'] || 'video/mpeg',
        'Access-Control-Allow-Headers': '*',
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'no-store' // Don't cache authenticated streams
      }
    });
  } catch (err) {
    Logger.error({ err }, 'Error fetching channel stream');
    return new Response('Internal server error', { status: 500 });
  }
}
```

### 7. Update Channel Page

**File**: `src/app/(protected)/tuners/[id]/channel/[channel_id]/page.tsx`

```typescript
import { generateStreamToken } from '@/lib/stream-token';

export default async function Page({ params }: { params: Promise<PageParams> }) {
  const { id, channel_id } = await params;
  // ... existing channel lookup ...
  
  // Generate signed stream URL (fetches secret from settings internally)
  const token = await generateStreamToken(parseInt(id, 10), parseInt(channel_id, 10));
  const streamUrl = `/tuners/${id}/channel/${channel_id}/stream?token=${token}`;
  
  return (
    <main>
      {/* ... existing content ... */}
      <h2>Stream</h2>
      <ChannelStream channel={channel} streamUrl={streamUrl} />
      {/* ... */}
    </main>
  );
}
```

### 8. Stream Secret Management Server Action

**File**: `src/lib/actions/settings.ts` (new file)

```typescript
'use server';

import { auth } from '@/auth';
import { AuthRoles } from '@/lib/auth-roles';
import { regenerateStreamSecret, getStreamSecret } from '@/lib/settings';
import { revalidatePath } from 'next/cache';
import Logger from '@/lib/logger';

export interface FormState {
  errors: Record<string, string[]>;
  success?: boolean;
}

/**
 * Regenerate the application stream secret (invalidates all stream tokens)
 * Admin only
 */
export async function regenerateAppStreamSecret(
  state: FormState,
  formData: FormData
): Promise<FormState> {
  const session = await auth();
  
  if (!session?.user || session.user.role !== AuthRoles.Admin) {
    return { errors: { auth: ['Admin access required'] } };
  }
  
  try {
    const newSecret = await regenerateStreamSecret();
    Logger.info({ actor: session.user.id }, 'Stream secret regenerated');
    revalidatePath('/settings');
    
    return { errors: {}, success: true };
  } catch (err) {
    Logger.error({ err }, 'Failed to regenerate stream secret');
    return { errors: { form: ['Failed to regenerate stream secret'] } };
  }
}

/**
 * Get stream secret info (for display, returns partial key only)
 * Admin only
 */
export async function getStreamSecretInfo(): Promise<{ preview: string } | null> {
  const session = await auth();
  
  if (!session?.user || session.user.role !== AuthRoles.Admin) {
    return null;
  }
  
  try {
    const secret = await getStreamSecret();
    // Only show first/last 8 characters
    const preview = `${secret.slice(0, 8)}...${secret.slice(-8)}`;
    return { preview };
  } catch (err) {
    Logger.error({ err }, 'Failed to get stream secret info');
    return null;
  }
}
```

### 9. Settings Page

**File**: `src/app/(protected)/settings/page.tsx` (new file)

```typescript
import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { AuthRoles } from '@/lib/auth-roles';
import { regenerateAppStreamSecret, getStreamSecretInfo } from '@/lib/actions/settings';
import StreamSecretManager from '@/components/stream-secret-manager';

export default async function SettingsPage() {
  const session = await auth();
  
  if (!session?.user || session.user.role !== AuthRoles.Admin) {
    redirect('/');
  }
  
  const secretInfo = await getStreamSecretInfo();
  
  return (
    <main>
      <h1>Settings</h1>
      
      <h2>Stream Authentication</h2>
      <StreamSecretManager 
        secretPreview={secretInfo?.preview || 'Not available'}
        regenerateAction={regenerateAppStreamSecret}
      />
    </main>
  );
}
```

### 10. Stream Secret Manager Component

**File**: `src/components/stream-secret-manager.tsx` (new file)

```typescript
'use client';

import { useActionState } from 'react';
import { FormState } from '@/lib/actions/settings';

interface StreamSecretManagerProps {
  secretPreview: string;
  regenerateAction: (state: FormState, formData: FormData) => Promise<FormState>;
}

const initialState: FormState = { errors: {} };

export default function StreamSecretManager({ 
  secretPreview, 
  regenerateAction 
}: StreamSecretManagerProps) {
  const [state, action, pending] = useActionState(regenerateAction, initialState);
  
  return (
    <section>
      <p>
        The stream secret is used to sign all stream URLs. Regenerating this secret 
        will invalidate all existing stream URLs immediately.
      </p>
      
      <dl>
        <dt>Current Secret</dt>
        <dd><code>{secretPreview}</code></dd>
      </dl>
      
      {state.success && (
        <p style={{ color: 'green' }}>✓ Stream secret regenerated successfully</p>
      )}
      
      {state.errors.form && (
        <p style={{ color: 'red' }}>{state.errors.form.join(', ')}</p>
      )}
      
      {state.errors.auth && (
        <p style={{ color: 'red' }}>{state.errors.auth.join(', ')}</p>
      )}
      
      <form action={action}>
        <button type="submit" disabled={pending}>
          {pending ? 'Regenerating...' : 'Regenerate Stream Secret'}
        </button>
      </form>
      
      <details>
        <summary>What happens when I regenerate?</summary>
        <ul>
          <li>A new random 64-character secret is generated</li>
          <li>The new secret is stored in the database</li>
          <li>All existing stream URLs become invalid immediately</li>
          <li>Users must visit channel pages again to get new URLs</li>
          <li>This does not affect user authentication</li>
        </ul>
      </details>
    </section>
  );
}
```

### 11. Testing

**Unit Tests**: `src/lib/settings.test.ts`
```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { generateStreamSecret } from './settings';

describe('Settings', () => {
  it('should generate unique stream secrets', () => {
    const secret1 = generateStreamSecret();
    const secret2 = generateStreamSecret();
    expect(secret1).not.toEqual(secret2);
    expect(secret1).toHaveLength(64); // 32 bytes = 64 hex chars
  });
});
```

**Unit Tests**: `src/lib/stream-token.test.ts`
```typescript
import { describe, it, expect, beforeAll, vi } from 'vitest';
import { generateStreamToken, verifyStreamToken } from './stream-token';
import * as settings from './settings';

describe('Stream Token', () => {
  const testSecret = 'a'.repeat(64); // 64-char test secret
  
  beforeAll(() => {
    process.env.HD_HOMEY_STREAM_TOKEN_EXPIRY = '300';
    // Mock getStreamSecret to return test secret
    vi.spyOn(settings, 'getStreamSecret').mockResolvedValue(testSecret);
  });
  
  it('should generate and verify valid token', async () => {
    const token = await generateStreamToken(2, 42);
    const verified = await verifyStreamToken(token);
    expect(verified).toEqual({
      tunerId: 2,
      channelId: 42,
      expiresAt: expect.any(Number)
    });
  });
  
  it('should reject token with wrong secret', async () => {
    const token = await generateStreamToken(2, 42);
    // Change the mock to return different secret
    vi.spyOn(settings, 'getStreamSecret').mockResolvedValue('b'.repeat(64));
    const verified = await verifyStreamToken(token);
    expect(verified).toBeNull();
  });
  
  it('should reject expired token', async () => {
    // Create token with negative expiry
    process.env.HD_HOMEY_STREAM_TOKEN_EXPIRY = '-10';
    const token = await generateStreamToken(2, 42);
    process.env.HD_HOMEY_STREAM_TOKEN_EXPIRY = '300';
    const verified = await verifyStreamToken(token);
    expect(verified).toBeNull();
  });
  
  it('should reject tampered token', async () => {
    const token = await generateStreamToken(2, 42);
    const tampered = token.slice(0, -4) + 'XXXX';
    const verified = await verifyStreamToken(tampered);
    expect(verified).toBeNull();
  });
  
  it('should reject malformed token', async () => {
    const verified = await verifyStreamToken('not-a-valid-token');
    expect(verified).toBeNull();
  });
});
```

## Security Considerations

### Strengths
✅ **Stateless**: No database lookup required for validation  
✅ **Time-limited**: Tokens expire automatically  
✅ **Cryptographically secure**: HMAC-SHA256 prevents tampering  
✅ **Resource-bound**: Token only valid for specific tuner/channel  
✅ **Timing-safe**: Uses `crypto.timingSafeEqual` to prevent timing attacks  

### Limitations
⚠️ **Token reuse**: Valid token can be shared until expiration  
⚠️ **No per-token revocation**: Cannot invalidate individual tokens  
⚠️ **No IP binding**: Token works from any IP address  
⚠️ **Global revocation**: Regenerating secret invalidates ALL tokens for ALL users  

### Strengths
✅ **Admin-controlled revocation**: Admin can invalidate all tokens system-wide  
✅ **Database-managed**: Secret stored in database, not environment variables  
✅ **Simple architecture**: Single secret to manage  
✅ **No user association**: Tokens don't reveal user information  
✅ **Easy key rotation**: One-button regeneration from settings page  

### Potential Enhancements (Future)
- **IP binding**: Include user IP in signature (breaks if IP changes)
- **Single-use tokens**: Store token usage in Redis/DB (adds complexity)
- **Per-user secrets**: Derive secret from user ID (requires auth on generation)
- **Shorter expiry**: Balance security vs usability

## Migration Strategy

### Phase 1: Add New Endpoint (Non-Breaking)
1. Add token utilities (`stream-token.ts`)
2. Update existing `/tuners/[id]/channel/[channel_id]/stream` route with token auth
3. Update channel page to generate tokens
4. Update ChannelStream component to use new URL
5. Test with VLC and browsers

### Phase 2: Remove Old Endpoint (Breaking)
1. Keep existing route: `src/app/(protected)/tuners/[id]/channel/[channel_id]/stream/route.tsx`
2. Update any API routes that reference old path

### Phase 3: Documentation
1. Update `.env-example` with `HD_HOMEY_STREAM_SECRET`
2. Update README.md with setup instructions
3. Update Docker Compose example
4. Add to AGENTS.md

## Configuration Example

**`.env-example`**:
```bash
# ... existing vars ...

# Stream token expiration in seconds (optional, default: 43200 = 12 hours)
HD_HOMEY_STREAM_TOKEN_EXPIRY=43200
```

**`docker-compose.yml`**:
```yaml
services:
  hd-homey:
    # ...
    environment:
      - HD_HOMEY_STREAM_TOKEN_EXPIRY=43200
```

**Note**: No global secret needed - each user has their own `stream_key` in the database.

## User Experience Impact

### Before (Insecure)
1. User logs in
2. Visits channel page
3. Copies stream URL
4. Pastes into VLC
5. ⚠️ **URL works without authentication**

### After (Secure)
1. User logs in
2. Visits channel page (generates signed token with app stream secret)
3. Copies stream URL with token
4. Pastes into VLC within 12 hours
5. ✅ **VLC can play with valid token**
6. ⏱️ **Token expires after 12 hours**
7. 🔄 **Admin can regenerate stream secret from settings page**

### Edge Cases
- **Token expired**: User must revisit channel page to get new URL
- **Bookmark saved**: Old bookmarked URL won't work after expiry
- **URL sharing**: Valid tokens can be shared (within expiry window)
- **Secret regeneration**: Admin regenerates from /settings → ALL stream URLs become invalid immediately
- **Security incident**: Admin can invalidate all tokens system-wide instantly

## Performance Impact

- **Token generation**: ~0.2ms (HMAC + 1 DB query to fetch secret)
- **Token verification**: ~0.2ms (HMAC + 1 DB query to fetch secret)
- **Database queries**: 1 per token operation (fetch stream_secret from settings)
- **Memory usage**: Negligible (no token storage)
- **Secret generation**: ~1ms (crypto.randomBytes)
- **Setting query**: Cached by connection pool (minimal overhead)

## Testing Plan

1. **Unit Tests**
   - Token generation and verification
   - Expiration handling
   - Invalid token rejection
   - Signature tampering detection

2. **Integration Tests**
   - Generate token from authenticated page
   - Access stream with valid token
   - Reject stream with invalid token
   - Reject stream with expired token
   - Verify token-resource mismatch rejection

3. **Manual Testing**
   - VLC playback with valid token
   - VLC failure with expired token
   - Browser playback
   - Mobile device playback
   - Token sharing between users

## Rollout Checklist

- [ ] Create `settings` table schema
- [ ] Create database migration for `settings` table with initial stream_secret
- [ ] Implement `src/lib/settings.ts` module (get/set/regenerate secret)
- [ ] Implement `src/lib/stream-token.ts` utility
- [ ] Update `Config` class with token expiry
- [x] Update existing `/tuners/[id]/channel/[channel_id]/stream` route with token validation
- [ ] Update channel page to generate tokens
- [ ] Create `src/lib/actions/settings.ts` server actions
- [ ] Create `src/app/(protected)/settings/page.tsx` settings page
- [ ] Create `src/components/stream-secret-manager.tsx` component
- [ ] Add navigation link to settings page (admin only)
- [ ] Update ChannelStream component
- [ ] Add unit tests for settings and tokens
- [ ] Add integration tests
- [ ] Update `.env-example`
- [ ] Update `docker-compose.yml`
- [ ] Update README.md
- [ ] Update AGENTS.md
- [ ] Update SPEC-003 with new requirements ✅
- [ ] Manual testing with VLC
- [ ] Test secret regeneration invalidates tokens
- [ ] Delete old protected stream route

## References

- [HMAC-SHA256 in Node.js](https://nodejs.org/api/crypto.html#crypto_crypto_createhmac_algorithm_key_options)
- [Signed URLs for Video Streaming](https://www.vdocipher.com/blog/token-based-urls/)
- [Securing Video Streams - Cloudflare](https://developers.cloudflare.com/stream/viewing-videos/securing-your-stream/)
- [HMAC Security Best Practices](https://www.authgear.com/post/generate-verify-hmac-signatures)
