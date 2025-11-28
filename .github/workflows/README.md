# GitHub Actions Workflows

This directory contains automated workflows for CI/CD, security, and release management.

## Workflows Overview

### 🧪 CI (test.yml)

**Triggers:** Push to main/develop, Pull Requests, Manual

Runs comprehensive quality checks in parallel:

-   **Lint**: ESLint validation
-   **Type Check**: TypeScript compilation
-   **Test**: Unit tests with coverage
-   **Build**: Next.js production build

**Features:**

-   Parallel job execution for faster feedback
-   Caching for npm and Next.js builds
-   Coverage artifact uploads
-   Build artifact uploads
-   Timeout protection (5-15 mins per job)

### 🐳 Docker (docker.yml)

**Triggers:** Push to main, Tags (v\*.\*.\*), Pull Requests, Manual

Builds and publishes multi-platform Docker images:

-   **Platforms**: linux/amd64, linux/arm64
-   **Registry**: GitHub Container Registry (ghcr.io)
-   **Tags**: latest, semver, sha, branch
-   **Security**: Attestations and SBOM generation

**Features:**

-   BuildKit cache for faster builds
-   Comprehensive metadata tagging
-   Supply chain security (attestations)
-   SBOM (Software Bill of Materials)
-   Only pushes on main branch and tags (not PRs)

### 🔒 CodeQL (codeql.yml)

**Triggers:** Push to main/develop, Pull Requests, Weekly schedule, Manual

Security and code quality analysis:

-   **Languages**: JavaScript/TypeScript
-   **Queries**: Security-extended + quality
-   **Schedule**: Every Monday at 6 AM UTC

**Features:**

-   Automated vulnerability detection
-   Code quality checks
-   Security alerts in GitHub Security tab

### 🔍 Dependency Review (dependency-review.yml)

**Triggers:** Pull Requests to main/develop

Reviews dependencies for vulnerabilities and license compliance:

-   **Severity**: Fails on moderate+ vulnerabilities
-   **Licenses**: Denies GPL-3.0, LGPL-3.0
-   **Reports**: Automatic PR comments

**Features:**

-   Vulnerability scanning
-   License compliance
-   Automatic PR feedback

### 🚀 Release (release.yml)

**Triggers:** Tags (v\*.\*.\*), Manual with version input

Creates GitHub releases with changelogs:

-   **Validation**: Runs full CI suite first
-   **Changelog**: Extracted from CHANGELOG.md (Keep a Changelog format)
-   **Docker**: Links to published images
-   **Prerelease**: Auto-detects alpha/beta/rc versions

**Features:**

-   Extracts release notes from CHANGELOG.md (not git log)
-   Properly formatted markdown release notes
-   Docker pull instructions in release body
-   Installation guide links
-   Prerelease detection and marking
-   Uses modern GitHub CLI (`gh`) for reliability

## Dependabot Configuration

Automated dependency updates (`.github/dependabot.yml`):

-   **NPM**: Weekly updates on Mondays
-   **GitHub Actions**: Weekly updates
-   **Docker**: Weekly updates
-   **Grouping**: Minor/patch updates grouped together

## Best Practices Implemented

### ✅ Performance

-   Parallel job execution
-   Multi-layer caching (npm, Next.js, Docker)
-   `npm ci --prefer-offline` for faster installs
-   BuildKit cache for Docker

### ✅ Security

-   CodeQL scanning
-   Dependency review
-   SBOM generation
-   Attestations for Docker images
-   Minimal permissions per job
-   Secret scanning (via GitHub)

### ✅ Reliability

-   Concurrency control (cancel outdated runs)
-   Job timeouts
-   Fail-fast strategies
-   Artifact retention policies

### ✅ Developer Experience

-   Fast feedback (parallel jobs)
-   Clear job names and descriptions
-   Coverage reports
-   Automatic PR comments
-   Manual workflow triggers

## Environment Variables

### CI Workflow

-   `NODE_VERSION`: Node.js version (20)
-   `SKIP_INSTRUMENTATION`: Skip database init during build

### Docker Workflow

-   `REGISTRY`: ghcr.io
-   `IMAGE_NAME`: Auto from repository name

## Caching Strategy

### NPM Dependencies

-   **Managed by**: `actions/setup-node@v4` with `cache: npm`
-   **Key**: Based on `package-lock.json`
-   **Speed**: ~2-3x faster installs

### Next.js Build Cache

-   **Path**: `.next/cache`
-   **Key**: `package-lock.json` + source files hash
-   **Speed**: ~10-30% faster builds

### Docker Layer Cache

-   **Type**: GitHub Actions cache (gha)
-   **Mode**: max (caches all layers)
-   **Speed**: ~40-60% faster builds

## Artifact Retention

-   **Coverage Reports**: 7 days
-   **Build Artifacts**: 7 days
-   **SBOM**: 90 days
-   **Docker Images**: Managed by GHCR retention policy

## Usage Examples

### Manual Workflow Dispatch

```bash
# Trigger CI manually
gh workflow run test.yml

# Trigger Docker build manually
gh workflow run docker.yml

# Create a release
gh workflow run release.yml -f version=v1.0.0
```

### Viewing Workflow Runs

```bash
# List recent workflow runs
gh run list

# View specific run details
gh run view <run-id>

# Watch a running workflow
gh run watch
```

### Working with Artifacts

```bash
# List artifacts for a run
gh run view <run-id> --log

# Download artifacts
gh run download <run-id>
```

## Troubleshooting

### Build Fails on Database

-   **Issue**: `Cannot open database because the directory does not exist`
-   **Solution**: `SKIP_INSTRUMENTATION=true` is set in CI workflow

### Docker Build Timeout

-   **Issue**: Multi-platform builds take too long
-   **Solution**: Cache is enabled; first build is slower

### Dependabot PRs Not Created

-   **Issue**: Too many open PRs
-   **Solution**: Check `open-pull-requests-limit` in dependabot.yml

### CodeQL Analysis Fails

-   **Issue**: Timeout or out of memory
-   **Solution**: Increase `timeout-minutes` in workflow

## Maintenance

### Updating Workflows

1. Edit workflow files
2. Test with `workflow_dispatch` trigger
3. Commit and push changes
4. Monitor first automated run

### Updating Actions Versions

Dependabot automatically creates PRs for action updates.

### Adding New Workflows

1. Create new `.yml` file in `.github/workflows/`
2. Test thoroughly with manual triggers
3. Document in this README

## Security Considerations

-   All workflows use pinned action versions
-   Minimal permissions per job
-   Secrets are never logged
-   Dependabot scans for vulnerabilities
-   CodeQL performs weekly security scans

## Performance Metrics

Typical execution times (with cache):

-   **Lint**: ~1 minute
-   **Type Check**: ~1 minute
-   **Test**: ~2-3 minutes
-   **Build**: ~3-5 minutes
-   **Docker**: ~5-10 minutes (multi-platform)

**Total CI Pipeline**: ~5-7 minutes (parallel execution)

## Contributing

When adding new workflows:

1. Follow existing naming conventions
2. Use appropriate timeouts
3. Implement caching where possible
4. Add proper permissions
5. Document in this README
6. Test with manual trigger first

## Resources

-   [GitHub Actions Documentation](https://docs.github.com/en/actions)
-   [Next.js CI/CD Best Practices](https://nextjs.org/docs/deployment)
-   [Docker Build Best Practices](https://docs.docker.com/build/ci/github-actions/)
-   [CodeQL Documentation](https://codeql.github.com/docs/)
