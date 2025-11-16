# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

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
