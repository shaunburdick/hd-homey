# Why HD Homey Uses Cookie Authentication (Not Bearer Tokens)

**Question**: Why don't the API endpoints support `Authorization: Bearer <token>` authentication?

**Answer**: HD Homey uses Better-Auth with JWT sessions stored in HTTP cookies. This is a deliberate architectural choice, not a limitation.

---

## Technical Background

### Better-Auth Session Strategy

HD Homey uses **Better-Auth** with **JWT/Stateless sessions** (see `apps/web/src/lib/auth/auth.ts`):

```typescript
session: {
    cookieCache: {
        enabled: true,
        maxAge: 60 * 60 * 24 * 7, // 7 days
    },
    expiresIn: 60 * 60 * 24 * 7, // 7 days
},
```

**How it works**:
1. User authenticates (web login OR device pairing)
2. Better-Auth generates a JWT session token
3. Token stored in `better-auth.session_token` HTTP-only cookie
4. Subsequent requests automatically include cookie
5. Better-Auth validates JWT signature (no DB lookup needed)

**Benefits**:
- ✅ Works on Edge Runtime (no database access for session validation)
- ✅ Secure (HTTP-only cookies prevent XSS attacks)
- ✅ Automatic (browsers handle cookies transparently)
- ✅ Stateless (JWT validation is cryptographic, not database lookup)

---

## Why Not Bearer Tokens?

### Better-Auth Is Cookie-First

Better-Auth's `auth.api.getSession()` is designed to read session tokens from cookies via Next.js's `headers()` function:

```typescript
const session = await auth.api.getSession({
    headers: await import('next/headers').then((mod) => mod.headers()),
});
```

This is tightly integrated with Next.js's request handling. It's not easily adaptable to read from `Authorization: Bearer` headers.

### Attempting to Support Both Would Require:

1. **Manual JWT validation** - Bypass Better-Auth and verify tokens ourselves
2. **Session reconstruction** - Recreate Better-Auth session objects manually
3. **Maintenance burden** - Keep custom validation in sync with Better-Auth updates
4. **Security risks** - DIY crypto is error-prone

**Verdict**: Not worth the complexity. Better-Auth's cookie approach works well.

---

## Solution for Mobile Apps (Android/iOS)

Mobile apps should **use cookies**, not Bearer tokens. This works perfectly fine - HTTP clients support cookies.

### How Android App Should Handle Authentication

#### Phase 1: Device Pairing (Already Implemented)

```kotlin
// 1. Request device code
val response = api.requestDeviceCode(clientId, scope)
// Returns: { device_code, user_code, verification_uri, expires_in }

// 2. User authorizes on web (enters user_code)

// 3. Poll for authorization
val pollResponse = api.pollDeviceAuthorization(deviceCode)
// Returns: { status: "authorized", token: "<SESSION_TOKEN>", expiresAt, user: {...} }

// 4. Store session token
secureStorage.save("session_token", pollResponse.token)
```

#### Phase 2: Making Authenticated Requests (To Implement)

**Option A: Cookie Header (Simple)**

```kotlin
// Retrofit OkHttp Interceptor
class AuthInterceptor(private val sessionStorage: SessionStorage) : Interceptor {
    override fun intercept(chain: Interceptor.Chain): Response {
        val token = sessionStorage.getSessionToken() ?: return chain.proceed(chain.request())
        
        val request = chain.request().newBuilder()
            .addHeader("Cookie", "better-auth.session_token=$token")
            .build()
            
        return chain.proceed(request)
    }
}
```

**Option B: CookieJar (Automatic)**

```kotlin
// OkHttp CookieJar handles cookies automatically
val cookieJar = object : CookieJar {
    private val cookieStore = mutableMapOf<String, List<Cookie>>()
    
    override fun saveFromResponse(url: HttpUrl, cookies: List<Cookie>) {
        cookieStore[url.host] = cookies
    }
    
    override fun loadForRequest(url: HttpUrl): List<Cookie> {
        // Manually inject session token as cookie
        val sessionToken = sessionStorage.getSessionToken() ?: return emptyList()
        return listOf(
            Cookie.Builder()
                .domain(url.host)
                .name("better-auth.session_token")
                .value(sessionToken)
                .build()
        )
    }
}

val client = OkHttpClient.Builder()
    .cookieJar(cookieJar)
    .build()
```

**Recommended**: Use Option A (interceptor) for explicit control and easier debugging.

---

## Example: Testing with curl

### ✅ CORRECT - Cookie Header

```bash
curl -X POST http://localhost:3000/api/stream-token \
  -H "Content-Type: application/json" \
  -H "Cookie: better-auth.session_token=<TOKEN>" \
  -d '{"tunerId": 1, "channelId": 1}'
```

### ❌ WRONG - Authorization Bearer Header

```bash
curl -X POST http://localhost:3000/api/stream-token \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <TOKEN>" \
  -d '{"tunerId": 1, "channelId": 1}'
# Returns: 401 Unauthorized
```

---

## Why This Is Not a Problem

### Web Browsers
- ✅ Automatically handle cookies
- ✅ No code changes needed
- ✅ HTTP-only cookies prevent XSS

### Mobile Apps (Android/iOS)
- ✅ HTTP clients support cookies (OkHttp, URLSession, etc.)
- ✅ Simple interceptor pattern (10 lines of code)
- ✅ More secure than storing Bearer tokens in localStorage

### Postman/Testing Tools
- ✅ Supports Cookie header
- ✅ Can manage cookie jars automatically
- ✅ Easy to test both methods

---

## Comparison: Cookie vs Bearer Token Auth

| Aspect | Cookie (HD Homey) | Bearer Token (Alternative) |
|--------|-------------------|----------------------------|
| **Security** | ✅ HTTP-only (XSS-proof) | ⚠️ Vulnerable to XSS if in localStorage |
| **CSRF Protection** | ⚠️ Needs CSRF tokens | ✅ Not vulnerable to CSRF |
| **Mobile Support** | ✅ OkHttp/URLSession support | ✅ Standard Authorization header |
| **Browser Support** | ✅ Automatic | ⚠️ Manual (fetch/axios) |
| **Edge Runtime** | ✅ Works (JWT validation) | ✅ Works (JWT validation) |
| **Implementation** | ✅ Better-Auth native | ⚠️ Manual validation needed |
| **Maintenance** | ✅ Handled by Better-Auth | ⚠️ Custom code to maintain |

**Verdict**: Cookie auth is more secure for web and equally easy for mobile. Better choice.

---

## Implementation in Phase 2 (Android App)

The Phase 2 plan already accounts for this:

### From `specs/013-android-app-phase2/plan.md`:

```kotlin
// AuthInterceptor.kt
class AuthInterceptor(private val tokenProvider: () -> String?) : Interceptor {
    override fun intercept(chain: Interceptor.Chain): Response {
        val token = tokenProvider() ?: return chain.proceed(chain.request())
        val request = chain.request().newBuilder()
            .addHeader("Cookie", "better-auth.session_token=$token")
            .build()
        return chain.proceed(request)
    }
}
```

### From `specs/013-android-app-phase2/data-model.md`:

```kotlin
// Server entity stores the session token
data class Server(
    val id: String,
    val name: String,
    val url: String,
    val sessionToken: String, // Stored after device pairing
    val tokenExpiresAt: Long
)
```

**Status**: ✅ Already planned and documented

---

## Alternative: If Bearer Token Support Was Required

If there was a hard requirement for Bearer token support (there isn't), here's what would be needed:

### 1. Create Manual JWT Validation Helper

```typescript
// apps/web/src/lib/auth/jwt-validator.ts
import jwt from 'jsonwebtoken';
import Config from '@/lib/config';

export function validateBearerToken(authHeader: string | null): { userId: string } | null {
    if (!authHeader?.startsWith('Bearer ')) return null;
    
    const token = authHeader.substring(7);
    
    try {
        const decoded = jwt.verify(token, Config.AUTH_SECRET) as { sub: string };
        return { userId: decoded.sub };
    } catch {
        return null;
    }
}
```

### 2. Update API Endpoints

```typescript
// apps/web/src/app/api/stream-token/route.ts
import { validateBearerToken } from '@/lib/auth/jwt-validator';

export async function POST(request: NextRequest) {
    // Try Better-Auth cookie first
    let session = await auth.api.getSession({ headers: await headers() });
    
    // Fallback to Bearer token
    if (!session?.user) {
        const bearerAuth = validateBearerToken(request.headers.get('authorization'));
        if (bearerAuth) {
            // Manually fetch user from database
            const user = await db.query.user.findFirst({
                where: eq(user.id, bearerAuth.userId)
            });
            session = { user }; // Reconstruct session
        }
    }
    
    if (!session?.user) {
        return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // ... rest of endpoint
}
```

### 3. Maintain Parity with Better-Auth

- Track Better-Auth JWT format changes
- Handle session expiry manually
- Implement token refresh logic
- Test both auth methods

**Effort**: 4-8 hours initial + ongoing maintenance  
**Benefit**: Marginal (Cookie auth already works)  
**Recommendation**: Not worth it

---

## Conclusion

**HD Homey uses Cookie authentication because**:
1. ✅ Better-Auth is designed for cookies
2. ✅ More secure for web (HTTP-only)
3. ✅ Equally easy for mobile (OkHttp interceptor)
4. ✅ Works on Edge Runtime (no DB needed)
5. ✅ Less code to maintain

**Android apps should**:
1. Store session token from device pairing
2. Use Retrofit interceptor to add Cookie header
3. Handle 401 errors (re-authenticate when expired)

**This is already documented and planned in Phase 2.**

---

**Status**: ✅ Architecture decision is sound, no changes needed  
**Action Required**: None - Android implementation should use Cookie header  
**Reference**: Phase 2 plan already includes AuthInterceptor implementation

**Last Updated**: December 14, 2025  
**Branch**: `013-android-app-phase2-backend`
