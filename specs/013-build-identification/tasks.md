# Implementation Tasks: Enhanced Build Identification (SPEC-013)

**Branch**: `013-build-identification`  
**Created**: 2025-12-06  
**Status**: Ready for Implementation

## Task Overview

This document breaks down the implementation of enhanced build identification into ordered, actionable tasks. Tasks marked with `[P]` can be executed in parallel with other `[P]` tasks.

**Total Estimated Tasks**: 22  
**Estimated Effort**: 6-8 hours

---

## Phase 1: Build Script Enhancement (Core Foundation)

### Task 1.1: Extract Git Metadata Function
**Priority**: P1 - Critical Path  
**Effort**: 1 hour  
**Dependencies**: None

**Objective**: Add Git metadata extraction to `scripts/generate-version.mjs`

**Implementation**:
1. Add `child_process` import to generate-version.mjs
2. Create `getGitMetadata()` function that:
   - Executes `git rev-parse --short=7 HEAD` for commit SHA
   - Executes `git rev-parse --abbrev-ref HEAD` for branch name
   - Filters "HEAD" response to `null` (detached HEAD detection)
   - Wraps in try/catch for graceful fallback to "unknown"
   - Suppresses stderr with `stdio: ['pipe', 'pipe', 'pipe']`
3. Add dirty state detection (development only):
   - Execute `git status --porcelain`
   - Append `-dirty` to commit if output is non-empty
   - Only run if `process.env.NODE_ENV !== 'production'`

**Acceptance Criteria**:
- ✅ Function returns `{ commit: string, branch: string | null }`
- ✅ Gracefully handles missing Git (returns "unknown")
- ✅ Detects detached HEAD (returns null for branch)
- ✅ Detects dirty working tree in development only
- ✅ Never throws uncaught errors

**Test Scenarios**:
- Git available: Returns valid commit and branch
- Git missing: Returns "unknown" and null
- Detached HEAD: Returns commit with null branch
- Dirty working tree (dev): Returns commit with `-dirty` suffix
- Dirty working tree (prod): No `-dirty` suffix

---

### Task 1.2: Update version.json Schema
**Priority**: P1 - Critical Path  
**Effort**: 30 minutes  
**Dependencies**: Task 1.1

**Objective**: Enhance version.json generation with Git metadata

**Implementation**:
1. Call `getGitMetadata()` in generate-version.mjs
2. Determine environment:
   ```javascript
   const environment = process.env.NODE_ENV === 'production' ? 'production' : 'development';
   ```
3. Update versionData object:
   ```javascript
   const versionData = {
     version: packageJson.version,
     commit,
     branch,
     buildDate: new Date().toISOString(), // UTC
     environment
   };
   ```
4. Write updated schema to version.json

**Acceptance Criteria**:
- ✅ version.json includes all 5 fields (version, commit, branch, buildDate, environment)
- ✅ buildDate is ISO 8601 UTC format (ends with 'Z')
- ✅ environment is "production" or "development"
- ✅ File is valid JSON and properly formatted (2 space indent)

---

### Task 1.3: Test Build Script
**Priority**: P1 - Critical Path  
**Effort**: 30 minutes  
**Dependencies**: Task 1.2

**Objective**: Verify build script works in all environments

**Implementation**:
1. Create test cases for generate-version.mjs (manual testing):
   - Run on feature branch → verify branch name captured
   - Run on main branch → verify branch is "main"
   - Hide .git directory → verify fallback to "unknown"
   - Make uncommitted changes (dev) → verify `-dirty` suffix
2. Verify version.json output format
3. Verify build succeeds with and without Git

**Acceptance Criteria**:
- ✅ Script succeeds on feature branch
- ✅ Script succeeds on main branch
- ✅ Script succeeds without Git (graceful fallback)
- ✅ Script detects dirty state in development
- ✅ version.json is valid JSON

---

## Phase 2: Version Library Enhancement

### Task 2.1: Add Version Formatting Functions
**Priority**: P1 - Critical Path  
**Effort**: 1 hour  
**Dependencies**: Task 1.2

**Objective**: Add formatting logic to `src/lib/version.ts`

**Implementation**:
1. Read and parse version.json (keep existing logic)
2. Add `getVersionMetadata()` function:
   ```typescript
   export function getVersionMetadata(): BuildMetadata {
     try {
       const versionData = require('../../version.json');
       return versionData;
     } catch {
       return {
         version: '1.0.0-beta.5',
         commit: 'unknown',
         branch: null,
         buildDate: new Date().toISOString(),
         environment: 'development'
       };
     }
   }
   ```
3. Add `getFormattedVersion()` function:
   ```typescript
   export function getFormattedVersion(): string {
     const metadata = getVersionMetadata();
     const { version, commit, branch, environment } = metadata;
     
     // Show branch only for feature branches (not main/master)
     const showBranch = branch && 
                        branch !== 'main' && 
                        branch !== 'master' && 
                        environment === 'development';
     
     if (showBranch) {
       return `${version} (${branch}@${commit})`;
     } else {
       return `${version} (${commit})`;
     }
   }
   ```
4. Keep existing `getVersion()` function for backward compatibility:
   ```typescript
   export function getVersion(): string {
     const metadata = getVersionMetadata();
     return metadata.version; // Just the semantic version
   }
   ```

**Acceptance Criteria**:
- ✅ `getVersionMetadata()` returns BuildMetadata interface
- ✅ `getFormattedVersion()` returns formatted string
- ✅ Feature branch shows "VERSION (BRANCH@COMMIT)"
- ✅ Main branch shows "VERSION (COMMIT)"
- ✅ Production shows "VERSION (COMMIT)" (no branch)
- ✅ Backward compatible `getVersion()` still works

**Types to add**:
```typescript
export interface BuildMetadata {
  version: string;
  commit: string;
  branch: string | null;
  buildDate: string;
  environment: 'production' | 'development';
}
```

---

### Task 2.2: Add Unit Tests for Version Formatting
**Priority**: P1 - Critical Path  
**Effort**: 1 hour  
**Dependencies**: Task 2.1

**Objective**: Comprehensive test coverage for version formatting

**Implementation**:
Add tests to `src/lib/version.test.ts`:

1. **Test `getVersionMetadata()`**:
   - Returns metadata from version.json
   - Returns fallback when version.json missing
   - Validates BuildMetadata interface structure

2. **Test `getFormattedVersion()`**:
   - Feature branch: Returns "VERSION (BRANCH@COMMIT)"
   - Main branch in dev: Returns "VERSION (COMMIT)"
   - Production: Returns "VERSION (COMMIT)"
   - Unknown commit: Returns "VERSION (unknown)"
   - Dirty state: Returns "VERSION (BRANCH@COMMIT-dirty)"

3. **Test backward compatibility**:
   - `getVersion()` still returns just semantic version
   - Existing tests pass without modification

**Acceptance Criteria**:
- ✅ All new tests pass
- ✅ All existing tests still pass
- ✅ Test coverage is 100% for new functions
- ✅ No `any` types in test code

---

## Phase 3: UI Updates

### Task 3.1: Update About Page [P]
**Priority**: P2  
**Effort**: 15 minutes  
**Dependencies**: Task 2.1

**Objective**: Display formatted version on About page

**Implementation**:
Update `src/app/(protected)/about/page.tsx`:
```typescript
import { getFormattedVersion } from '@/lib/version';

export default function AboutPage() {
    const version = getFormattedVersion(); // Changed from getVersion()
    
    return (
        // ... existing JSX
        <p className="text-secondary m-0 text-lg">
            Version {version}
        </p>
        // ... rest of component
    );
}
```

**Acceptance Criteria**:
- ✅ About page displays formatted version
- ✅ Version includes commit SHA in parentheses
- ✅ Layout works on mobile and desktop
- ✅ No visual regressions

---

### Task 3.2: Update Footer Component [P]
**Priority**: P2  
**Effort**: 45 minutes  
**Dependencies**: Task 2.1

**Objective**: Add responsive version display to Footer

**Implementation**:

1. Update `src/components/Footer.tsx`:
   ```typescript
   import { getFormattedVersion } from '@/lib/version';
   
   export function Footer() {
       const version = getFormattedVersion(); // Changed from getVersion()
       
       return (
           <footer className={styles.footer}>
               <div className={styles.container}>
                   <div className={styles.content}>
                       <div className={styles.links}>
                           <span className={styles.text}>Made by Shaun Burdick</span>
                           <span className={styles.separator}>•</span>
                           <Link href="..." className={styles.link}>AGPL-3.0</Link>
                           <span className={styles.separator}>•</span>
                           <Link href="..." className={styles.link}>Docs</Link>
                       </div>
                       <span className={styles.version}>
                           v{version}
                       </span>
                   </div>
               </div>
           </footer>
       );
   }
   ```

2. Update `src/components/Footer.module.css`:
   ```css
   .content {
     display: flex;
     flex-direction: row;
     align-items: center;
     gap: var(--space-3);
     flex-wrap: wrap;
   }
   
   .links {
     display: flex;
     flex-direction: row;
     align-items: center;
     gap: var(--space-3);
   }
   
   .version {
     font-size: 0.875rem;
     color: var(--text-secondary);
   }
   
   /* Mobile: version on separate line */
   @media (max-width: 768px) {
     .content {
       flex-direction: column;
       align-items: flex-start;
       gap: var(--space-2);
     }
     
     .version {
       width: 100%;
     }
   }
   ```

**Acceptance Criteria**:
- ✅ Desktop: All items on one line
- ✅ Mobile: Links on first line, version on second line
- ✅ Version is readable on all screen sizes
- ✅ No layout shifts or wrapping issues
- ✅ Maintains existing footer styling

---

### Task 3.3: Add Version to Startup Log [P]
**Priority**: P2  
**Effort**: 15 minutes  
**Dependencies**: Task 2.1

**Objective**: Log version on application startup

**Implementation**:
Update `src/instrumentation-node.ts`:
```typescript
import { getFormattedVersion } from '@/lib/version';

export async function run() {
    const version = getFormattedVersion();
    Logger.info(`HD Homey v${version} starting...`);
    
    Logger.info('Starting App with the following config: %o', Config);
    
    // ... rest of startup logic
}
```

**Acceptance Criteria**:
- ✅ Startup log shows version with commit SHA
- ✅ Log format is clean and readable
- ✅ Log appears before config details
- ✅ No errors during startup

---

## Phase 4: Health Endpoint Enhancement

### Task 4.1: Add Version to Health Endpoint
**Priority**: P3  
**Effort**: 30 minutes  
**Dependencies**: Task 2.1

**Objective**: Include version metadata in `/api/health` response

**Implementation**:
Update `src/app/api/health/route.ts`:
```typescript
import { getVersionMetadata } from '@/lib/version';

export async function GET() {
    const version = getVersionMetadata();
    
    return Response.json(
        {
            status: 'ok',
            timestamp: new Date().toISOString(),
            version, // Add version metadata
        },
        {
            status: 200,
            headers: {
                'Cache-Control': 'no-cache, no-store, must-revalidate',
            },
        }
    );
}
```

**Acceptance Criteria**:
- ✅ Response includes version object
- ✅ Version object has all 5 fields
- ✅ Response is valid JSON
- ✅ Cache-Control header unchanged (no-cache)
- ✅ Endpoint still returns 200 even if version read fails

---

### Task 4.2: Update Health Endpoint Tests
**Priority**: P3  
**Effort**: 30 minutes  
**Dependencies**: Task 4.1

**Objective**: Test health endpoint with version metadata

**Implementation**:
Update `src/app/api/health/route.test.ts`:

1. **Test version metadata is included**:
   ```typescript
   it('should include version metadata', async () => {
     const response = await GET();
     const data = await response.json();
     
     expect(data).toHaveProperty('version');
     expect(data.version).toHaveProperty('version');
     expect(data.version).toHaveProperty('commit');
     expect(data.version).toHaveProperty('branch');
     expect(data.version).toHaveProperty('buildDate');
     expect(data.version).toHaveProperty('environment');
   });
   ```

2. **Test backward compatibility**:
   ```typescript
   it('should still return status and timestamp', async () => {
     const response = await GET();
     const data = await response.json();
     
     expect(data).toHaveProperty('status', 'ok');
     expect(data).toHaveProperty('timestamp');
     expect(typeof data.timestamp).toBe('string');
   });
   ```

3. **Test graceful fallback** (if version.json missing):
   ```typescript
   it('should return fallback version if version.json missing', async () => {
     // Mock missing version.json scenario
     const response = await GET();
     const data = await response.json();
     
     expect(data.version.commit).toBe('unknown');
   });
   ```

**Acceptance Criteria**:
- ✅ All new tests pass
- ✅ All existing health endpoint tests pass
- ✅ Test coverage includes version metadata
- ✅ Tests verify graceful fallback

---

## Phase 5: Documentation Updates

### Task 5.1: Update Environment Variables Documentation [P]
**Priority**: P3  
**Effort**: 15 minutes  
**Dependencies**: None (no new env vars added)

**Objective**: Confirm no new environment variables needed

**Implementation**:
- Review `docs/config/environment-variables.md`
- Confirm no changes needed (feature uses build-time detection only)
- Add note in "Version Information" section (if it exists) about version.json generation

**Acceptance Criteria**:
- ✅ Documentation reviewed
- ✅ No incorrect or outdated information
- ✅ No new environment variables needed

---

### Task 5.2: Add Feature Documentation [P]
**Priority**: P3  
**Effort**: 30 minutes  
**Dependencies**: None

**Objective**: Document the new build identification feature

**Implementation**:

1. Update `docs/features/index.md`:
   - Add entry: "Build Identification - Version display includes commit SHA and build metadata"

2. Create or update relevant sections with:
   - How version information is displayed (About page, Footer, startup log)
   - How to interpret version strings (VERSION (COMMIT) vs VERSION (BRANCH@COMMIT))
   - What `-dirty` suffix means
   - How to use `/api/health` endpoint to get version metadata

**Acceptance Criteria**:
- ✅ Feature is documented in features index
- ✅ Documentation is clear and concise
- ✅ Examples show actual version formats
- ✅ Health endpoint changes are documented

---

### Task 5.3: Update CHANGELOG.md [P]
**Priority**: P3  
**Effort**: 15 minutes  
**Dependencies**: All implementation tasks complete

**Objective**: Document changes in CHANGELOG

**Implementation**:
Add to `CHANGELOG.md` under "Unreleased" or next version:

```markdown
### Added
- Enhanced build identification showing commit SHA alongside version
- Version display now shows `VERSION (COMMIT)` in production
- Version display shows `VERSION (BRANCH@COMMIT)` in development on feature branches
- `-dirty` suffix appended to commit SHA when uncommitted changes exist (development only)
- Version metadata added to `/api/health` endpoint response
- Build date and environment information included in version metadata
- Version display updated in About page, Footer (responsive), and startup log

### Changed
- Footer version display now responsive (splits to separate line on mobile)
- `generate-version.mjs` build script now captures Git metadata during build
- Health endpoint response includes nested `version` object with build metadata
```

**Acceptance Criteria**:
- ✅ CHANGELOG updated with all changes
- ✅ Changes categorized correctly (Added/Changed)
- ✅ Clear and concise descriptions
- ✅ User-facing language (not technical jargon)

---

## Phase 6: Integration Testing & Validation

### Task 6.1: Manual Testing - Production Build
**Priority**: P1 - Critical Path  
**Effort**: 30 minutes  
**Dependencies**: All implementation tasks

**Objective**: Validate production Docker build

**Test Scenarios** (from quickstart.md):
1. Build Docker image from current commit
2. Verify About page shows VERSION (COMMIT)
3. Verify Footer shows VERSION (COMMIT) 
4. Check startup log shows version
5. Verify `/api/health` includes version metadata
6. Confirm commit SHA matches Git HEAD

**Acceptance Criteria**:
- ✅ All scenarios pass
- ✅ Version display is consistent across UI
- ✅ No UI layout issues
- ✅ Health endpoint returns valid JSON

---

### Task 6.2: Manual Testing - Development Build
**Priority**: P1 - Critical Path  
**Effort**: 30 minutes  
**Dependencies**: All implementation tasks

**Objective**: Validate development build on feature branch

**Test Scenarios** (from quickstart.md):
1. Start dev server on feature branch
2. Verify About page shows VERSION (BRANCH@COMMIT)
3. Verify Footer shows VERSION (BRANCH@COMMIT)
4. Check startup log shows branch name
5. Verify `/api/health` includes branch name
6. Test on main branch (should hide branch name)

**Acceptance Criteria**:
- ✅ All scenarios pass
- ✅ Branch name displayed on feature branches
- ✅ Branch name hidden on main branch
- ✅ Footer responsive layout works

---

### Task 6.3: Manual Testing - Edge Cases
**Priority**: P1 - Critical Path  
**Effort**: 45 minutes  
**Dependencies**: All implementation tasks

**Objective**: Validate edge case handling

**Test Scenarios** (from quickstart.md):
1. **No Git Available**: Hide .git → verify "unknown" fallback
2. **Dirty Working Tree**: Make uncommitted changes → verify `-dirty` suffix
3. **Detached HEAD**: Checkout commit → verify null branch
4. **Long Branch Names**: Create long branch name → verify responsive layout
5. **Mobile Layout**: Test Footer on narrow screen → verify split layout

**Acceptance Criteria**:
- ✅ All edge cases handled gracefully
- ✅ No errors or crashes
- ✅ Fallback values displayed correctly
- ✅ UI layouts work on all screen sizes

---

### Task 6.4: Run Full Test Suite
**Priority**: P1 - Critical Path  
**Effort**: 15 minutes  
**Dependencies**: All implementation tasks

**Objective**: Ensure no regressions

**Implementation**:
```bash
npm run lint          # ESLint passes
npm run typecheck     # TypeScript passes
npm test              # All tests pass
npm run build         # Build succeeds
```

**Acceptance Criteria**:
- ✅ Linting passes with no new violations
- ✅ Type checking passes with no errors
- ✅ All unit tests pass
- ✅ Build completes successfully
- ✅ No console errors or warnings

---

## Task Completion Checklist

Mark tasks complete as you finish them:

### Phase 1: Build Script Enhancement
- [ ] Task 1.1: Extract Git Metadata Function
- [ ] Task 1.2: Update version.json Schema
- [ ] Task 1.3: Test Build Script

### Phase 2: Version Library Enhancement
- [ ] Task 2.1: Add Version Formatting Functions
- [ ] Task 2.2: Add Unit Tests for Version Formatting

### Phase 3: UI Updates
- [ ] Task 3.1: Update About Page
- [ ] Task 3.2: Update Footer Component
- [ ] Task 3.3: Add Version to Startup Log

### Phase 4: Health Endpoint Enhancement
- [ ] Task 4.1: Add Version to Health Endpoint
- [ ] Task 4.2: Update Health Endpoint Tests

### Phase 5: Documentation Updates
- [ ] Task 5.1: Update Environment Variables Documentation
- [ ] Task 5.2: Add Feature Documentation
- [ ] Task 5.3: Update CHANGELOG.md

### Phase 6: Integration Testing & Validation
- [ ] Task 6.1: Manual Testing - Production Build
- [ ] Task 6.2: Manual Testing - Development Build
- [ ] Task 6.3: Manual Testing - Edge Cases
- [ ] Task 6.4: Run Full Test Suite

---

## Implementation Notes

### Parallel Execution
Tasks marked `[P]` can be executed in parallel:
- Task 3.1, 3.2, 3.3 (UI Updates) - Independent UI changes
- Task 5.1, 5.2, 5.3 (Documentation) - Independent doc updates

### Critical Path
**Must be completed in order**:
1. Phase 1 (Build Script) → Phase 2 (Version Library) → Phase 3/4 (UI/API) → Phase 6 (Testing)

### Estimated Timeline
- **Phase 1**: 2 hours
- **Phase 2**: 2 hours
- **Phase 3**: 1.25 hours
- **Phase 4**: 1 hour
- **Phase 5**: 1 hour (parallel with implementation)
- **Phase 6**: 2 hours

**Total**: 6-8 hours (can be reduced with parallel execution)

### Quality Standards
- **Test Coverage**: 100% for new code
- **Linting**: Zero new violations
- **Type Safety**: No `any` types without justification
- **Backward Compatibility**: Existing `getVersion()` function still works

---

## Success Criteria

**Feature is complete when**:
- ✅ All 22 tasks checked off
- ✅ All automated tests pass
- ✅ All manual test scenarios validated
- ✅ Documentation updated
- ✅ CHANGELOG updated
- ✅ No regressions in existing functionality
- ✅ Quickstart validation scenarios all pass

**Ready for merge when**:
- ✅ Code reviewed (if applicable)
- ✅ All quality gates passed
- ✅ Feature tested in production-like environment (Docker)
- ✅ User acceptance criteria from spec.md verified
