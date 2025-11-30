# Feature Specification: Enhanced Video Player Loading Experience

**Feature ID**: `009-video-player-loading`
**Created**: 2025-11-29
**Status**: 📝 Draft
**Owner**: HD Homey Core Team
**Version**: 1.0

## Overview

This specification defines enhancements to the video player loading experience by replacing the simple "Loading stream..." text with a more engaging visual loading state. The goal is to improve perceived performance and provide a more polished user experience during the stream initialization period.

**Problem Statement**: Currently, when users navigate to the watch page, they see a plain "Loading stream..." text while the HLS stream initializes. This can take 2-10 seconds depending on network conditions and tuner responsiveness. A static text message feels unresponsive and doesn't provide visual feedback about progress or system activity.

**Solution**: Implement an animated loading state that shows visual feedback while the stream is loading. This could include:
1. An animated logo or icon
2. A looping background video/animation
3. A progress indicator or skeleton screen
4. Informative status messages

## User Stories

### Story 1: Engaging Loading Experience (Priority: P2)

**As a** user watching a channel
**I want** to see an animated loading indicator instead of static text
**So that** I know the system is actively working and the wait feels less tedious

**Why this priority**: Enhances UX but doesn't affect core functionality

**Acceptance Criteria**:
- **Given** I navigate to the watch page, **When** the stream is loading, **Then** I see an animated visual indicator
- **Given** the stream takes 5+ seconds to load, **When** I'm waiting, **Then** the animation loops smoothly without jarring transitions
- **Given** the stream loads successfully, **When** video is ready, **Then** the loading animation smoothly transitions out
- **Given** I'm on a slow connection, **When** waiting for the stream, **Then** the animation doesn't consume significant bandwidth

---

### Story 2: Informative Loading States (Priority: P3)

**As a** user watching a channel
**I want** to understand what's happening during loading
**So that** I know if I should wait or if there's a problem

**Why this priority**: Nice-to-have enhancement for transparency

**Acceptance Criteria**:
- **Given** the stream is initializing, **When** different stages occur, **Then** I see descriptive status messages (e.g., "Connecting to tuner...", "Loading stream...", "Buffering video...")
- **Given** the stream fails to load, **When** an error occurs, **Then** the loading animation stops and I see a clear error message
- **Given** I'm waiting more than 10 seconds, **When** the stream hasn't started, **Then** I see a message suggesting potential issues

## Requirements

### Functional Requirements

#### Loading Animation
- **FR-001**: System MUST display an animated visual indicator when the video player is in loading state
- **FR-002**: Loading animation MUST loop seamlessly without visible restarts or freezing
- **FR-003**: Loading animation MUST be visually consistent with HD Homey's dark theme (primary: #1a1a1a, accent: #3b82f6)
- **FR-004**: System MUST transition smoothly from loading state to video playback (no jarring cuts)
- **FR-005**: Loading animation MUST be accessible (proper ARIA labels, respects `prefers-reduced-motion`)

#### Animation Options (Choose One Implementation)
- **FR-006a** (Option A): Display HD Homey logo with CSS animation (pulse, rotate, or fade effects)
- **FR-006b** (Option B): Display an SVG animation (custom or from library like loading.io)
- **FR-006c** (Option C): Display a looping video with minimal file size (<200KB)
- **FR-006d** (Option D): Display a skeleton screen showing video player layout

#### Status Messages
- **FR-007**: System MAY display status messages indicating loading stages (connecting, buffering, etc.)
- **FR-008**: Status messages MUST be concise (max 50 characters)
- **FR-009**: Status messages MUST update without causing layout shift

#### Error Handling
- **FR-010**: System MUST stop loading animation when an error occurs
- **FR-011**: System MUST show clear error state with actionable recovery options

### Non-Functional Requirements

- **NFR-001**: Performance - Loading animation must not delay First Contentful Paint
- **NFR-002**: Performance - Animation assets must be <200KB total
- **NFR-003**: Performance - Animation must run at 60fps on mobile devices
- **NFR-004**: Accessibility - Animation must respect `prefers-reduced-motion` setting
- **NFR-005**: Accessibility - Loading state must be announced to screen readers
- **NFR-006**: UX - Animation must be visually appealing and professional
- **NFR-007**: UX - Animation must not distract from actual video playback once started

## Technical Constraints

- Must work within existing `VideoPlayer` component structure
- Must maintain compatibility with HLS.js loading lifecycle
- Must not interfere with native HLS support detection (Safari)
- Must work on both mobile and desktop viewports
- Must follow existing design token system from SPEC-004
- Animation files must be served from `/public` directory
- Must maintain current error handling behavior

## Proposed Implementation Approach

### Option A: CSS-Animated Logo (Recommended)

**Pros**:
- Zero additional network requests (use existing logo)
- Lightweight (CSS only)
- Easy to maintain
- Respects `prefers-reduced-motion` naturally
- Works offline

**Cons**:
- Limited animation complexity
- May feel basic compared to video

**Implementation**:
```tsx
// Loading state in VideoPlayer component
{loading && (
  <div className="video-loading-overlay">
    <img 
      src="/hd-homey.webp" 
      alt="HD Homey logo"
      className="loading-logo"
    />
    <p className="loading-message">Loading stream...</p>
  </div>
)}

// CSS
.video-loading-overlay {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: var(--color-bg-primary);
  z-index: 10;
}

.loading-logo {
  width: 120px;
  height: 120px;
  animation: pulse 2s ease-in-out infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 0.6; transform: scale(1); }
  50% { opacity: 1; transform: scale(1.05); }
}

@media (prefers-reduced-motion: reduce) {
  .loading-logo {
    animation: none;
  }
}
```

### Option B: SVG Animation

**Pros**:
- More sophisticated animations possible
- Scalable (vector graphics)
- Can include progress indicators

**Cons**:
- Requires creating or licensing SVG
- More complex implementation
- Larger file size than CSS-only

### Option C: Looping Video

**Pros**:
- Most visually engaging
- Can show "broadcast" theme (color bars, test pattern)

**Cons**:
- Additional network request (even if small)
- Complexity in ensuring seamless loop
- Doesn't work without network
- May be overkill for this use case

### Option D: Skeleton Screen

**Pros**:
- Modern UX pattern
- Shows expected layout
- Minimal implementation

**Cons**:
- Less engaging than animation
- Doesn't indicate "loading" as clearly
- May not fit streaming context well

## Recommendation

**Implement Option A (CSS-Animated Logo)** because:
1. Aligns with "Simplicity First" principle from Constitution
2. Zero additional network overhead
3. Works offline
4. Easy to maintain and customize
5. Accessible by default
6. Professional appearance

If user feedback indicates desire for more elaborate animations, we can enhance later.

## Edge Cases & Error Handling

### Loading Duration
- **Short loads (<1s)**: Don't flash loading animation (minimum display time 300ms)
- **Normal loads (1-5s)**: Show animation throughout
- **Long loads (>10s)**: Add supplementary message: "Still loading... Check your network connection"
- **Timeout (>30s)**: Show error with recovery options

### User Interactions
- **User navigates away**: Cleanup animation and HLS.js instance
- **User reloads page**: Animation restarts cleanly
- **Multiple rapid watches**: Each instance gets fresh loading state

### Device Scenarios
- **Slow device**: Use simpler animation if performance degrades
- **Reduced motion preference**: Use opacity fade only, no transforms
- **High contrast mode**: Ensure animation has sufficient contrast

### Network Conditions
- **Offline**: Animation shows immediately (CSS-based), error appears when stream fails
- **Intermittent connection**: Animation continues during retries
- **Very slow connection**: Animation doesn't compound the issue (CSS/local assets only)

## Success Criteria

### Measurable Outcomes

- **SC-001**: Loading animation displays within 100ms of watch page navigation
- **SC-002**: Animation maintains 60fps on mobile devices (iPhone 12+, equivalent Android)
- **SC-003**: Animation respects `prefers-reduced-motion` setting
- **SC-004**: Total asset size increase <50KB (if using Option A: 0KB increase)
- **SC-005**: No measurable impact on Time to Interactive or First Contentful Paint
- **SC-006**: Screen reader announces loading state change

### User Validation

- Users report improved perceived performance (subjective feedback)
- No complaints about distracting or annoying animations
- Animation is visually consistent with overall design
- Mobile users find the loading experience acceptable

## Dependencies

- **Depends On**: 004-ui-ux-guidelines (design tokens and animation guidelines)
- **Depends On**: 005-video-transcoding (VideoPlayer component exists)
- **Blocks**: None
- **Related To**: Any future video player enhancements

## Out of Scope

This specification does NOT include:

- Progress bar showing actual loading percentage (HLS doesn't provide reliable progress)
- Interactive loading screen (games, tips, etc.)
- Customizable loading animations per user preference
- Network speed detection and adaptive animation
- Loading animation for channel lists or other parts of the app
- A/B testing framework for different loading animations

## Implementation Plan

### Phase 1: Core Animation (P2)
1. Create CSS animation styles for logo
2. Update `VideoPlayer` component to show animated loading state
3. Ensure proper z-index layering and transitions
4. Add `prefers-reduced-motion` support
5. Update ARIA labels for accessibility

### Phase 2: Polish (P3)
1. Add status message updates (optional)
2. Implement minimum display time to avoid flashing
3. Add long-load timeout handling
4. Fine-tune animation timing and easing

### Phase 3: Validation (P3)
1. Test on iOS Safari and Android Chrome
2. Test with screen readers
3. Performance testing on low-end devices
4. Gather user feedback

## Testing Requirements

### Unit Tests
- Loading state renders animation overlay
- Animation respects `prefers-reduced-motion` CSS class
- Component cleans up properly on unmount
- Minimum display time prevents flashing (<1s loads)

### Integration Tests
- Animation appears when `loading={true}`
- Animation disappears when video starts playing
- Error state replaces loading animation on failure
- ARIA labels are correct for accessibility

### Manual Testing Checklist
- [ ] Animation appears on watch page navigation
- [ ] Animation loops smoothly without visible restarts
- [ ] Video playback starts smoothly after loading
- [ ] Animation respects `prefers-reduced-motion` browser setting
- [ ] Screen reader announces "Loading stream" state
- [ ] Works on Chrome, Firefox, Safari, Edge
- [ ] Works on iOS Safari and Android Chrome
- [ ] No layout shift when transitioning from loading to playing
- [ ] Looks good on 320px mobile and 1920px desktop
- [ ] Fast loads (<1s) don't cause jarring flash

### Performance Testing
- [ ] Animation maintains 60fps on iPhone 12
- [ ] Animation maintains 60fps on mid-range Android
- [ ] No increase in Time to Interactive
- [ ] No increase in First Contentful Paint
- [ ] Memory usage remains stable during long loads

## Notes

- Consider adding a "Skip to player" button for users who don't want to see the animation
- Future enhancement: Could add TV-themed animations (color bars, test patterns) for nostalgia
- Future enhancement: Could show channel artwork/logo if available
- Keep animation subtle to avoid overshadowing the actual content
- Animation should feel "premium" but not excessive

## References

- [WCAG 2.2: Animation from Interactions](https://www.w3.org/WAI/WCAG22/Understanding/animation-from-interactions.html)
- [MDN: prefers-reduced-motion](https://developer.mozilla.org/en-US/docs/Web/CSS/@media/prefers-reduced-motion)
- [Material Design: Loading](https://m2.material.io/design/communication/data-loading.html)
- [CSS-Tricks: Skeleton Screens](https://css-tricks.com/building-skeleton-screens-css-custom-properties/)
- [Web.dev: Loading Performance](https://web.dev/loading-performance/)
