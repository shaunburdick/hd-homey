# Feature Specification: GitHub Pages Documentation Site

**Feature ID**: `011-github-pages-docs`  
**Created**: 2025-11-30  
**Status**: 📝 Planned  
**Priority**: P2 (Quality of Life - External Documentation)  
**Owner**: HD Homey Core Team  
**Version**: 1.0  

---

## Overview

Create a comprehensive, user-friendly documentation website for HD Homey hosted on GitHub Pages. The site will provide setup guides, feature walkthroughs, configuration references, and troubleshooting resources for end users and contributors. The documentation will be built using VitePress for a modern developer experience with built-in search, dark theme matching the application's design system, and automatic deployment via GitHub Actions.

**Why**: As HD Homey is shared publicly and moves toward broader adoption, users need accessible documentation separate from the README. A dedicated documentation site improves discoverability, provides better structure for complex topics, and offers a professional experience that matches the application's quality.

---

## Problem Statement

Currently, HD Homey documentation exists in scattered locations:
- **README.md**: Installation, quick start, configuration (technical)
- **.specs/**: Feature specifications (developer-focused)
- **AGENTS.md**: Development guide (AI agent-focused)

**Issues**:
1. README is becoming too long (400+ lines)
2. No clear separation between user docs and developer docs
3. Difficult for non-technical users to find setup instructions
4. No search functionality across documentation
5. Specs are technical and not user-friendly
6. Missing visual walkthroughs for features

**Goal**: Create a dedicated documentation site that serves both end users (setup, usage, troubleshooting) and developers (contributing, architecture, APIs) with clear separation, excellent navigation, and search functionality.

---

## User Stories

### Story 1: New User Setup (Priority: P1)

**As a** new user discovering HD Homey  
**I want** clear, step-by-step installation instructions  
**So that** I can get the application running quickly without confusion

**Acceptance Criteria**:
- **Given** I visit the docs site home page, **When** I land on the page, **Then** I see a prominent "Get Started" button
- **Given** I'm on the Quick Start page, **When** I follow the Docker Compose instructions, **Then** each command has copy buttons and explanations
- **Given** I'm installing from source, **When** I view the Full Setup guide, **Then** I see prerequisites, installation steps, and common pitfalls
- **Given** I complete setup, **When** I access the app for the first time, **Then** the docs explain the initial admin account creation

---

### Story 2: Feature Discovery (Priority: P1)

**As a** user learning HD Homey  
**I want** a comprehensive feature walkthrough with screenshots/examples  
**So that** I understand what the application can do and how to use each feature

**Acceptance Criteria**:
- **Given** I'm exploring features, **When** I visit the Features page, **Then** I see sections for Tuners, Channels, Users, Streaming, Transcoding
- **Given** I want to add a tuner, **When** I read the Tuner Management section, **Then** I see step-by-step instructions with form field explanations
- **Given** I need to watch a channel, **When** I view the Streaming section, **Then** I understand both in-browser and external player options
- **Given** I'm an admin, **When** I explore User Management, **Then** I understand role differences (Admin vs Viewer)

---

### Story 3: Configuration Reference (Priority: P2)

**As a** user configuring HD Homey  
**I want** a complete reference of all environment variables  
**So that** I can customize the application to my needs

**Acceptance Criteria**:
- **Given** I need to configure HD Homey, **When** I visit the Configuration page, **Then** I see a table with all environment variables
- **Given** I'm reviewing a variable, **When** I read its entry, **Then** I see: name, description, default value, example, and required/optional status
- **Given** I want to change stream token expiry, **When** I search for "token", **Then** I find `HD_HOMEY_STREAM_TOKEN_EXPIRY` with clear documentation
- **Given** I'm setting up reverse proxy, **When** I look for proxy config, **Then** I find `HD_HOMEY_PROXY_HOST` with examples

---

### Story 4: Troubleshooting Help (Priority: P1)

**As a** user experiencing issues  
**I want** a troubleshooting guide with common problems and solutions  
**So that** I can resolve issues without opening GitHub issues

**Acceptance Criteria**:
- **Given** I have a problem, **When** I visit the Troubleshooting page, **Then** I see categories: Installation, Authentication, Streaming, Transcoding, Network
- **Given** streams won't play, **When** I search "video not playing", **Then** I find relevant troubleshooting steps
- **Given** I see an error message, **When** I search for it, **Then** I find explanations and solutions
- **Given** none of the solutions work, **When** I reach the end of the guide, **Then** I see instructions for reporting issues on GitHub

---

### Story 5: Developer Contribution (Priority: P2)

**As a** developer wanting to contribute  
**I want** clear documentation on the project structure and development workflow  
**So that** I can contribute effectively

**Acceptance Criteria**:
- **Given** I want to contribute, **When** I visit the Contributing page, **Then** I see the spec-driven development process
- **Given** I need to understand architecture, **When** I view the Architecture section, **Then** I see directory structure, tech stack, and key patterns
- **Given** I want to run tests, **When** I check Development Setup, **Then** I see commands for linting, testing, and development server
- **Given** I'm creating a feature, **When** I read the workflow, **Then** I understand: spec first, then implementation, then tests

---

### Story 6: API Reference (Priority: P2)

**As a** developer integrating with HD Homey  
**I want** API documentation for the lineup endpoint and stream URLs  
**So that** I can integrate HD Homey with other applications (Plex, Emby, etc.)

**Acceptance Criteria**:
- **Given** I need API docs, **When** I visit the API Reference page, **Then** I see documented endpoints
- **Given** I want to use the lineup endpoint, **When** I read the docs, **Then** I see: URL format, response schema, example JSON
- **Given** I need stream URLs, **When** I check Stream Authentication, **Then** I understand token generation, expiry, and URL structure
- **Given** I'm building a client, **When** I review examples, **Then** I see curl commands and code snippets

---

### Story 7: Search & Navigation (Priority: P1)

**As a** user seeking specific information  
**I want** fast search and intuitive navigation  
**So that** I can quickly find what I need without reading everything

**Acceptance Criteria**:
- **Given** I have a question, **When** I press Ctrl+K or click search, **Then** a search dialog opens instantly
- **Given** I search for "docker", **When** I type, **Then** I see real-time results from all pages
- **Given** I'm on mobile, **When** I open the menu, **Then** navigation slides in smoothly with all sections visible
- **Given** I'm browsing docs, **When** I view the sidebar, **Then** I see my current page highlighted and sections organized logically

---

## Requirements

### Functional Requirements

#### Site Structure
- **FR-001**: Site MUST have the following top-level sections:
  - Home (Introduction, Quick Links)
  - Getting Started (Quick Start, Full Installation, First Steps)
  - Features (Tuners, Channels, Users, Streaming, Transcoding)
  - Configuration (Environment Variables, Advanced Settings)
  - Troubleshooting (Common Issues, FAQs, Error Messages)
  - API Reference (Lineup Endpoint, Stream URLs, Authentication)
  - Contributing (Development Setup, Spec Process, Testing)
- **FR-002**: Each page MUST have a clear title, introduction, and table of contents (auto-generated)
- **FR-003**: Navigation sidebar MUST show all pages in a hierarchical structure
- **FR-004**: Site MUST have a persistent header with logo, search, and GitHub link

#### Content Requirements
- **FR-005**: Quick Start guide MUST include Docker Compose example with copy buttons
- **FR-006**: Full Installation guide MUST cover: Docker Compose, Docker Run, and Source Installation
- **FR-007**: Configuration page MUST document ALL environment variables with: name, description, type, default, example, required/optional
- **FR-008**: Feature walkthroughs MUST include step-by-step instructions for each major feature
- **FR-009**: Troubleshooting page MUST be organized by category with symptom → solution format
- **FR-010**: API Reference MUST include example requests and responses
- **FR-011**: Contributing page MUST reference the Constitution and spec-driven development process

#### Search & Navigation
- **FR-012**: Site MUST provide client-side full-text search across all pages
- **FR-013**: Search MUST be accessible via keyboard shortcut (Ctrl+K / Cmd+K)
- **FR-014**: Search results MUST show page title, section heading, and text snippet
- **FR-015**: Navigation MUST indicate current page and expand current section
- **FR-016**: Mobile navigation MUST use a hamburger menu with slide-in drawer
- **FR-017**: All pages MUST have "Edit this page on GitHub" links

#### Design & Styling
- **FR-018**: Site MUST use a dark theme matching HD Homey's application design
- **FR-019**: Color palette MUST use extracted design tokens from `src/app/globals.css`
- **FR-020**: Typography MUST use Fira Code monospace font (same as app)
- **FR-021**: All text MUST meet WCAG 2.2 Level AA contrast requirements (4.5:1 normal, 3:1 large/UI)
- **FR-022**: Site MUST be fully responsive (mobile, tablet, desktop)
- **FR-023**: Code blocks MUST have syntax highlighting and copy buttons

#### Build & Deployment
- **FR-024**: Documentation source files MUST live in `/docs` directory in main branch
- **FR-025**: Site MUST build using VitePress v1.6.4+
- **FR-026**: GitHub Actions workflow MUST automatically build and deploy to GitHub Pages on push to main
- **FR-027**: Build MUST fail if VitePress build fails (no broken links)
- **FR-028**: Deployment MUST serve site at `https://shaunburdick.github.io/hd-homey/`

#### Content Transformation
- **FR-029**: Quick Start content SHOULD be extracted from README.md (keep in sync)
- **FR-030**: Configuration reference SHOULD be auto-generated from `.env-example` if feasible
- **FR-031**: Specs MAY be linked but MUST NOT be directly included (maintain separation)
- **FR-032**: User-facing docs MUST use non-technical language; developer docs MAY use technical terms

### Non-Functional Requirements

- **NFR-001**: Performance - First Contentful Paint < 1.5s on 4G connection
- **NFR-002**: Accessibility - WCAG 2.2 Level AA compliance minimum
- **NFR-003**: SEO - All pages MUST have proper meta tags (title, description, og:image)
- **NFR-004**: Search - Client-side search index MUST be < 500KB compressed
- **NFR-005**: Build Time - Documentation build MUST complete in < 2 minutes
- **NFR-006**: Mobile Performance - Lighthouse mobile score > 85
- **NFR-007**: Browser Support - Modern browsers (Chrome/Edge/Firefox/Safari last 2 versions)

---

## Technical Design

### VitePress Configuration

**Why VitePress**: 
- Markdown-based with Vue components (easy content authoring)
- Built-in client-side search (no external services needed)
- Excellent performance (Vite build tooling)
- Dark theme support out of the box
- Active development and maintenance

**Version**: VitePress v1.6.4 (latest stable)

**Directory Structure**:
```
/docs/
├── .vitepress/
│   ├── config.ts           # VitePress configuration
│   ├── theme/
│   │   ├── index.ts        # Custom theme entry
│   │   ├── style.css       # HD Homey design token overrides
│   │   └── components/     # Custom Vue components (if needed)
│   └── public/             # Static assets (images, icons)
├── index.md                # Home page
├── getting-started/
│   ├── index.md            # Getting Started overview
│   ├── quick-start.md      # Docker Compose quick start
│   ├── full-installation.md # All installation methods
│   └── first-steps.md      # Initial configuration
├── features/
│   ├── index.md            # Features overview
│   ├── tuner-management.md
│   ├── channel-streaming.md
│   ├── user-management.md
│   ├── authentication.md
│   └── video-transcoding.md
├── configuration/
│   ├── index.md            # Configuration overview
│   ├── environment-variables.md
│   └── advanced-settings.md
├── troubleshooting/
│   ├── index.md            # Troubleshooting guide
│   ├── installation.md
│   ├── streaming.md
│   └── common-errors.md
├── api/
│   ├── index.md            # API overview
│   ├── lineup-endpoint.md
│   └── stream-authentication.md
└── contributing/
    ├── index.md            # Contributing overview
    ├── development-setup.md
    ├── spec-process.md
    ├── architecture.md
    └── testing.md
```

### Design Token Extraction

Extract from `src/app/globals.css`:
```css
/* docs/.vitepress/theme/style.css */
:root {
  /* Colors */
  --vp-c-brand: #2563eb;           /* HD Homey accent */
  --vp-c-brand-dark: #1d4ed8;
  --vp-c-bg: #1a1a1a;              /* HD Homey bg-primary */
  --vp-c-bg-soft: #2a2a2a;         /* HD Homey bg-secondary */
  --vp-c-bg-mute: #3a3a3a;         /* HD Homey bg-tertiary */
  --vp-c-text-1: #f0f0f0;          /* HD Homey text-primary */
  --vp-c-text-2: #b0b0b0;          /* HD Homey text-secondary */
  --vp-c-text-3: #909090;          /* HD Homey text-tertiary */
  
  /* Typography */
  --vp-font-family-base: 'Fira Code', monospace;
  --vp-font-family-mono: 'Fira Code', monospace;
}
```

### GitHub Actions Workflow

**File**: `.github/workflows/docs.yml`

```yaml
name: Deploy Documentation

on:
  push:
    branches: [main]
    paths:
      - 'docs/**'
      - '.github/workflows/docs.yml'
  workflow_dispatch:

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: pages
  cancel-in-progress: false

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v4
        with:
          fetch-depth: 0 # For lastUpdated timestamps
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: npm
          cache-dependency-path: docs/package-lock.json
      
      - name: Setup Pages
        uses: actions/configure-pages@v4
      
      - name: Install dependencies
        run: cd docs && npm ci
      
      - name: Build documentation
        run: cd docs && npm run docs:build
      
      - name: Upload artifact
        uses: actions/upload-pages-artifact@v3
        with:
          path: docs/.vitepress/dist

  deploy:
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    needs: build
    runs-on: ubuntu-latest
    steps:
      - name: Deploy to GitHub Pages
        id: deployment
        uses: actions/deploy-pages@v4
```

### Content Guidelines

**Writing Style**:
- Use clear, concise language
- Avoid jargon unless explaining it
- Use active voice ("Click the button" not "The button should be clicked")
- Include examples for complex concepts
- Use callouts for warnings/tips (VitePress supports `::: warning`, `::: tip`, etc.)

**Code Examples**:
```markdown
::: code-group
```bash [Docker Compose]
docker compose up -d
```

```bash [Docker Run]
docker run -d --name hd-homey ...
```

```bash [Source]
npm ci && npm run dev
```
:::
```

**Callouts**:
```markdown
::: tip
Generate a secure AUTH_SECRET using: `openssl rand -base64 32`
:::

::: warning
Changing the stream secret will invalidate all existing stream URLs.
:::

::: danger
Never commit AUTH_SECRET to version control!
:::
```

---

## Dependencies

- **Depends On**: None (documentation only)
- **Blocks**: None
- **Related To**:
  - All existing features (documenting them)
  - SPEC-004 (design system provides styling foundation)

---

## Out of Scope

This specification does NOT include:

- ❌ **Versioned documentation** - Single version only (v1.0+), may add versioning later
- ❌ **Video tutorials** - Text and screenshots only (videos may be added later)
- ❌ **Interactive demos** - No embedded app instances
- ❌ **Translation/i18n** - English only
- ❌ **Blog/changelog** - CHANGELOG.md remains in repo
- ❌ **User comments** - No Disqus/utterances integration
- ❌ **Analytics** - No Google Analytics (may add privacy-respecting analytics later)
- ❌ **Custom domain** - Uses github.io subdomain (custom domain can be added later)

---

## Implementation Phases

### Phase 1: VitePress Setup (P1) - ~3 hours
1. Create `/docs` directory structure
2. Install VitePress and dependencies
3. Configure VitePress (`config.ts`)
4. Extract design tokens and create custom theme
5. Create basic home page and navigation structure
6. Test local development server

**Deliverables**:
- [ ] `/docs` directory with VitePress initialized
- [ ] Custom dark theme matching HD Homey design
- [ ] Working local dev server (`npm run docs:dev`)
- [ ] Basic navigation sidebar

---

### Phase 2: Core Content Pages (P1) - ~6 hours
1. **Home page** (`index.md`)
   - Hero section with project description
   - Feature highlights
   - Quick links to Getting Started and Features
2. **Getting Started** section
   - Quick Start guide (Docker Compose focus)
   - Full Installation guide (all methods)
   - First Steps (initial setup walkthrough)
3. **Configuration** section
   - Environment variables reference table
   - Advanced settings explanations

**Deliverables**:
- [ ] Home page with hero and quick links
- [ ] Complete Getting Started guides
- [ ] Configuration reference with all env vars documented

---

### Phase 3: Feature Documentation (P1) - ~5 hours
1. **Features overview** page
2. **Tuner Management** guide
   - Adding/editing/deleting tuners
   - Channel scanning
   - Connection testing
3. **Channel Streaming** guide
   - Browsing channels
   - In-browser playback
   - External player setup
4. **User Management** guide
   - Creating users
   - Role differences (Admin vs Viewer)
   - Profile management
5. **Video Transcoding** guide
   - How transcoding works
   - Settings configuration
   - Troubleshooting

**Deliverables**:
- [ ] Features overview with navigation
- [ ] Complete guide for each major feature
- [ ] Step-by-step instructions with explanations

---

### Phase 4: Troubleshooting & API (P2) - ~4 hours
1. **Troubleshooting** guide
   - Organized by category (Installation, Streaming, etc.)
   - Common issues with solutions
   - Error message reference
   - "Getting Help" section
2. **API Reference** section
   - Lineup endpoint documentation
   - Stream URL format and authentication
   - Example requests/responses
   - Integration guide for Plex/Emby

**Deliverables**:
- [ ] Comprehensive troubleshooting guide
- [ ] Complete API reference with examples
- [ ] Integration guides for third-party apps

---

### Phase 5: Contributing Guide (P2) - ~3 hours
1. **Contributing overview** page
2. **Development Setup** guide
   - Prerequisites
   - Running locally
   - Testing and linting
3. **Spec-Driven Development** guide
   - Constitution overview
   - Feature spec process
   - Implementation workflow
4. **Architecture** reference
   - Directory structure
   - Tech stack details
   - Key patterns and conventions

**Deliverables**:
- [ ] Complete contributing guide
- [ ] Development setup instructions
- [ ] Architecture documentation

---

### Phase 6: GitHub Actions & Deployment (P1) - ~2 hours
1. Create `.github/workflows/docs.yml`
2. Configure GitHub Pages in repository settings
3. Test deployment workflow
4. Verify site is accessible at github.io URL
5. Add "Edit this page on GitHub" links
6. Update README with link to documentation site

**Deliverables**:
- [ ] GitHub Actions workflow for automatic deployment
- [ ] Documentation site live on GitHub Pages
- [ ] README updated with docs link

---

### Phase 7: Polish & Search Optimization (P2) - ~2 hours
1. Review all pages for consistency
2. Add missing cross-links between related pages
3. Test search functionality with common queries
4. Add SEO meta tags (title, description, og:image)
5. Test responsive design on mobile/tablet
6. Run Lighthouse audit and fix issues
7. Proofread all content

**Deliverables**:
- [ ] All pages reviewed and polished
- [ ] Search works well for common queries
- [ ] SEO meta tags on all pages
- [ ] Lighthouse score > 90 (all categories)

---

## Success Criteria

### Measurable Outcomes

- **SC-001**: Documentation site is live at `https://shaunburdick.github.io/hd-homey/`
- **SC-002**: All 7 main sections have complete content
- **SC-003**: Search returns relevant results for common queries (test 20 queries)
- **SC-004**: Lighthouse score > 90 (Performance, Accessibility, Best Practices, SEO)
- **SC-005**: All code blocks have copy buttons and syntax highlighting
- **SC-006**: Mobile navigation works smoothly on < 768px screens
- **SC-007**: Zero broken links (verified by VitePress build)
- **SC-008**: Documentation build completes in < 2 minutes
- **SC-009**: All text meets WCAG 2.2 Level AA contrast (4.5:1 minimum)
- **SC-010**: Page load time < 1.5s on 4G connection

### User Validation

- [ ] New user can complete Docker Compose setup using only docs site
- [ ] Existing user can find troubleshooting solution within 2 minutes
- [ ] Developer can understand contributing process from docs alone
- [ ] API integrator can implement lineup endpoint without asking questions
- [ ] Mobile user can navigate entire site comfortably on phone

---

## Testing Requirements

### Manual Testing Checklist

**Content Completeness**:
- [ ] All environment variables documented in Configuration
- [ ] All features have step-by-step guides
- [ ] Troubleshooting covers major issue categories
- [ ] API reference includes all public endpoints
- [ ] Contributing guide references Constitution and specs

**Navigation & Search**:
- [ ] Search returns results for: "docker", "tuner", "stream", "token", "error"
- [ ] Sidebar navigation shows current page
- [ ] Mobile menu slides in/out smoothly
- [ ] All internal links work correctly
- [ ] "Edit this page" links open correct GitHub file

**Responsive Design**:
- [ ] Test on 320px (small mobile)
- [ ] Test on 768px (tablet)
- [ ] Test on 1024px (desktop)
- [ ] Test on 1920px (large desktop)
- [ ] Code blocks scroll horizontally on mobile

**Accessibility**:
- [ ] Navigate with keyboard only (Tab, Enter, Esc)
- [ ] Color contrast passes WCAG AA (use axe DevTools)
- [ ] Screen reader announces page titles and headings
- [ ] Focus indicators are visible
- [ ] No animation for `prefers-reduced-motion`

**Cross-Browser**:
- [ ] Chrome/Edge (latest)
- [ ] Firefox (latest)
- [ ] Safari (latest)
- [ ] Mobile Safari (iOS)
- [ ] Mobile Chrome (Android)

### Automated Testing

- [ ] VitePress build succeeds with no warnings
- [ ] GitHub Actions workflow deploys successfully
- [ ] Lighthouse CI runs on all pages (score > 90)
- [ ] Link checker finds zero broken links
- [ ] Search index builds without errors

---

## Edge Cases & Error Handling

### Build Failures
- **Case**: VitePress build fails due to broken link
- **Handling**: GitHub Actions fails, prevents deployment, requires fix before merge

### Large Search Index
- **Case**: Search index grows > 500KB
- **Handling**: Consider partial indexing or external search service

### Outdated Content
- **Case**: Docs drift from actual application behavior
- **Handling**: Add CI check to ensure critical values (env vars, defaults) stay in sync

### Mobile Performance
- **Case**: Heavy images slow down mobile load
- **Handling**: Optimize images, use WebP format, lazy load below fold

### Browser Compatibility
- **Case**: Old browser doesn't support VitePress
- **Handling**: Show "Please update your browser" message (VitePress includes this)

---

## Maintenance Plan

### Regular Updates
- Update docs when features change (part of spec implementation)
- Review troubleshooting section quarterly based on common issues
- Refresh screenshots when UI changes significantly
- Update configuration reference when new env vars are added

### Content Sync
- Keep Quick Start in sync with README.md
- Ensure environment variables match `.env-example`
- Update API reference when endpoints change
- Review contributing guide when development process changes

### Version Management (Future)
- When v2.0 launches, add version switcher
- Archive v1.x docs but keep accessible
- Use VitePress versioning feature

---

## Notes

### Design Decisions

**Why VitePress over Eleventy/Jekyll?**
- VitePress provides better search out of the box
- Modern DX with hot reload
- Vue components allow future interactive features
- Better performance than Jekyll
- Active maintenance and community

**Why `/docs` directory over `gh-pages` branch?**
- Easier to keep docs in sync with code
- Simpler PR reviews (docs + code together)
- No branch switching needed
- Follows modern GitHub Pages best practices

**Why extract design tokens vs embedded app?**
- Docs are lightweight and fast (no React/Next.js)
- Consistent visual identity without heavy dependencies
- Easier to maintain (just CSS variables)
- Better performance for documentation use case

### Future Enhancements (Out of Scope for v1)
- Video tutorials embedded in guides
- Interactive code playground (live MPEG-TS stream demo?)
- Versioned documentation (v1.x, v2.x)
- Multi-language support (i18n)
- Community-contributed recipes/tutorials
- Analytics (privacy-respecting, like Plausible)
- Custom domain (e.g., `docs.hd-homey.com`)

---

## References

- [VitePress Documentation](https://vitepress.dev/)
- [GitHub Pages Documentation](https://docs.github.com/en/pages)
- [VitePress Default Theme Config](https://vitepress.dev/reference/default-theme-config)
- [Writing Documentation - Google Dev Docs](https://developers.google.com/style)
- [Diátaxis Documentation Framework](https://diataxis.fr/) (tutorials, how-to, reference, explanation)

---

## Appendix: Example Pages

### Example: Quick Start Page Structure

```markdown
# Quick Start

Get HD Homey running in 5 minutes with Docker Compose.

## Prerequisites

- Docker and Docker Compose installed
- HDHomeRun device on local network
- Internet connection

## Installation

### 1. Download Configuration Files

::: code-group
```bash [curl]
curl -O https://raw.githubusercontent.com/shaunburdick/hd-homey/main/compose.yml
curl -O https://raw.githubusercontent.com/shaunburdick/hd-homey/main/.env-example
```

```bash [wget]
wget https://raw.githubusercontent.com/shaunburdick/hd-homey/main/compose.yml
wget https://raw.githubusercontent.com/shaunburdick/hd-homey/main/.env-example
```
:::

### 2. Configure Environment

```bash
cp .env-example .env
sed -i "s/some-random-string/$(openssl rand -base64 32)/" .env
```

::: tip
The `AUTH_SECRET` must be at least 32 characters. The command above generates a secure random value.
:::

### 3. Start the Application

```bash
docker compose up -d
```

### 4. Create Admin Account

Visit `http://localhost:3000` and create your first admin account.

## Next Steps

- [Add your first tuner](/features/tuner-management)
- [Configure external access](/configuration/advanced-settings)
- [Learn about video transcoding](/features/video-transcoding)

## Troubleshooting

**Container won't start?** Check logs: `docker compose logs -f`

**Can't access the UI?** Verify port 3000 isn't in use: `lsof -i :3000`

**Need more help?** See the [Troubleshooting Guide](/troubleshooting/).
```

### Example: Environment Variable Table

```markdown
## Required Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `AUTH_SECRET` | Encryption key for Better-Auth sessions (32+ chars) | `openssl rand -base64 32` |

## Optional Variables

| Variable | Description | Default | Example |
|----------|-------------|---------|---------|
| `HD_HOMEY_PROXY_HOST` | External URL for stream proxying | Auto-detected | `https://tuner.example.com` |
| `HD_HOMEY_DB_PATH` | Database directory path | `./data/db` | `/data/db` |
| `HD_HOMEY_TRANSCODE_DIR` | Transcoding output directory | `./data/transcoding` | `/data/transcoding` |
| `HD_HOMEY_STREAM_TOKEN_EXPIRY` | Stream token validity (seconds) | `43200` (12 hours) | `86400` (24 hours) |
```

---

**End of Specification**
