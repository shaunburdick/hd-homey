# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- **Enhanced Build Identification (SPEC-013)**: Version display now includes commit SHA and build metadata for improved debugging and monitoring
  - Version format: `VERSION (COMMIT)` in production, `VERSION (BRANCH@COMMIT)` in development feature branches
  - `-dirty` suffix indicates uncommitted changes (development only)
  - Version displayed in About page, footer (responsive layout), and startup log
  - `/api/health` endpoint now includes complete version metadata (version, commit, branch, buildDate, environment)
  - Build script automatically captures Git metadata during build time
  - Footer layout responsive: version splits to separate line on mobile (≤640px)

## [1.0.0-beta.5] - 2024-12-04

### Added

- **Channel Favorites (SPEC-012)**: Users can now favorite and hide channels for personalized channel organization
  - Favorite button (★) to mark frequently watched channels
  - Hide button (✕) to remove unwanted channels from view
  - Channels automatically organized into Favorites/Channels/Hidden sections
  - Intelligent state management: favoriting auto-unhides, hiding auto-unfavorites
  - Per-user preferences stored in database
  - Optimistic UI updates for instant feedback
  - Full accessibility support with ARIA labels
  - All channels sorted numerically by guide number
- **Channel Section State Persistence**: Channel section expand/collapse states now persist across page reloads
  - Per-tuner state isolation (each tuner remembers its own section states)
  - Independent state for Favorites, Channels, and Hidden sections
  - Uses browser localStorage for persistence

## [1.0.0-beta.4] - 2025-11-30

### Added

- **Documentation Site**: Comprehensive VitePress-based documentation site deployed to GitHub Pages
  - Full installation and configuration guides
  - Feature documentation for all major capabilities
  - API reference and troubleshooting guides
  - Deployed at https://shaunburdick.github.io/hd-homey/
- **User Invitations (SPEC-010)**: Admins can now invite users via secure invitation links
  - Generate time-limited invitation tokens with configurable expiry
  - Support for admin and viewer role invitations
  - Invitation management UI in settings
  - Automatic cleanup of expired invitations
- **Enhanced Video Player**: Improved loading states and error handling
  - Smooth skeleton loading animation
  - Better error messages and recovery
  - Visual feedback during stream initialization
- **AC4 Audio Codec Support**: Added support for AC4 audio transcoding
  - Better audio compatibility across devices
  - Improved error reporting for unsupported codecs
- **Mobile UI Enhancements**: Added logo and app name to mobile navigation bar
  - Improved branding on smaller screens
  - Better visual consistency across devices

### Changed

- **Documentation Links**: App footer and About page now link to comprehensive documentation site instead of GitHub
  - Footer shows "Docs" link to documentation site
  - About page prioritizes Documentation link over GitHub
- **Environment Variables**: Updated all documentation to reflect optional configuration with auto-detection
  - `HD_HOMEY_PROXY_HOST` now optional (auto-detects from request headers)
  - `HD_HOMEY_DB_PATH` now accepts full file path instead of directory
  - Added `HD_HOMEY_TRANSCODE_DIR`, `FFMPEG_PATH`, and `BETTER_AUTH_URL` with auto-detection
- **Profile Page**: Display username instead of email for better UX

### Fixed

- **Transcoding Cleanup**: Prevent FFmpeg race condition during session cleanup
  - Fixed process termination timing issues
  - More reliable cleanup of transcoding resources
- **Stream Secret Caching**: Optimized Docker deployment with proper secret caching
  - Reduced database queries for stream token validation
  - Improved streaming performance

### Documentation

- Updated AGENTS.md with VitePress config version update instructions
- Updated all environment variable documentation to match current .env-example
- Added auto-detection guidance for configuration
- Added troubleshooting for common setup issues

## [1.0.0-beta.3] - 2025-11-29

### Changed

- **Authentication Library Migration**: Migrated from NextAuth.js v5 (beta) to Better-Auth v1.1.0
  - Replaced NextAuth with Better-Auth for improved stability and TypeScript support
  - Maintains same security model: JWT/stateless sessions, Edge Runtime compatible
  - **Breaking Change**: Password hashing changed from bcrypt to scrypt (Better-Auth default)
  - Users created before this version will need their passwords reset by admin
  - All 203 tests passing with new authentication system
- **Database Migrations**: Consolidated all migrations into single initial migration (`0000_large_microchip.sql`)
  - Simplified migration history for beta release
  - Clean slate approach for beta users
  - **Breaking Change**: Assumes fresh install - existing databases should be backed up and recreated
- **Database Schema**: Consolidated duplicate schema files into single source of truth
  - Removed redundant `better-auth-schema.ts` (Better-Auth tables now in main `schema.ts`)
  - Better-Auth adapter and Drizzle migrations now use same schema file
  - Removed backup schema files from migration process

### Fixed

- **Build Process**: Fixed Next.js build errors in CI environments without pre-existing database
  - Database directory is now automatically created if it doesn't exist
  - Added `dynamic='force-dynamic'` exports to prevent unnecessary page pre-rendering
  - Fixes: `TypeError: Cannot open database because the directory does not exist`

### Removed

- Removed `bcrypt` and `@types/bcrypt` dependencies (replaced with Better-Auth's built-in scrypt)
- Removed incremental database migrations (consolidated into single initial migration)
- Removed `better-auth-schema.ts` (consolidated into `schema.ts`)

## [1.0.0-beta.2] - 2025-11-28

**Note**: This is a **critical security release** that fixes a vulnerability where API endpoints were completely unprotected. All users should upgrade immediately.

### Security

- **CRITICAL: API Route Authentication**: Fixed vulnerability where API endpoints were accessible without authentication
  - Added proxy-level authentication for all protected routes (`src/proxy.ts`)
  - API routes now require valid NextAuth session
  - Unauthenticated requests to API routes return 401 with JSON error
  - Unauthenticated requests to pages redirect to sign-in with callback URL
  - Token-authenticated routes (streaming) properly bypass proxy and validate tokens in handlers
  - Admin-only operations (tuner modifications) require explicit `isAdmin` check
  - Defense-in-depth: Both proxy and route handlers verify permissions
  - Proxy runs on Edge Runtime using NextAuth v5 JWT sessions (no database access needed)

### Added

- **Comprehensive Authentication Tests**: 19 new proxy tests covering all route types
  - Public routes (signin, get-started, NextAuth API)
  - Token-authenticated routes (streaming endpoints)
  - Session-authenticated routes (API and pages)
  - Admin-only operations
  - Protected route coverage (tuners, settings, users, profile, about)
  - Total test count increased from 154 to 200 tests

### Fixed

- **Tuner Poll Endpoint**: Now requires authentication (prevents abuse of resource-intensive channel scans)
- **Tuner Update Endpoint**: Now requires admin role (prevents unauthorized tuner modifications)

## [1.0.0-beta.1] - 2025-11-20

**Note**: This is the first beta release! All core features are now complete and tested. Beta releases focus on stability, bug fixes, and user feedback before moving to release candidate status.

### Added

- **User Profile Page**: New `/profile` page accessible to all authenticated users
  - View account information (username, display name, role, account creation date)
  - Change password functionality with validation
  - Profile menu item added to navigation for all users
- **Password Change**: Secure password management for all users
  - Requires current password verification
  - Enforces 8 character minimum for new passwords
  - Confirmation password validation
  - Users can only change their own password
  - Success message displayed after password change
- **Settings Database Optimization**: Batch operations for settings
  - New `getSetting()` function for retrieving multiple settings at once
  - New `updateSettings()` function for batch updates
  - Reduces database queries from N to 1 for settings operations
- **Comprehensive Test Coverage**: 154 tests total (was 147)
  - 7 new tests for profile password change functionality
  - Tests cover validation, security, and success scenarios

### Changed

- **Navigation Layout**: Improved menu item spacing
  - Changed from `space-between` to `flex-start` with gap spacing
  - Better accommodates additional menu items without wrapping
  - Sign Out button pushed to the right with auto margin
- **Settings Page Access**: Now admin-only with proper navigation hiding
  - Settings menu item hidden from viewer role
  - Viewers see Profile menu item instead
  - Better UX - users don't see options they can't access
- **Channel Queries**: Inactive channels now filtered at database query level
  - More efficient than client-side filtering
  - Consistent behavior across all channel listings

### Fixed

- **Settings Page Refresh**: Transcoding settings now update immediately after save
  - Added `router.refresh()` after successful save
  - No need to manually refresh page to see updated values
- **Transcoding Settings Form**: Fixed React useActionState transition warning
  - Wrapped formAction call in `startTransition`
  - Proper async handling with redirect error detection
- **UI Consistency**: Fixed text color issues across multiple components
  - Active sessions action buttons now have proper contrast
  - Stop confirmation dialog text and buttons use design tokens
  - Error displays use proper text colors
- **Quick Start Documentation**: Improved setup instructions
  - Now downloads and uses `.env-example` file
  - Auto-generates secure AUTH_SECRET
  - NEXTAUTH_URL marked as optional (auto-detected)
  - More user-friendly workflow
- **CI/CD TypeCheck**: Fixed TypeScript path resolution in GitHub Actions
  - Added `next typegen` step before typecheck
  - Generates required type definitions for proper module resolution
  - `@public/*` path alias now works in CI environment
- **Cursor Indicators**: All clickable cards now show pointer cursor
  - Fixed on tuner cards, channel cards, and user cards
  - Better UX showing interactive elements
- **Account Information Display**: Profile page now uses InfoCard component
  - Consistent styling with other info cards throughout the app
  - Professional presentation of user information

## [1.0.0-alpha.9] - 2025-11-19

**Note**: This patch adds image file type declarations for TypeScript compilation.

### Fixed

- **TypeScript Types**: Added type declarations for image files (webp, png, jpg, svg) to resolve import errors

## [1.0.0-alpha.8] - 2025-11-19

**Note**: This patch fixes TypeScript compilation in CI/CD by including public folder in tsconfig.

### Fixed

- **TypeScript Config**: Added `public/**/*` to tsconfig include to resolve @public/* path imports in CI/CD

## [1.0.0-alpha.7] - 2025-11-19

**Note**: This patch fixes test failures in CI/CD by excluding build artifacts from test discovery.

### Fixed

- **Test Discovery**: Vitest now excludes `.next/**` build directory to prevent import errors in CI/CD
- **Release Process**: Updated release instructions in AGENTS.md with pre-release validation steps

## [1.0.0-alpha.6] - 2025-11-19

**Note**: This release focuses on comprehensive tuner management improvements including connection validation, automatic channel scanning, inactive tuner enforcement, and soft-delete functionality.

### Added

- **Tuner Connection Validation**: Test button on tuner forms to validate HDHomeRun connectivity before saving
  - Validates tuner path points to a valid HDHomeRun device
  - Shows channel count on successful connection
  - Provides clear error messages for common connection issues (timeout, invalid URL, device unreachable)
  - Works on both new tuner and edit tuner forms
  - Non-blocking: allows saving even if test fails
  - Visible loading indicator during test with blue info box
- **Automatic Channel Scan**: New tuners automatically scan for channels on creation
  - No need to manually refresh channels after adding a tuner
  - Channels are available immediately on the tuner detail page
  - Gracefully handles scan errors without failing tuner creation
- **Tuner Deletion**: Ability to soft-delete tuners from the edit page
  - Confirmation dialog prevents accidental deletion
  - Soft delete preserves data (sets deleted_at timestamp)
  - Automatically soft-deletes all channels belonging to the tuner
  - Deleted tuners hidden from all tuner lists
  - "Danger Zone" section with clear warnings
  - Comprehensive unit tests (7 test cases)

### Fixed

- **Inactive Tuner Enforcement**: Inactive tuners are now properly blocked from streaming
  - Direct stream requests return 403 Forbidden
  - Transcoding playlist requests return 403 Forbidden
  - Inactive status clearly shown on tuners list page with visual indicators
  - Inactive tuners displayed with reduced opacity and "Inactive" badge
  - Tuner detail page shows prominent inactive warning with explanation

## [1.0.0-alpha.5] - 2025-11-19

**Note**: This release updates all dependencies to latest versions including React 19 and Next.js 16, resolves all code quality issues, and optimizes CI/CD workflows.

### Changed

- **Dependencies**: Updated all npm dependencies to latest versions
  - React 18.3.1 → 19.2.0 (major)
  - Next.js 15.1.6 → 16.0.3 (major)
  - bcrypt 5.1.1 → 6.0.0 (major)
  - better-sqlite3 11.8.1 → 12.4.1 (major)
  - next-auth 5.0.0-beta.25 → 5.0.0-beta.30 (beta)
  - All type definitions updated to match
  - eslint-config-next updated to 16.0.3

- **Framework Migrations**: Migrated to Next.js 16 conventions
  - Renamed `middleware.ts` → `proxy.ts` (Next.js 16 convention)
  - Separated viewport configuration from metadata export
  - Converted `<img>` tags to Next.js `<Image>` component

- **ESLint Configuration**: Added Next.js ESLint plugin with recommended and core-web-vitals rules

- **Code Quality**: Fixed all ESLint errors (223 → 0)
  - Refactored React setState-in-effect patterns
  - Fixed accessibility issues
  - Eliminated duplicate string literals
  - Improved null/undefined checks
  - Reduced cognitive complexity
  - Added proper viewport configuration

- **CI/CD**: Simplified Docker workflow
  - Removed ARM64 build (emulation too slow)
  - Build time reduced from ~60 minutes to ~5 minutes
  - Docker images now linux/amd64 only

### Fixed

- **Authentication**: Fixed logout redirect to 0.0.0.0 issue
- **Session Validation**: Fixed null user edge case handling
- **Tests**: Added missing test constants

### Added

- **UX**: Added autofocus to username field on sign-in page

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
