# Implementation Tasks: Phase 0 - Monorepo Reorganization

**Branch**: `013-android-app-phase0` | **Date**: 2025-12-12 | **Status**: Ready for Implementation

## Task Overview

This document breaks down the Phase 0 monorepo reorganization into ordered, actionable tasks. All tasks must be completed in a single commit to avoid partial state (NFR-P0-006).

**Total Estimated Tasks**: 18  
**Estimated Effort**: 8-12 hours (1-2 days)  
**Strategy**: "Big Bang" - all changes in one commit

---

## Pre-Migration Tasks

### Task 0.1: Capture Baseline Metrics
**Priority**: P1 - Critical Path  
**Effort**: 15 minutes  
**Dependencies**: None

**Objective**: Document current state for comparison after migration.

**Implementation**:
```bash
# Test count
npm test | tee baseline-tests.txt
# Note: Should see ~340 tests passing

# Docker build time
time docker compose build | tee baseline-docker-build.txt

# Dev server startup
npm run dev
# Verify http://localhost:3000 works
# Note startup time

# List all root files
ls -la > baseline-files.txt

# Commit baseline (temporary, for reference only)
git add baseline-*.txt
git commit -m "chore: capture baseline metrics for Phase 0 migration"
```

**Acceptance Criteria**:
- ✅ Test count documented (~340 tests)
- ✅ Docker build time noted
- ✅ Dev server confirmed working
- ✅ File list captured

---

## Phase 1: Repository Structure Setup

### Task 1.1: Create Feature Branch
**Priority**: P1 - Critical Path  
**Effort**: 5 minutes  
**Dependencies**: Task 0.1

**Objective**: Create isolated branch for Phase 0 migration.

**Implementation**:
```bash
# Ensure clean working directory
git status

# Create and checkout new branch
git checkout -b 013-android-app-phase0

# Verify branch
git branch --show-current
# Expected: 013-android-app-phase0
```

**Acceptance Criteria**:
- ✅ Branch created: `013-android-app-phase0`
- ✅ No uncommitted changes
- ✅ Ready for file moves

---

### Task 1.2: Create Monorepo Directory Structure
**Priority**: P1 - Critical Path  
**Effort**: 5 minutes  
**Dependencies**: Task 1.1

**Objective**: Create apps/ directory and subdirectories.

**Implementation**:
```bash
# Create directory structure
mkdir -p apps/web
mkdir -p apps/docs
mkdir -p apps/android

# Verify structure
tree -L 2 apps/
```

**Acceptance Criteria**:
- ✅ `apps/web/` directory created
- ✅ `apps/docs/` directory created
- ✅ `apps/android/` directory created

---

## Phase 2: Move Files to apps/web/

### Task 2.1: Move Source Code Directories
**Priority**: P1 - Critical Path  
**Effort**: 10 minutes  
**Dependencies**: Task 1.2

**Objective**: Move main source directories to apps/web/.

**Implementation**:
```bash
# Move directories
git mv src apps/web/
git mv public apps/web/
git mv scripts apps/web/

# Verify moves
ls -la apps/web/
# Expected: src/, public/, scripts/ present
```

**Acceptance Criteria**:
- ✅ `src/` moved to `apps/web/src/`
- ✅ `public/` moved to `apps/web/public/`
- ✅ `scripts/` moved to `apps/web/scripts/`
- ✅ Git tracks moves (not delete + add)

---

### Task 2.2: Move Configuration Files
**Priority**: P1 - Critical Path  
**Effort**: 15 minutes  
**Dependencies**: Task 2.1

**Objective**: Move all Next.js and build config files to apps/web/.

**Implementation**:
```bash
# Move config files
git mv package.json apps/web/
git mv package-lock.json apps/web/
git mv tsconfig.json apps/web/
git mv next.config.mjs apps/web/
git mv next-env.d.ts apps/web/
git mv vitest.config.mts apps/web/
git mv vitest.setup.ts apps/web/
git mv eslint.config.mjs apps/web/
git mv drizzle.config.ts apps/web/
git mv new-types.d.ts apps/web/

# Move Docker files
git mv Dockerfile apps/web/
git mv docker-entrypoint.sh apps/web/
git mv .dockerignore apps/web/

# Move version file if exists
git mv version.json apps/web/ 2>/dev/null || echo "version.json not present (OK)"

# Verify
ls -la apps/web/*.{json,ts,mjs,mts} 2>/dev/null
ls -la apps/web/Dockerfile apps/web/.dockerignore
```

**Acceptance Criteria**:
- ✅ All config files moved to `apps/web/`
- ✅ Docker files in `apps/web/`
- ✅ Git tracks all moves

---

### Task 2.3: Move Docs to apps/docs/
**Priority**: P1 - Critical Path  
**Effort**: 5 minutes  
**Dependencies**: Task 1.2

**Objective**: Move VitePress docs directory.

**Implementation**:
```bash
# Move entire docs directory
git mv docs/* apps/docs/
git mv docs/.vitepress apps/docs/
git mv docs/.gitignore apps/docs/ 2>/dev/null || true

# Remove old docs directory (now empty)
rmdir docs

# Verify
ls -la apps/docs/
# Expected: .vitepress/, package.json, index.md, etc.
```

**Acceptance Criteria**:
- ✅ All docs files moved to `apps/docs/`
- ✅ `.vitepress/` directory moved
- ✅ Old `docs/` directory removed

---

### Task 2.4: Create Android Placeholder
**Priority**: P1 - Critical Path  
**Effort**: 5 minutes  
**Dependencies**: Task 1.2

**Objective**: Create empty apps/android/ directory with placeholder (FR-P0-010).

**Implementation**:
```bash
# Create .gitkeep to preserve directory in Git
touch apps/android/.gitkeep

# Create README
cat > apps/android/README.md << 'EOF'
# HD Homey Android App

This directory is reserved for the Android app implementation (SPEC-013 Phase 1+).

## Status

🚧 **Under Development** - Phase 0 (repository reorganization) complete.

## Next Steps

Phase 1 of Android app development will begin after Phase 0 is merged to main.

See `.specify/features/013-android-app.md` for the complete specification.
EOF

# Verify
ls -la apps/android/
cat apps/android/README.md
```

**Acceptance Criteria**:
- ✅ `apps/android/.gitkeep` created
- ✅ `apps/android/README.md` created
- ✅ Directory tracked by Git

---

## Phase 3: Update Configuration Files

### Task 3.1: Create Root package.json (Workspace Coordinator)
**Priority**: P1 - Critical Path  
**Effort**: 20 minutes  
**Dependencies**: Task 2.2, Task 2.3

**Objective**: Create new root package.json with npm workspaces (FR-P0-007).

**Implementation**:
```bash
# Create root package.json
cat > package.json << 'EOF'
{
  "name": "hd-homey-monorepo",
  "version": "1.0.0-beta.5",
  "description": "HD Homey monorepo - Next.js web app, Android app, and documentation",
  "private": true,
  "workspaces": [
    "apps/web",
    "apps/docs"
  ],
  "scripts": {
    "dev": "npm run dev --workspace=apps/web",
    "build": "npm run build --workspaces",
    "start": "npm run start --workspace=apps/web",
    "test": "npm run test --workspace=apps/web",
    "test:coverage": "npm run test:coverage --workspace=apps/web",
    "lint": "npm run lint --workspaces --if-present",
    "typecheck": "npm run typecheck --workspace=apps/web",
    "web:dev": "npm run dev --workspace=apps/web",
    "web:build": "npm run build --workspace=apps/web",
    "web:start": "npm run start --workspace=apps/web",
    "web:test": "npm run test --workspace=apps/web",
    "web:lint": "npm run lint --workspace=apps/web",
    "web:typecheck": "npm run typecheck --workspace=apps/web",
    "docs:dev": "npm run docs:dev --workspace=apps/docs",
    "docs:build": "npm run docs:build --workspace=apps/docs",
    "docs:preview": "npm run docs:preview --workspace=apps/docs",
    "docs:lint": "npm run lint --workspace=apps/docs",
    "db:push": "npm run db:push --workspace=apps/web",
    "db:generate": "npm run db:generate --workspace=apps/web",
    "db:studio": "npm run db:studio --workspace=apps/web",
    "db:migrate": "npm run db:migrate --workspace=apps/web"
  },
  "keywords": [
    "hdhomerun",
    "streaming",
    "tv",
    "monorepo"
  ],
  "author": "Shaun Burdick",
  "license": "AGPL-3.0-only",
  "repository": {
    "type": "git",
    "url": "https://github.com/shaunburdick/hd-homey.git"
  },
  "engines": {
    "node": ">=22.0.0"
  }
}
EOF

# Add to Git
git add package.json
```

**Acceptance Criteria**:
- ✅ Root `package.json` created with workspaces
- ✅ Hybrid scripts (shortcuts + explicit) defined
- ✅ All db:* scripts delegated to apps/web

---

### Task 3.2: Update apps/web/package.json
**Priority**: P1 - Critical Path  
**Effort**: 10 minutes  
**Dependencies**: Task 2.2

**Objective**: Update web app package.json name for workspace.

**Implementation**:
```bash
# Edit apps/web/package.json
# Change name from "hd-homey" to "@hd-homey/web"
sed -i 's/"name": "hd-homey"/"name": "@hd-homey\/web"/' apps/web/package.json

# Verify
grep '"name"' apps/web/package.json
# Expected: "name": "@hd-homey/web"

# Git add
git add apps/web/package.json
```

**Acceptance Criteria**:
- ✅ Package name changed to `@hd-homey/web`
- ✅ All other fields unchanged

---

### Task 3.3: Update apps/web/drizzle.config.ts (Migrations Path)
**Priority**: P1 - Critical Path  
**Effort**: 10 minutes  
**Dependencies**: Task 2.2

**Objective**: Update migrations output path to point to root (FR-P0-004).

**Implementation**:
```bash
# Edit apps/web/drizzle.config.ts
# Change: out: './migrations'
# To: out: '../../migrations'
```

**Manual Edit Required**: Open `apps/web/drizzle.config.ts` and update:

```typescript
// Before:
export default defineConfig({
  // ...
  out: './migrations',
});

// After:
export default defineConfig({
  // ...
  out: '../../migrations',
});
```

**Verification**:
```bash
grep "out:" apps/web/drizzle.config.ts
# Expected: out: '../../migrations'

git add apps/web/drizzle.config.ts
```

**Acceptance Criteria**:
- ✅ Migrations path points to `../../migrations`
- ✅ File compiles without errors

---

### Task 3.4: Update apps/web/Dockerfile (Migrations Copy)
**Priority**: P1 - Critical Path  
**Effort**: 15 minutes  
**Dependencies**: Task 2.2

**Objective**: Update Dockerfile to copy migrations from monorepo root (FR-P0-005).

**Implementation**:

**Manual Edit Required**: Open `apps/web/Dockerfile` and update line 45:

```dockerfile
# Before:
COPY --from=builder /app/migrations ./migrations

# After:
# Copy migrations from monorepo root (../../migrations from context)
COPY --from=builder /app/../../migrations ./migrations
```

Wait, that won't work with the new context. Let me reconsider...

**Actually**: Since Docker build context is now `apps/web/`, we need a different approach.

**Better Implementation**:

```dockerfile
# In the builder stage, we need to copy migrations from parent directory
# The COPY command sees paths relative to the build context (apps/web/)

# Add after line 23 (after COPY . .):
# Before:
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# After:
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# Copy migrations from parent directory (monorepo root)
COPY ../../migrations ./migrations

# Then in runner stage, line 45 stays the same:
COPY --from=builder /app/migrations ./migrations
```

**Verification**:
```bash
grep -A2 "COPY.*migrations" apps/web/Dockerfile

git add apps/web/Dockerfile
```

**Acceptance Criteria**:
- ✅ Dockerfile copies migrations from `../../migrations`
- ✅ Migrations available in final image

---

### Task 3.5: Update compose.yml (Build Context)
**Priority**: P1 - Critical Path  
**Effort**: 10 minutes  
**Dependencies**: Task 2.2

**Objective**: Update Docker Compose to use apps/web context (FR-P0-006).

**Implementation**:

**Manual Edit Required**: Open `compose.yml` and update:

```yaml
# Before:
services:
    hd-homey:
        build:
            context: .
            dockerfile: ./Dockerfile

# After:
services:
    hd-homey:
        build:
            context: ./apps/web
            dockerfile: Dockerfile
```

**Verification**:
```bash
grep -A3 "build:" compose.yml

git add compose.yml
```

**Acceptance Criteria**:
- ✅ Build context changed to `./apps/web`
- ✅ Dockerfile path is just `Dockerfile` (relative to context)

---

### Task 3.6: Update .gitignore for Monorepo
**Priority**: P2  
**Effort**: 10 minutes  
**Dependencies**: None

**Objective**: Update .gitignore with monorepo-aware paths.

**Implementation**:

**Manual Edit Required**: Open `.gitignore` and update paths:

```gitignore
# Dependencies
node_modules/
apps/*/node_modules/
**/node_modules/

# Next.js
.next/
apps/web/.next/
out/
apps/web/out/

# Testing
coverage/
apps/web/coverage/
apps/*/coverage/

# VitePress
.vitepress/dist/
.vitepress/cache/
apps/docs/.vitepress/dist/
apps/docs/.vitepress/cache/

# Environment
.env*.local
apps/*/.env*.local

# Misc
.DS_Store
*.pem

# Debug
npm-debug.log*
yarn-debug.log*
yarn-error.log*

# Local
.vercel
.vscode/*
!.vscode/extensions.json

# Data (database and transcoding)
data/
apps/web/data/

# TypeScript
*.tsbuildinfo
next-env.d.ts
apps/web/next-env.d.ts

# Baseline files (temporary)
baseline-*.txt
```

**Verification**:
```bash
git add .gitignore
```

**Acceptance Criteria**:
- ✅ Monorepo paths added (`apps/*/`)
- ✅ Old single-app paths kept for compatibility

---

## Phase 4: Update CI/CD Workflows

### Task 4.1: Update .github/workflows/test.yml
**Priority**: P1 - Critical Path  
**Effort**: 30 minutes  
**Dependencies**: Task 3.1, Task 3.2

**Objective**: Update test workflow with working-directory for apps/web (FR-P0-008).

**Implementation**:

**Manual Edit Required**: Open `.github/workflows/test.yml` and update all jobs:

**Changes needed**:

1. **Lint job** - Add working-directory to web lint steps:
```yaml
lint:
    # ... existing setup
    steps:
        - name: Checkout
          uses: actions/checkout@v4

        - name: Setup Node.js
          uses: actions/setup-node@v4
          with:
              node-version: ${{ env.NODE_VERSION }}
              cache: npm

        - name: Install root dependencies
          run: npm ci --prefer-offline

        - name: Run ESLint (web)
          working-directory: apps/web
          run: npm run lint

        - name: Run ESLint (docs)
          working-directory: apps/docs
          run: npm run lint
```

2. **Typecheck job** - Add working-directory:
```yaml
typecheck:
    # ... existing setup
    steps:
        - name: Checkout
          uses: actions/checkout@v4

        - name: Setup Node.js
          uses: actions/setup-node@v4
          with:
              node-version: ${{ env.NODE_VERSION }}
              cache: npm

        - name: Install root dependencies
          run: npm ci --prefer-offline

        - name: Generate Next.js types
          working-directory: apps/web
          run: npx next typegen

        - name: Run TypeScript compiler
          working-directory: apps/web
          run: npx tsc --noEmit
```

3. **Test job** - Add working-directory:
```yaml
test:
    # ... existing setup
    steps:
        - name: Checkout
          uses: actions/checkout@v4

        - name: Setup Node.js
          uses: actions/setup-node@v4
          with:
              node-version: ${{ env.NODE_VERSION }}
              cache: npm

        - name: Install root dependencies
          run: npm ci --prefer-offline

        - name: Run tests with coverage
          working-directory: apps/web
          run: npm run test:coverage

        - name: Upload coverage reports
          if: always()
          uses: actions/upload-artifact@v4
          with:
              name: coverage-report
              path: apps/web/coverage/
              retention-days: 7
```

4. **Build job** - Add working-directory and update cache paths:
```yaml
build:
    # ... existing setup
    steps:
        - name: Checkout
          uses: actions/checkout@v4

        - name: Setup Node.js
          uses: actions/setup-node@v4
          with:
              node-version: ${{ env.NODE_VERSION }}
              cache: npm

        - name: Install root dependencies
          run: npm ci --prefer-offline

        - name: Restore Next.js cache
          uses: actions/cache@v4
          with:
              path: |
                  apps/web/.next/cache
              key: ${{ runner.os }}-nextjs-${{ hashFiles('package-lock.json') }}-${{ hashFiles('apps/web/**/*.ts', 'apps/web/**/*.tsx', 'apps/web/**/*.js', 'apps/web/**/*.jsx') }}
              restore-keys: |
                  ${{ runner.os }}-nextjs-${{ hashFiles('package-lock.json') }}-

        - name: Build Next.js application
          working-directory: apps/web
          run: npm run build

        - name: Upload build artifacts
          uses: actions/upload-artifact@v4
          with:
              name: nextjs-build
              path: |
                  apps/web/.next/
                  !apps/web/.next/cache
              retention-days: 7
```

**Verification**:
```bash
git add .github/workflows/test.yml
```

**Acceptance Criteria**:
- ✅ All jobs updated with working-directory
- ✅ Cache paths use `apps/web/` prefix
- ✅ Artifact paths use `apps/web/` prefix

---

### Task 4.2: Update .github/workflows/docker.yml
**Priority**: P1 - Critical Path  
**Effort**: 20 minutes  
**Dependencies**: Task 3.5

**Objective**: Update Docker workflow with new build context.

**Implementation**:

**Manual Edit Required**: Open `.github/workflows/docker.yml` and update:

1. **Version generation step**:
```yaml
- name: Generate version.json with Git metadata
  working-directory: apps/web
  run: |
    node scripts/generate-version.mjs
    echo "Generated version.json:"
    cat version.json
  env:
    NODE_ENV: production
```

2. **Docker build step** - Update context:
```yaml
- name: Build and push Docker image by digest
  id: build
  uses: docker/build-push-action@v6
  with:
    context: ./apps/web
    platforms: linux/amd64
    # ... rest unchanged
```

**Verification**:
```bash
git add .github/workflows/docker.yml
```

**Acceptance Criteria**:
- ✅ Version generation uses `working-directory: apps/web`
- ✅ Docker build context is `./apps/web`

---

### Task 4.3: Update .github/workflows/docs.yml
**Priority**: P1 - Critical Path  
**Effort**: 15 minutes  
**Dependencies**: Task 2.3

**Objective**: Update docs workflow for apps/docs path (FR-P0-008, NFR-P0-005).

**Implementation**:

**Manual Edit Required**: Open `.github/workflows/docs.yml` and update:

```yaml
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v4
        with:
          fetch-depth: 0

      - name: Setup Node
        uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm
          cache-dependency-path: apps/docs/package-lock.json

      - name: Setup Pages
        uses: actions/configure-pages@v4

      - name: Install dependencies
        working-directory: apps/docs
        run: npm ci

      - name: Build with VitePress
        working-directory: apps/docs
        run: npm run docs:build

      - name: Upload artifact
        uses: actions/upload-artifact@v3
        with:
          path: apps/docs/.vitepress/dist
```

**Verification**:
```bash
git add .github/workflows/docs.yml
```

**Acceptance Criteria**:
- ✅ Cache path points to `apps/docs/package-lock.json`
- ✅ Install and build use `working-directory: apps/docs`
- ✅ Upload artifact path is `apps/docs/.vitepress/dist`

---

## Phase 5: Update Documentation

### Task 5.1: Update README.md (Project Overview)
**Priority**: P2  
**Effort**: 20 minutes  
**Dependencies**: All file moves complete

**Objective**: Update README with new monorepo structure (FR-P0-009).

**Implementation**:

**Manual Edit Required**: Open `README.md` and update:

1. **Directory structure section** (if exists):
```markdown
## Repository Structure

This project uses a monorepo structure:

- `apps/web/` - Next.js web application (backend + UI)
- `apps/docs/` - VitePress documentation site
- `apps/android/` - Android app (under development)
- `migrations/` - Database migrations
- `.specify/` - Feature specifications
- `specs/` - Implementation plans
```

2. **Installation section** - No changes needed! Commands still work:
```markdown
npm install
npm run dev
```

3. **Docker section** - Mention updated context (optional):
```markdown
The Docker build uses `apps/web/` as the build context.
```

**Verification**:
```bash
git add README.md
```

**Acceptance Criteria**:
- ✅ Structure diagram updated
- ✅ Commands still user-friendly
- ✅ Links work (if any file links present)

---

### Task 5.2: Update AGENTS.md (AI Agent Guide)
**Priority**: P2  
**Effort**: 30 minutes  
**Dependencies**: All file moves complete

**Objective**: Update agent documentation with new paths (FR-P0-009).

**Implementation**:

**Manual Edit Required**: Open `AGENTS.md` and update:

1. **Directory Structure section** (around line 45):
```markdown
### Directory Structure
```
apps/
├── web/              # Next.js App Router
│   ├── src/          # Source code
│   │   ├── app/      # Pages and API routes
│   │   ├── components/ # React components
│   │   └── lib/      # Utilities
│   ├── public/       # Static assets
│   ├── scripts/      # Build scripts
│   ├── Dockerfile    # Docker build
│   └── package.json  # Dependencies
├── docs/             # VitePress docs
│   ├── .vitepress/   # VitePress config
│   └── package.json
└── android/          # Android app (future)
migrations/           # Database migrations
.specify/             # Specifications
specs/                # Implementation plans
compose.yml           # Docker Compose
package.json          # Root workspace
```
```

2. **Update all file path references** throughout document:
- `src/` → `apps/web/src/`
- `package.json` → `apps/web/package.json`
- `Dockerfile` → `apps/web/Dockerfile`
- etc.

3. **Update Common Tasks section** commands (if needed):
Most commands stay the same: `npm run dev`, `npm test`, etc.

**Verification**:
```bash
git add AGENTS.md
```

**Acceptance Criteria**:
- ✅ Directory structure updated
- ✅ All file path examples updated
- ✅ Commands still work as documented

---

### Task 5.3: Update CHANGELOG.md
**Priority**: P2  
**Effort**: 15 minutes  
**Dependencies**: All implementation complete

**Objective**: Document Phase 0 migration in changelog.

**Implementation**:

**Manual Edit Required**: Open `CHANGELOG.md` and add under `## [Unreleased]`:

```markdown
## [Unreleased]

### Changed
- **[BREAKING]** Repository reorganized into monorepo structure for Android app support
  - Next.js web app moved to `apps/web/`
  - VitePress docs moved to `apps/docs/`
  - Created `apps/android/` directory (reserved for future Android app)
  - Added npm workspaces configuration at root
  - Updated Docker build context to `apps/web/`
  - Updated all CI/CD workflows for new paths
  - Database migrations remain at repository root
  - User-facing commands unchanged (`npm run dev`, `npm test`, etc.)
  
### Infrastructure
- Adopt npm workspaces for monorepo management
- Per-app Dockerfiles with app-specific build context
- Hybrid workspace scripts (shortcuts + explicit commands)

**Migration Impact**: 
- Developers: Re-run `npm install` after pulling this change
- Docker users: `docker compose build` works unchanged
- CI/CD: All workflows updated, no action needed
- End users: No impact, application functionality unchanged
```

**Verification**:
```bash
git add CHANGELOG.md
```

**Acceptance Criteria**:
- ✅ Migration documented under Unreleased
- ✅ Breaking change clearly marked
- ✅ Impact assessment included

---

## Phase 6: Validation & Testing

### Task 6.1: Install Dependencies and Verify Workspaces
**Priority**: P1 - Critical Path  
**Effort**: 15 minutes  
**Dependencies**: All Phase 3 tasks complete

**Objective**: Verify npm workspaces install correctly.

**Implementation**:
```bash
# Clean install
rm -rf node_modules apps/*/node_modules
npm install

# Verify workspaces installed
ls -la node_modules/.bin/next
ls -la node_modules/.bin/vitepress
ls -la apps/web/node_modules/
ls -la apps/docs/node_modules/

# Check workspace info
npm ls --workspaces
```

**Acceptance Criteria**:
- ✅ Root node_modules created
- ✅ apps/web/node_modules has dependencies
- ✅ apps/docs/node_modules has dependencies
- ✅ No installation errors

---

### Task 6.2: Test Development Workflow
**Priority**: P1 - Critical Path  
**Effort**: 15 minutes  
**Dependencies**: Task 6.1

**Objective**: Verify dev commands work (NFR-P0-003).

**Implementation**:
```bash
# Test web dev server
npm run dev
# Verify: Opens http://localhost:3000
# Stop with Ctrl+C

# Test docs dev server
npm run docs:dev
# Verify: Opens http://localhost:5173/hd-homey/
# Stop with Ctrl+C

# Test explicit commands
npm run web:dev
npm run docs:dev
```

**Acceptance Criteria**:
- ✅ `npm run dev` starts web app
- ✅ `npm run docs:dev` starts docs
- ✅ Both servers accessible
- ✅ No errors in console

---

### Task 6.3: Run Tests and Verify Count
**Priority**: P1 - Critical Path  
**Effort**: 10 minutes  
**Dependencies**: Task 6.1

**Objective**: Verify all tests pass (NFR-P0-001).

**Implementation**:
```bash
# Run tests
npm test

# Compare with baseline
# Expected: Same ~340 tests passing

# Run coverage
npm run test:coverage

# Verify coverage report
ls -la apps/web/coverage/
```

**Acceptance Criteria**:
- ✅ All 340 tests passing
- ✅ Same test count as baseline
- ✅ Coverage report generated
- ✅ No new test failures

---

### Task 6.4: Run Linting and Type Checking
**Priority**: P1 - Critical Path  
**Effort**: 10 minutes  
**Dependencies**: Task 6.1

**Objective**: Verify quality checks pass.

**Implementation**:
```bash
# Lint all workspaces
npm run lint
# Expected: Lints apps/web and apps/docs

# Type check
npm run typecheck
# Expected: TypeScript compiles

# Test explicit commands
npm run web:lint
npm run docs:lint
```

**Acceptance Criteria**:
- ✅ Linting passes (or same errors as baseline)
- ✅ Type checking passes
- ✅ No new issues introduced

---

### Task 6.5: Test Production Build
**Priority**: P1 - Critical Path  
**Effort**: 15 minutes  
**Dependencies**: Task 6.1

**Objective**: Verify build works.

**Implementation**:
```bash
# Build all workspaces
npm run build

# Verify outputs
ls -la apps/web/.next/standalone/
ls -la apps/docs/.vitepress/dist/

# Test explicit build
npm run web:build
npm run docs:build
```

**Acceptance Criteria**:
- ✅ Web app builds successfully
- ✅ Docs build successfully
- ✅ Build outputs in correct locations

---

### Task 6.6: Test Docker Build and Run
**Priority**: P1 - Critical Path  
**Effort**: 20 minutes  
**Dependencies**: Task 3.4, Task 3.5

**Objective**: Verify Docker works with new context (NFR-P0-002, NFR-P0-004).

**Implementation**:
```bash
# Build Docker image
docker compose build

# Check build succeeded
docker images | grep hd-homey

# Start container
docker compose up -d

# Check health
docker compose ps
docker compose logs hd-homey | tail -20

# Test health endpoint
curl http://localhost:3000/api/health

# Access in browser
open http://localhost:3000

# Stop container
docker compose down
```

**Acceptance Criteria**:
- ✅ Docker build succeeds
- ✅ Container starts healthy
- ✅ Web app accessible
- ✅ Migrations run successfully
- ✅ No errors in logs

---

### Task 6.7: Test Database Migrations
**Priority**: P1 - Critical Path  
**Effort**: 10 minutes  
**Dependencies**: Task 3.3, Task 6.1

**Objective**: Verify migrations accessible from apps/web/ (FR-P0-004).

**Implementation**:
```bash
# Check Drizzle config
cat apps/web/drizzle.config.ts | grep "out:"
# Expected: out: '../../migrations'

# List migrations
ls -la migrations/

# Test migration command
npm run db:migrate

# Verify database
ls -la apps/web/data/db/hd_homey.db

# Test Drizzle Studio (optional)
# npm run db:studio
```

**Acceptance Criteria**:
- ✅ Migrations path points to root
- ✅ `npm run db:migrate` works
- ✅ Database created successfully

---

## Phase 7: Commit and Push

### Task 7.1: Review All Changes
**Priority**: P1 - Critical Path  
**Effort**: 20 minutes  
**Dependencies**: All Phase 6 validation complete

**Objective**: Final review before committing.

**Implementation**:
```bash
# Check git status
git status

# Review all changes
git diff --cached

# Verify file moves tracked correctly
git status | grep "renamed:"

# Check for untracked files that should be added
git status | grep "Untracked files"

# Add any missed files
# git add <file>
```

**Acceptance Criteria**:
- ✅ All file moves tracked as renames
- ✅ All new files added (root package.json, android README, etc.)
- ✅ All updated files staged
- ✅ No unexpected changes

---

### Task 7.2: Commit Phase 0 Migration (Single Commit)
**Priority**: P1 - Critical Path  
**Effort**: 10 minutes  
**Dependencies**: Task 7.1

**Objective**: Commit all changes as single atomic commit (NFR-P0-006).

**Implementation**:
```bash
# Commit everything
git commit -m "feat: reorganize repository into monorepo structure (Phase 0)

Reorganize HD Homey repository from single-app to monorepo structure
to support Android app development (SPEC-013).

Repository Structure Changes:
- Move Next.js web app to apps/web/
- Move VitePress docs to apps/docs/
- Create apps/android/ directory (empty, ready for Phase 1)
- Add npm workspaces configuration at root
- Keep migrations/ at repository root (accessible to apps/web)

Configuration Updates:
- Root package.json with workspace scripts (hybrid approach)
- apps/web/package.json renamed to @hd-homey/web
- apps/web/drizzle.config.ts points to ../../migrations
- apps/web/Dockerfile copies migrations from parent directory
- compose.yml uses apps/web/ build context

CI/CD Updates:
- .github/workflows/test.yml uses working-directory for all jobs
- .github/workflows/docker.yml uses apps/web context
- .github/workflows/docs.yml uses apps/docs paths

Documentation Updates:
- README.md structure section updated
- AGENTS.md directory structure and examples updated
- CHANGELOG.md documents migration

User Impact:
- Development workflow unchanged (npm run dev works)
- Docker Compose unchanged (docker compose up works)
- All 340 tests passing
- No breaking changes for end users

Phase 0 Requirements:
✅ FR-P0-001: Monorepo structure implemented
✅ FR-P0-002: Web app moved to apps/web/
✅ FR-P0-003: Docs moved to apps/docs/
✅ FR-P0-004: Migrations accessible to web app
✅ FR-P0-005: Docker build works from apps/web/
✅ FR-P0-006: Docker Compose references apps/web/
✅ FR-P0-007: Root package.json defines workspaces
✅ FR-P0-008: CI/CD workflows updated
✅ FR-P0-009: Documentation updated
✅ FR-P0-010: apps/android/ created

✅ NFR-P0-001: All 340 tests passing
✅ NFR-P0-002: Docker build succeeds
✅ NFR-P0-003: Dev workflow works (npm run dev)
✅ NFR-P0-004: Production deployment works
✅ NFR-P0-005: GitHub Pages deployment will work
✅ NFR-P0-006: Single commit migration (this commit)

Closes #<issue-number-if-exists>

BREAKING CHANGE: Repository structure changed. Run 'npm install'
after pulling this change. Docker users can continue with
'docker compose up' unchanged."

# Verify commit
git show --stat HEAD
```

**Acceptance Criteria**:
- ✅ Single commit contains all changes
- ✅ Comprehensive commit message
- ✅ All requirements listed
- ✅ Breaking change noted

---

### Task 7.3: Push Branch and Create PR
**Priority**: P1 - Critical Path  
**Effort**: 15 minutes  
**Dependencies**: Task 7.2

**Objective**: Push branch and open PR for review.

**Implementation**:
```bash
# Push branch
git push origin 013-android-app-phase0

# Create PR via GitHub CLI (if available)
gh pr create \
  --title "feat: Phase 0 - Monorepo reorganization for Android app" \
  --body "$(cat <<'EOF'
## Summary

Reorganizes HD Homey repository from single-app to monorepo structure, enabling Android app development (SPEC-013 Phase 0).

## Changes

### Repository Structure
- ✅ Next.js web app moved to `apps/web/`
- ✅ VitePress docs moved to `apps/docs/`
- ✅ Created `apps/android/` directory (empty, ready for Phase 1)
- ✅ Added npm workspaces at root
- ✅ Migrations remain at root (accessible to web app)

### Configuration
- ✅ Root `package.json` with workspace scripts
- ✅ `apps/web/package.json` renamed to `@hd-homey/web`
- ✅ Drizzle config points to root migrations
- ✅ Dockerfile copies migrations from parent
- ✅ Docker Compose uses `apps/web/` context

### CI/CD
- ✅ All workflows updated with `working-directory`
- ✅ Docker workflow uses new context
- ✅ Docs workflow uses new paths

### Documentation
- ✅ README.md updated
- ✅ AGENTS.md updated
- ✅ CHANGELOG.md updated

## Testing

✅ All 340 tests passing  
✅ Docker build succeeds  
✅ `npm run dev` works  
✅ `npm run docs:dev` works  
✅ All quality checks pass (lint, typecheck)

## Phase 0 Requirements

All 10 Functional Requirements met (FR-P0-001 through FR-P0-010)  
All 6 Non-Functional Requirements met (NFR-P0-001 through NFR-P0-006)

## User Impact

- **Developers**: Run `npm install` after pulling
- **Docker users**: No changes needed (`docker compose up` works)
- **End users**: No impact (application unchanged)

## Next Steps

After merge:
1. Verify CI/CD workflows pass
2. Verify GitHub Pages deployment
3. Begin SPEC-013 Phase 1 (Android app development)

## Checklist

- [x] All files moved
- [x] All configurations updated
- [x] All tests passing
- [x] Docker build succeeds
- [x] Dev workflow works
- [x] Docs build succeeds
- [x] CI/CD workflows updated
- [x] Documentation updated
- [x] Single commit migration

Closes #<issue-number-if-exists>
EOF
)" \
  --label "infrastructure" \
  --label "breaking-change"

# Or open PR manually in browser
echo "Create PR at: https://github.com/shaunburdick/hd-homey/compare/013-android-app-phase0"
```

**Acceptance Criteria**:
- ✅ Branch pushed to origin
- ✅ PR created with detailed description
- ✅ Labels added (infrastructure, breaking-change)

---

## Phase 8: CI/CD Verification

### Task 8.1: Monitor CI/CD Workflows
**Priority**: P1 - Critical Path  
**Effort**: 30 minutes  
**Dependencies**: Task 7.3

**Objective**: Verify all workflows pass on GitHub Actions.

**Implementation**:
```bash
# Watch workflow runs
gh run watch

# Or check specific workflow
gh run list --workflow=test.yml
gh run list --workflow=docker.yml

# View logs if failures
gh run view <run-id> --log
```

**Expected Results**:
- ✅ Test workflow passes (lint, typecheck, test, build)
- ✅ Docker workflow builds image (if on main or PR to main)
- ✅ No workflow failures

**If Failures**: Fix issues, amend commit, force push:
```bash
# Fix issue
# ... make changes ...

# Amend commit
git add .
git commit --amend --no-edit

# Force push (updates PR)
git push origin 013-android-app-phase0 --force
```

**Acceptance Criteria**:
- ✅ All workflows green
- ✅ 340 tests passing in CI
- ✅ Docker build succeeds in CI

---

## Task Completion Checklist

### Pre-Migration
- [ ] Task 0.1: Capture baseline metrics

### Phase 1: Setup
- [ ] Task 1.1: Create feature branch
- [ ] Task 1.2: Create directory structure

### Phase 2: File Moves
- [ ] Task 2.1: Move source directories
- [ ] Task 2.2: Move config files
- [ ] Task 2.3: Move docs
- [ ] Task 2.4: Create Android placeholder

### Phase 3: Configuration
- [ ] Task 3.1: Create root package.json
- [ ] Task 3.2: Update apps/web/package.json
- [ ] Task 3.3: Update drizzle.config.ts
- [ ] Task 3.4: Update Dockerfile
- [ ] Task 3.5: Update compose.yml
- [ ] Task 3.6: Update .gitignore

### Phase 4: CI/CD
- [ ] Task 4.1: Update test.yml
- [ ] Task 4.2: Update docker.yml
- [ ] Task 4.3: Update docs.yml

### Phase 5: Documentation
- [ ] Task 5.1: Update README.md
- [ ] Task 5.2: Update AGENTS.md
- [ ] Task 5.3: Update CHANGELOG.md

### Phase 6: Validation
- [ ] Task 6.1: Install dependencies
- [ ] Task 6.2: Test dev workflow
- [ ] Task 6.3: Run tests
- [ ] Task 6.4: Run linting/typecheck
- [ ] Task 6.5: Test build
- [ ] Task 6.6: Test Docker
- [ ] Task 6.7: Test migrations

### Phase 7: Commit
- [ ] Task 7.1: Review all changes
- [ ] Task 7.2: Commit (single)
- [ ] Task 7.3: Push and create PR

### Phase 8: CI/CD
- [ ] Task 8.1: Monitor workflows

---

## Success Criteria

**Migration complete when**:
- ✅ All 18 tasks checked off
- ✅ All 340 tests passing locally
- ✅ Docker build succeeds locally
- ✅ All CI/CD workflows green
- ✅ PR approved and ready to merge
- ✅ No reported issues

**Ready to merge when**:
- ✅ All acceptance criteria met
- ✅ All validation scenarios pass
- ✅ PR approved (if review required)
- ✅ CI/CD all green

## Rollback Plan

If critical issues found after merge:
```bash
# Revert the migration commit
git revert <commit-sha>
git push origin main

# Or create rollback PR
git checkout -b rollback-phase0
git revert <commit-sha>
git push origin rollback-phase0
# Create PR
```

---

**Estimated Timeline**: 8-12 hours (1-2 days)  
**Status**: Ready for execution  
**Next**: Execute tasks in order, validate at each phase
