# Quickstart Validation: Enhanced Build Identification

**Feature**: Enhanced Build Identification (013-build-identification)  
**Date**: 2025-12-06

## Purpose

This document provides step-by-step validation scenarios to test the enhanced build identification feature across different environments. Follow these scenarios to verify the feature works correctly before release.

## Prerequisites

- Git installed and available in PATH
- Docker installed (for production build testing)
- Node.js 22+ installed
- Repository cloned with full Git history

## Validation Scenarios

### Scenario 1: Production Build (Docker)

**Objective**: Verify commit SHA is displayed in production Docker builds

**Steps**:

1. **Build Docker image from current commit**:
   ```bash
   cd /path/to/hd-homey
   git log -1 --oneline  # Note the commit SHA (e.g., 1ce5e97)
   docker build -t hd-homey:test .
   ```

2. **Run Docker container**:
   ```bash
   docker run -d -p 3000:3000 \
     -e AUTH_SECRET=test-secret-key-for-validation-only \
     --name hd-homey-test \
     hd-homey:test
   ```

3. **Verify version display in UI**:
   - Open browser to http://localhost:3000
   - Log in (create initial admin if needed)
   - Navigate to **About** page
   - **Expected**: Version display shows `1.0.0-beta.5 (1ce5e97)` (your commit SHA)
   - **Verify**: Commit SHA matches the SHA from step 1

4. **Verify health endpoint includes version**:
   ```bash
   curl http://localhost:3000/api/health | jq
   ```
   
   **Expected response**:
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
   
   **Verify**:
   - ✅ `status` is `"ok"`
   - ✅ `timestamp` is valid ISO 8601 timestamp
   - ✅ `version.version` matches package.json
   - ✅ `version.commit` matches Git commit SHA
   - ✅ `version.branch` is `null` (production builds shouldn't include branch)
   - ✅ `version.buildDate` is valid ISO 8601 timestamp
   - ✅ `version.environment` is `"production"`

5. **Cleanup**:
   ```bash
   docker stop hd-homey-test
   docker rm hd-homey-test
   ```

**Success Criteria**:
- ✅ Docker build completes without errors
- ✅ About page displays version with commit SHA
- ✅ API returns correct JSON with commit SHA
- ✅ Commit SHA matches current Git HEAD

---

### Scenario 2: Development Build (Feature Branch)

**Objective**: Verify branch name and commit SHA are displayed in development

**Steps**:

1. **Ensure you're on a feature branch**:
   ```bash
   git checkout 013-build-identification  # Or your feature branch
   git log -1 --oneline  # Note the commit SHA
   git branch --show-current  # Note the branch name
   ```

2. **Start development server**:
   ```bash
   npm run dev
   ```

3. **Verify version display in UI**:
   - Open browser to http://localhost:3000
   - Log in
   - Navigate to **About** page
   - **Expected**: Version shows `1.0.0-beta.5 (013-build-identification@a1b2c3d)`
   - **Verify**: Both branch name and commit SHA are displayed

4. **Verify health endpoint includes version**:
   ```bash
   curl http://localhost:3000/api/health | jq
   ```
   
   **Expected response**:
   ```json
   {
     "status": "ok",
     "timestamp": "2024-12-06T15:30:45.123Z",
     "version": {
       "version": "1.0.0-beta.5",
       "commit": "a1b2c3d",
       "branch": "013-build-identification",
       "buildDate": "2024-12-06T10:00:00.000Z",
       "environment": "development"
     }
   }
   ```
   
   **Verify**:
   - ✅ `status` is `"ok"`
   - ✅ `version.commit` matches Git commit SHA
   - ✅ `version.branch` matches current Git branch
   - ✅ `version.environment` is `"development"`

5. **Stop development server** (Ctrl+C)

**Success Criteria**:
- ✅ Dev server starts without errors
- ✅ About page shows branch@commit format
- ✅ API returns correct branch and commit
- ✅ Git metadata matches current state

---

### Scenario 3: Development Build (Main Branch)

**Objective**: Verify main branch doesn't show branch name (same as production format)

**Steps**:

1. **Switch to main branch**:
   ```bash
   git checkout main
   git log -1 --oneline  # Note the commit SHA
   ```

2. **Start development server**:
   ```bash
   npm run dev
   ```

3. **Verify version display in UI**:
   - Open browser to http://localhost:3000
   - Log in
   - Navigate to **About** page
   - **Expected**: Version shows `1.0.0-beta.5 (1ce5e97)` (NO branch name)
   - **Verify**: Format matches production (no branch name shown)

4. **Verify health endpoint**:
   ```bash
   curl http://localhost:3000/api/health | jq
   ```
   
   **Expected response**:
   ```json
   {
     "status": "ok",
     "timestamp": "2024-12-06T15:30:45.123Z",
     "version": {
       "version": "1.0.0-beta.5",
       "commit": "1ce5e97",
       "branch": "main",
       "buildDate": "2024-12-06T10:00:00.000Z",
       "environment": "development"
     }
   }
   ```
   
   **Verify**:
   - ✅ `version.branch` is `"main"` in API response
   - ✅ UI doesn't show branch name (cleaner display)
   - ✅ `version.environment` is still `"development"`

5. **Stop development server** (Ctrl+C)

**Success Criteria**:
- ✅ Main branch in dev shows commit-only format
- ✅ API still returns branch name
- ✅ UI display is clean and readable

---

### Scenario 4: Dirty Working Tree (Uncommitted Changes)

**Objective**: Verify `-dirty` suffix is appended in development when uncommitted changes exist

**Steps**:

1. **Make uncommitted changes**:
   ```bash
   git checkout 013-build-identification
   echo "// test comment" >> src/lib/version.ts
   git status  # Verify file is modified
   ```

2. **Start development server**:
   ```bash
   npm run dev
   ```

3. **Verify version display in UI**:
   - Open browser to http://localhost:3000
   - Navigate to **About** page
   - **Expected**: Version shows `1.0.0-beta.5 (013-build-identification@a1b2c3d-dirty)`
   - **Verify**: `-dirty` suffix is present

4. **Verify health endpoint**:
   ```bash
   curl http://localhost:3000/api/health | jq
   ```
   
   **Expected response**:
   ```json
   {
     "status": "ok",
     "timestamp": "2024-12-06T15:30:45.123Z",
     "version": {
       "version": "1.0.0-beta.5",
       "commit": "a1b2c3d-dirty",
       "branch": "013-build-identification",
       "buildDate": "2024-12-06T10:00:00.000Z",
       "environment": "development"
     }
   }
   ```
   
   **Verify**:
   - ✅ `version.commit` includes `-dirty` suffix
   - ✅ Both UI and API show dirty state

5. **Cleanup**:
   ```bash
   git checkout src/lib/version.ts  # Revert changes
   ```

**Success Criteria**:
- ✅ Dirty state is detected and displayed
- ✅ `-dirty` suffix appears in both UI and API
- ✅ Clean state is restored after reverting changes

---

### Scenario 5: No Git Available (Graceful Fallback)

**Objective**: Verify graceful fallback when Git is not available

**Steps**:

1. **Temporarily hide Git directory**:
   ```bash
   mv .git .git.backup
   ```

2. **Generate version file manually**:
   ```bash
   node scripts/generate-version.mjs
   ```
   
   **Expected console output**:
   ```
   Git metadata extraction failed: ...
   Generated version.json: 1.0.0-beta.5
   ```
   
   **Verify**: Warning appears but script succeeds

3. **Check generated version.json**:
   ```bash
   cat version.json
   ```
   
   **Expected content**:
   ```json
   {
     "version": "1.0.0-beta.5",
     "commit": "unknown",
     "branch": null,
     "buildDate": "2024-12-06T15:30:45.123Z",
     "environment": "development"
   }
   ```
   
   **Verify**:
   - ✅ `commit` is `"unknown"`
   - ✅ `branch` is `null`
   - ✅ Other fields are valid

4. **Build and start application**:
   ```bash
   npm run build
   npm start
   ```

5. **Verify version display**:
   - Open browser to http://localhost:3001
   - Navigate to **About** page
   - **Expected**: Version shows `1.0.0-beta.5 (unknown)`

6. **Restore Git directory**:
   ```bash
   killall node  # Stop Next.js server
   rm -rf .git
   mv .git.backup .git
   ```

**Success Criteria**:
- ✅ Build succeeds without Git
- ✅ Fallback values are displayed
- ✅ No crashes or errors
- ✅ User sees meaningful fallback message

---

### Scenario 6: Detached HEAD State

**Objective**: Verify behavior in detached HEAD state (common in CI/CD)

**Steps**:

1. **Enter detached HEAD state**:
   ```bash
   git log -1 --oneline  # Note current commit SHA
   git checkout HEAD~1   # Checkout previous commit (detached HEAD)
   git status  # Verify detached HEAD state
   ```

2. **Start development server**:
   ```bash
   npm run dev
   ```

3. **Verify version display**:
   - Open browser to http://localhost:3000
   - Navigate to **About** page
   - **Expected**: Version shows `1.0.0-beta.5 (abc1234)` (commit only, no branch)

4. **Verify version API**:
   ```bash
   curl http://localhost:3000/api/version | jq
   ```
   
   **Expected response**:
   ```json
   {
     "version": "1.0.0-beta.5",
     "commit": "abc1234",
     "branch": null,
     "buildDate": "2024-12-06T15:30:45.123Z",
     "environment": "development"
   }
   ```
   
   **Verify**:
   - ✅ `commit` is valid
   - ✅ `branch` is `null` (detached HEAD has no branch)

5. **Return to branch**:
   ```bash
   git checkout 013-build-identification
   ```

**Success Criteria**:
- ✅ Detached HEAD is detected
- ✅ Branch name is null
- ✅ Commit SHA is still displayed
- ✅ No errors or crashes

---

### Scenario 7: Long Branch Names (UI Layout)

**Objective**: Verify UI handles long branch names gracefully

**Steps**:

1. **Create branch with long name**:
   ```bash
   git checkout -b feature/PROJ-1234-implement-really-long-feature-name-that-describes-everything-in-detail
   ```

2. **Start development server**:
   ```bash
   npm run dev
   ```

3. **Verify version display on different screen sizes**:
   - Open browser to http://localhost:3000
   - Navigate to **About** page
   - **Test on desktop** (wide screen):
     - **Expected**: Full branch name visible or truncated with ellipsis
     - **Verify**: No horizontal scrolling
   - **Test on mobile** (narrow screen, use browser DevTools):
     - **Expected**: Branch name truncated with ellipsis or wrapped
     - **Verify**: Layout remains readable

4. **Verify version API (unchanged)**:
   ```bash
   curl http://localhost:3000/api/version | jq
   ```
   
   **Expected**: Full branch name in JSON response (no truncation)

5. **Cleanup**:
   ```bash
   git checkout 013-build-identification
   git branch -D feature/PROJ-1234-implement-really-long-feature-name-that-describes-everything-in-detail
   ```

**Success Criteria**:
- ✅ Long branch names don't break layout
- ✅ UI truncates or wraps appropriately
- ✅ API returns full branch name
- ✅ Responsive design works on mobile

---

### Scenario 8: Health Endpoint with Version

**Objective**: Verify health endpoint includes version metadata and maintains performance

**Steps**:

1. **Start server** (production build recommended):
   ```bash
   npm run build
   npm start
   ```

2. **Check response headers**:
   ```bash
   curl -I http://localhost:3001/api/health
   ```
   
   **Expected headers**:
   ```
   HTTP/1.1 200 OK
   Content-Type: application/json
   Cache-Control: no-cache, no-store, must-revalidate
   ...
   ```
   
   **Verify**:
   - ✅ `Content-Type` is `application/json`
   - ✅ `Cache-Control` is no-cache (existing health endpoint behavior)
   - ✅ Status is 200 OK

3. **Verify response body includes version**:
   ```bash
   curl http://localhost:3001/api/health | jq
   ```
   
   **Expected**:
   ```json
   {
     "status": "ok",
     "timestamp": "...",
     "version": {
       "version": "1.0.0-beta.5",
       "commit": "1ce5e97",
       ...
     }
   }
   ```
   
   **Verify**: 
   - ✅ Valid JSON with status, timestamp, and version
   - ✅ Version object contains all expected fields

**Success Criteria**:
- ✅ Health check still works (backward compatible)
- ✅ Version data is included
- ✅ Response time is < 100ms

---

## Edge Case Validation

### Edge Case: Shallow Clone (CI/CD Simulation)

**Steps**:
```bash
# Create shallow clone
cd /tmp
git clone --depth=1 https://github.com/shaunburdick/hd-homey.git hd-homey-shallow
cd hd-homey-shallow

# Verify Git commands work
git rev-parse --short=7 HEAD  # Should return commit SHA
git rev-parse --abbrev-ref HEAD  # Should return branch name

# Build and verify
npm ci
node scripts/generate-version.mjs
cat version.json  # Should contain valid commit SHA
```

**Expected Result**: ✅ Shallow clone works correctly

---

### Edge Case: Environment Variable Fallback (Future)

**Note**: Not implemented in initial version, but documented for future enhancement.

**Steps** (when implemented):
```bash
# Simulate CI environment
export CI_COMMIT_SHA=abc1234567890
export CI_COMMIT_REF_NAME=main

# Hide Git
mv .git .git.backup

# Generate version
node scripts/generate-version.mjs

# Verify fallback to env vars
cat version.json | jq .commit
# Expected: "abc1234" (from env var)

# Restore
mv .git.backup .git
unset CI_COMMIT_SHA CI_COMMIT_REF_NAME
```

---

## Troubleshooting

### Issue: Version shows "unknown" in development

**Cause**: Git metadata extraction failed

**Debug steps**:
1. Check Git is installed: `git --version`
2. Check you're in a Git repository: `git status`
3. Check for Git errors: `node scripts/generate-version.mjs` (look for warnings)

**Solution**: Ensure Git is installed and `.git` directory exists

---

### Issue: Branch name shows "HEAD"

**Cause**: Detached HEAD state

**Debug steps**:
1. Check current state: `git branch --show-current`
2. Check if detached: `git status` (look for "HEAD detached")

**Solution**: This is expected behavior. Checkout a branch: `git checkout main`

---

### Issue: Health endpoint doesn't include version

**Cause**: Version metadata not being added to response

**Debug steps**:
1. Check server is running: `curl http://localhost:3000/api/health`
2. Check version.json exists: `ls version.json`
3. Check for build errors: `npm run build`

**Solution**: Verify version.json was generated and health route was updated correctly

---

### Issue: Docker build fails on Git commands

**Cause**: `.git` directory excluded or Git not installed in builder

**Debug steps**:
1. Check `.dockerignore`: `grep git .dockerignore`
2. Verify Git in builder: `docker run --rm node:22-alpine git --version`

**Solution**: Ensure `.git` is available during build stage, install Git if needed

---

## Success Checklist

Before marking this feature as complete, verify:

- ✅ **Scenario 1**: Production Docker build shows commit SHA
- ✅ **Scenario 2**: Feature branch shows branch@commit
- ✅ **Scenario 3**: Main branch shows commit only
- ✅ **Scenario 4**: Dirty working tree shows `-dirty` suffix
- ✅ **Scenario 5**: Missing Git shows "unknown" fallback
- ✅ **Scenario 6**: Detached HEAD shows commit with null branch
- ✅ **Scenario 7**: Long branch names don't break UI
- ✅ **Scenario 8**: API returns correct cache headers
- ✅ All tests pass: `npm test`
- ✅ Linting passes: `npm run lint`
- ✅ Type checking passes: `npm run typecheck`
- ✅ Documentation updated
- ✅ CHANGELOG.md updated

## Notes

- All scenarios should complete without errors
- Console warnings for missing Git are acceptable (not errors)
- UI should always display meaningful version info
- API should always return valid JSON
- No regressions in existing version functionality
