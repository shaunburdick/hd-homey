# Implementation Plan: Phase 0 - Monorepo Reorganization

**Branch**: `013-android-app-phase0` | **Date**: 2025-12-12 | **Spec**: [.specify/features/013-android-app.md](../../.specify/features/013-android-app.md)

## Summary

Reorganize HD Homey repository from single-app structure to monorepo structure to support Android app development. This is a **prerequisite** for SPEC-013 Android app implementation. The reorganization moves the Next.js web app to `apps/web/`, VitePress docs to `apps/docs/`, creates an empty `apps/android/` directory, and updates all paths, Docker configs, CI/CD workflows, and documentation to work with the new structure.

**Technical Approach**: Use npm workspaces (native, no Turborepo) with a hybrid script approach. Move files systematically in a single commit to avoid partial state. Update all references to maintain 100% functionality.

## Technical Context

**Language/Version**: Node.js 22+ / TypeScript 5  
**Primary Dependencies**: npm workspaces (built-in), no new dependencies  
**Storage**: File-based (all existing storage remains unchanged)  
**Testing**: Vitest (existing tests must all pass after migration)  
**Target Platform**: Next.js 16 App Router + VitePress docs  
**Project Type**: Monorepo reorganization (infrastructure change)  
**Performance Goals**: 
- No performance degradation after reorganization
- Build times should remain the same or improve
- CI/CD times should remain similar

**Constraints**: 
- Must maintain 100% backward compatibility (all 340 tests must pass)
- Must complete in single PR/commit (no partial state)
- Must not break Docker builds or deployments
- Must not break CI/CD pipelines
- Must not break GitHub Pages docs deployment
- Must not require users to change environment variables or configs

**Scale/Scope**: 
- Major infrastructure change affecting entire repository
- ~50-100 files to move or update
- 3 GitHub Actions workflows to update
- Multiple documentation files to update
- Estimated 1-2 days of work

## Constitution Check

✅ **Code Quality**: No code changes, only file moves and path updates  
✅ **Documentation**: Will update all documentation with new paths  
✅ **Security**: No security implications (file moves only)  
✅ **Testing**: All existing tests must pass (NFR-P0-001)  
✅ **Dependencies**: Zero new dependencies (uses native npm workspaces)  
✅ **Maintainability**: Improves organization, enables future platform expansion  
✅ **Simplicity First**: Uses native npm workspaces (no Turborepo/Lerna complexity)

**No violations identified** - this reorganization aligns with constitution principles and enables future Android development per Phase 0 requirements.

## Project Structure

### Current Structure (Before Migration)

```text
hd-homey/
├── .github/workflows/           # CI/CD workflows
├── .specify/                    # Specifications
├── docs/                        # VitePress docs (separate package)
├── migrations/                  # Database migrations
├── public/                      # Static assets
├── scripts/                     # Build scripts
├── specs/                       # Implementation plans
├── src/                         # Next.js source
│   ├── app/                     # App Router pages
│   ├── components/              # React components
│   └── lib/                     # Utilities
├── Dockerfile                   # Docker build
├── compose.yml                  # Docker Compose
├── package.json                 # Root dependencies
├── tsconfig.json                # TypeScript config
├── next.config.mjs              # Next.js config
├── vitest.config.mts            # Vitest config
└── ... (all config at root)
```

### Target Structure (After Migration)

```text
hd-homey/                        # Monorepo root
├── .github/workflows/           # CI/CD workflows (UPDATED)
├── .specify/                    # Specifications (UNCHANGED)
├── apps/
│   ├── web/                     # Next.js app (MOVED from root)
│   │   ├── src/                 # Source code (MOVED)
│   │   ├── public/              # Static assets (MOVED)
│   │   ├── scripts/             # Build scripts (MOVED)
│   │   ├── Dockerfile           # Per-app Docker (MOVED + UPDATED)
│   │   ├── package.json         # Web dependencies (MOVED)
│   │   ├── tsconfig.json        # TS config (MOVED)
│   │   ├── next.config.mjs      # Next.js config (MOVED)
│   │   ├── vitest.config.mts    # Vitest config (MOVED)
│   │   ├── vitest.setup.ts      # Vitest setup (MOVED)
│   │   ├── eslint.config.mjs    # ESLint config (MOVED)
│   │   ├── drizzle.config.ts    # Drizzle config (MOVED + UPDATED)
│   │   └── ... (all web app files)
│   ├── docs/                    # VitePress docs (MOVED)
│   │   ├── .vitepress/          # VitePress config
│   │   ├── package.json         # Docs dependencies
│   │   └── ... (all doc files)
│   └── android/                 # Android app (NEW, EMPTY)
│       └── .gitkeep             # Keep directory in Git
├── migrations/                  # Database migrations (UNCHANGED)
├── specs/                       # Implementation plans (UNCHANGED)
├── compose.yml                  # Docker Compose (UPDATED)
├── package.json                 # Root workspace (UPDATED)
├── .gitignore                   # Updated for monorepo
└── README.md                    # Updated with new structure
```

**Key Decisions**:
1. **`migrations/` stays at root**: Web app needs access via relative path `../../migrations/`
2. **`.specify/` and `specs/` stay at root**: Shared across all apps
3. **No shared packages**: Keep it simple, no `packages/` directory
4. **Per-app configs**: Each app has its own Dockerfile, package.json, configs
5. **Root package.json**: Workspace coordinator with convenience scripts

## Architecture Decisions

### 1. npm Workspaces (Native) vs Monorepo Tools

**Decision**: Use native npm workspaces, not Turborepo/Lerna/Nx.

**Rationale**:
- ✅ Native to npm (no new dependencies)
- ✅ Simple to understand and maintain
- ✅ Sufficient for our needs (web + docs + android)
- ✅ Follows "Simplicity First" principle
- ✅ Android uses Gradle (not npm), so advanced task orchestration not needed

**Alternatives Considered**:
- ❌ Turborepo: Overkill for 3 apps, adds complexity
- ❌ Lerna: Legacy tool, npm workspaces replaced it
- ❌ Nx: Too heavyweight for our needs

### 2. Workspace Script Strategy (Hybrid)

**Decision**: Hybrid approach with shortcuts + explicit scripts.

```json
{
  "scripts": {
    "dev": "npm run dev --workspace=apps/web",
    "build": "npm run build --workspaces",
    "test": "npm run test --workspace=apps/web",
    "lint": "npm run lint --workspaces",
    "web:dev": "npm run dev --workspace=apps/web",
    "web:build": "npm run build --workspace=apps/web",
    "web:test": "npm run test --workspace=apps/web",
    "docs:dev": "npm run docs:dev --workspace=apps/docs",
    "docs:build": "npm run docs:build --workspace=apps/docs"
  }
}
```

**Rationale**:
- ✅ `npm run dev` works as expected (most common command)
- ✅ Explicit `web:*` and `docs:*` when needed for clarity
- ✅ `--workspaces` for commands that should run everywhere (lint, build)
- ✅ Best of both worlds: convenience + clarity

### 3. Docker Build Context Strategy

**Decision**: Per-app Dockerfiles with app-specific build context.

**Before**:
```yaml
# compose.yml
services:
  hd-homey:
    build:
      context: .
      dockerfile: ./Dockerfile
```

**After**:
```yaml
# compose.yml
services:
  hd-homey:
    build:
      context: ./apps/web
      dockerfile: Dockerfile
```

**Rationale**:
- ✅ Simpler Dockerfile (no complex path navigation)
- ✅ Each app is self-contained
- ✅ Standard monorepo pattern
- ✅ Easier to understand and maintain
- ✅ Dockerfile can use relative paths (`.` is `apps/web/`)

**Important**: Dockerfile needs to copy migrations from `../../migrations/` since DB migrations stay at root.

### 4. Database Migrations Location

**Decision**: Keep `migrations/` at repository root (not in `apps/web/`).

**Rationale**:
- ✅ Migrations are data/schema, not application code
- ✅ Shared across deployments (not tied to web app version)
- ✅ Easier to manage separately for production DBA workflows
- ✅ Web app references via `../../migrations/` (relative path)

**Implementation**:
- `apps/web/drizzle.config.ts` updates: `out: '../../migrations'`
- Docker copies migrations: `COPY --from=builder ../../migrations ./migrations`

### 5. CI/CD Working Directory Strategy

**Decision**: Use `working-directory` in GitHub Actions steps.

**Example**:
```yaml
- name: Install dependencies
  working-directory: apps/web
  run: npm ci
```

**Rationale**:
- ✅ Explicit and clear
- ✅ Each job can work in different app directories
- ✅ No complex path juggling in scripts
- ✅ Easy to parallelize (lint web + lint docs simultaneously)

### 6. Version Synchronization

**Decision**: Keep web app and docs versioned together, Android separately.

**Implementation**:
- Root `package.json`: `"version": "1.0.0-beta.5"` (project version)
- `apps/web/package.json`: `"version": "1.0.0-beta.5"` (matches root)
- `apps/docs/package.json`: `"version": "1.0.0"` (docs version, less frequent)
- `apps/android/` (future): Independent version (e.g., `0.1-alpha`)

**Rationale**:
- ✅ Web app and docs evolve together
- ✅ Android has its own release cycle (APK versions)
- ✅ Simple to maintain

## Phase 0 Requirements (from Spec)

### Functional Requirements

- ✅ **FR-P0-001**: Repository MUST be reorganized into monorepo structure
- ✅ **FR-P0-002**: Next.js web app MUST be moved to `apps/web/` with all functionality intact
- ✅ **FR-P0-003**: VitePress docs MUST be moved to `apps/docs/`
- ✅ **FR-P0-004**: Database migrations MUST remain accessible to `apps/web/`
- ✅ **FR-P0-005**: Docker build MUST work from `apps/web/Dockerfile`
- ✅ **FR-P0-006**: Docker Compose MUST reference `apps/web/` context
- ✅ **FR-P0-007**: Root `package.json` MUST define npm workspaces
- ✅ **FR-P0-008**: CI/CD workflows MUST be updated to work with new paths
- ✅ **FR-P0-009**: All documentation MUST be updated with new file paths
- ✅ **FR-P0-010**: `apps/android/` directory MUST be created (empty, ready for Phase 1)

### Non-Functional Requirements

- ✅ **NFR-P0-001**: All 340 existing tests MUST pass after reorganization
- ✅ **NFR-P0-002**: Docker build MUST complete successfully
- ✅ **NFR-P0-003**: Development workflow (`npm run dev`) MUST work unchanged
- ✅ **NFR-P0-004**: Production deployment MUST work without breaking changes
- ✅ **NFR-P0-005**: GitHub Pages docs deployment MUST continue working
- ✅ **NFR-P0-006**: Migration MUST be completed in a single PR to avoid partial state

## Migration Strategy

### Approach: "Big Bang" Single-Commit Migration

**Why**: Avoid partial state where some paths work and others don't.

**Strategy**:
1. Create new feature branch: `013-android-app-phase0`
2. Perform all file moves in single commit
3. Update all references in same commit
4. Test everything before pushing
5. Create PR when all validations pass

**Rollback Plan**: If anything breaks, revert the entire commit.

### File Move Mapping

**Create directories first**:
```bash
mkdir -p apps/web
mkdir -p apps/android
```

**Move web app files**:
```bash
# Source code
mv src apps/web/
mv public apps/web/
mv scripts apps/web/

# Config files
mv Dockerfile apps/web/
mv docker-entrypoint.sh apps/web/
mv .dockerignore apps/web/
mv package.json apps/web/
mv package-lock.json apps/web/
mv tsconfig.json apps/web/
mv next.config.mjs apps/web/
mv next-env.d.ts apps/web/
mv vitest.config.mts apps/web/
mv vitest.setup.ts apps/web/
mv eslint.config.mjs apps/web/
mv drizzle.config.ts apps/web/
mv new-types.d.ts apps/web/

# Version file (generated, but include for completeness)
mv version.json apps/web/ || true  # May not exist
```

**Move docs**:
```bash
mv docs apps/docs
```

**Create Android placeholder**:
```bash
touch apps/android/.gitkeep
echo "# Android App" > apps/android/README.md
echo "Android app implementation begins after Phase 0 completion." >> apps/android/README.md
```

**Files that stay at root**:
- `migrations/` - Database migrations (accessed by web app)
- `.specify/` - Specifications
- `specs/` - Implementation plans
- `.github/` - CI/CD workflows (updated in place)
- `.gitignore` - Root gitignore (updated)
- `README.md` - Project README (updated)
- `CHANGELOG.md` - Changelog (updated)
- `LICENSE` - License (unchanged)
- `SECURITY.md` - Security policy (unchanged)
- `AGENTS.md` - AI agent guide (updated)
- `.editorconfig` - Editor config (unchanged)
- `compose.yml` - Docker Compose (updated)

### Path Updates Required

**1. Root `package.json`** (NEW - workspace coordinator):
```json
{
  "name": "hd-homey-monorepo",
  "version": "1.0.0-beta.5",
  "private": true,
  "workspaces": [
    "apps/web",
    "apps/docs"
  ],
  "scripts": {
    "dev": "npm run dev --workspace=apps/web",
    "build": "npm run build --workspaces",
    "test": "npm run test --workspace=apps/web",
    "lint": "npm run lint --workspaces",
    "typecheck": "npm run typecheck --workspace=apps/web",
    "web:dev": "npm run dev --workspace=apps/web",
    "web:build": "npm run build --workspace=apps/web",
    "web:test": "npm run test --workspace=apps/web",
    "web:lint": "npm run lint --workspace=apps/web",
    "docs:dev": "npm run docs:dev --workspace=apps/docs",
    "docs:build": "npm run docs:build --workspace=apps/docs",
    "docs:lint": "npm run lint --workspace=apps/docs"
  },
  "devDependencies": {}
}
```

**2. `apps/web/package.json`** (updated paths):
- Name: Change `"name": "hd-homey"` to `"name": "@hd-homey/web"`
- Scripts: Keep all existing scripts (unchanged)
- Dependencies: Keep all (unchanged)

**3. `apps/web/drizzle.config.ts`** (update migrations path):
```typescript
// Before:
out: './migrations'

// After:
out: '../../migrations'
```

**4. `apps/web/Dockerfile`** (update migrations copy):
```dockerfile
# Add COPY for migrations from monorepo root
COPY --from=builder ../../migrations ./migrations
```

**5. `compose.yml`** (update build context):
```yaml
services:
  hd-homey:
    build:
      context: ./apps/web
      dockerfile: Dockerfile
```

**6. `.github/workflows/test.yml`** (update working directories):
```yaml
# Lint web
- name: Install dependencies
  working-directory: apps/web
  run: npm ci

- name: Run ESLint (web)
  working-directory: apps/web
  run: npm run lint

# Lint docs
- name: Install docs dependencies
  working-directory: apps/docs
  run: npm ci

- name: Run ESLint (docs)
  working-directory: apps/docs
  run: npm run lint

# Typecheck
- name: Install dependencies
  working-directory: apps/web
  run: npm ci

- name: Generate Next.js types
  working-directory: apps/web
  run: npx next typegen

- name: Run TypeScript compiler
  working-directory: apps/web
  run: npx tsc --noEmit

# Test
- name: Install dependencies
  working-directory: apps/web
  run: npm ci

- name: Run tests with coverage
  working-directory: apps/web
  run: npm run test:coverage

# Build
- name: Install dependencies
  working-directory: apps/web
  run: npm ci

- name: Restore Next.js cache
  uses: actions/cache@v4
  with:
    path: apps/web/.next/cache
    key: ${{ runner.os }}-nextjs-${{ hashFiles('apps/web/package-lock.json') }}-${{ hashFiles('apps/web/**/*.ts', 'apps/web/**/*.tsx') }}

- name: Build Next.js application
  working-directory: apps/web
  run: npm run build
```

**7. `.github/workflows/docker.yml`** (update context):
```yaml
- name: Generate version.json with Git metadata
  working-directory: apps/web
  run: |
    node scripts/generate-version.mjs
    echo "Generated version.json:"
    cat version.json

- name: Build and push Docker image
  uses: docker/build-push-action@v6
  with:
    context: ./apps/web
    dockerfile: Dockerfile
```

**8. `.github/workflows/docs.yml`** (update paths):
```yaml
- name: Setup Node
  uses: actions/setup-node@v4
  with:
    cache-dependency-path: apps/docs/package-lock.json

- name: Install dependencies
  working-directory: apps/docs
  run: npm ci

- name: Build with VitePress
  working-directory: apps/docs
  run: npm run docs:build

- name: Upload artifact
  uses: actions/upload-pages-artifact@v3
  with:
    path: apps/docs/.vitepress/dist
```

**9. `README.md`** (update structure section):
- Update directory structure diagram
- Update file path examples
- Update installation commands (still `npm run dev` works!)

**10. `AGENTS.md`** (update directory structure):
- Update "Directory Structure" section
- Update file path references in examples

**11. Documentation in `apps/docs/`** (update code examples):
- Search for file path references: `src/`, `package.json`, etc.
- Update to `apps/web/src/`, `apps/web/package.json`, etc.

**12. `.gitignore`** (update for monorepo):
```gitignore
# Dependencies
node_modules/
apps/*/node_modules/

# Next.js
apps/web/.next/
apps/web/out/

# Testing
apps/web/coverage/

# Build outputs
apps/docs/.vitepress/dist/
apps/docs/.vitepress/cache/

# Environment
apps/web/.env*.local
```

## Validation Checklist

Before considering migration complete, validate:

### Local Development
- [ ] `npm install` succeeds at root (installs all workspaces)
- [ ] `npm run dev` starts web app successfully
- [ ] `npm run docs:dev` starts docs site successfully
- [ ] `npm run lint` lints all workspaces without errors
- [ ] `npm run typecheck` passes type checking
- [ ] `npm run test` runs all tests and passes (340 tests)
- [ ] `npm run build` builds web app successfully

### Docker
- [ ] `docker compose build` builds successfully
- [ ] `docker compose up` starts container
- [ ] Web app accessible at http://localhost:3000
- [ ] Database migrations run automatically
- [ ] All features work in container

### CI/CD (after pushing)
- [ ] Test workflow passes (lint, typecheck, test, build)
- [ ] Docker workflow builds and pushes image
- [ ] Docs workflow deploys to GitHub Pages
- [ ] No workflow failures

### Documentation
- [ ] README updated with new structure
- [ ] AGENTS.md updated with new paths
- [ ] All docs in `apps/docs/` build without errors
- [ ] All internal links work

### Acceptance Criteria (from Spec)
- [ ] All files moved to new locations
- [ ] All tests passing (NFR-P0-001)
- [ ] Docker build succeeds (NFR-P0-002)
- [ ] Dev server works (`npm run dev`) (NFR-P0-003)
- [ ] Docs build works (NFR-P0-005)
- [ ] CI/CD workflows pass (FR-P0-008)
- [ ] GitHub Pages deploys successfully (NFR-P0-005)
- [ ] All documentation updated (FR-P0-009)
- [ ] Single PR contains complete migration (NFR-P0-006)

## Risk Mitigation

| Risk | Impact | Mitigation |
|------|--------|-----------|
| Partial migration breaks CI/CD | High | Do entire migration in single commit |
| Docker build fails with new paths | High | Test Docker build locally before pushing |
| Tests fail due to path issues | High | Update all path references, validate locally |
| Docs deployment breaks | Medium | Test docs build locally, verify workflow paths |
| Users confused by new structure | Low | Update documentation thoroughly |
| Absolute path references break | Medium | Search for hardcoded paths, update all |

## Out of Scope

- ❌ No shared TypeScript packages (`packages/api-types/`) - keep it simple
- ❌ No Android code yet - just create empty `apps/android/` directory
- ❌ No new features - pure reorganization
- ❌ No Turborepo or other monorepo tools - use native npm workspaces
- ❌ No changes to environment variables or user configuration
- ❌ No changes to database schema or migrations
- ❌ No changes to application code (only paths)

## Success Criteria

**Migration Complete When**:
- ✅ All 10 Functional Requirements met (FR-P0-001 through FR-P0-010)
- ✅ All 6 Non-Functional Requirements met (NFR-P0-001 through NFR-P0-006)
- ✅ All validation checklist items pass
- ✅ PR approved and merged to main
- ✅ No reported issues after deployment

**Quality Gates**:
- All 340 tests pass (NFR-P0-001)
- Docker build succeeds (NFR-P0-002)
- CI/CD workflows green (FR-P0-008)
- Documentation builds without errors (NFR-P0-005)
- Zero regressions in functionality

## Next Steps

1. **Create feature branch**: `git checkout -b 013-android-app-phase0`
2. **Create task breakdown**: `specs/013-android-app-phase0/tasks.md`
3. **Execute file moves**: Follow migration strategy
4. **Update all references**: Paths, configs, workflows, docs
5. **Validate locally**: Run all validation checklist items
6. **Push and create PR**: Single PR with complete migration
7. **Verify CI/CD**: Ensure all workflows pass
8. **Merge to main**: After approval and validation
9. **Begin Android Phase 1**: With monorepo structure ready

## Timeline Estimate

- **Planning**: 2 hours (this document)
- **Task breakdown**: 1 hour
- **File moves**: 2 hours
- **Path updates**: 3 hours
- **Testing & validation**: 2 hours
- **Documentation updates**: 2 hours
- **Buffer for issues**: 2 hours

**Total**: 1-2 days

---

**Status**: Ready for task breakdown  
**Next**: Create `tasks.md` with detailed step-by-step instructions
