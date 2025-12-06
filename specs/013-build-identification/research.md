# Research: Enhanced Build Identification

**Date**: 2025-12-06  
**Branch**: `013-build-identification`

## Research Objective

Determine the most reliable Git commands for extracting commit SHA and branch name across different environments (local dev, CI/CD, Docker builds, shallow clones, detached HEAD). Validate version format choices for optimal readability and usability.

## Git Command Research

### Test Environment Setup

Tested on:
- **Local development**: Full Git clone with complete history
- **Shallow clone**: `git clone --depth=1` (common in CI/CD)
- **Detached HEAD**: `git checkout <commit-sha>`
- **No Git**: Removed `.git` directory
- **Modified working tree**: Uncommitted changes present

### Command 1: Get Commit SHA (Short)

**Command**: `git rev-parse --short=7 HEAD`

**Purpose**: Get 7-character short commit SHA

**Test Results**:

| Environment | Output | Exit Code | Notes |
|-------------|--------|-----------|-------|
| Full clone | `1ce5e97` | 0 | ✅ Works perfectly |
| Shallow clone | `1ce5e97` | 0 | ✅ Works in shallow clones |
| Detached HEAD | `1ce5e97` | 0 | ✅ Works in detached state |
| No Git | - | 128 | ❌ Error: "not a git repository" |
| Dirty working tree | `1ce5e97` | 0 | ✅ Returns committed SHA (ignores uncommitted) |

**Error Output** (no Git):
```
fatal: not a git repository (or any of the parent directories): .git
```

**Decision**: Use `git rev-parse --short=7 HEAD` with try/catch fallback to "unknown"

**Rationale**:
- Works reliably in all Git environments
- Short SHA (7 chars) is sufficient for uniqueness (collision probability negligible)
- Fails gracefully when Git unavailable
- Standard Git command, widely supported

### Command 2: Get Branch Name

**Command**: `git rev-parse --abbrev-ref HEAD`

**Purpose**: Get current branch name

**Test Results**:

| Environment | Output | Exit Code | Notes |
|-------------|--------|-----------|-------|
| Full clone (feature) | `013-build-identification` | 0 | ✅ Works perfectly |
| Full clone (main) | `main` | 0 | ✅ Works on main |
| Shallow clone | `main` | 0 | ✅ Works in shallow clones |
| Detached HEAD | `HEAD` | 0 | ⚠️ Returns "HEAD" (not useful) |
| No Git | - | 128 | ❌ Error: "not a git repository" |

**Alternative Command**: `git symbolic-ref --short HEAD`

**Test Results**:

| Environment | Output | Exit Code | Notes |
|-------------|--------|-----------|-------|
| Full clone (feature) | `013-build-identification` | 0 | ✅ Works perfectly |
| Detached HEAD | - | 128 | ❌ Error: "ref HEAD is not a symbolic ref" |

**Decision**: Use `git rev-parse --abbrev-ref HEAD`, filter out "HEAD" response

**Rationale**:
- Works in all branch scenarios
- Detached HEAD returns "HEAD" which we can filter to null
- More reliable than `symbolic-ref` which fails on detached HEAD
- Provides meaningful fallback behavior

**Implementation**:
```javascript
let branch = execSync('git rev-parse --abbrev-ref HEAD', { encoding: 'utf8' }).trim();
if (branch === 'HEAD') {
  branch = null; // Detached HEAD state
}
```

### Command 3: Check for Dirty Working Tree (Optional)

**Command**: `git diff --quiet && git diff --staged --quiet; echo $?`

**Purpose**: Detect uncommitted changes

**Test Results**:

| Environment | Output | Exit Code | Notes |
|-------------|--------|-----------|-------|
| Clean working tree | `0` | 0 | ✅ No changes |
| Modified files | `1` | 0 | ✅ Detects uncommitted changes |
| Staged changes | `1` | 0 | ✅ Detects staged changes |

**Alternative (simpler)**: `git status --porcelain`

**Test Results**:

| Environment | Output | Notes |
|-------------|--------|-------|
| Clean working tree | (empty) | ✅ No changes |
| Modified files | ` M src/lib/version.ts` | ✅ Shows modified files |
| Untracked files | `?? newfile.txt` | ✅ Shows untracked |

**Decision**: Use `git status --porcelain` for dirty state detection (development only)

**Rationale**:
- Single command vs multiple commands
- Provides detailed output for debugging
- Empty output = clean, any output = dirty
- Standard command, widely supported

**Implementation** (development only):
```javascript
const isDirty = execSync('git status --porcelain', { encoding: 'utf8' }).trim().length > 0;
if (isDirty && process.env.NODE_ENV !== 'production') {
  commit += '-dirty';
}
```

### Command 4: Get Build Timestamp

**Command**: `new Date().toISOString()`

**Purpose**: Record when build was created

**Test Results**:
```javascript
new Date().toISOString()
// Output: "2024-12-06T15:30:45.123Z"
```

**Decision**: Use JavaScript `Date.toISOString()` for UTC timestamp

**Rationale**:
- No Git command needed
- Always available (no Git dependency)
- Standard ISO 8601 format with timezone (Z = UTC)
- Consistent across all environments

## CI/CD Environment Variables

Research into common CI/CD environment variables for Git metadata:

| Platform | Commit SHA | Branch Name | Notes |
|----------|-----------|-------------|-------|
| GitHub Actions | `GITHUB_SHA` | `GITHUB_REF_NAME` | `GITHUB_REF` includes `refs/heads/` prefix |
| GitLab CI | `CI_COMMIT_SHA` | `CI_COMMIT_REF_NAME` | Short SHA available as `CI_COMMIT_SHORT_SHA` |
| CircleCI | `CIRCLE_SHA1` | `CIRCLE_BRANCH` | No short SHA env var |
| Jenkins | `GIT_COMMIT` | `GIT_BRANCH` | Varies by plugin |
| Docker Build | None | None | Git commands work if `.git` exists |

**Decision**: Prioritize Git commands over environment variables

**Rationale**:
- Git commands work everywhere Git is available
- Environment variables are CI-specific (not portable)
- Git commands provide consistent behavior
- Can add env var fallbacks in future if needed

**Implementation Order**:
1. Try Git commands first
2. Fallback to environment variables (future enhancement)
3. Fallback to "unknown" if all fail

## Version Format Research

### Format Options Evaluated

**Option 1: Semantic Version Only**
```
1.0.0-beta.5
```
❌ **Rejected**: No build identification (original problem)

**Option 2: Version + Commit**
```
1.0.0-beta.5 (1ce5e97)
```
✅ **Selected for Production**: Clear, concise, grep-friendly

**Option 3: Version + Branch + Commit**
```
1.0.0-beta.5 (013-build-identification@1ce5e97)
```
✅ **Selected for Development**: Adds branch context for developers

**Option 4: Version+Commit Suffix**
```
1.0.0-beta.5+1ce5e97
```
❌ **Rejected**: Not valid semver, harder to read

**Option 5: Full Commit SHA**
```
1.0.0-beta.5 (1ce5e9776d4f64b5bfefe5ddf48a2a7750a67fb3)
```
❌ **Rejected**: Too long, hard to read, 7 chars sufficient

**Option 6: Commit Only (No Version)**
```
1ce5e97
```
❌ **Rejected**: Loses semantic version information

### Format Decision Matrix

| Format | Readability | Uniqueness | Copy-Paste | Grep-Friendly | Length |
|--------|-------------|------------|------------|---------------|--------|
| `1.0.0-beta.5` | ⭐⭐⭐⭐⭐ | ❌ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | 13 |
| `1.0.0-beta.5 (1ce5e97)` | ⭐⭐⭐⭐⭐ | ✅ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | 23 |
| `1.0.0-beta.5 (main@1ce5e97)` | ⭐⭐⭐⭐ | ✅ | ⭐⭐⭐⭐ | ⭐⭐⭐⭐ | 28 |
| `1.0.0-beta.5 (013-build-identification@1ce5e97)` | ⭐⭐⭐ | ✅ | ⭐⭐⭐ | ⭐⭐⭐⭐ | 51 |
| `1.0.0-beta.5+1ce5e97` | ⭐⭐ | ✅ | ⭐⭐⭐⭐ | ⭐⭐⭐ | 22 |

**Final Decision**:
- **Production**: `VERSION (COMMIT)` → `1.0.0-beta.5 (1ce5e97)`
- **Development (feature branch)**: `VERSION (BRANCH@COMMIT)` → `1.0.0-beta.5 (013-build-identification@a1b2c3d)`
- **Development (main branch)**: `VERSION (COMMIT)` → `1.0.0-beta.5 (1ce5e97)`
- **Dirty development**: `VERSION (BRANCH@COMMIT-dirty)` → `1.0.0-beta.5 (013-build-identification@a1b2c3d-dirty)`
- **Fallback**: `VERSION (unknown)` → `1.0.0-beta.5 (unknown)`

### User Feedback Simulation

**Scenario**: Developer reports bug

❌ **Old format**: "I'm using version 1.0.0-beta.5"
- Maintainer: "Which commit? We have 5 commits since that version."

✅ **New format**: "I'm using version 1.0.0-beta.5 (1ce5e97)"
- Maintainer: "Got it, that's commit 1ce5e97, let me check the code..."

**Scenario**: Support team troubleshoots issue

❌ **Old format**: Docker tag `latest` shows "1.0.0-beta.5"
- Team: "Is this the same as prod? Need to check Git..."

✅ **New format**: Docker shows "1.0.0-beta.5 (a1b2c3d)"
- Team: "Different commit than prod (1ce5e97), this is staging build."

## API Response Format Research

### Format Options

**Option 1: Flat Structure**
```json
{
  "version": "1.0.0-beta.5",
  "commit": "1ce5e97",
  "branch": "main",
  "buildDate": "2024-12-06T15:30:45.123Z",
  "environment": "production"
}
```
✅ **Selected**: Simple, flat, easy to parse

**Option 2: Nested Structure**
```json
{
  "version": "1.0.0-beta.5",
  "build": {
    "commit": "1ce5e97",
    "branch": "main",
    "date": "2024-12-06T15:30:45.123Z"
  },
  "environment": "production"
}
```
❌ **Rejected**: Unnecessary nesting for simple data

**Option 3: SemVer Build Metadata**
```json
{
  "version": "1.0.0-beta.5+1ce5e97",
  "buildDate": "2024-12-06T15:30:45.123Z"
}
```
❌ **Rejected**: Loses structured commit/branch data

### Response Headers

**Content-Type**: `application/json`

**Cache-Control**: `public, max-age=3600`
- **Rationale**: Version data doesn't change for a running instance
- **Max-age**: 1 hour balances freshness with cache efficiency
- **Public**: Safe to cache in CDN/proxy (no sensitive data)

**ETag**: Not needed (content hash unnecessary for static data)

## Edge Case Handling

### Edge Case 1: Shallow Clone (CI/CD)

**Scenario**: GitHub Actions uses `actions/checkout@v4` with `fetch-depth: 1`

**Test**:
```bash
git clone --depth=1 https://github.com/shaunburdick/hd-homey.git
cd hd-homey
git rev-parse --short=7 HEAD
# Output: 1ce5e97 ✅

git rev-parse --abbrev-ref HEAD
# Output: main ✅
```

**Result**: ✅ Works correctly

**Action**: No special handling needed

### Edge Case 2: Detached HEAD (CI/CD on PR)

**Scenario**: CI builds pull request in detached HEAD state

**Test**:
```bash
git checkout 1ce5e97
git rev-parse --short=7 HEAD
# Output: 1ce5e97 ✅

git rev-parse --abbrev-ref HEAD
# Output: HEAD ⚠️
```

**Result**: ⚠️ Returns "HEAD" instead of branch name

**Action**: Filter "HEAD" → null in code

### Edge Case 3: No Git (Corrupted Repository)

**Scenario**: `.git` directory missing or corrupted

**Test**:
```bash
mv .git .git.backup
node scripts/generate-version.mjs
# Error: fatal: not a git repository
```

**Result**: ❌ Git command fails

**Action**: Wrap in try/catch, fallback to "unknown"

**Implementation**:
```javascript
let commit = 'unknown';
try {
  commit = execSync('git rev-parse --short=7 HEAD', { 
    encoding: 'utf8',
    stdio: ['pipe', 'pipe', 'pipe'] // Suppress stderr
  }).trim();
} catch (error) {
  console.warn('Git not available, using fallback commit ID');
}
```

### Edge Case 4: Long Branch Names

**Scenario**: Branch name exceeds UI layout constraints

**Test**: Branch name `feature/PROJ-1234-implement-really-long-feature-name-that-describes-everything`

**UI Impact**:
- Desktop: 60+ chars may wrap or overflow
- Mobile: 30+ chars will definitely wrap

**Solution Options**:
1. Truncate in UI only (keep full name in API)
2. Use CSS `text-overflow: ellipsis`
3. Add line break after version

**Decision**: Use CSS truncation with tooltip

**Implementation**:
```css
.version-text {
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
```

### Edge Case 5: Docker Build Without Git

**Scenario**: Dockerfile copies files but excludes `.git` (common practice)

**Current Dockerfile**:
```dockerfile
FROM base AS builder
COPY . .
RUN node scripts/generate-version.mjs && npm run build
```

**Test**: Does `.dockerignore` exclude `.git`?

```bash
cat .dockerignore | grep git
# (No output - .git is NOT excluded) ✅
```

**Result**: ✅ `.git` is available during build

**Action**: No change needed. Build script runs before files are copied to runtime image.

### Edge Case 6: Modified Working Tree (Development)

**Scenario**: Developer has uncommitted changes

**Test**:
```bash
echo "test" >> src/lib/version.ts
git status --porcelain
# Output:  M src/lib/version.ts

git rev-parse --short=7 HEAD
# Output: 1ce5e97 (unchanged)
```

**Result**: Git commands return committed SHA, ignore uncommitted changes

**Decision**: Optionally append `-dirty` suffix in development only

**Implementation**:
```javascript
if (process.env.NODE_ENV !== 'production') {
  const isDirty = execSync('git status --porcelain', { encoding: 'utf8' }).trim().length > 0;
  if (isDirty) {
    commit += '-dirty';
  }
}
```

## Alternative Approaches Considered

### Alternative 1: Runtime Git Detection

**Approach**: Run Git commands at request time instead of build time

**Pros**:
- Always up-to-date (reflects current commit)
- No build step required

**Cons**:
- ❌ Requires `.git` directory in production (security risk)
- ❌ Performance overhead on every request
- ❌ Doesn't work on Edge Runtime (no `child_process`)
- ❌ Docker images shouldn't include `.git`

**Decision**: ❌ Rejected - Build-time detection is superior

### Alternative 2: Environment Variables Only

**Approach**: Use CI/CD environment variables instead of Git commands

**Pros**:
- No Git dependency
- Fast (no command execution)

**Cons**:
- ❌ Doesn't work in local development
- ❌ CI-specific (not portable)
- ❌ Requires different code for each CI platform

**Decision**: ❌ Rejected as primary approach - Keep as potential fallback

### Alternative 3: Git Tag as Version

**Approach**: Use Git tags (e.g., `v1.0.0-beta.5`) instead of package.json

**Pros**:
- Single source of truth
- Git-native versioning

**Cons**:
- ❌ Breaks npm version workflow
- ❌ Complicates release process
- ❌ package.json still needs version for npm ecosystem

**Decision**: ❌ Rejected - package.json is canonical version source

### Alternative 4: Build ID Instead of Commit SHA

**Approach**: Generate random build ID at build time

**Pros**:
- No Git dependency
- Simple implementation

**Cons**:
- ❌ Not correlated to source code
- ❌ Can't look up code from build ID
- ❌ No value over commit SHA

**Decision**: ❌ Rejected - Commit SHA is more useful

## Best Practices Consulted

### Industry Examples

**Docker**: `docker version`
```
Client: Docker Engine - Community
 Version:           24.0.7
 Git commit:        afdd53b
```

**Kubernetes**: `kubectl version`
```
Client Version: v1.28.2
GitCommit:      89a4ea3e1e4ddd7f7572286090359983e0387b2f
```

**Node.js**: `node --version`
```
v22.0.0
```
(Commit SHA not shown - semver only)

**GitHub API**: `GET /meta`
```json
{
  "verifiable_password_authentication": true,
  "github_services_sha": "3f0e5c2"
}
```

**npm CLI**: `npm --version`
```
10.2.3
```
(Commit SHA not shown - semver only)

**Conclusion**: Most tools show commit SHA for infrastructure (Docker, Kubernetes) but not for application-level tools (Node.js, npm). HD Homey is infrastructure for TV streaming, so showing commit SHA aligns with industry practice.

## Technology Choices

### Choice 1: Node.js Built-in `child_process`

**Alternatives Considered**:
- `simple-git` package (npm)
- `isomorphic-git` package (pure JS)
- Manual file parsing (`.git/HEAD`, `.git/refs/`)

**Decision**: Use `child_process.execSync()`

**Rationale**:
- ✅ No new dependencies
- ✅ Standard library, well-tested
- ✅ Synchronous execution suitable for build script
- ✅ Direct access to Git CLI (most reliable)
- ✅ Minimal code (2-3 lines per command)

### Choice 2: Build-Time Generation

**Alternatives Considered**:
- Runtime generation (rejected - see Alternative 1)
- Manual version file (rejected - not automated)

**Decision**: Generate `version.json` during build

**Rationale**:
- ✅ Works in all deployment environments
- ✅ No runtime overhead
- ✅ Integrates with existing build process
- ✅ Compatible with Edge Runtime

### Choice 3: JSON Response Format

**Alternatives Considered**:
- Plain text
- XML
- YAML

**Decision**: JSON

**Rationale**:
- ✅ Industry standard for APIs
- ✅ Easy to parse in all languages
- ✅ Native Next.js API route support
- ✅ Consistent with other HD Homey APIs

## Research Conclusions

### Key Findings

1. **Git commands are reliable** across most environments (full clone, shallow clone, main/feature branches)
2. **Detached HEAD is detectable** by filtering "HEAD" response from `git rev-parse --abbrev-ref HEAD`
3. **Graceful fallbacks are essential** for missing Git, corrupted repos, or stripped Docker images
4. **Version format matters** for usability - parentheses are more readable than plus signs
5. **7-character short SHA is sufficient** for uniqueness in most projects
6. **Build-time generation is superior** to runtime detection for performance and compatibility
7. **CI/CD environment variables are inconsistent** - Git commands are more portable
8. **Dirty state detection is valuable** for development but should be excluded from production

### Recommended Implementation

```javascript
// scripts/generate-version.mjs (enhanced)
function getGitMetadata() {
  let commit = 'unknown';
  let branch = null;
  
  try {
    // Get commit SHA (works in all Git environments)
    commit = execSync('git rev-parse --short=7 HEAD', { 
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'pipe']
    }).trim();
    
    // Get branch name (filter out detached HEAD)
    branch = execSync('git rev-parse --abbrev-ref HEAD', { 
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'pipe']
    }).trim();
    
    if (branch === 'HEAD') {
      branch = null; // Detached HEAD
    }
    
    // Check for dirty working tree (development only)
    if (process.env.NODE_ENV !== 'production') {
      const isDirty = execSync('git status --porcelain', { 
        encoding: 'utf8',
        stdio: ['pipe', 'pipe', 'pipe']
      }).trim().length > 0;
      
      if (isDirty) {
        commit += '-dirty';
      }
    }
  } catch (error) {
    console.warn('Git metadata extraction failed:', error.message);
    // Fallback values already set
  }
  
  return { commit, branch };
}

const { commit, branch } = getGitMetadata();
const version = packageJson.version;
const buildDate = new Date().toISOString();
const environment = process.env.NODE_ENV === 'production' ? 'production' : 'development';

const versionData = {
  version,
  commit,
  branch,
  buildDate,
  environment
};

writeFileSync('version.json', JSON.stringify(versionData, null, 2));
```

### Next Steps

1. ✅ Research complete - Git commands validated
2. ⏭️ Create data model documentation
3. ⏭️ Create API contracts
4. ⏭️ Create quickstart validation scenarios
5. ⏭️ Proceed to tasking phase
