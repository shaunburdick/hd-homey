# HD Homey Constitution

**Project**: HD Homey - HD HomeRun Proxy Application  
**Version**: 0.1.0  
**Last Updated**: 2025-11-15

## Project Purpose

HD Homey is a Next.js application that acts as a proxy for HD HomeRun devices, making it easier to connect and share live TV streams over the internet. The application manages multiple tuners, automatically scans channel lineups, and proxies video streams to users.

## Core Principles

### 1. Simplicity First

- **Minimal Dependencies**: Use built-in Next.js features and standard libraries whenever possible
- **No Over-Engineering**: Avoid complex abstractions unless absolutely necessary
- **Progressive Enhancement**: Start with the simplest solution that works

### 2. User Experience

- **Fast Performance**: Page loads should be immediate, streams should start quickly
- **Clear Interface**: Users should understand what each page does without documentation
- **Reliable Streaming**: Video streams must be stable and uninterrupted
- **Mobile Friendly**: Interface works on phones, tablets, and desktops

### 3. Code Quality

- **Type Safety**: TypeScript strict mode enabled, all code must be properly typed
- **Tested Code**: All business logic must have unit tests (Vitest)
- **Linted Code**: ESLint must pass before builds (enforced in prebuild)
- **Clear Structure**: Follow Next.js conventions (app router, server actions)

### 4. Security

- **Authentication Required**: All routes (except signin/setup) require authentication
- **Role-Based Access**: Admin vs Viewer roles with appropriate permissions
- **No Exposed Secrets**: Environment variables for sensitive data
- **Secure Passwords**: Bcrypt hashing for password storage

### 5. Data Management

- **SQLite Database**: Simple, file-based database with Drizzle ORM
- **Migrations**: All schema changes must have migration files
- **Data Validation**: Use TypeBox for runtime validation at API boundaries
- **Soft Deletes**: Mark records as deleted rather than removing them

### 6. Development Workflow

- **Docker First**: Application is designed to run in containers
- **Environment Config**: All configuration via environment variables
- **Continuous Testing**: Tests run on every build (CI/CD)
- **Conventional Structure**: Follow Next.js app router conventions

## Technical Stack

### Core Framework
- **Next.js 15+**: React framework with app router
- **React 18**: UI library
- **TypeScript 5**: Type-safe JavaScript

### Database & ORM
- **SQLite**: File-based database (better-sqlite3)
- **Drizzle ORM**: Type-safe database queries
- **Drizzle Kit**: Schema management and migrations

### Authentication
- **NextAuth.js v5**: Authentication framework
- **Credentials Provider**: Username/password authentication
- **Bcrypt**: Password hashing

### Validation & Types
- **TypeBox**: Runtime type validation
- **Drizzle TypeBox**: Generate TypeBox schemas from Drizzle schemas

### Styling
- **new.css**: Classless CSS framework for semantic HTML

### Testing
- **Vitest**: Unit testing framework
- **React Testing Library**: Component testing
- **Vitest Coverage**: Code coverage reporting

### Logging
- **Pino**: Fast, structured logging
- **Pino Pretty**: Human-readable logs in development

### Data Fetching
- **SWR**: React hooks for data fetching and caching

## Architecture Patterns

### Route Organization
```
src/app/
├── (start)/           # Unauthenticated routes (get-started)
├── (protected)/       # Authenticated routes
├── api/               # API routes (REST endpoints)
└── users/signin/      # Special authentication route
```

### Server vs Client Components
- **Server Components**: Default for all pages (SSR benefits)
- **Client Components**: Only when needed (forms, interactive elements)
- **Server Actions**: Use for mutations (createTuner, createUser)

### Database Access
- **Centralized DB**: Single `getDb()` function
- **Schema Validation**: Validate at API boundaries using TypeBox
- **Transactions**: Use for multi-step operations

### State Management
- **Server State**: SWR for API data
- **Form State**: React useActionState for form submissions
- **URL State**: Use Next.js routing for navigation state

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

## Non-Goals

- ❌ **Not a DVR**: No recording functionality
- ❌ **Not a Guide**: No EPG/program guide integration
- ❌ **Not Multi-User Streaming**: No concurrent stream management
- ❌ **Not a Transcoder**: No video format conversion

## Future Considerations

These are explicitly out of scope for now but may be considered later:

- Channel recording/DVR functionality
- EPG/program guide integration
- Multi-stream management and scheduling
- Video transcoding for bandwidth optimization
- Mobile applications (iOS/Android)

## Decision Log

### Why Next.js App Router?
- Server components reduce client-side JavaScript
- Built-in API routes
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

### Why Bcrypt over Argon2?
- Widely supported
- Mature library
- Sufficient security for use case
- Easier to install (fewer native dependencies)

---

*This constitution should guide all feature development and technical decisions. When in doubt, refer back to these principles.*
