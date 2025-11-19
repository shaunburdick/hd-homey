# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Changed

- **Dependencies**: Updated all npm dependencies to latest versions
  - React 18 → 19.2.0 (major)
  - Next.js 15 → 16.0.3 (major)
  - bcrypt 5 → 6.0.0 (major)
  - better-sqlite3 11 → 12.4.1 (major)
  - next-auth 5.0.0-beta.25 → 5.0.0-beta.30 (beta)
  - All type definitions updated to match
  - eslint-config-next updated to 16.0.3

- **ESLint Configuration**: Added Next.js ESLint plugin with recommended and core-web-vitals rules
- **Code Quality**: Fixed all ESLint errors (223 → 0)
  - Refactored React setState-in-effect patterns
  - Fixed accessibility issues
  - Eliminated duplicate string literals
  - Improved null/undefined checks
  - Reduced cognitive complexity
  - Added proper viewport configuration

- **Images**: Converted `<img>` tags to Next.js `<Image>` component for better optimization

## [1.0.0-alpha.4] - 2025-01-18

**Note**: This release completes the design system overhaul with enhanced accessibility, mobile optimization, and comprehensive UI/UX improvements.

### Added

- **Design System & Accessibility** (SPEC-004): Complete UI/UX overhaul
  - Enhanced dark theme with WCAG 2.2 AA compliance (all color contrast issues resolved)
  - Complete design token system (spacing, colors, typography, transitions)
  - Reusable component library (Button, Input, Card, Toast, Skeleton, FormErrors)
  - Layout components (PageContainer, PageHeader, InfoCard, Section, EmptyState)
  - Mobile-first responsive design with proper touch targets (44px minimum)
  - Error boundary (error.tsx) and friendly 404 page (not-found.tsx)
  - Loading states and skeleton screens throughout
  - Consistent form patterns with validation feedback
  - Enhanced navigation with mobile hamburger menu

- **Page Redesigns**: All pages updated with new design system
  - Authentication pages (sign in, get started)
  - Tuner management (list, detail, add, edit)
  - Channel browsing and streaming
  - User management (list, detail, add, edit)
  - Settings page with improved layout
  - Dashboard with quick stats and actions
  - About page with version information

### Changed

- **CSS Architecture**: Migrated to utility-first approach with design tokens
  - 55% reduction in inline styles through utility classes
  - Centralized design tokens in globals.css
  - Mobile-first breakpoints (640px, 768px, 1024px, 1280px)
  - Consistent spacing scale (0.25rem to 4rem)

- **Accessibility Improvements**:
  - Fixed all WCAG 2.2 AA color contrast violations
  - Proper ARIA labels and semantic HTML throughout
  - Keyboard navigation support
  - Screen reader friendly components
  - Focus indicators on all interactive elements

- **Mobile Optimization**:
  - Touch-friendly button sizes (44px height minimum)
  - Responsive grid layouts with auto-fit
  - Proper viewport configuration
  - Next.js Image component for optimized loading
  - Reduced bundle sizes (102 kB shared JS)

### Fixed

- Tuner edit page help text now displays as block below checkbox
- Date formatting shows local time instead of UTC (e.g., "11/18/2024, 8:35:52 PM")
- Active status display added to Tuner Information card
- Home page test database initialization fixed (all 128 tests passing)
- Footer link contrast increased for better readability
- Non-HD channels no longer show "0" for HD indicator
- Cursor pointer added to all clickable links

## [1.0.0-alpha.3] - 2025-11-18

**Note**: This release adds the most requested feature - in-browser video playback with automatic transcoding.

### Added

- **Video Transcoding & In-Browser Playback** (SPEC-005): Complete implementation
  - Real-time MPEG-2 to H.264/HLS transcoding using ffmpeg
  - HLS.js-based video player with adaptive buffering
  - Intelligent session management with automatic cleanup after 30s of inactivity
  - Shared transcoding sessions - multiple viewers share a single transcode process
  - Token-based authentication for HLS playlists and segments
  - Automatic process cleanup when streams end
  - Optimized settings: 4Mbps video, 192kbps audio, 2-second segments
  - Comprehensive test suite for FFmpeg, session manager, and token generation
  
- **Transcoding Infrastructure**:
  - Session manager for lifecycle management and resource cleanup
  - Activity tracking based on segment access timestamps
  - Configurable settings via database (bitrate, resolution, codec, etc.)
  - Background cleanup timer (10s interval) for inactive sessions
  - Stream token generation and validation for secure access

### Fixed

- **Audio Quality Issue**: Removed audio resampling flag that caused degraded/segmented audio playback
- **Process Cleanup**: FFmpeg processes now properly terminate when streams end
- **Session Management**: Fixed session cleanup based on activity rather than viewer count (HLS is stateless)

## [1.0.0-alpha.2] - 2025-11-17

**Note**: This is an **alpha release** with comprehensive test coverage. The application is functional but requires more comprehensive testing and UX improvements.

### Added

- **Comprehensive Test Suite**: Full unit and integration test coverage (82 tests, 100% passing)
  - HDTuner unit tests for HDHomeRun device integration
  - User action tests for authentication and authorization
  - Database schema validation tests
  - API endpoint tests (GET and POST routes)
  - Authorization and security tests
  - Test utilities and helpers for maintainability
  - Vitest + React Testing Library integration
  - Type-safe mocking without type assertions
  
- **Testing Documentation**: Complete testing guide and plan
  - Testing summary document with patterns and best practices
  - Testing plan with phase breakdown and completion status
  - Test maintenance guidelines

### Changed

- **Docker Build Process**: Enhanced multi-platform support and caching
  - Streamlined build jobs for amd64 and arm64
  - Improved layer caching strategy
  - ARM64 build using emulation
  - Limited Docker builds to release tags
  - GitHub Actions cache optimization
  
- **CI/CD Improvements**: 
  - Separate test, build, and Docker workflows
  - Added workflow_call trigger for reusability
  - Fixed badge links in README
  - Disabled Dependabot in favor of manual updates

### Fixed

- **Dependency Review**: Removed conflicting allow-licenses configuration
- **TypeScript Errors**: Resolved all TypeScript compilation errors in test files
- **Linting**: Fixed ESLint errors in test files (non-null assertions, curly braces, unused variables)
- **Docker Registry Cache**: Fixed 403 errors for PRs by removing registry cache from workflow
- **Test Validation**: Updated validation tests to use truly invalid data

## [1.0.0-alpha.1] - 2025-11-16

**Note**: This is an **alpha release**. The application is functional but requires more comprehensive testing, UX improvements, and may contain bugs.

### Added

- **User Authentication System**: Complete NextAuth.js v5 integration with local credentials provider
  - Admin and viewer role-based access control
  - Get-started page for initial admin account creation
  - Protected routes with middleware enforcement
  - Session-based authentication with secure password hashing
  - Sign in/out functionality with proper session management
  
- **User Management**: Full CRUD operations for user accounts
  - User listing page with role indicators
  - User edit page with password updates, enable/disable, and role changes
  - Server-side authorization checks on all user operations
  - Admin-only access controls for user management
  
- **Spec-Driven Development**: Documentation-first development approach
  - Spec directory structure compatible with spec-kit and similar tools
  - Constitution document defining spec philosophy and practices
  - Feature templates for consistent documentation
  - Completed specs for existing features (tuners, channels, authentication, users)

- **Enhanced Navigation**: Improved UI for authenticated users
  - Dynamic menu items based on authentication state
  - Admin-only links (Users, Settings)
  - User role badges and indicators
  - Proper session refresh on login/logout

### Changed

- **Docker Base Image**: Updated from Node 18 to Node 22 LTS for security and performance improvements
- **Database Migrations**: Switched from template database to Drizzle migrations at container startup
- **Database Connection**: Improved connection caching strategy to prevent stale data issues
- **Page Rendering**: Added `dynamic = 'force-dynamic'` to layouts to prevent static pre-rendering issues
- **Updated Dependencies**: All packages updated to latest stable versions
  - Next.js 15.1.6 with App Router
  - NextAuth.js 5.0.0-beta.25
  - React 18 with useActionState hook
  - Drizzle ORM 0.44.7
  
- **Improved GitHub Actions Workflows**: Modernized CI/CD pipeline
  - Separate workflows for test, build, and Docker
  - Dependency caching for faster builds
  - Proper build artifact handling
  - Enhanced Docker image optimization with layer caching

- **Better Database Management**: 
  - Dynamic route export configuration for static builds
  - Improved error handling in database operations
  - Fixed transaction issues in channel refresh

### Fixed

- **Redirect Loop**: Fixed issue where protected pages would redirect to get-started after user creation
- **Database Caching**: Fixed database connection caching causing stale query results
- **WSL2 Compatibility**: Dev server now properly binds to 0.0.0.0 for WSL2 environments
- **NEXTAUTH_URL Configuration**: Proper URL handling for authentication redirects
- **Client-Side Database Imports**: Separated server-only database code from client components
- **Session Updates**: Proper session refresh after login/logout actions
- **Redirect Handling**: Fixed 0.0.0.0 redirects in various server actions
- **Database Transactions**: Corrected transaction usage in channel refresh operations

### Security

- **Password Hashing**: BCrypt integration for secure password storage
- **Route Protection**: Middleware-based authentication enforcement
- **Role-Based Authorization**: Server-side checks on all protected operations
- **Session Security**: Secure session token encryption with AUTH_SECRET

## [0.1.0] - Previous Release

### Added

- Initial release with HD Homerun tuner management
- Channel lineup discovery and streaming
- Proxy functionality for remote access
- Docker deployment support
