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
apps/
├── web/               # Main Next.js application
│   ├── migrations/           # Database migrations
│   ├── src/
│   │   ├── app/               # Next.js App Router pages and API routes
│   │   │   ├── (protected)/  # Auth-protected routes (tuners, channels, users, settings)
│   │   │   ├── api/          # API endpoints
│   │   │   └── users/        # Public auth routes (signin, get-started)
│   │   ├── components/       # React components
│   │   ├── lib/              # Utilities and core logic
│   │   │   ├── auth/         # Better-Auth configuration and helpers
│   │   │   │   ├── auth.ts   # Better-Auth instance
│   │   │   │   ├── auth-client.ts  # Client-side auth hooks
│   │   │   │   └── helpers.ts # Role checking (requireAdmin, etc.)
│   │   │   ├── database/     # Database schema and operations
│   │   │   │   └── schema.ts # Unified schema (includes Better-Auth tables)
│   │   │   └── logger.ts     # Pino logging
│   │   └── proxy.ts          # Route protection proxy
│   ├── public/        # Static assets
│   ├── scripts/       # Build scripts
│   └── package.json   # Web app dependencies
├── docs/              # VitePress documentation site
│   ├── .vitepress/    # VitePress configuration
│   ├── getting-started/
│   ├── features/
│   └── package.json   # Docs dependencies
└── android/           # Android app (Phase 1, coming soon)

.specify/            # Spec-kit: specifications and constitution
specs/               # Spec-kit: implementation plans (created during planning phase)
```

### Key Features (with Specs)
1. **Tuner Management** (SPEC-001) - Add/edit/manage HDHomeRun devices
2. **Channel Discovery** (SPEC-002) - Automatic channel lineup scanning and updates
3. **User Authentication** (SPEC-003) - Role-based access (admin/viewer)
4. **User Management** (SPEC-004) - CRUD operations for user accounts
5. **Stream Proxying** - Transparent video stream relay with URL rewriting

## Development Practices

### Spec-Driven Development (Spec-Kit)
- **All features must have a spec** in `.specify/features/`
- Use spec-kit commands: `/speckit.specify`, `/speckit.clarify`, `/speckit.plan`, `/speckit.tasks`, `/speckit.implement`
- Feature specs are single files (e.g., `001-tuner-management.md`), not subdirectories
- Implementation plans live in `specs/###-feature/` directory (created during planning phase)
- Update spec status as implementation progresses
- Specs drive implementation, not vice versa

### Documentation Maintenance

**CRITICAL**: HD Homey uses a dual-documentation approach that MUST be kept in sync:

#### Documentation Structure
1. **README.md** (root) - Quick pitch and getting started (~95 lines)
   - Project description and badges
   - Repository structure overview
   - Minimal quick start guide
   - Feature highlights with links to docs
   - Links to comprehensive documentation
   
2. **apps/docs/** (VitePress site) - Comprehensive documentation (~4,400 lines)
   - Deployed to: https://shaunburdick.github.io/hd-homey/
   - Full installation guides
   - Detailed feature documentation
   - Configuration reference
   - Troubleshooting guides
   - API reference
   - Contributing guide

#### When to Update Documentation

**Always update documentation when you**:
- ✅ Add a new feature or capability
- ✅ Change existing behavior or configuration
- ✅ Add/modify environment variables
- ✅ Update dependencies that affect usage
- ✅ Fix bugs that were documented as workarounds
- ✅ Change API endpoints or contracts
- ✅ Add new troubleshooting solutions

#### Documentation Update Checklist

When making changes, update BOTH locations as needed:

**1. README.md Updates Required When**:
- [ ] Changing the quick start process
- [ ] Adding high-level features to the feature list
- [ ] Updating tech stack versions (major versions only)
- [ ] Changing project status or version

**2. apps/docs/ Updates Required When**:
- [ ] Adding new features → Update `apps/docs/features/`
- [ ] Changing configuration → Update `apps/docs/config/`
- [ ] Adding installation methods → Update `apps/docs/getting-started/installation.md`
- [ ] Fixing common issues → Update `apps/docs/troubleshooting/`
- [ ] Changing APIs → Update `apps/docs/api/`
- [ ] Modifying workflows → Update `apps/docs/contributing/`

**3. Specific Files to Check**:
```
Feature changes:
  → apps/docs/features/[feature-name].md
  → apps/docs/features/index.md (overview)
  → README.md (feature list if major)

Configuration changes:
  → apps/docs/config/environment-variables.md
  → apps/docs/config/database.md
  → apps/docs/getting-started/installation.md (if affects setup)

New capabilities:
  → apps/docs/getting-started/quick-start.md
  → apps/docs/getting-started/first-stream.md (if user-facing)
  → README.md (quick start if critical)
```

#### Documentation Development Workflow

```bash
# 1. Make your code changes in apps/web/
# 2. Update relevant docs/ files in apps/docs/
npm run docs:dev  # Preview at http://localhost:5173/hd-homey/

# 3. Verify all internal links work
npm run docs:build            # Checks for dead links

# 4. Update README.md if needed (rarely)

# 5. Lint docs
npm run lint                  # Lints docs with eslint-config-shaunburdick

# 6. Commit docs WITH your code changes (same commit or same PR)
git add apps/web/ apps/docs/ README.md
git commit -m "feat: add new feature

- Implement feature X
- Update apps/docs/features/feature-x.md
- Update README feature list"
```

#### Documentation Style Guidelines

**apps/docs/ (VitePress)**:
- Use clear, descriptive headings (H2 for major sections, H3 for subsections)
- Include code examples with syntax highlighting
- Add callouts for warnings, tips, and notes using VitePress containers
- Link to related pages using relative paths
- Keep each page focused on a single topic
- Use emoji sparingly (only in feature highlights)

**README.md**:
- Keep it brief and scannable
- Link to docs/ for details (use full URLs with base path)
- Use emoji for feature highlights only
- Focus on "why" and "what", link to docs for "how"

#### Example: Adding a New Feature

```bash
# 1. Create spec (if new feature)
.specify/features/012-new-feature.md

# 2. Plan implementation (spec-kit planning phase)
specs/012-new-feature/plan.md

# 3. Implement feature
apps/web/src/app/(protected)/new-feature/page.tsx

# 4. Add comprehensive docs
apps/docs/features/new-feature.md     # New file
apps/docs/features/index.md           # Add to feature list
apps/docs/config/environment-variables.md  # If adds env vars

# 5. Update README feature list (optional, if major)
README.md                        # Add one-line feature highlight

# 6. Test docs build
npm run docs:build    # Verify no errors

# 7. Commit everything together
git add .specify/ specs/ apps/web/ apps/docs/ README.md
git commit -m "feat: add new feature X

Implements new feature X that allows users to...

Documentation:
- Add apps/docs/features/new-feature.md
- Update feature index
- Add environment variable docs"
```

#### Common Documentation Pitfalls to Avoid

❌ **Don't**: Update code without updating docs  
✅ **Do**: Update docs in the same commit/PR as the code

❌ **Don't**: Copy-paste large sections from README to apps/docs/  
✅ **Do**: Keep README minimal, comprehensive details in apps/docs/

❌ **Don't**: Use absolute URLs for internal doc links  
✅ **Do**: Use relative paths in apps/docs/ for internal navigation

❌ **Don't**: Forget to run `docs:build` before committing  
✅ **Do**: Verify build succeeds and links work

❌ **Don't**: Update only the code and tell users "see docs"  
✅ **Do**: Make docs updates part of your definition of done

#### Documentation Deployment

- **Automatic**: Docs deploy on merge to `main` via GitHub Actions
- **URL**: https://shaunburdick.github.io/hd-homey/
- **Workflow**: `.github/workflows/docs.yml`
- **Build time**: ~2-3 seconds
- **Preview**: Run `npm run docs:dev` locally before pushing

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
- **Proxy**: `apps/web/src/proxy.ts` protects all routes requiring authentication
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
- Database schema in `apps/web/src/lib/database/schema.ts`
- Migrations in `apps/web/migrations/` directory
- **Important**: Do NOT use transactions for simple operations - they can cause "cannot commit" errors

## Configuration

### Environment Variables
```bash
# Required
AUTH_SECRET=<generate-with-openssl-rand-base64-32>   # Better-Auth encryption key

# Optional (with auto-detection/defaults)
HD_HOMEY_PROXY_HOST=                                 # External URL (auto-detects from request if blank)
HD_HOMEY_DB_PATH=./data/db/hd_homey.db               # Full database file path (not just directory)
HD_HOMEY_TRANSCODE_DIR=./data/transcoding            # Transcoding temp dir (defaults to ${HD_HOMEY_DB_PATH}/transcoding)
FFMPEG_PATH=ffmpeg                                   # FFmpeg binary (auto-detected from PATH)
BETTER_AUTH_URL=http://localhost:3000                # Auth base URL (auto-detected from request)
```

### Database
- SQLite database at path specified by `HD_HOMEY_DB_PATH` (full file path, not directory)
- Default location: `./data/db/hd_homey.db`
- Migrations run automatically on startup
- Tables: `user`, `session`, `account`, `verification`, `invitation`, `tuners`, `channels`, `settings`
- Schema uses snake_case for DB columns, camelCase for TypeScript properties

## Common Tasks

### Running Locally
```bash
npm install              # Install all workspace dependencies
cp apps/web/.env-example apps/web/.env  # Configure environment
npm run dev              # Start web app dev server on 0.0.0.0:3000
npm run docs:dev         # Start docs site (optional)
```

### Running Tests
```bash
npm test                 # Lint + unit tests (web app)
npm run test:coverage    # With coverage report (web app)
```

### Database Operations
```bash
npm run db:studio        # Open Drizzle Studio (web app)
npm run db:migrate       # Run migrations (web app)
npm run db:generate      # Generate migration from schema changes (web app)
```

### Docker
```bash
docker compose up -d     # Start with Docker Compose
```

### Workspace Commands
```bash
# Root-level shortcuts (delegate to web app)
npm run dev              # → npm run dev -w @hd-homey/web
npm test                 # → npm test -w @hd-homey/web
npm run build            # → npm run build --workspaces
npm run lint             # → npm run lint --workspaces

# Explicit workspace commands
npm run web:dev          # Start web app
npm run web:build        # Build web app
npm run web:test         # Test web app
npm run docs:dev         # Start docs site
npm run docs:build       # Build docs site
```

## Known Issues & Quirks

1. **Monorepo Structure**: HD Homey uses npm workspaces with apps in `apps/` directory. Use workspace commands or shortcuts defined in root package.json.
2. **WSL2**: Dev server binds to `0.0.0.0` for WSL2 compatibility
3. **NEXT_REDIRECT**: Server actions that redirect throw `NEXT_REDIRECT` - this is normal, handle with `isRedirectError()`
4. **0.0.0.0 redirects**: Always use relative paths or check `NEXTAUTH_URL` for absolute URLs
5. **Session updates**: Call `router.refresh()` after login/logout to update UI
6. **Build-time DB**: Dynamic routes export `dynamic = 'force-dynamic'` to avoid DB access during build
7. **Transactions**: Avoid using db transactions for simple operations - they can fail with "cannot commit"
8. **Proxy**: Route protection is enforced at the proxy level (`apps/web/src/proxy.ts`). Token-authenticated routes (transcoding) bypass proxy and validate tokens in handlers. Proxy runs on Edge Runtime but works with Better-Auth because it uses JWT sessions (no database access needed for session validation).
9. **Password Hashing**: Better-Auth uses scrypt (not bcrypt) with format `salt:hash`. Do not use bcrypt functions for password operations.

## Testing

- Unit tests use Vitest + React Testing Library
- Test files: `*.test.ts` or `*.test.tsx`
- Mock Next.js modules when needed
- Focus on business logic, not implementation details

## Contributing

1. Create/update spec in `.specify/features/` FIRST
2. Implement feature following spec
3. Update spec status as you progress
4. Add/update tests
5. Ensure linting passes: `npm run lint`
6. Update CHANGELOG.md
7. Commit with descriptive messages

## Releases

### Current Version
**1.0.0-beta.5** - Channel organization and preferences release! Channel favorites and hiding (SPEC-012), persistent section expand/collapse states per tuner, optimistic UI updates, and full accessibility support. All 340 tests passing.

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
   - `apps/docs/.vitepress/config.ts`: Update version in nav dropdown (line 19)
   - `apps/web/package.json`: Update version (use `npm version` in workspace)
   - Search entire project for previous version number to catch any other references

5. **Commit and tag**:
   ```bash
   git add apps/web/package.json package-lock.json CHANGELOG.md README.md AGENTS.md apps/docs/.vitepress/config.ts
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

**Quick Start for Agents**: Review `.specify/memory/constitution.md` and relevant feature specs in `.specify/features/` before making changes. Always update specs to match implementation.

**Spec-Kit Commands**: Use `/speckit.specify` to create specifications, `/speckit.clarify` to resolve ambiguities, `/speckit.plan` for implementation planning, `/speckit.tasks` to break down work, and `/speckit.implement` to execute.
