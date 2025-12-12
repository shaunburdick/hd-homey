# Quickstart Validation Guide: Phase 0 Monorepo Reorganization

**Purpose**: Quick validation scenarios to ensure Phase 0 migration is successful.

## Pre-Migration Baseline

Before starting migration, capture baseline metrics:

```bash
# Run tests and note count
npm test
# Expected: ~340 tests passing

# Test Docker build time
time docker compose build
# Note the build time for comparison

# Test dev server startup
npm run dev
# Note startup time and verify http://localhost:3000 works
```

## Post-Migration Validation

### Scenario 1: Local Development Workflow

**Objective**: Verify npm workspaces work and dev workflow is unchanged.

```bash
# Clean install from root
rm -rf node_modules apps/*/node_modules
npm install

# Expected: 
# - Installs root workspace
# - Installs apps/web dependencies
# - Installs apps/docs dependencies
# Output shows: "added XXX packages in Xs"

# Start web dev server (shortcut command)
npm run dev

# Expected:
# - Next.js dev server starts
# - Accessible at http://localhost:3000
# - No errors in console
# - Hot reload works

# Stop dev server (Ctrl+C)

# Start docs dev server
npm run docs:dev

# Expected:
# - VitePress dev server starts
# - Accessible at http://localhost:5173/hd-homey/
# - Docs render correctly
# - No broken links
```

### Scenario 2: Linting and Type Checking

**Objective**: Verify workspace scripts run across all apps.

```bash
# Lint all workspaces
npm run lint

# Expected:
# - Lints apps/web
# - Lints apps/docs
# - No errors (or same errors as before migration)
# - Exit code 0

# Type check web app
npm run typecheck

# Expected:
# - TypeScript compiles without errors
# - Next.js types generated
# - Exit code 0
```

### Scenario 3: Testing

**Objective**: Verify all 340 tests still pass.

```bash
# Run tests
npm test

# Expected:
# - All 340 tests pass
# - Same test count as pre-migration
# - No new failures
# - Coverage report generated

# Run tests with coverage
npm run test:coverage

# Expected:
# - Coverage report in apps/web/coverage/
# - Coverage percentages similar to baseline
```

### Scenario 4: Docker Build and Run

**Objective**: Verify Docker builds with new context and paths.

```bash
# Build Docker image
docker compose build

# Expected:
# - Build succeeds
# - Similar build time to baseline
# - Image tagged as ghcr.io/shaunburdick/hd-homey
# - No errors during build

# Start container
docker compose up -d

# Verify container is running
docker compose ps

# Expected:
# - Container status: "running" or "healthy"
# - Port 3000 exposed

# Check logs
docker compose logs hd-homey

# Expected:
# - No errors
# - "HD Homey v1.0.0-beta.5 starting..." message
# - Database migrations run successfully

# Test web app in container
curl http://localhost:3000/api/health

# Expected:
# - HTTP 200 OK
# - JSON response: {"status":"ok", "timestamp":"...", "version":{...}}

# Access in browser
open http://localhost:3000

# Expected:
# - Sign-in page loads
# - No console errors
# - All assets load correctly

# Stop container
docker compose down
```

### Scenario 5: Build and Production Mode

**Objective**: Verify production build works.

```bash
# Build all workspaces
npm run build

# Expected:
# - apps/web/.next/ directory created
# - apps/docs/.vitepress/dist/ directory created
# - Build output shows no errors
# - Build warnings (if any) same as baseline

# Check Next.js build output
ls -lh apps/web/.next/standalone

# Expected:
# - server.js present
# - node_modules/ present
# - All required files for standalone deployment

# Start production server
cd apps/web
npm start
# Or: NODE_ENV=production node .next/standalone/server.js

# Expected:
# - Server starts on port 3000
# - http://localhost:3000 accessible
# - Production optimizations enabled
```

### Scenario 6: Workspace-Specific Commands

**Objective**: Verify explicit workspace commands work.

```bash
# Web app specific
npm run web:dev
npm run web:build
npm run web:test
npm run web:lint

# Expected: All commands work as if run in apps/web/

# Docs specific
npm run docs:dev
npm run docs:build
npm run docs:lint

# Expected: All commands work as if run in apps/docs/
```

### Scenario 7: Database Migrations

**Objective**: Verify migrations are accessible from apps/web/.

```bash
# Check migration path in Drizzle config
cat apps/web/drizzle.config.ts | grep "out:"

# Expected:
# out: '../../migrations'

# List migrations (should still be at root)
ls migrations/

# Expected:
# - 0000_large_microchip.sql
# - 0001_plain_junta.sql
# - 0003_smart_banner.sql
# - meta/_journal.json
# - meta/*.json

# Run migrations (inside web app context)
cd apps/web
npm run db:migrate

# Expected:
# - Migrations run successfully
# - Database file created at ./data/db/hd_homey.db
# - No errors
```

### Scenario 8: Git and Version Generation

**Objective**: Verify version generation still works with Git metadata.

```bash
# Generate version.json from web app
cd apps/web
node scripts/generate-version.mjs
cat version.json

# Expected:
# {
#   "version": "1.0.0-beta.5",
#   "commit": "<7-char-sha>",
#   "branch": "013-android-app-phase0",
#   "buildDate": "<iso-timestamp>",
#   "environment": "development"
# }

# Clean up
rm version.json
cd ../..
```

## CI/CD Validation (After Push)

### Scenario 9: GitHub Actions Test Workflow

**Objective**: Verify test workflow passes with new paths.

```bash
# Push branch to GitHub
git push origin 013-android-app-phase0

# Check workflow status
gh run watch

# Or visit: https://github.com/shaunburdick/hd-homey/actions

# Expected:
# - Lint job passes
# - Typecheck job passes
# - Test job passes (340 tests)
# - Build job passes
# - All artifacts uploaded successfully
```

### Scenario 10: Docker Workflow

**Objective**: Verify Docker build works in CI.

**Action**: Create PR or push to main (depending on workflow triggers)

**Expected**:
- Docker build completes
- Image pushed to ghcr.io/shaunburdick/hd-homey
- SBOM generated
- No build errors

### Scenario 11: Docs Workflow

**Objective**: Verify GitHub Pages deployment works.

**Action**: Merge to main (docs workflow triggered)

**Expected**:
- Docs build succeeds
- Pages deployed to https://shaunburdick.github.io/hd-homey/
- All pages accessible
- No broken links
- Navigation works

## Validation Checklist

Use this checklist during validation:

### Local Development
- [ ] `npm install` succeeds at root
- [ ] `npm run dev` starts web app
- [ ] `npm run docs:dev` starts docs site
- [ ] Web app accessible at http://localhost:3000
- [ ] Docs accessible at http://localhost:5173/hd-homey/

### Quality Checks
- [ ] `npm run lint` passes (all workspaces)
- [ ] `npm run typecheck` passes
- [ ] `npm test` passes (340 tests)
- [ ] `npm run test:coverage` generates report

### Build & Deploy
- [ ] `npm run build` succeeds (all workspaces)
- [ ] Docker Compose build succeeds
- [ ] Docker Compose up works
- [ ] Container is healthy
- [ ] Web app works in container

### Database & Migrations
- [ ] Migrations accessible from `apps/web/`
- [ ] `npm run db:migrate` works
- [ ] Database created successfully
- [ ] Schema matches expectations

### CI/CD (Post-Push)
- [ ] Test workflow passes on GitHub Actions
- [ ] Docker workflow builds image
- [ ] Docs workflow deploys to GitHub Pages
- [ ] All checks green on PR

### Documentation
- [ ] README updated with new structure
- [ ] AGENTS.md updated with new paths
- [ ] Docs build without errors
- [ ] All internal links work
- [ ] Code examples reference correct paths

### Regression Testing
- [ ] Sign-in page loads
- [ ] User authentication works
- [ ] Tuner management accessible (after auth)
- [ ] Channel list displays
- [ ] Video streaming works
- [ ] Settings page functional
- [ ] Admin features work (if admin user)

## Common Issues and Solutions

### Issue: `npm install` fails with workspace errors

**Symptom**: Error about workspace dependencies

**Solution**: 
```bash
# Clean everything
rm -rf node_modules apps/*/node_modules package-lock.json apps/*/package-lock.json

# Reinstall from scratch
npm install
```

### Issue: Tests fail with module resolution errors

**Symptom**: `Cannot find module '@/lib/...'`

**Solution**: Check `apps/web/tsconfig.json` has correct `baseUrl`:
```json
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"]
    }
  }
}
```

### Issue: Docker build fails copying migrations

**Symptom**: `COPY failed: file not found`

**Solution**: Update `apps/web/Dockerfile` to use correct relative path:
```dockerfile
COPY --from=builder ../../migrations ./migrations
```

### Issue: CI/CD workflows fail with path errors

**Symptom**: `npm ci` fails or files not found

**Solution**: Ensure `working-directory` is set in all workflow steps:
```yaml
- name: Install dependencies
  working-directory: apps/web
  run: npm ci
```

### Issue: Docs deployment shows 404

**Symptom**: GitHub Pages deployed but shows 404 errors

**Solution**: Check `apps/docs/.vitepress/config.ts` has correct `base`:
```typescript
export default defineConfig({
  base: '/hd-homey/',
  // ...
})
```

### Issue: Version.json not generated in Docker

**Symptom**: Docker build fails with "version.json not found"

**Solution**: Ensure Docker workflow generates version.json before build:
```yaml
- name: Generate version.json
  working-directory: apps/web
  run: node scripts/generate-version.mjs
```

## Success Indicators

Migration is successful when:

✅ **All validation scenarios pass**  
✅ **All 340 tests passing**  
✅ **Docker build under 5 minutes**  
✅ **CI/CD workflows green**  
✅ **Docs deployed to GitHub Pages**  
✅ **No regressions in functionality**  
✅ **Development workflow unchanged (`npm run dev` works)**

## Rollback Procedure

If validation fails and issues cannot be resolved quickly:

```bash
# Discard all changes
git reset --hard HEAD~1

# Or revert the migration commit
git revert <commit-sha>

# Push rollback
git push origin 013-android-app-phase0 --force
```

**Important**: Only rollback if critical issues found. Minor issues should be fixed with follow-up commits.

---

**Next Steps**: After all validation passes:
1. Create PR with migration changes
2. Wait for CI/CD checks to pass
3. Request review (if applicable)
4. Merge to main
5. Verify production deployment works
6. Begin Android Phase 1 implementation
