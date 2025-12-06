# Implementation Plan: Enhanced Build Identification

**Branch**: `013-build-identification` | **Date**: 2025-12-06 | **Spec**: [spec.md](./spec.md)

## Summary

Enhance version display to show commit SHA in production builds and branch@commit in development builds. This enables precise identification of deployed code for troubleshooting and eliminates ambiguity when multiple commits exist between version bumps.

**Technical Approach**: Extend the existing `scripts/generate-version.mjs` to capture Git metadata (commit SHA, branch name) during build time and store it in `version.json`. Update the version display logic to format version strings appropriately for production vs development environments. Add a public API endpoint for programmatic access.

## Technical Context

**Language/Version**: TypeScript 5 / Node.js 22+  
**Primary Dependencies**: None (uses Node.js built-ins: `child_process`, `fs`, `path`)  
**Storage**: File-based (`version.json` generated at build time)  
**Testing**: Vitest with mocks for `child_process.execSync()`  
**Target Platform**: Next.js 16 App Router (Edge + Node.js runtimes)  
**Project Type**: Web (Next.js full-stack)  
**Performance Goals**: 
- Build-time Git operations: < 2 seconds
- Version API response: < 100ms
- UI rendering impact: negligible (static data)

**Constraints**: 
- Must work in environments without Git (graceful fallback)
- Must not break Docker builds
- Must maintain backward compatibility with existing `getVersion()`
- Must work on Edge Runtime (no Node.js APIs at request time)

**Scale/Scope**: 
- Single feature touching 5 files
- ~200 lines of new code
- 8-12 new test cases
- No database changes

## Constitution Check

✅ **Code Quality**: Adding comprehensive tests for Git metadata extraction and version formatting  
✅ **Documentation**: Will update About page display and add API endpoint docs  
✅ **Security**: Git operations are build-time only, no runtime security implications  
✅ **Testing**: Full test coverage for version logic and edge cases  
✅ **Dependencies**: Zero new dependencies (uses Node.js built-ins)  
✅ **Maintainability**: Simple, well-documented code with clear separation of concerns  

**No violations identified** - this feature aligns with all constitution principles.

## Project Structure

### Documentation (this feature)

```text
specs/013-build-identification/
├── plan.md              # This file
├── research.md          # Git command research and version format decisions
├── quickstart.md        # Manual testing scenarios
└── tasks.md             # Implementation task breakdown (created after planning)
```

### Source Code (existing Next.js structure)

```text
scripts/
├── generate-version.mjs     # [MODIFY] Add Git metadata extraction

src/
├── lib/
│   ├── version.ts           # [MODIFY] Add formatting logic for dev/prod
│   └── version.test.ts      # [MODIFY] Add tests for new formatting
│
├── components/
│   ├── Footer.tsx           # [MODIFY] Update version display with responsive layout
│   └── Footer.module.css    # [MODIFY] Add responsive styles for version
│
├── instrumentation-node.ts  # [MODIFY] Add version to startup log
│
└── app/
    ├── (protected)/
    │   └── about/
    │       └── page.tsx     # [MODIFY] Update version display
    │
    └── api/
        └── health/
            ├── route.ts     # [MODIFY] Add version metadata to response
            └── route.test.ts # [MODIFY] Add tests for version in response

version.json                 # [GENERATED] Enhanced with commit/branch data
```

**Structure Decision**: Leverage existing build script, version infrastructure, and health endpoint. Minimal changes to existing code. No new files or directories needed. All changes are backwards-compatible extensions.

## Architecture Decisions

### 1. Build-Time vs Runtime Git Detection

**Decision**: Extract Git metadata at build time, not runtime.

**Rationale**:
- Docker images don't include `.git` directory (excluded by `.dockerignore`)
- Edge Runtime can't execute shell commands
- Avoids performance overhead on every request
- Simplifies deployment (no Git required on production servers)

**Implementation**: Enhance `scripts/generate-version.mjs` to run Git commands via `child_process.execSync()` before Next.js build.

### 2. Version String Format

**Decision**: Use different formats for dev vs production:
- **Production**: `VERSION (COMMIT)` → e.g., "1.0.0-beta.5 (1ce5e97)"
- **Development**: `VERSION (BRANCH@COMMIT)` → e.g., "1.0.0-beta.5 (013-build-identification@a1b2c3d)"

**Rationale**:
- Production users care about commit SHA for troubleshooting
- Developers need branch context when switching between features
- Short SHA (7 chars) balances uniqueness with readability
- Format is grep-friendly and copy-paste friendly

### 3. Graceful Fallback Strategy

**Decision**: Never fail the build, always provide fallback values.

**Fallback values**:
- No Git: `commit: "unknown"`, `branch: null`
- Detached HEAD: `commit: "<sha>"`, `branch: null`
- Development without Git: `commit: "dev-unknown"`, `branch: "local"`

**Rationale**:
- CI/CD systems may use shallow clones
- Local builds might not have Git installed
- Docker builds might lose Git context
- Users should always get a working app

### 4. Environment Detection

**Decision**: Detect environment based on `NODE_ENV` and presence of branch name.

Logic:
```
if (branch && branch !== 'main' && branch !== 'master') {
  environment = 'development'
  showBranch = true
} else if (NODE_ENV === 'production') {
  environment = 'production'
  showBranch = false
} else {
  environment = 'development'
  showBranch = false (on main/master in dev)
}
```

**Rationale**:
- Feature branches always indicate development
- Main/master can be dev (local) or prod (deployed)
- `NODE_ENV` is the canonical Next.js environment indicator

### 5. Health Endpoint Enhancement

**Decision**: Add version metadata to existing `/api/health` endpoint instead of creating separate `/api/version`.

**Rationale**:
- Reduces implementation scope (modify existing vs create new)
- Consolidates health check and version info in one request
- Maintains existing public access pattern (health is already public)
- Standard practice to include version in health checks
- Monitoring tools get both status and version in single call

**Response format**:
```json
{
  "status": "ok",
  "timestamp": "2024-12-06T15:30:45.123Z",
  "version": {
    "version": "1.0.0-beta.5",
    "commit": "1ce5e97",
    "branch": null,
    "buildDate": "2024-12-06T10:00:00.000Z",
    "environment": "production"
  }
}
```

### 6. UI Display Locations

**Decision**: Update version display in three locations:
1. **About page** - Full version with commit SHA
2. **Footer** - Responsive layout (full on desktop, split line on mobile)
3. **Startup log** - Simple one-liner format

**Rationale**:
- About page: Primary location for detailed version info
- Footer: Always visible, helps identify version without navigation
- Startup log: Useful for developers and troubleshooting server logs

**Footer responsive behavior**:
- **Desktop**: `Made by Shaun Burdick • AGPL-3.0 • Docs • v1.0.0-beta.5 (branch@commit)`
- **Mobile**: All links on first line, version on separate second line

**Startup log format**: `HD Homey v1.0.0-beta.5 (branch@commit) starting...`

### 7. Dirty State Detection

**Decision**: Append `-dirty` suffix to commit SHA when uncommitted changes exist in development.

**Rationale**:
- Helps distinguish committed code from work-in-progress
- Prevents confusion when testing local modifications
- Only applies to development (production should never be dirty)
- Simple implementation using `git status --porcelain`

**Example**: `1.0.0-beta.5 (013-build-identification@a1b2c3d-dirty)`

## Phase 0: Research

**Objective**: Determine optimal Git commands, test in various environments, and validate format choices.

**Key Research Questions**:
1. What Git commands provide commit SHA and branch name reliably?
2. How do Git commands behave in shallow clones, detached HEAD, CI/CD?
3. What error handling is needed for missing Git or corrupted repos?
4. How should version strings be formatted for optimal readability?

**Deliverable**: `research.md` documenting:
- Git commands tested and their outputs
- Edge case behavior (shallow clone, detached HEAD, no Git)
- Environment variable considerations (CI/CD)
- Version format examples and user feedback
- Alternative approaches considered and rejected

## Phase 1: Data Model & Contracts

### Data Model (`data-model.md`)

**BuildMetadata Entity**:
```typescript
interface BuildMetadata {
  version: string;        // From package.json (e.g., "1.0.0-beta.5")
  commit: string;         // Short SHA or "unknown" (e.g., "1ce5e97")
  branch: string | null;  // Branch name or null (e.g., "013-build-identification")
  buildDate: string;      // ISO 8601 timestamp (e.g., "2024-12-06T10:30:00.000Z")
  environment: 'production' | 'development';
}
```

**Relationships**: None (standalone entity, no database)

**Validation Rules**:
- `version` must match semver pattern (delegated to package.json)
- `commit` must be 7-40 characters or "unknown"/"dev-unknown"
- `branch` must be valid Git branch name or null
- `buildDate` must be valid ISO 8601 timestamp
- `environment` must be "production" or "development"

### API Contracts

**GET /api/health** (Enhanced)

Request: None (public endpoint)

Response (200 OK):
```json
{
  "status": "ok",
  "timestamp": "2024-12-06T15:30:45.123Z",
  "version": {
    "version": "1.0.0-beta.5",
    "commit": "1ce5e97",
    "branch": "013-build-identification",
    "buildDate": "2024-12-06T10:00:00.000Z",
    "environment": "development"
  }
}
```

Response (500 Internal Server Error) - if version read fails:
```json
{
  "status": "error",
  "timestamp": "2024-12-06T15:30:45.123Z",
  "error": "Failed to initialize"
}
```

Note: Version read failure should not prevent health check from returning 200 OK. Health endpoint should remain reliable.

**Version String Formats**:

Production format:
```
{version} ({commit})
Example: 1.0.0-beta.5 (1ce5e97)
```

Development format (with branch):
```
{version} ({branch}@{commit})
Example: 1.0.0-beta.5 (013-build-identification@a1b2c3d)
```

Development format (main/master):
```
{version} ({commit})
Example: 1.0.0-beta.5 (1ce5e97)
```

Dirty development format:
```
{version} ({branch}@{commit}-dirty)
Example: 1.0.0-beta.5 (013-build-identification@a1b2c3d-dirty)
```

Fallback format (no Git):
```
{version} (unknown)
Example: 1.0.0-beta.5 (unknown)
```

### Quickstart Validation (`quickstart.md`)

**Scenario 1: Production Build**
```bash
# Build Docker image
docker build -t hd-homey:test .
docker run -p 3000:3000 hd-homey:test

# Verify version display
# Navigate to http://localhost:3000/about
# Expected: "Version 1.0.0-beta.5 (1ce5e97)"

# Verify health endpoint includes version
curl http://localhost:3000/api/health | jq
# Expected: {"status":"ok","timestamp":"...","version":{"version":"1.0.0-beta.5","commit":"1ce5e97",...}}
```

**Scenario 2: Development Build**
```bash
# Start dev server on feature branch
git checkout 013-build-identification
npm run dev

# Verify version display
# Navigate to http://localhost:3000/about
# Expected: "Version 1.0.0-beta.5 (013-build-identification@a1b2c3d)"

# Verify health endpoint includes version
curl http://localhost:3000/api/health | jq
# Expected: {"status":"ok","timestamp":"...","version":{"commit":"a1b2c3d","branch":"013-build-identification",...}}
```

**Scenario 3: No Git Available**
```bash
# Simulate missing Git
mv .git .git.backup
npm run build
npm start

# Verify graceful fallback
# Navigate to http://localhost:3000/about
# Expected: "Version 1.0.0-beta.5 (unknown)"

# Restore Git
mv .git.backup .git
```

## Phase 2: Tasking Preparation

**Note**: Detailed task breakdown will be created in `tasks.md` after this plan is approved.

**High-Level Task Groups**:
1. **Research & Validation** (Phase 0)
   - Test Git commands in various environments
   - Validate version format choices
   - Document edge cases

2. **Build Script Enhancement** (Phase 1)
   - Modify `scripts/generate-version.mjs` to extract Git metadata
   - Add error handling and fallbacks
   - Update version.json schema

3. **Version Library Updates** (Phase 1)
   - Add formatting functions to `src/lib/version.ts`
   - Add environment detection logic
   - Add tests for all version formats

4. **UI Updates** (Phase 1)
   - Update About page to display enhanced version
   - Update Footer component with responsive version display
   - Add responsive CSS for mobile layout
   - Add version to startup log in `instrumentation-node.ts`

5. **Health Endpoint Enhancement** (Phase 1)
   - Modify `/api/health` route handler to include version metadata
   - Update tests for enhanced health response
   - Ensure backward compatibility (health check still returns 200 even if version fails)

6. **Testing & Documentation** (Phase 1)
   - Add unit tests for Git extraction
   - Add integration tests for health endpoint with version
   - Update user documentation
   - Add troubleshooting guide

7. **Validation & Release** (Phase 2)
   - Run quickstart scenarios
   - Test in Docker
   - Test in development
   - Verify all edge cases

## Implementation Order

**Priority Order** (based on spec user story priorities):
1. **P1**: Production build identification (FR-001, FR-004, FR-005, FR-008)
2. **P2**: Development build identification (FR-002, FR-003, FR-004, FR-008)
3. **P3**: Health endpoint enhancement (FR-006, FR-007)

**Dependency Order**:
1. Research Git commands and formats (prerequisite for all)
2. Enhance build script (prerequisite for library and UI)
3. Update version library (prerequisite for UI and health endpoint)
4. Update UI (About, Footer, startup log) and enhance health endpoint (parallel, independent)
5. Testing and documentation (final)

## Risk Mitigation

| Risk | Impact | Mitigation |
|------|--------|-----------|
| Git not available in CI/CD | Build fails | Graceful fallback, never fail build |
| Shallow clone missing commit info | Wrong commit shown | Use `git rev-parse HEAD` (works in shallow) |
| Docker build excludes .git | No Git metadata | Run Git extraction before build, store in version.json |
| Long branch names break UI | Layout issues | Responsive CSS, split to two lines on mobile |
| Health endpoint overhead | Slower responses | Version data cached in memory, minimal overhead |

## Resolved Design Questions

1. **Git dirty state**: ✅ **DECIDED** - Append `-dirty` suffix for uncommitted changes in development only
2. **Version endpoint**: ✅ **DECIDED** - Add to existing `/api/health` endpoint (not separate `/api/version`)
3. **UI display locations**: ✅ **DECIDED** - Update About page, Footer, and startup log
4. **Footer layout**: ✅ **DECIDED** - Full version on desktop, split to separate line on mobile
5. **Startup log format**: ✅ **DECIDED** - Simple one-liner: `HD Homey v1.0.0-beta.5 (branch@commit) starting...`
6. **Tooltips**: ✅ **DECIDED** - No tooltips or help text (keep it simple)

## Open Implementation Details

1. **Build date timezone**: Should we use UTC or local timezone in build timestamp?
   - Recommendation: Always use UTC (ISO 8601 with 'Z' suffix) for consistency

2. **Branch name handling**: Long branch names in Footer - responsive split handles this, no truncation needed

## Success Metrics

**Implementation Complete When**:
- ✅ All tests pass (unit + integration)
- ✅ Build succeeds with and without Git
- ✅ Version displays correctly in dev and prod
- ✅ Health endpoint returns correct JSON with version data
- ✅ Documentation updated
- ✅ All quickstart scenarios validated
- ✅ No regressions in existing version functionality

**Quality Gates**:
- Test coverage: 100% for new code (version formatting, Git extraction)
- Linting: No new violations
- Build time: No increase > 2 seconds
- Type safety: No `any` types without justification

## Next Steps

1. **Approve this plan** or request clarifications
2. **Run Phase 0 research** - Document Git command behavior
3. **Create `tasks.md`** - Break down into actionable tasks
4. **Begin implementation** - Execute tasks in priority order
5. **Validate & document** - Run quickstart scenarios and update docs
