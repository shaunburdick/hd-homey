# Feature Specification: Enhanced Build Identification

**Feature Branch**: `013-build-identification`  
**Created**: 2025-12-06  
**Status**: Draft  

## Problem Statement

Currently, HD Homey displays only the semantic version (e.g., "1.0.0-beta.5") on the About page. This creates ambiguity when:

1. **Development deployments** using `latest` Docker tag may have different commits but show the same version
2. **Multiple commits** exist between version bumps, making it unclear which exact build is deployed
3. **Troubleshooting** becomes difficult when users report issues without knowing the exact commit
4. **Testing** multiple pre-release builds is confusing when they all show the same version

Users need to know the **exact build** they're running, not just the semantic version.

## User Scenarios & Testing

### User Story 1 - Production Build Identification (Priority: P1)

**As a** system administrator deploying HD Homey to production  
**I want** to see the semantic version AND the short commit SHA (e.g., "1.0.0-beta.5 (1ce5e97)")  
**So that** I can identify the exact build deployed and correlate it with Git history when troubleshooting issues

**Why this priority**: Critical for production deployments where multiple commits may exist between version tags. Enables precise identification of deployed code for debugging and support.

**Independent Test**: Can be fully tested by building a Docker image and checking the About page displays version with commit SHA.

**Acceptance Scenarios**:

1. **Given** a production build created from commit `1ce5e97`  
   **When** I navigate to the About page  
   **Then** I see "Version 1.0.0-beta.5 (1ce5e97)"

2. **Given** a production build with no Git metadata available  
   **When** I navigate to the About page  
   **Then** I see "Version 1.0.0-beta.5 (unknown)" as graceful fallback

3. **Given** I want to report a bug  
   **When** I provide the version from the About page  
   **Then** maintainers can identify the exact commit and changes included

---

### User Story 2 - Development Build Identification (Priority: P2)

**As a** developer running HD Homey locally  
**I want** to see the current branch name and short commit SHA (e.g., "1.0.0-beta.5 (013-build-identification@a1b2c3d)")  
**So that** I can confirm which branch and commit I'm testing

**Why this priority**: Important for development workflow to avoid confusion when switching branches or testing different features. Lower priority than production since developers have direct Git access.

**Independent Test**: Can be fully tested by running `npm run dev` and checking the About page displays branch name with commit SHA.

**Acceptance Scenarios**:

1. **Given** I'm running `npm run dev` on branch `013-build-identification` at commit `a1b2c3d`  
   **When** I navigate to the About page  
   **Then** I see "Version 1.0.0-beta.5 (013-build-identification@a1b2c3d)"

2. **Given** I'm running on `main` branch at commit `1ce5e97`  
   **When** I navigate to the About page  
   **Then** I see "Version 1.0.0-beta.5 (main@1ce5e97)"

3. **Given** Git metadata is unavailable in development  
   **When** I navigate to the About page  
   **Then** I see "Version 1.0.0-beta.5 (dev-unknown)" as graceful fallback

---

### User Story 3 - Health Check with Version (Priority: P3)

**As a** system integrator or monitoring tool  
**I want** the existing `/api/health` endpoint to include version metadata  
**So that** I can programmatically verify deployed versions and automate health checks in a single request

**Why this priority**: Nice to have for automation and monitoring but not critical for manual operations. Most use cases are covered by the UI display.

**Independent Test**: Can be fully tested by making a GET request to `/api/health` and validating the JSON response includes version metadata.

**Acceptance Scenarios**:

1. **Given** a production build at commit `1ce5e97`  
   **When** I GET `/api/health`  
   **Then** I receive JSON: `{"status": "ok", "timestamp": "...", "version": {"version": "1.0.0-beta.5", "commit": "1ce5e97", "branch": null, "buildDate": "2024-12-06T10:30:00Z", "environment": "production"}}`

2. **Given** a development build on branch `013-build-identification` at commit `a1b2c3d`  
   **When** I GET `/api/health`  
   **Then** I receive JSON with version object including branch name and development environment

3. **Given** monitoring tools need to check health and version  
   **When** they poll `/api/health` every 5 minutes  
   **Then** they receive both health status and version data in a single request

---

### Edge Cases

- **Git not available**: Gracefully fallback to "unknown" for commit/branch
- **Detached HEAD state**: Show commit SHA only, no branch name
- **Shallow clone**: Show available commit SHA even if full history is missing
- **Build during CI/CD**: Ensure CI environment variables are properly passed to build
- **Docker builds**: Verify Git metadata is available during Docker image build (before `.git` is excluded)
- **Modified working tree**: Append `-dirty` suffix if uncommitted changes exist (development only)

## Requirements

### Functional Requirements

- **FR-001**: System MUST display semantic version with short commit SHA in all UI locations (About page, Footer, startup log) in production builds (format: "VERSION (COMMIT)")
- **FR-002**: System MUST display semantic version with branch name and short commit SHA in all UI locations in development builds (format: "VERSION (BRANCH@COMMIT)")
- **FR-003**: System MUST append `-dirty` suffix to commit SHA when uncommitted changes exist in development
- **FR-004**: System MUST gracefully handle missing Git metadata by displaying appropriate fallback values ("unknown")
- **FR-005**: System MUST generate version metadata during build process (not at runtime)
- **FR-006**: System MUST include version metadata in existing `/api/health` endpoint response
- **FR-007**: System MUST include build timestamp in version metadata
- **FR-008**: System MUST use short commit SHA (7 characters) for readability
- **FR-009**: System MUST NOT break existing version display functionality
- **FR-010**: Footer version display MUST be responsive (full version on desktop, split to separate line on mobile)

### Non-Functional Requirements

- **NFR-001**: Version metadata generation must complete in under 5 seconds during build
- **NFR-002**: Health endpoint with version data must respond in under 100ms
- **NFR-003**: Git operations must not fail build if Git is unavailable
- **NFR-004**: Solution must work in Docker builds, local development, and CI/CD environments

### Key Entities

- **BuildMetadata**: Represents complete build information
  - `version`: Semantic version from package.json (e.g., "1.0.0-beta.5")
  - `commit`: Short commit SHA (7 chars, e.g., "1ce5e97")
  - `branch`: Branch name (e.g., "013-build-identification", null in production)
  - `buildDate`: ISO 8601 timestamp of build
  - `environment`: "production" or "development"

## Success Criteria

### Measurable Outcomes

- **SC-001**: Developers can identify exact commit of deployed build within 5 seconds by viewing About page
- **SC-002**: Support team can correlate user-reported versions to specific Git commits 100% of the time
- **SC-003**: Build process succeeds even when Git metadata is unavailable (graceful degradation)
- **SC-004**: Health endpoint with version data can be polled by monitoring tools without performance impact
- **SC-005**: Solution works correctly in all deployment environments (local dev, Docker, CI/CD)

## Technical Constraints

- Must maintain backward compatibility with existing `getVersion()` function
- Must work with Next.js 16 App Router and Edge Runtime
- Must not introduce new runtime dependencies
- Must use only Git commands available in standard Git installations
- Must work with Node.js 22+ (current project requirement)

## Out of Scope

- Displaying full commit SHA (use short SHA for readability)
- Showing commit message or author information
- Displaying uncommitted changes in production builds
- Creating a separate version history page
- Showing version differences between builds
- Auto-updating version display without page refresh

## Design Decisions

1. **Dirty suffix**: ✅ Include `-dirty` suffix for uncommitted changes in development
2. **API endpoint**: ✅ Add version metadata to existing `/api/health` endpoint (not a separate endpoint)
3. **UI display locations**: ✅ Update Footer, About page, and add to startup log
4. **Footer layout**: ✅ Full version on desktop, split to separate line on mobile
5. **Startup log format**: ✅ Simple one-liner: `HD Homey v1.0.0-beta.5 (branch@commit) starting...`
6. **Tooltips**: ✅ Keep it simple - no explanatory tooltips or help text

## Implementation Notes

This is a planning document. Implementation approach will be determined during the Planning phase (Phase 4).

Considerations for planning:
- Modify `scripts/generate-version.mjs` to extract Git metadata using `child_process.execSync()`
- Update `version.json` schema to include `commit`, `branch`, `environment`
- Update `src/lib/version.ts` to return formatted version strings
- Update `/api/health` endpoint to include version metadata in response
- Update About page to display enhanced version information
- Update Footer component with responsive version display
- Add version to startup log in `instrumentation-node.ts`
- Add tests for version formatting and Git metadata extraction
- Document new version format in user-facing documentation
