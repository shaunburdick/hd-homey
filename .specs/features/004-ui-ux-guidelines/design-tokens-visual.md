# Design Tokens Visual Reference

**Feature**: 004-ui-ux-guidelines
**Purpose**: Visual reference for developers implementing the design system

## Color Palette Preview

### Dark Theme Colors (Extending new.css)

**Current new.css dark theme** (via `prefers-color-scheme: dark`):
- `--nc-bg-1: #000000` (pure black)
- `--nc-bg-2: #111111`
- `--nc-bg-3: #222222`
- `--nc-tx-1: #ffffff`
- `--nc-tx-2: #eeeeee`
- `--nc-lk-1: #3291FF` (links)

**HD Homey customizations** (override and extend):

#### Backgrounds
```
┌─────────────────────────────────────┐
│  Primary Background (#1a1a1a)       │  ← Main page background (lighter than pure black)
│  ┌───────────────────────────────┐  │
│  │ Secondary (#2a2a2a)           │  │  ← Cards, elevated surfaces
│  │ ┌─────────────────────────┐   │  │
│  │ │ Tertiary (#3a3a3a)      │   │  │  ← Hover states
│  │ └─────────────────────────┘   │  │
│  └───────────────────────────────┘  │
└─────────────────────────────────────┘
```

**HEX Values** (override new.css):
- `--nc-bg-1: #1a1a1a` - Slightly lighter than pure black for better readability
- `--nc-bg-2: #2a2a2a` - Medium (cards, containers)
- `--nc-bg-3: #3a3a3a` - Lightest (hover, active states)

#### Text Colors
```
Primary Text (#f0f0f0)     ← Main content (high contrast)
Secondary Text (#b0b0b0)   ← Labels, descriptions (medium contrast)
Tertiary Text (#808080)    ← Disabled, placeholders (low contrast)
```

**Contrast Ratios** (on #1a1a1a background):
- Primary: 13.8:1 ✅ (Exceeds WCAG AAA)
- Secondary: 7.2:1 ✅ (Exceeds WCAG AA)
- Tertiary: 4.6:1 ✅ (Meets WCAG AA for large text)

#### Accent & Semantic Colors
```
┌────────────┬────────────┬────────────┬────────────┐
│  Accent    │  Success   │   Error    │  Warning   │
│  #3b82f6   │  #10b981   │  #ef4444   │  #f59e0b   │
│  Blue      │  Green     │   Red      │  Orange    │
└────────────┴────────────┴────────────┴────────────┘
```

**Usage**:
- **Accent** (#3b82f6): Links, primary buttons, focus rings
- **Success** (#10b981): Success messages, confirmation icons
- **Error** (#ef4444): Error messages, destructive actions
- **Warning** (#f59e0b): Warning messages, caution states

#### Borders
```
Default Border: #404040 (subtle, 1px solid)
Focus Border: #3b82f6 (accent color, 2px solid)
```

## Component Examples

### Button Styles

#### Primary Button
```
┌─────────────────────────────┐
│     Primary Action          │  Background: #3b82f6
│                             │  Text: #ffffff
└─────────────────────────────┘  Hover: #2563eb
     ↓ hover                      Shadow: 0 4px 6px rgba(0,0,0,0.5)
┌─────────────────────────────┐
│     Primary Action          │  (Darker blue)
│                             │
└─────────────────────────────┘
```

#### Secondary Button
```
┌─────────────────────────────┐
│    Secondary Action         │  Background: #3a3a3a
│                             │  Text: #f0f0f0
└─────────────────────────────┘  Border: 1px solid #404040
     ↓ hover                      Hover: #404040 background
┌─────────────────────────────┐
│    Secondary Action         │
│                             │
└─────────────────────────────┘
```

#### Loading State
```
┌─────────────────────────────┐
│   ⟳ Loading...              │  Opacity: 0.7
│                             │  Cursor: not-allowed
└─────────────────────────────┘  Disabled: true
```

### Form Input Styles

#### Default Input
```
Label (secondary text)
┌─────────────────────────────┐
│ Placeholder text            │  Background: #2a2a2a
│                             │  Border: 1px solid #404040
└─────────────────────────────┘  Text: #f0f0f0
Help text (tertiary text)
```

#### Focus State
```
Label (secondary text)
┌─────────────────────────────┐
│ User typing...│             │  Border: 2px solid #3b82f6
│                             │  Outline: none
└─────────────────────────────┘  Box-shadow: 0 0 0 3px rgba(59,130,246,0.1)
```

#### Error State
```
Label (secondary text)
┌─────────────────────────────┐
│ Invalid value               │  Border: 1px solid #ef4444
│                             │  Background: rgba(239,68,68,0.1)
└─────────────────────────────┘
⚠ Error message here (error color)
```

### Card Component
```
┌─────────────────────────────────────────┐
│  Card Title                             │
│                                         │
│  Card content goes here with proper     │
│  padding and spacing.                   │
│                                         │
│  [Action Button]                        │
│                                         │
└─────────────────────────────────────────┘

Background: #2a2a2a
Border: 1px solid #404040
Border-radius: 12px (--radius-lg)
Padding: 24px (--space-6)
Shadow: 0 1px 2px rgba(0,0,0,0.5)
Hover: Shadow increases to --shadow-md
```

### Navigation

#### Desktop Navigation
```
┌────────────────────────────────────────────────────────┐
│  [Logo]  Home  Tuners  Settings  About     Sign Out    │
│          ━━━━                                           │
│          (active indicator)                            │
└────────────────────────────────────────────────────────┘
```

#### Mobile Navigation
```
┌──────────────────────────────┐
│  [Logo]               [☰]    │  ← Hamburger (48×48px)
└──────────────────────────────┘

Menu open:
┌──────────────────────────────┐
│  [Logo]               [✕]    │
├──────────────────────────────┤
│                              │
│  ┌────────────────────────┐  │
│  │  Home                  │  │
│  │  Tuners                │  │
│  │  Settings              │  │
│  │  About                 │  │
│  │  Sign Out              │  │
│  └────────────────────────┘  │
│                              │
└──────────────────────────────┘
  ↑ Backdrop (rgba(0,0,0,0.75))
```

## Typography Scale

```
Display / H1:   2.25rem (36px)  ━━━━━━━━━━━━━━
Heading 2:      1.875rem (30px) ━━━━━━━━━━━
Heading 3:      1.5rem (24px)   ━━━━━━━━
Heading 4:      1.25rem (20px)  ━━━━━━
Large:          1.125rem (18px) ━━━━
Base:           1rem (16px)     ━━━
Small:          0.875rem (14px) ━━
Extra Small:    0.75rem (12px)  ━
```

**Line Heights**:
- Tight: 1.25 (headings)
- Normal: 1.5 (body text) ← Default
- Relaxed: 1.75 (long-form content)

## Spacing Scale

```
--space-1:  4px   ▪
--space-2:  8px   ▪▪
--space-3:  12px  ▪▪▪
--space-4:  16px  ▪▪▪▪          ← Base unit
--space-5:  24px  ▪▪▪▪▪▪
--space-6:  32px  ▪▪▪▪▪▪▪▪
--space-8:  48px  ▪▪▪▪▪▪▪▪▪▪▪▪
--space-10: 64px  ▪▪▪▪▪▪▪▪▪▪▪▪▪▪▪▪
```

**Common Usage**:
- `--space-1`: Small gaps between inline elements
- `--space-2`: Label margins, small padding
- `--space-3`: Input padding, button padding (vertical)
- `--space-4`: Section spacing, general margins
- `--space-5`: Button padding (horizontal), card padding (small)
- `--space-6`: Card padding, section padding
- `--space-8`: Page section spacing
- `--space-10`: Major section breaks

## Shadow & Depth

```
Elevation 0: No shadow (flush with background)

Elevation 1: --shadow-sm
┌─────────────┐
│   Button    │
└─────────────┘
   ▒ (subtle shadow)

Elevation 2: --shadow-md
┌─────────────┐
│    Card     │
└─────────────┘
   ▒▒ (medium shadow)

Elevation 3: --shadow-lg
┌─────────────┐
│   Modal     │
└─────────────┘
   ▒▒▒ (pronounced shadow)
```

## Radius Scale

```
Small (4px):     ┌──┐  Buttons, inputs, small elements
                 └──┘

Medium (8px):    ┌───┐  Cards, containers
                 └───┘

Large (12px):    ┌────┐  Modals, prominent cards
                 └────┘
```

## Breakpoints

```
Mobile:    ├─────────────┤  < 768px
           0             768

Tablet:                   ├──────────┤  768px - 1024px
                         768        1024

Desktop:                              ├──────────────────→
                                    1024                  ∞
```

## Touch Target Sizes

```
Minimum (44×44px):           Maximum (56×56px):
┌────────────┐               ┌──────────────┐
│    Hit     │               │   Spacious   │
│    Area    │               │   Hit Area   │
└────────────┘               └──────────────┘
  ↑ Mobile only                ↑ Preferred size
```

## Real-World Examples

### Sign In Form
```
┌────────────────────────────────────────┐
│                                        │
│           Sign In                      │  (H1, 36px)
│                                        │
│  Username                              │  (Label, 14px, secondary)
│  ┌──────────────────────────────────┐  │
│  │ Enter username                   │  │  (Input, 16px)
│  └──────────────────────────────────┘  │
│                                        │
│  Password                              │
│  ┌──────────────────────────────────┐  │
│  │ ••••••••                         │  │
│  └──────────────────────────────────┘  │
│                                        │
│  ┌──────────────────────────────────┐  │
│  │         Sign In                  │  │  (Primary button)
│  └──────────────────────────────────┘  │
│                                        │
└────────────────────────────────────────┘

Background: #1a1a1a
Form container: #2a2a2a with padding
Inputs: #2a2a2a with #404040 borders
Button: #3b82f6 with white text
```

### Tuner Card
```
┌────────────────────────────────────────┐
│  Living Room Tuner          [Edit]     │  (H2 + Button)
│                                        │
│  Status: Online                        │  (Green dot + text)
│  Channels: 42                          │
│  Last Scanned: 2 hours ago             │  (Secondary text)
│                                        │
│  [View Channels]                       │  (Primary button)
│                                        │
└────────────────────────────────────────┘

Background: #2a2a2a
Border: 1px solid #404040
Shadow: --shadow-sm
Hover: --shadow-md + border color #505050
Clickable: Entire card responds to click
```

### Error Message
```
┌────────────────────────────────────────┐
│  ⚠ Error                               │
│                                        │
│  Unable to connect to tuner at         │
│  http://192.168.1.100                  │
│                                        │
│  Please check:                         │
│  • Network connection                  │
│  • Tuner IP address is correct         │
│  • Tuner is powered on                 │
│                                        │
│  [Try Again]  [Cancel]                 │
└────────────────────────────────────────┘

Background: rgba(239, 68, 68, 0.1)
Border: 1px solid #ef4444
Text: #ef4444 for error, #f0f0f0 for details
Icon: #ef4444
```

## Implementation Notes

### CSS Custom Properties Location
Extend new.css in `src/app/globals.css`:

```css
/* Keep new.css import - provides excellent defaults and dark theme */
@import '@exampledev/new.css/new.css';

/* Override new.css dark theme with softer blacks */
@media (prefers-color-scheme: dark) {
  :root {
    /* Override new.css backgrounds for better readability */
    --nc-bg-1: #1a1a1a;
    --nc-bg-2: #2a2a2a;
    --nc-bg-3: #3a3a3a;
  }
}

/* Add HD Homey-specific design tokens */
:root {
  /* Semantic colors (new.css doesn't provide these) */
  --color-success: #10b981;
  --color-error: #ef4444;
  --color-warning: #f59e0b;

  /* Spacing scale */
  --space-1: 0.25rem;
  --space-4: 1rem;
  /* ... more tokens ... */
}

/* Base element styles */
body {
  background-color: var(--color-bg-primary);
  color: var(--color-text-primary);
  font-family: var(--font-family);
}

/* ... component styles ... */
```

### Usage in Components
```tsx
// Use semantic class names
<button className="btn-primary">Action</button>

// Or inline styles with tokens (when dynamic)
<div style={{ padding: 'var(--space-4)' }}>Content</div>
```

### Accessibility Reminders
- ✅ Minimum 4.5:1 contrast for normal text
- ✅ Minimum 3:1 contrast for large text (18px+)
- ✅ Minimum 3:1 contrast for UI components
- ✅ Focus indicators must be visible (2px outline)
- ✅ Touch targets minimum 44×44px on mobile

## Testing Checklist

- [ ] View in Chrome DevTools dark mode
- [ ] Check contrast with tool (WebAIM, etc.)
- [ ] Test on real mobile device
- [ ] Verify in different lighting conditions
- [ ] Test with screen reader
- [ ] Check keyboard focus indicators
- [ ] Test at different zoom levels (150%, 200%)

---

**Quick Reference**: Use this document alongside `spec.md` when implementing the design system. All values here match the tokens defined in the specification.
