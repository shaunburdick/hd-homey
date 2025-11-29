# AI Agent Guide for HD Homey

This document provides AI agents with essential context to quickly understand and work with the HD Homey project.

## Project Overview

**HD Homey** is a Next.js-based proxy application for HDHomeRun devices that enables secure remote access to live TV streams over the internet.

### Tech Stack
- **Framework**: Next.js 16.0.3 (App Router)
- **UI Library**: React 19.2.0
- **Language**: TypeScript 5
- **Database**: SQLite via better-sqlite3 + Drizzle ORM
- **Authentication**: Better-Auth 1.1.0 (username plugin)
- **UI**: new.css for styling
- **Testing**: Vitest + React Testing Library
- **Deployment**: Docker + Docker Compose

## Architecture

### Directory Structure
```
src/
├── app/               # Next.js App Router pages and API routes
│   ├── (protected)/  # Auth-protected routes (tuners, channels, users, settings)
│   ├── api/          # API endpoints
│   └── users/        # Public auth routes (signin, get-started)
├── components/       # React components
├── lib/              # Utilities and core logic
│   ├── auth/         # Better-Auth configuration and helpers
│   │   ├── auth.ts   # Better-Auth instance
│   │   ├── auth-client.ts  # Client-side auth hooks
│   │   └── helpers.ts # Role checking (requireAdmin, etc.)
│   ├── database/     # Database schema and operations
│   │   └── schema.ts # Unified schema (includes Better-Auth tables)
│   └── logger.ts     # Pino logging
└── proxy.ts          # Route protection proxy

.specs/               # Spec-driven development documentation
migrations/           # Database migrations
```

### Key Features (with Specs)
1. **Tuner Management** (SPEC-001) - Add/edit/manage HDHomeRun devices
2. **Channel Discovery** (SPEC-002) - Automatic channel lineup scanning and updates
3. **User Authentication** (SPEC-003) - Role-based access (admin/viewer)
4. **User Management** (SPEC-004) - CRUD operations for user accounts
5. **Stream Proxying** - Transparent video stream relay with URL rewriting

## Development Practices

### Spec-Driven Development
- **All features must have a spec** in `.specs/features/`
- Use the template in `.specs/templates/feature-spec-template.md`
- Update spec status as implementation progresses
- Specs drive implementation, not vice versa

### Code Patterns

#### Server Actions
- Use React Server Actions with `"use server"`
- Return `FormState` objects: `{ errors: Record<string, string[]>, success?: boolean }`
- Redirect using Next.js `redirect()` (throws NEXT_REDIRECT - this is expected)
- Always validate session/authorization server-side

Example:
```typescript
export async function updateUser(id: string, state: FormState, formData: FormData): Promise<FormState> {
  const session = await auth();
  if (!session?.user?.isAdmin) {
    return { errors: { auth: ['Unauthorized'] }};
  }
  // ... implementation
  redirect('/users'); // Will throw NEXT_REDIRECT - handle in client
}
```

#### Client Components
- Use `useActionState` (not deprecated `useFormState`)
- Handle `isRedirectError()` for NEXT_REDIRECT
- Call `router.refresh()` after successful mutations
- Use SWR for data fetching where appropriate

Example:
```typescript
'use client';
import { useActionState } from 'react';
import { isRedirectError } from 'next/dist/client/components/redirect-error';

const [state, action, pending] = useActionState(serverAction, initialState);

try {
  await action(formData);
} catch (error) {
  if (isRedirectError(error)) throw error; // Re-throw redirects
}
```

#### Authentication & Route Protection
- **Proxy**: `src/proxy.ts` protects all routes requiring authentication
  - Public routes: `/users/signin`, `/get-started`, `/api/auth/*`
  - Token-authenticated: `/api/transcode/*` (HMAC tokens validated in handlers)
  - Session-authenticated: All other routes (checked by proxy)
  - Works on Edge Runtime because Better-Auth uses JWT sessions (no database access needed)
- Use `auth.api.getSession()` from `@/lib/auth/auth` in Server Components
- Use `useSession()` from `@/lib/auth/auth-client` in Client Components
- Check `session.user.role` for role-based operations (use `requireAdmin()` helper)
- **Always verify permissions server-side** in API routes, even if proxy checks session
- Admin-only operations (tuner modifications) require explicit role check in handler

#### Database
- All DB code is server-side only (Node.js APIs like `fs`)
- Use Drizzle ORM for queries
- Database schema in `src/lib/database/schema.ts`
- Migrations in `migrations/` directory
- **Important**: Do NOT use transactions for simple operations - they can cause "cannot commit" errors

## Configuration

### Environment Variables
```bash
HD_HOMEY_PROXY_HOST=https://tuner.myawesomesite.com  # External URL for stream proxying
HD_HOMEY_DB_PATH=./data/db                           # Database directory
AUTH_SECRET=<generate-with-openssl-rand-base64-32>   # Better-Auth encryption key
BETTER_AUTH_URL=http://localhost:3000                # Auth base URL (fallback to NEXTAUTH_URL)
```

### Database
- SQLite database at `${HD_HOMEY_DB_PATH}/hd_homey.db`
- Migrations run automatically on startup
- Tables: `user`, `session`, `account`, `verification`, `tuners`, `channels`, `settings`
- Schema uses snake_case for DB columns, camelCase for TypeScript properties

## Common Tasks

### Running Locally
```bash
npm ci                    # Install dependencies
cp .env-example .env     # Configure environment
npm run dev              # Start dev server on 0.0.0.0:3000
```

### Running Tests
```bash
npm test                 # Lint + unit tests
npm run test:coverage    # With coverage report
```

### Database Operations
```bash
npm run db:studio        # Open Drizzle Studio
npm run db:migrate       # Run migrations
npm run db:generate      # Generate migration from schema changes
```

### Docker
```bash
docker compose up -d     # Start with Docker Compose
```

## Known Issues & Quirks

1. **WSL2**: Dev server binds to `0.0.0.0` for WSL2 compatibility
2. **NEXT_REDIRECT**: Server actions that redirect throw `NEXT_REDIRECT` - this is normal, handle with `isRedirectError()`
3. **0.0.0.0 redirects**: Always use relative paths or check `NEXTAUTH_URL` for absolute URLs
4. **Session updates**: Call `router.refresh()` after login/logout to update UI
5. **Build-time DB**: Dynamic routes export `dynamic = 'force-dynamic'` to avoid DB access during build
6. **Transactions**: Avoid using db transactions for simple operations - they can fail with "cannot commit"
7. **Proxy**: Route protection is enforced at the proxy level (`src/proxy.ts`). Token-authenticated routes (transcoding) bypass proxy and validate tokens in handlers. Proxy runs on Edge Runtime but works with Better-Auth because it uses JWT sessions (no database access needed for session validation).
8. **Password Hashing**: Better-Auth uses scrypt (not bcrypt) with format `salt:hash`. Do not use bcrypt functions for password operations.

## Testing

- Unit tests use Vitest + React Testing Library
- Test files: `*.test.ts` or `*.test.tsx`
- Mock Next.js modules when needed
- Focus on business logic, not implementation details

## Contributing

1. Create/update spec in `.specs/features/` FIRST
2. Implement feature following spec
3. Update spec status as you progress
4. Add/update tests
5. Ensure linting passes: `npm run lint`
6. Update CHANGELOG.md
7. Commit with descriptive messages

## Releases

### Current Version
**1.0.0-beta.3** - Better-Auth migration release! Migrates from NextAuth to Better-Auth for improved security and maintainability. Includes automatic database directory creation to prevent build failures. All 203 tests passing. **Breaking change: Users must migrate authentication setup.**

### Release Process

1. **Pre-release validation**:
   ```bash
   npm test              # Run all tests (must pass)
   npm run build         # Verify build succeeds
   ```
   
2. **Update version**: Use `npm version <version> --no-git-tag-version` to update package.json

3. **Update CHANGELOG.md**: Document changes under appropriate section (Added/Changed/Fixed/Removed)

4. **Update version references** in all files:
   - `README.md`: Update version badge (search for "badge/version")
   - `AGENTS.md`: Update "Current Version" section (this file)
   - Search entire project for previous version number to catch any other references

5. **Commit and tag**:
   ```bash
   git add package.json package-lock.json CHANGELOG.md README.md AGENTS.md
   git commit -m "chore: release v<version>"
   git tag -a v<version> -m "Release v<version>"
   git push origin main --tags
   ```

6. **GitHub Actions**: The `release.yml` workflow automatically:
   - Builds Docker image
   - Publishes to ghcr.io/shaunburdick/hd-homey
   - Creates GitHub Release

### Manual Trigger
```bash
gh workflow run release.yml -f version=v1.0.0-alpha.2
```

### Version Strategy
- **Alpha**: Early testing, incomplete features
- **Beta**: Feature complete, needs testing
- **RC**: Release candidate, final testing
- **Stable**: Production ready

## Security Considerations

- All passwords hashed with scrypt (Better-Auth native)
- Better-Auth handles session tokens via JWT
- Proxy protects routes at Edge Runtime level
- Always verify admin status server-side
- No sensitive data in client components
- Stream URLs protected with HMAC-SHA256 tokens

## Resources

- [Next.js 16 Docs](https://nextjs.org/docs)
- [React 19 Docs](https://react.dev/)
- [Better-Auth Docs](https://www.better-auth.com/)
- [Drizzle ORM Docs](https://orm.drizzle.team/)
- [HDHomeRun API](https://www.silicondust.com/hdhomerun/developers/)

---

**Quick Start for Agents**: Review `.specs/constitution.md` and relevant feature specs in `.specs/features/` before making changes. Always update specs to match implementation.
