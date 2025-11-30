# Implementation Plan: GitHub Pages Documentation Site

**Feature ID**: `011-github-pages-docs`  
**Created**: 2025-11-30  
**Status**: 🔧 In Progress  
**Developer**: AI Agent  

---

## Overview

This plan outlines the implementation of a comprehensive documentation website for HD Homey using VitePress 1.6.4, hosted on GitHub Pages. The site will provide user-facing guides, API reference, and developer documentation with a dark theme matching the application's design system.

---

## Technical Context

### Technology Stack
- **Documentation Framework**: VitePress v1.6.4 (latest stable)
- **Node.js**: v20+ (consistent with main project)
- **Build Tool**: Vite 5.x (bundled with VitePress)
- **Package Manager**: npm (consistent with main project)
- **Hosting**: GitHub Pages (https://shaunburdick.github.io/hd-homey/)
- **Deployment**: GitHub Actions (automated on push to main)

### Dependencies
```json
{
  "devDependencies": {
    "vitepress": "^1.6.4",
    "vue": "^3.5.13"
  }
}
```

**Rationale**:
- VitePress 1.6.4 is the latest stable version with excellent performance and built-in search
- Vue 3.5.13 is a peer dependency required by VitePress
- No additional dependencies needed for basic documentation site
- Minimal bundle size (<500KB for search index per NFR-004)

### Platform & Constraints
- **Deployment**: GitHub Pages with custom workflow
- **Build Time**: Must complete in <2 minutes (NFR-005)
- **Performance**: Lighthouse score >90 (NFR-006)
- **Browser Support**: Modern browsers (Chrome/Edge/Firefox/Safari last 2 versions)
- **Accessibility**: WCAG 2.2 Level AA compliance (NFR-002)

---

## Constitution Check

### Alignment with Core Principles

✅ **1. Simplicity First**
- Uses VitePress (built-in search, no complex setup)
- Markdown-based content (easy to write and maintain)
- Minimal dependencies (just VitePress + Vue)

✅ **2. User Experience**
- Fast performance (static site generation)
- Clear navigation with sidebar
- Mobile-friendly responsive design
- Built-in search for quick information access

✅ **3. Code Quality**
- TypeScript for VitePress config
- ESLint disabled for docs (content-focused, not code)
- Version controlled with main project
- Clear directory structure

✅ **4. Security**
- Static site (no server-side vulnerabilities)
- No authentication needed (public docs)
- No sensitive data exposure
- GitHub Pages secure hosting

✅ **5. Data Management**
- No database needed (static content)
- Content versioned in Git
- Easy to backup and restore

✅ **6. Development Workflow**
- Separate `/docs` directory (doesn't interfere with app)
- Auto-deploy on push to main
- Preview builds in PRs (future enhancement)
- Local development server for testing

### No Violations
This feature aligns with all constitutional principles and introduces no violations.

---

## Project Structure

### New Directories & Files

```
/docs/                                    # VitePress documentation root
├── .vitepress/
│   ├── config.ts                        # VitePress configuration (TypeScript)
│   ├── theme/
│   │   ├── index.ts                     # Custom theme entry point
│   │   ├── style.css                    # HD Homey design token overrides
│   │   └── Layout.vue                   # Custom layout (if needed)
│   └── public/                          # Static assets (copied to root)
│       ├── hd-homey.png                 # Logo (copy from /public)
│       ├── hd-homey.webp                # WebP logo (copy from /public)
│       └── favicon.ico                  # Favicon
├── index.md                             # Home page
├── getting-started/
│   ├── index.md                         # Getting Started overview
│   ├── quick-start.md                   # Docker Compose quick start
│   ├── full-installation.md             # All installation methods
│   └── first-steps.md                   # Initial setup walkthrough
├── features/
│   ├── index.md                         # Features overview
│   ├── tuner-management.md              # Managing HDHomeRun devices
│   ├── channel-streaming.md             # Streaming channels
│   ├── user-management.md               # User CRUD operations
│   ├── user-invitations.md              # Invitation system (NEW)
│   ├── authentication.md                # Better-Auth login/logout
│   └── video-transcoding.md             # Transcoding settings
├── configuration/
│   ├── index.md                         # Configuration overview
│   ├── environment-variables.md         # Complete env var reference
│   └── advanced-settings.md             # Reverse proxy, TLS, etc.
├── troubleshooting/
│   ├── index.md                         # Troubleshooting overview
│   ├── installation.md                  # Installation issues
│   ├── streaming.md                     # Stream playback issues
│   └── common-errors.md                 # Error message reference
├── api/
│   ├── index.md                         # API overview
│   ├── lineup-endpoint.md               # /lineup.json documentation
│   └── stream-authentication.md         # HMAC token documentation
├── contributing/
│   ├── index.md                         # Contributing overview
│   ├── development-setup.md             # Local dev environment
│   ├── spec-process.md                  # Spec-driven development
│   ├── architecture.md                  # System architecture
│   └── testing.md                       # Testing guidelines
├── package.json                         # VitePress dependencies
├── package-lock.json                    # Lock file
└── tsconfig.json                        # TypeScript config for VitePress

/.github/workflows/
└── docs.yml                             # GitHub Actions workflow (NEW)
```

**Key Design Decisions**:
- `/docs` is separate from main app (isolation, no conflicts)
- Markdown files use `.md` extension (VitePress convention)
- TypeScript config for VitePress (type safety)
- Public assets copied from main project (consistency)

---

## Architecture Decisions

### 1. Documentation Framework: VitePress over Alternatives

**Decision**: Use VitePress 1.6.4

**Alternatives Considered**:
- **Docusaurus**: More features but heavier (React-based, slower build)
- **Jekyll**: GitHub Pages default but outdated, no TypeScript support
- **Eleventy**: Flexible but requires more setup, no built-in search
- **MkDocs**: Python-based, not Node.js ecosystem fit

**Rationale**:
- **Performance**: Vite-powered, lightning-fast builds and HMR
- **Built-in Search**: Client-side search included (no external service needed)
- **Modern DX**: TypeScript config, Vue components, hot reload
- **Lightweight**: Minimal bundle size, excellent Lighthouse scores
- **Active Maintenance**: Official Vue.js project, well-maintained
- **Dark Theme**: Easy to customize with CSS variables

---

### 2. Design Token Extraction Strategy

**Decision**: Extract CSS variables from `src/app/globals.css` into VitePress theme

**Implementation**:
```css
/* docs/.vitepress/theme/style.css */
:root {
  /* Color System */
  --vp-c-brand: #2563eb;              /* HD Homey accent */
  --vp-c-brand-dark: #1d4ed8;
  --vp-c-brand-darker: #1e40af;
  --vp-c-bg: #1a1a1a;                 /* bg-primary */
  --vp-c-bg-soft: #2a2a2a;            /* bg-secondary */
  --vp-c-bg-mute: #3a3a3a;            /* bg-tertiary */
  --vp-c-text-1: #f0f0f0;             /* text-primary */
  --vp-c-text-2: #b0b0b0;             /* text-secondary */
  --vp-c-text-3: #909090;             /* text-tertiary */
  
  /* Typography */
  --vp-font-family-base: 'Fira Code', monospace;
  --vp-font-family-mono: 'Fira Code', monospace;
  
  /* Borders */
  --vp-c-divider: #404040;
  --vp-c-border: #404040;
  
  /* Interactive */
  --vp-c-brand-light: #3b82f6;
  --vp-c-brand-lighter: #60a5fa;
}
```

**Rationale**:
- Consistent visual identity with main app
- No need to embed React/Next.js (lightweight)
- VitePress provides CSS variable hooks
- Easy maintenance (update one file)

---

### 3. Content Organization Strategy

**Decision**: Use Diátaxis documentation framework principles

**Four Documentation Types**:
1. **Tutorials** (Getting Started) - Learning-oriented, step-by-step
2. **How-To Guides** (Features) - Task-oriented, practical
3. **Reference** (API, Configuration) - Information-oriented, precise
4. **Explanation** (Contributing, Architecture) - Understanding-oriented, conceptual

**Rationale**:
- Industry best practice for documentation structure
- Clear separation of concerns
- Users can quickly find what they need
- Reduces duplicate content

**Source**: [Diátaxis Framework](https://diataxis.fr/)

---

### 4. Search Implementation

**Decision**: Use VitePress built-in client-side search (no external service)

**Configuration**:
```typescript
// docs/.vitepress/config.ts
export default {
  themeConfig: {
    search: {
      provider: 'local',
      options: {
        miniSearch: {
          searchOptions: {
            fuzzy: 0.2,
            prefix: true,
            boost: { title: 4, heading: 2, text: 1 }
          }
        }
      }
    }
  }
}
```

**Rationale**:
- No external dependencies (Algolia, etc.)
- Works offline after first load
- Privacy-respecting (no tracking)
- Fast and accurate (MiniSearch library)
- Meets NFR-004 (<500KB index size)

---

### 5. Deployment Strategy

**Decision**: GitHub Actions workflow deploying to GitHub Pages

**Workflow Triggers**:
- Push to `main` branch with changes in `/docs/**`
- Manual workflow dispatch
- No PR preview builds (future enhancement)

**Rationale**:
- Automatic deployment (no manual steps)
- Fast feedback loop (builds in <2 minutes)
- Free hosting on GitHub Pages
- CDN-backed (fast global delivery)
- No custom domain needed (github.io subdomain)

---

### 6. Content Sync Strategy

**Decision**: Manual content sync with periodic reviews

**Sync Points**:
- Environment variables: Compare `.env-example` with `environment-variables.md`
- Quick Start: Keep in sync with `README.md` (single source of truth: README)
- API contracts: Update when endpoints change
- Feature docs: Update as part of feature implementation

**Rationale**:
- Automated sync is brittle and hard to maintain
- Manual reviews ensure quality and clarity
- Documentation updates are part of feature acceptance criteria
- Quarterly reviews catch drift

---

## Data Model

### Content Structure

**Entity**: Documentation Page

**Fields**:
- `title`: String (page title, shown in navigation)
- `description`: String (meta description for SEO)
- `layout`: String (default: 'doc', home: 'home')
- `outline`: Number | Boolean (table of contents depth, default: 2)
- `lastUpdated`: Boolean (show last git commit date, default: true)
- `editLink`: Boolean (show "Edit this page" link, default: true)

**Example Frontmatter**:
```yaml
---
title: Quick Start Guide
description: Get HD Homey running in 5 minutes with Docker Compose
layout: doc
outline: 2
---
```

**No Database**: All content is static Markdown files, no runtime database needed.

---

## API Contracts

### VitePress Configuration API

**File**: `docs/.vitepress/config.ts`

```typescript
import { defineConfig } from 'vitepress'

export default defineConfig({
  title: 'HD Homey',
  description: 'HDHomeRun Proxy for Remote Streaming',
  base: '/hd-homey/',
  
  themeConfig: {
    logo: '/hd-homey.png',
    siteTitle: 'HD Homey Docs',
    
    nav: [
      { text: 'Guide', link: '/getting-started/' },
      { text: 'Features', link: '/features/' },
      { text: 'API', link: '/api/' },
      { text: 'GitHub', link: 'https://github.com/shaunburdick/hd-homey' }
    ],
    
    sidebar: {
      '/getting-started/': [...],
      '/features/': [...],
      '/configuration/': [...],
      '/troubleshooting/': [...],
      '/api/': [...],
      '/contributing/': [...]
    },
    
    socialLinks: [
      { icon: 'github', link: 'https://github.com/shaunburdick/hd-homey' }
    ],
    
    editLink: {
      pattern: 'https://github.com/shaunburdick/hd-homey/edit/main/docs/:path',
      text: 'Edit this page on GitHub'
    },
    
    search: {
      provider: 'local'
    }
  },
  
  head: [
    ['link', { rel: 'icon', href: '/hd-homey/favicon.ico' }],
    ['meta', { property: 'og:type', content: 'website' }],
    ['meta', { property: 'og:image', content: '/hd-homey/hd-homey.png' }]
  ]
})
```

---

### GitHub Actions Workflow API

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
          fetch-depth: 0  # For lastUpdated timestamps
      
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

---

## Quickstart Guide

### Local Development

```bash
# Navigate to docs directory
cd docs

# Install dependencies
npm ci

# Start development server
npm run docs:dev
# Server will start at http://localhost:5173

# Build for production
npm run docs:build

# Preview production build
npm run docs:preview
```

### Key Validation Scenarios

#### Scenario 1: Verify Design Token Consistency
**Goal**: Ensure documentation site matches application design

**Steps**:
1. Start docs dev server: `cd docs && npm run docs:dev`
2. Open http://localhost:5173/hd-homey/
3. Compare colors with main app at http://localhost:3000
4. Verify:
   - Background colors match (#1a1a1a, #2a2a2a, #3a3a3a)
   - Text colors match (#f0f0f0, #b0b0b0, #909090)
   - Accent color matches (#2563eb)
   - Fira Code font is used

**Expected**: Visual consistency between docs and app

---

#### Scenario 2: Test Search Functionality
**Goal**: Verify search returns relevant results

**Steps**:
1. Build docs: `cd docs && npm run docs:build`
2. Preview: `npm run docs:preview`
3. Press Ctrl+K (Cmd+K on Mac)
4. Search for:
   - "docker" → Should find installation guides
   - "tuner" → Should find tuner management page
   - "token" → Should find stream authentication docs
   - "error" → Should find troubleshooting section

**Expected**: Search returns relevant pages with highlighted context

---

#### Scenario 3: Mobile Responsiveness
**Goal**: Ensure documentation works on mobile devices

**Steps**:
1. Open docs in Chrome DevTools
2. Toggle device toolbar (Ctrl+Shift+M)
3. Test viewports:
   - 320px (iPhone SE)
   - 375px (iPhone 12)
   - 768px (iPad)
   - 1024px (Desktop)
4. Verify:
   - Hamburger menu on mobile (<768px)
   - Readable text sizes
   - Horizontal scroll for code blocks
   - Touch targets ≥44px

**Expected**: Smooth experience across all viewports

---

#### Scenario 4: Lighthouse Audit
**Goal**: Meet performance and accessibility requirements

**Steps**:
1. Build and preview docs
2. Open Chrome DevTools → Lighthouse tab
3. Run audit with:
   - Mode: Navigation
   - Device: Mobile
   - Categories: All
4. Check scores:
   - Performance: >90
   - Accessibility: >90
   - Best Practices: >90
   - SEO: >90

**Expected**: All Lighthouse scores >90

---

#### Scenario 5: Link Checker
**Goal**: Verify no broken internal links

**Steps**:
1. Build docs: `npm run docs:build`
2. VitePress automatically checks links during build
3. Build should complete without warnings
4. Manually test:
   - Click all navigation links
   - Click all sidebar links
   - Click "Edit this page on GitHub" links

**Expected**: Zero broken links, all links navigate correctly

---

## Testing Strategy

### Automated Testing
- ✅ VitePress build (fails on broken links)
- ✅ GitHub Actions workflow validation
- ✅ Lighthouse CI (future enhancement)
- ❌ No unit tests needed (static content)

### Manual Testing
- ✅ Visual design review (compare with app)
- ✅ Search functionality (20 common queries)
- ✅ Mobile responsiveness (multiple viewports)
- ✅ Accessibility (keyboard navigation, screen reader)
- ✅ Cross-browser (Chrome, Firefox, Safari, Edge)

### Acceptance Criteria
- [ ] All 7 main sections have complete content
- [ ] Search returns results for 20 test queries
- [ ] Lighthouse score >90 (all categories)
- [ ] Zero broken links
- [ ] Mobile navigation works smoothly
- [ ] All code blocks have copy buttons
- [ ] "Edit this page" links work
- [ ] Site accessible at https://shaunburdick.github.io/hd-homey/

---

## Performance Considerations

### Build Time Optimization
- VitePress uses Vite for lightning-fast builds
- Expected build time: 30-60 seconds (well under 2-minute requirement)
- Incremental builds in development (HMR)

### Bundle Size Optimization
- Client-side search index: Target <300KB (NFR-004 requires <500KB)
- Images: Use WebP format, optimize with ImageOptim
- Code splitting: VitePress handles automatically
- CSS: Minimal custom CSS (<10KB)

### Runtime Performance
- Static site generation: No server-side processing
- CDN delivery: GitHub Pages uses CDN
- Image lazy loading: Below-the-fold images load on scroll
- Font loading: Use `font-display: swap` for Fira Code

---

## Security Considerations

### No Authentication Needed
- Public documentation (no sensitive data)
- No user accounts or session management
- No forms or data collection

### Content Security
- Markdown content reviewed before deployment
- No user-generated content
- No external scripts (except VitePress bundle)
- GitHub Pages provides HTTPS by default

### Dependency Security
- VitePress and Vue are actively maintained
- Dependabot enabled for automatic security updates
- Minimal dependency tree reduces attack surface

---

## Maintenance Plan

### Regular Updates
- **When features change**: Update docs as part of feature PR
- **Quarterly reviews**: Check for content drift
  - Environment variables vs `.env-example`
  - Configuration docs vs actual behavior
  - Screenshots vs current UI
- **Version updates**: Keep VitePress updated (minor/patch releases)

### Content Sync Checklist
```markdown
## Quarterly Documentation Review

- [ ] Compare environment variables in docs with `.env-example`
- [ ] Verify Quick Start matches README.md
- [ ] Test all installation methods
- [ ] Review troubleshooting for new common issues
- [ ] Update screenshots if UI changed
- [ ] Check for broken external links
- [ ] Review API documentation for endpoint changes
- [ ] Update version numbers and release notes
```

### VitePress Updates
```bash
# Check for updates
cd docs && npm outdated

# Update VitePress (minor/patch)
npm update vitepress

# Test locally
npm run docs:dev
npm run docs:build

# Commit and deploy
git add docs/package*.json
git commit -m "chore(docs): update vitepress to vX.Y.Z"
```

---

## Implementation Phases

### Phase 1: VitePress Setup (P1) - ~3 hours
**Goal**: Get basic VitePress site running with custom theme

**Tasks**:
1. [ ] Create `/docs` directory structure
2. [ ] Initialize npm and install VitePress
3. [ ] Create `docs/package.json` with scripts
4. [ ] Create VitePress config (`docs/.vitepress/config.ts`)
5. [ ] Extract design tokens to `docs/.vitepress/theme/style.css`
6. [ ] Copy logo/assets to `docs/.vitepress/public/`
7. [ ] Create basic home page (`docs/index.md`)
8. [ ] Set up navigation and sidebar structure
9. [ ] Test local dev server (`npm run docs:dev`)
10. [ ] Verify design consistency with main app

**Deliverables**:
- [ ] `/docs` directory initialized
- [ ] VitePress running locally
- [ ] Custom dark theme matching HD Homey design
- [ ] Basic navigation sidebar
- [ ] Home page with hero section

**Verification**:
```bash
cd docs
npm run docs:dev  # Should start on http://localhost:5173
```

---

### Phase 2: Core Content Pages (P1) - ~6 hours
**Goal**: Write essential user-facing documentation

**Tasks**:
1. [ ] **Home page** (`index.md`)
   - Hero section with project description
   - Feature highlights (cards)
   - Quick links to Getting Started and Features
2. [ ] **Getting Started** section
   - `getting-started/index.md` - Overview
   - `getting-started/quick-start.md` - Docker Compose 5-minute setup
   - `getting-started/full-installation.md` - Docker Run, Source, Environment
   - `getting-started/first-steps.md` - Add first tuner, create user, watch channel
3. [ ] **Configuration** section
   - `configuration/index.md` - Overview
   - `configuration/environment-variables.md` - Complete table with all env vars
   - `configuration/advanced-settings.md` - Reverse proxy, HTTPS, external access

**Deliverables**:
- [ ] Home page with hero and quick links
- [ ] Complete Getting Started guides (3 pages)
- [ ] Configuration reference with all env vars documented

**Content Sources**:
- Extract from `README.md` (Quick Start)
- Extract from `.env-example` (Environment Variables)
- Extract from `AGENTS.md` (Development setup)

---

### Phase 3: Feature Documentation (P1) - ~5 hours
**Goal**: Document all major features for end users

**Tasks**:
1. [ ] **Features overview** (`features/index.md`)
2. [ ] **Tuner Management** (`features/tuner-management.md`)
   - Adding/editing/deleting tuners
   - Channel scanning and refresh
   - Connection testing
   - Troubleshooting tuner issues
3. [ ] **Channel Streaming** (`features/channel-streaming.md`)
   - Browsing channel lineup
   - In-browser playback with HLS
   - External player setup (VLC, mpv)
   - Stream URL format
4. [ ] **User Management** (`features/user-management.md`)
   - Creating users directly (admin only)
   - Role differences (Admin vs Viewer)
   - User profiles and settings
5. [ ] **User Invitations** (`features/user-invitations.md`) - NEW
   - Generating invitation links
   - Managing invitations (revoke, view status)
   - Accepting invitations as new user
   - Security considerations (one-time use, expiration)
6. [ ] **Authentication** (`features/authentication.md`)
   - Signing in and out
   - Password requirements
   - Session management (7-day expiry)
   - Changing password
7. [ ] **Video Transcoding** (`features/video-transcoding.md`)
   - How transcoding works (MPEG-2 → H.264)
   - Settings configuration
   - Shared sessions
   - FFmpeg version requirements
   - Troubleshooting transcoding issues

**Deliverables**:
- [ ] Features overview with navigation
- [ ] Complete guide for each major feature (6 pages)
- [ ] Step-by-step instructions with screenshots/examples

---

### Phase 4: Troubleshooting & API (P2) - ~4 hours
**Goal**: Provide troubleshooting resources and API documentation

**Tasks**:
1. [ ] **Troubleshooting** section
   - `troubleshooting/index.md` - Overview with categories
   - `troubleshooting/installation.md`
     - Docker won't start
     - Database errors
     - Permission issues
   - `troubleshooting/streaming.md`
     - Video won't play
     - Buffering issues
     - External player problems
     - Token expiration errors
   - `troubleshooting/common-errors.md`
     - Error message reference
     - HTTP status codes
     - FFmpeg errors
2. [ ] **API Reference** section
   - `api/index.md` - Overview
   - `api/lineup-endpoint.md`
     - `/lineup.json` format
     - Example response
     - Integration with Plex/Emby
   - `api/stream-authentication.md`
     - HMAC token generation
     - Token format and expiration
     - Example curl commands

**Deliverables**:
- [ ] Comprehensive troubleshooting guide (3 pages)
- [ ] Complete API reference with examples (2 pages)
- [ ] Integration guides for third-party apps

---

### Phase 5: Contributing Guide (P2) - ~3 hours
**Goal**: Help developers contribute to HD Homey

**Tasks**:
1. [ ] **Contributing overview** (`contributing/index.md`)
   - How to contribute
   - Code of conduct
   - Reporting issues
   - Feature requests
2. [ ] **Development Setup** (`contributing/development-setup.md`)
   - Prerequisites (Node.js, Docker)
   - Cloning repository
   - Installing dependencies
   - Running locally (`npm run dev`)
   - Running tests (`npm test`)
3. [ ] **Spec-Driven Development** (`contributing/spec-process.md`)
   - Constitution overview
   - Feature spec template
   - Spec → Plan → Implementation workflow
   - When to create a spec
4. [ ] **Architecture** (`contributing/architecture.md`)
   - Directory structure
   - Tech stack details
   - Key patterns (Server Actions, Client Components)
   - Database schema
   - Authentication flow
5. [ ] **Testing** (`contributing/testing.md`)
   - Testing philosophy
   - Running tests
   - Writing unit tests (Vitest)
   - Writing component tests (React Testing Library)
   - Code coverage

**Deliverables**:
- [ ] Complete contributing guide (5 pages)
- [ ] Development setup instructions
- [ ] Architecture documentation
- [ ] Testing guidelines

---

### Phase 6: GitHub Actions & Deployment (P1) - ~2 hours
**Goal**: Automate deployment to GitHub Pages

**Tasks**:
1. [ ] Create `.github/workflows/docs.yml`
2. [ ] Configure workflow triggers (push to main, manual dispatch)
3. [ ] Set up build job (install, build, upload artifact)
4. [ ] Set up deploy job (deploy to GitHub Pages)
5. [ ] Enable GitHub Pages in repository settings
   - Source: GitHub Actions
   - Branch: N/A (Actions deployment)
6. [ ] Test workflow by pushing to main
7. [ ] Verify site is accessible at https://shaunburdick.github.io/hd-homey/
8. [ ] Add "Edit this page on GitHub" links
9. [ ] Update README.md with documentation link
10. [ ] Create docs badge for README

**Deliverables**:
- [ ] GitHub Actions workflow for automatic deployment
- [ ] Documentation site live on GitHub Pages
- [ ] README updated with docs link and badge

**Verification**:
```bash
# Trigger workflow manually
gh workflow run docs.yml

# Check workflow status
gh run list --workflow=docs.yml

# Visit site
open https://shaunburdick.github.io/hd-homey/
```

---

### Phase 7: Polish & Search Optimization (P2) - ~2 hours
**Goal**: Refine content and optimize for search/accessibility

**Tasks**:
1. [ ] Review all pages for consistency
   - Consistent tone and voice
   - Proper heading hierarchy (h1 → h2 → h3)
   - No broken internal links
2. [ ] Add missing cross-links between related pages
   - Link from Quick Start to Features
   - Link from Features to Configuration
   - Link from Troubleshooting to relevant Feature pages
3. [ ] Test search functionality with 20 common queries
   - "docker", "tuner", "channel", "stream", "token"
   - "error", "install", "setup", "config", "transcoding"
   - "admin", "user", "invitation", "password", "role"
   - "api", "lineup", "plex", "vlc", "external"
4. [ ] Add SEO meta tags to all pages
   - `<title>` tags
   - `<meta name="description">` tags
   - Open Graph tags (`og:title`, `og:description`, `og:image`)
5. [ ] Test responsive design on mobile/tablet
   - 320px, 375px, 768px, 1024px, 1920px
   - Hamburger menu works on mobile
   - Code blocks scroll horizontally
6. [ ] Run Lighthouse audit and fix issues
   - Target: All scores >90
   - Fix any accessibility issues
   - Optimize images if needed
7. [ ] Proofread all content
   - Fix typos and grammar
   - Clarify confusing sections
   - Add examples where helpful

**Deliverables**:
- [ ] All pages reviewed and polished
- [ ] Search works well for common queries
- [ ] SEO meta tags on all pages
- [ ] Lighthouse score >90 (all categories)
- [ ] Zero accessibility issues

**Testing Checklist**:
```markdown
## Search Test Queries
- [ ] "docker" → Quick Start, Full Installation
- [ ] "tuner" → Tuner Management, Troubleshooting
- [ ] "channel" → Channel Streaming, Features
- [ ] "stream" → Streaming, API, Troubleshooting
- [ ] "token" → Stream Authentication, API
- [ ] "error" → Troubleshooting, Common Errors
- [ ] "install" → Getting Started, Installation
- [ ] "setup" → Quick Start, First Steps
- [ ] "config" → Configuration, Environment Variables
- [ ] "transcoding" → Video Transcoding, Features
- [ ] "admin" → User Management, Roles
- [ ] "user" → User Management, Invitations
- [ ] "invitation" → User Invitations, Features
- [ ] "password" → Authentication, Troubleshooting
- [ ] "role" → User Management, Authorization
- [ ] "api" → API Reference, Lineup Endpoint
- [ ] "lineup" → API, Lineup Endpoint
- [ ] "plex" → API, Integration
- [ ] "vlc" → External Player, Streaming
- [ ] "external" → External Player, Configuration
```

---

## Success Metrics

### Quantitative Metrics
- [ ] Documentation site live at https://shaunburdick.github.io/hd-homey/
- [ ] All 7 main sections complete (25+ pages total)
- [ ] Search returns results for 100% of test queries
- [ ] Lighthouse score >90 (Performance, Accessibility, Best Practices, SEO)
- [ ] Build time <2 minutes
- [ ] Search index <500KB
- [ ] Zero broken links
- [ ] All text meets WCAG 2.2 AA contrast (4.5:1 minimum)

### Qualitative Metrics
- [ ] New user can complete Docker Compose setup using only docs
- [ ] Existing user can find troubleshooting solution quickly
- [ ] Developer can understand contributing process from docs
- [ ] API integrator can implement lineup endpoint without questions
- [ ] Mobile user can navigate entire site comfortably

---

## Risks & Mitigations

### Risk 1: Content Drift from Application
**Impact**: High - Outdated docs cause user confusion  
**Probability**: Medium - Features change frequently  
**Mitigation**:
- Add docs update to feature acceptance criteria
- Quarterly documentation reviews
- Link checker in CI/CD

### Risk 2: Large Search Index Size
**Impact**: Medium - Slow page loads  
**Probability**: Low - VitePress optimizes well  
**Mitigation**:
- Monitor index size during build
- Exclude unnecessary pages from search
- Use partial indexing if needed

### Risk 3: Build Time Exceeds 2 Minutes
**Impact**: Low - Slower deployments  
**Probability**: Low - VitePress is fast  
**Mitigation**:
- Use incremental builds
- Cache dependencies in GitHub Actions
- Optimize images before committing

### Risk 4: Design Tokens Drift
**Impact**: Medium - Visual inconsistency  
**Probability**: Medium - Design changes happen  
**Mitigation**:
- Document design token source in code comments
- Add visual regression testing (future)
- Review design consistency during quarterly reviews

---

## Open Questions

### Q1: Should we add a changelog to the docs site?
**Answer**: No - Keep changelog in CHANGELOG.md. Link to it from docs home page.  
**Rationale**: Single source of truth, avoid duplication.

### Q2: Do we need API versioning in docs?
**Answer**: No - Single version only for v1.0. Consider for v2.0.  
**Rationale**: Out of scope per spec, added complexity not needed yet.

### Q3: Should we include video tutorials?
**Answer**: No - Out of scope per spec. Text and screenshots only.  
**Rationale**: Videos are expensive to produce and maintain. May add later.

### Q4: Do we need i18n/translation support?
**Answer**: No - English only per spec.  
**Rationale**: Additional complexity, small user base doesn't justify yet.

---

## References

### Official Documentation
- [VitePress Documentation](https://vitepress.dev/)
- [VitePress Default Theme Config](https://vitepress.dev/reference/default-theme-config)
- [GitHub Pages Documentation](https://docs.github.com/en/pages)
- [GitHub Actions for Pages](https://github.com/actions/deploy-pages)

### Style Guides
- [Google Developer Documentation Style Guide](https://developers.google.com/style)
- [Microsoft Writing Style Guide](https://learn.microsoft.com/en-us/style-guide/welcome/)
- [Diátaxis Documentation Framework](https://diataxis.fr/)

### Accessibility
- [WCAG 2.2 Guidelines](https://www.w3.org/WAI/WCAG22/quickref/)
- [WebAIM Contrast Checker](https://webaim.org/resources/contrastchecker/)

### Tools
- [Lighthouse CI](https://github.com/GoogleChrome/lighthouse-ci)
- [ImageOptim](https://imageoptim.com/) - Image compression

---

## Next Steps

1. **Review this plan** with stakeholders
2. **Create feature branch**: `011-github-pages-docs`
3. **Begin Phase 1**: VitePress setup and theme customization
4. **Iterate through phases**: Complete deliverables, verify acceptance criteria
5. **Deploy to GitHub Pages**: Verify live site
6. **Announce documentation**: Update README, social media

---

**Total Estimated Time**: ~25 hours across 7 phases  
**Priority**: P2 (Quality of Life - External Documentation)  
**Impact**: Significantly improves user onboarding and reduces support burden

---

*This plan is a living document. Update as implementation progresses.*
