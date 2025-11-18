# Feature 004: UI/UX Guidelines & Design System

## Quick Links

- 📋 [Full Specification](./spec.md) - Complete UI/UX guidelines and design system
- 🗺️ [Implementation Plan](./implementation-plan.md) - Detailed phased approach with tasks and priorities

## Overview

This feature establishes comprehensive UI/UX guidelines focused on:
- **Enhanced dark theme** - Extend new.css's automatic dark theme with custom tokens and refinements
- **Mobile-first** - Responsive design with excellent touch support
- **User convenience** - Helpful instructions and clear feedback
- **Accessibility** - WCAG 2.1 AA compliance

**Current State**: new.css already provides automatic dark theme switching via `prefers-color-scheme`. This spec enhances it with custom design tokens and HD Homey-specific improvements.

## Current Status

**Status**: In Progress - Phase 8/9
**Priority**: P1 (Critical)
**Estimated Effort**: 15-20 days total across 9 phases

**Completed**: 
- ✅ Phase 1: Design system foundation (WCAG 2.2 AA)
- ✅ Phase 2: Core components and navigation
- ✅ Phase 3: Authentication pages
- ✅ Phase 4: Tuner management pages
- ✅ Phase 5: User management pages
- ✅ Phase 6: Settings and other pages
- ✅ Phase 7: Enhanced feedback & polish
- 🚧 Phase 8: Accessibility audit (in progress - most issues fixed)
- ⏳ Phase 9: Mobile testing & optimization (next)

## Key Deliverables

### Design System
- Complete dark theme color palette
- Design tokens (CSS custom properties)
- Typography scale
- Spacing system
- Component guidelines

### UI Components
- Button component (primary/secondary, loading states)
- Form components (Input, FormField, FormErrors)
- Card component
- Toast notifications
- Loading indicators

### Page Updates
- All authentication pages
- Tuner management pages
- User management pages
- Settings and dashboard
- Error pages (404, error boundaries)

## Implementation Phases

1. **Phase 1**: Foundation - Enhance dark theme & design system (1-2 days)
2. **Phase 2**: Navigation & core components (2-3 days)
3. **Phase 3**: Auth & onboarding pages (1-2 days)
4. **Phase 4**: Tuner management pages (2-3 days)
5. **Phase 5**: User management pages (1-2 days)
6. **Phase 6**: Settings & other pages (1 day)
7. **Phase 7**: Enhanced feedback & polish (2-3 days)
8. **Phase 8**: Accessibility audit & fixes (2-3 days)
9. **Phase 9**: Mobile testing & optimization (2 days)

**Note**: Phase 1 is shorter because new.css already provides a working dark theme foundation.

## Success Criteria

- ✅ Lighthouse accessibility score > 95
- ✅ Mobile usability score: 100
- ✅ All touch targets > 44×44px
- ✅ All text contrast > 4.5:1 (WCAG AA)
- ✅ Working on iOS Safari and Android Chrome
- ✅ Full keyboard navigation support

## Quick Start for Implementation

```bash
# 1. Create feature branch
git checkout -b feature/ui-ux-overhaul

# 2. Start with Phase 1 - Foundation
# - Extend src/app/globals.css with custom design tokens
# - Keep new.css as base (already provides dark theme)

# 3. Work through phases incrementally
# - Test after each phase
# - Commit frequently
# - Update CHANGELOG.md

# 4. Test thoroughly
npm test                    # Run unit tests
npm run lint               # Check linting
# Manual testing on real devices
```

## Design Tokens Preview

```css
/* Colors */
--color-bg-primary: #1a1a1a;
--color-bg-secondary: #2a2a2a;
--color-text-primary: #f0f0f0;
--color-accent: #3b82f6;

/* Spacing */
--space-1: 0.25rem;  /* 4px */
--space-4: 1rem;     /* 16px */
--space-6: 2rem;     /* 32px */

/* Typography */
--font-size-base: 1rem;
--line-height-normal: 1.5;
```

## Related Features

- **001-tuner-management** - UI improvements for tuner CRUD
- **002-channel-streaming** - UI improvements for channel viewing
- **003-user-authentication** - UI improvements for auth flows

## Files to Create

New components needed:
- `src/components/Button.tsx`
- `src/components/Input.tsx`
- `src/components/FormField.tsx`
- `src/components/FormErrors.tsx`
- `src/components/Card.tsx`
- `src/components/Toast.tsx`
- `src/components/LoadingSpinner.tsx`

## Files to Update

Major updates needed:
- `src/app/globals.css` - Complete rewrite
- `src/components/nav.tsx` - Enhanced UX
- `src/components/nav.css` - New design tokens
- All page files for improved UX

## Testing Requirements

### Manual Testing
- [ ] Test on iOS device
- [ ] Test on Android device
- [ ] Keyboard navigation only
- [ ] Screen reader testing
- [ ] Multiple viewport sizes

### Automated Testing
- [ ] Lighthouse CI
- [ ] Component unit tests
- [ ] Integration tests for forms
- [ ] Visual regression tests

## Notes

- Dark theme only - no light theme planned
- Maintaining compatibility with existing functionality is critical
- Real device testing is mandatory, simulators not sufficient
- Accessibility is non-negotiable
- Performance budget: FCP < 1.5s, TTI < 3s

## Questions or Issues?

Refer to:
1. Full spec for detailed guidelines
2. Implementation plan for specific tasks
3. AGENTS.md for project context
4. `.specs/constitution.md` for development process
