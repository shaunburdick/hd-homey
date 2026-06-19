# HD Homey Constitution

**Project**: HD Homey - HD HomeRun Proxy Application  
**Version**: 1.1.0  
**Ratified**: 2025-11-15  
**Last Amended**: 2026-06-19

## Project Purpose

HD Homey is a Next.js application that acts as a proxy for HD HomeRun devices, making it easier to connect and share live TV streams over the internet. The application manages multiple tuners, automatically scans channel lineups, and proxies video streams to users.

## Core Principles

### I. Simplicity First

**Minimal Dependencies**: Use built-in Next.js features and standard libraries whenever possible  
**No Over-Engineering**: Avoid complex abstractions unless absolutely necessary  
**Progressive Enhancement**: Start with the simplest solution that works

**Why**: Simpler code is easier to maintain, debug, and understand. Dependencies increase attack surface and maintenance burden.

### II. User Experience Excellence

**Fast Performance**: Page loads should be immediate, streams should start quickly  
**Clear Interface**: Users should understand what each page does without documentation  
**Reliable Streaming**: Video streams must be stable and uninterrupted  
**Mobile Friendly**: Interface works on phones, tablets, and desktops

**Why**: The application's primary value is enabling easy access to live TV. Any friction in UX diminishes that value.

### III. Code Quality (NON-NEGOTIABLE)

**Type Safety**: TypeScript strict mode enabled, all code must be properly typed  
**Tested Code**: All business logic must have unit tests (Vitest)  
**Linted Code**: ESLint must pass before builds (enforced in prebuild)  
**Clear Structure**: Follow Next.js conventions (app router, server actions)

**Why**: Quality gates prevent bugs from reaching production and make the codebase maintainable.

### IV. Security by Default

**Authentication Required**: All routes (except signin/setup) require authentication  
**Role-Based Access**: Admin vs Viewer roles with appropriate permissions  
**No Exposed Secrets**: Environment variables for sensitive data  
**Secure Passwords**: Scrypt hashing for password storage (Better-Auth native)  
**Token-Based Streams**: HMAC-SHA256 signed tokens for stream access

**Why**: Users trust us with access to their home network and TV streams. Security cannot be an afterthought.

### V. Data Integrity

**SQLite Database**: Simple, file-based database with Drizzle ORM  
**Migrations**: All schema changes must have migration files  
**Data Validation**: Validate at API boundaries  
**Soft Deletes**: Mark records as deleted rather than removing them (tuners, users)

**Why**: Data loss is unacceptable. Migrations ensure reproducible deployments. Soft deletes enable audit trails.

### VI. Development Workflow

**Docker First**: Application is designed to run in containers  
**Environment Config**: All configuration via environment variables  
**Continuous Testing**: Tests run on every build (CI/CD)  
**Conventional Structure**: Follow Next.js app router conventions  
**Spec-Driven Development**: Features start with specifications in `.specify/`

**Why**: Standardized workflows reduce friction and enable automation.

## Technical Stack

### Core Framework
- **Next.js 16.0.3+**: React framework with app router
- **React 19.2.0**: UI library
- **TypeScript 5**: Type-safe JavaScript

### Database & ORM
- **SQLite**: File-based database (better-sqlite3)
- **Drizzle ORM**: Type-safe database queries
- **Drizzle Kit**: Schema management and migrations

### Authentication
- **Better-Auth 1.1.0**: Modern authentication framework
- **Username Plugin**: Username-based authentication
- **Scrypt**: Password hashing (Better-Auth native)
- **JWT Sessions**: Stateless session management (7-day expiry)

### Styling
- **new.css**: Classless CSS framework for semantic HTML
- **CSS Modules**: Component-scoped styles where needed

### Testing
- **Vitest**: Unit testing framework
- **React Testing Library**: Component testing
- **Vitest Coverage**: Code coverage reporting

### Logging
- **Pino**: Fast, structured logging
- **Pino Pretty**: Human-readable logs in development

### Data Fetching
- **SWR**: React hooks for data fetching and caching

### Video Processing
- **FFmpeg**: MPEG-2 to H.264/HLS transcoding
- **HLS.js**: In-browser HLS playback

## Architecture Patterns

### Route Organization
```
src/app/
├── (start)/           # Unauthenticated routes (get-started)
├── (protected)/       # Authenticated routes
├── api/               # API routes (REST endpoints)
└── users/             # Public auth routes (signin)
```

### Server vs Client Components
- **Server Components**: Default for all pages (SSR benefits)
- **Client Components**: Only when needed (forms, interactive elements)
- **Server Actions**: Use for mutations (createTuner, createUser)

### Database Access
- **Centralized DB**: Single `getDb()` function in `src/lib/database/db.ts`
- **Schema Validation**: Validate at API boundaries
- **No Transactions for Simple Ops**: Avoid transaction overhead when not needed

### State Management
- **Server State**: SWR for API data
- **Form State**: React useActionState for form submissions
- **URL State**: Use Next.js routing for navigation state

### Authentication & Authorization
- **Proxy-Level Protection**: `src/proxy.ts` enforces authentication on Edge Runtime
- **JWT Sessions**: Better-Auth uses JWT for stateless sessions (no DB lookup needed)
- **Token Auth for Streams**: HMAC-SHA256 tokens for transcoding endpoints
- **Server-Side Verification**: Always check permissions in handlers, even if proxy validates session

## Constraints

### Performance
- **Build Time**: Must complete in under 2 minutes
- **Page Load**: First contentful paint under 1 second
- **Stream Start**: Video should start within 2 seconds of request

### Compatibility
- **Node.js**: Version 20+
- **Browsers**: Modern browsers (ES2020+)
- **HD HomeRun**: Compatible with HDHomeRun Connect and Extend devices

### Deployment
- **Docker**: Must run in Docker container
- **Port**: Default port 3000 (configurable)
- **Volume**: Database persisted via Docker volume or bind mount

### Accessibility
- **WCAG 2.2 Level AA**: All UI components must meet accessibility standards
- **Keyboard Navigation**: All interactive elements accessible via keyboard
- **Screen Readers**: Proper ARIA labels and semantic HTML
- **Reduced Motion**: Respect `prefers-reduced-motion` preference

## Anti-Patterns to Avoid

❌ **Transactions for simple operations**: Causes "cannot commit" errors  
❌ **Bcrypt for passwords**: Use scrypt (Better-Auth native)  
❌ **Client-side authorization checks**: Always verify server-side  
❌ **Exposed tuner IPs**: Always proxy through HD Homey  
❌ **Absolute URLs in redirects**: Use relative paths (WSL2 compatibility)  
❌ **Build-time database access**: Use `dynamic = 'force-dynamic'`  
❌ **Over-engineered solutions**: Start simple, add complexity only when needed

## Success Metrics

### Product Metrics
- Stream start time < 2 seconds (95th percentile)
- Zero data loss incidents
- Uptime > 99.5%
- Mobile usability score > 90

### Technical Metrics
- Test coverage > 70% for business logic
- Build time < 2 minutes
- Zero critical security vulnerabilities
- TypeScript strict mode with zero `any` types in new code

### Operational Metrics
- Zero password hashing bugs (scrypt format compliance)
- Zero authentication bypass incidents
- Database migrations succeed on first try
- Docker deployments succeed without manual intervention

## Out of Scope (Explicitly)

These features are intentionally not part of HD Homey's mission:

❌ **DVR/Recording Functionality** - Not a DVR system  
❌ **EPG/Program Guide Integration** - No TV guide  
❌ **Advanced Stream Management** - Beyond shared transcoding  
❌ **Mobile Applications** - Web-first, mobile-responsive  
❌ **Adaptive Bitrate Streaming** - Single quality transcoding only  
❌ **Closed Captioning Support** - Future enhancement  
~~❌ **Video Quality Analytics** - Future enhancement~~ *(now in-scope via Signal Monitoring feature)*  
❌ **Multi-Language Support** - English only for v1.0

## Decision Log

### Why Next.js App Router?
- Server components reduce client-side JavaScript
- Built-in API routes and middleware
- Great TypeScript support
- Server actions simplify mutations

### Why SQLite?
- Simple deployment (single file)
- No separate database server needed
- Sufficient for single-instance deployments
- Easy backups (copy file)

### Why new.css?
- Minimal CSS footprint
- Semantic HTML focus
- No class name complexity
- Fast styling without build step

### Why Drizzle ORM?
- Type-safe queries
- Lightweight compared to Prisma
- Great SQLite support
- Schema-first approach

### Why Better-Auth over NextAuth?
- Native scrypt hashing (no bcrypt issues)
- Username-based authentication (no email workaround)
- Simpler API and better TypeScript support
- JWT sessions work on Edge Runtime
- Active development and modern approach

### Why Scrypt over Bcrypt?
- Better-Auth native (no password format issues)
- Modern algorithm (2009 vs 1999)
- More resistant to hardware attacks
- Configurable work factor

## Governance

### Constitution Authority
- This constitution supersedes all other practices
- All feature specs must align with these principles
- All PRs must verify constitutional compliance
- Complexity must be justified against these principles

### Amendment Process
1. Propose amendment with rationale
2. Document impact on existing code
3. Get team approval
4. Update constitution version
5. Create migration plan if needed
6. Update all affected specs

### Spec-Driven Development Workflow
1. **Constitution Phase**: Define/update principles (this document)
2. **Specification Phase**: Create feature spec in `.specify/features/`
3. **Clarification Phase**: Resolve all ambiguities before planning
4. **Planning Phase**: Create implementation plan in `specs/###-feature/`
5. **Task Phase**: Break plan into actionable tasks
6. **Implementation Phase**: Execute with TDD approach

### Quality Gates
- ✅ All tests must pass (295+ passing)
- ✅ ESLint must pass (no warnings)
- ✅ TypeScript must compile (strict mode)
- ✅ Docker build must succeed
- ✅ No new security vulnerabilities (GitHub CodeQL)
- ✅ Feature specs must be complete before implementation

---

**Version**: 1.1.0 | **Ratified**: 2025-11-15 | **Last Amended**: 2026-06-19

*This constitution guides all development decisions. When in doubt, refer to these principles. Simplicity, security, and user experience are our north stars.*
