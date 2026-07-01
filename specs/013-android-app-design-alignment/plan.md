# Plan: Android Color Design Alignment

## Overview

Align the Android app's `colors.xml` with the canonical design language defined in `DESIGN.md` (repo root). The web app is the authoritative source for color tokens; Android values have drifted across multiple tokens. This plan brings them back into sync per FR-029 through FR-045 in `.specify/features/013-android-app.md`.

## What's Changing and Why

The project design language was canonicalized in `DESIGN.md`, establishing a single source of truth for color tokens. The Android app (`colors.xml`) diverges on 9 color values, is missing 8 colors present in the web design system, and carries 1 orphaned token (`hd_homey_accent`) with no design-system equivalent.

| Change Type | Count | Examples |
|---|---|---|
| **Value updates** | 9 | `hd_homey_blue`: `#007bff` → `#2563eb`, `text_primary`: `#ffffff` → `#f0f0f0`, etc. |
| **New colors added** | 8 | `color_border`, `color_success_bg`, `color_info`, etc. |
| **Removals** | 1 | `hd_homey_accent` (`#00bcd4`) — orphaned template leftover |
| **No change (verified)** | 1 | `text_secondary` (`#b3b3b3`) is perceptually equivalent to web `#b0b0b0` |

**Why this matters:**
- Cross-platform visual consistency (Constitution §II — User Experience Excellence)
- Removes orphaned tokens that cause confusion (Constitution §I — Simplicity First)
- Enables future use of design-system-aware components (borders, disabled states, info indicators)
- `text_primary` shift from `#ffffff` to `#f0f0f0` reduces eye strain on TV displays (matching web rationale)

### Constitution Alignment

This plan is explicitly aligned with:
- **§I Simplicity First** — removing `hd_homey_accent` eliminates an orphaned token with no design purpose
- **§II User Experience Excellence** — consistent colors across platforms reduce cognitive friction
- **§III Code Quality** — no lint suppressions, no `any` types (N/A to XML); verified via `grep` audit

No constitutional conflicts identified.

## Scope Boundaries

### In Scope
- `colors.xml` — value changes, additions, removals
- `themes.xml` — `colorAccent` and `android:colorAccent` references to removed `hd_homey_accent`
- All layout files in `res/layout/` that reference changed colors
- All drawable files in `res/drawable/` that reference changed colors
- All mipmap files in `res/mipmap-anydpi-v26/` that reference changed colors
- Verification: `grep -r` for any remaining old values

### NOT in Scope
- ❌ Do NOT change `text_secondary` (`#b3b3b3`) — verified imperceptibly close to web `#b0b0b0`
- ❌ Do NOT refactor layout structure or change component hierarchies
- ❌ Do NOT touch `dimens.xml` — no dimension changes in this alignment
- ❌ Do NOT change CardView/elevation pattern — layout patterns are out of scope
- ❌ Do NOT touch dark theme — it stays dark; only color values change
- ❌ Do NOT modify `activity_main.xml` — no color references
- ❌ Do NOT modify `item_server_skeleton.xml` — only references `surface_dark` which is not changing
- ❌ Do NOT change `shimmer_placeholder` / `shimmer_highlight` — these are animation-specific, not design-system tokens
- ❌ Do NOT add/change Java/Kotlin code — this is a resource-only change

## File Inventory

### Files to Modify (17 total)

| # | File | Change Type | Colors Referenced |
|---|---|---|---|
| 1 | `res/values/colors.xml` | Value changes + additions + removal | All colors (source of truth) |
| 2 | `res/values/themes.xml` | Reference fix | Replace `hd_homey_accent` with `hd_homey_blue` |
| 3 | `res/layout/activity_player.xml` | Value-only (no rename) | `hd_homey_blue`, `text_primary`, `error_red` |
| 4 | `res/layout/fragment_add_server.xml` | Value-only | `hd_homey_blue`, `error_red`, `text_primary`, `text_secondary`, `surface_dark`, `background_dark` |
| 5 | `res/layout/fragment_server_list.xml` | Value-only | `hd_homey_blue`, `text_primary`, `text_secondary`, `text_tertiary` |
| 6 | `res/layout/fragment_server_setup.xml` | Value-only | `text_secondary`, `background_dark` |
| 7 | `res/layout/fragment_channel_list.xml` | Value-only | `hd_homey_blue`, `text_primary`, `text_secondary`, `text_tertiary`, `error_red` |
| 8 | `res/layout/fragment_authentication.xml` | Value-only | `text_secondary`, `text_tertiary`, `error_red` |
| 9 | `res/layout/fragment_success.xml` | Value-only | `hd_homey_blue`, `success_green`, `text_primary`, `text_secondary` |
| 10 | `res/layout/item_channel.xml` | Value-only | `surface_dark_elevated`, `hd_homey_blue_dark`, `text_primary`, `text_secondary` |
| 11 | `res/layout/item_server.xml` | Value + possible rename | `surface_dark`, `text_primary`, `text_secondary`, `success_green`, `primary_blue` |
| 12 | `res/layout/player_controls.xml` | Value-only | `text_primary` |
| 13 | `res/drawable/bg_refresh_button.xml` | Value-only | `hd_homey_blue`, `surface_dark_elevated` |
| 14 | `res/drawable/ic_player_pause.xml` | Value-only | `text_primary` |
| 15 | `res/drawable/ic_player_exit.xml` | Value-only | `text_primary` |
| 16 | `res/drawable/ic_player_play.xml` | Value-only | `text_primary` |
| 17 | `res/mipmap-anydpi-v26/ic_launcher.xml` | Value-only | `hd_homey_blue` |
| 18 | `res/mipmap-anydpi-v26/ic_launcher_round.xml` | Value-only | `hd_homey_blue` |

### Colors NOT Changing (for completeness)

These colors appear in layout/drawable files but their values remain unchanged:
- `background_dark` (`#1a1a1a`) — already matches web `--color-bg-primary`
- `surface_dark` (`#2a2a2a`) — already matches web `--color-bg-secondary`
- `text_secondary` (`#b3b3b3`) — verified close enough to web `#b0b0b0`
- `shimmer_placeholder` (`#3a3a3a`) — animation-specific, not a design token
- `shimmer_highlight` (`#4a4a4a`) — animation-specific, not a design token

## Design Decisions

### D1. `hd_homey_accent` → Replace with `hd_homey_blue` in themes.xml

`colorAccent` and `android:colorAccent` in `themes.xml` reference `@color/hd_homey_accent` (teal `#00bcd4`). Since this token is being removed and has no equivalent, the accent should use the canonical accent blue (`hd_homey_blue` / `#2563eb`). This brings the accent color in line with the web design where `--color-accent` serves as the interactive accent color.

### D2. `primary_blue` → Remove and migrate reference to `hd_homey_blue`

`primary_blue` (`#007fbf`) duplicates the old `hd_homey_blue` value. Keeping a duplicate color name is confusing per Constitution §I (Simplicity First). Instead:
- Remove `<color name="primary_blue">` from `colors.xml`
- Change the one reference in `item_server.xml` from `@color/primary_blue` to `@color/hd_homey_blue`

### D3. `text_secondary` → No change

Android `#b3b3b3` vs web `#b0b0b0` — a 3-hex (0.1%) difference that is imperceptible on all display types (verified in spec §"Notes on Specific Tokens"). Skipping this change reduces diff noise and eliminates a risk of unnecessary regressions.

### D4. `surface_dark_elevated` → Value change only

Changes from `#353535` to `#3a3a3a`. All references in layout/drawable files use `@color/surface_dark_elevated` — no rename needed, only the hex value in `colors.xml` changes.

### D5. New color naming convention

New colors use the naming convention `color_<role>` (e.g., `color_border`, `color_success_bg`) to distinguish them from existing platform-named resources. This matches the pattern started by `success_green`, `error_red`, etc. and avoids collision with any Android system resources.

### D6. Shimmer colors preserved

`shimmer_placeholder` and `shimmer_highlight` are animation-specific utility colors for the shimmer loading effect. They do not correspond to any web design token and remain unchanged.

### D7. `warning_yellow` value changes but no layout references updated

`warning_yellow` is defined in `colors.xml` and changes from `#ffc107` to `#f59e0b`, but no layout or drawable file currently references it. The change is still made for future use — it will take effect automatically when any layout starts referencing it.

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Layout file references a removed color (`hd_homey_accent`) | Very low | Build failure | Confirmed: `hd_homey_accent` only used in `colors.xml` and `themes.xml` (verified via `grep`); no layout files reference it |
| Layout references a renamed color | None | N/A | No colors are renamed; only values change (except `primary_blue` which is removed and migrated) |
| `text_primary` shift (`#ffffff` → `#f0f0f0`) reduces contrast | Low | Slightly lower contrast on TV | Web uses `#f0f0f0` successfully; 7-hex difference maintains AA compliance at ~12:1 ratio on `#1a1a1a` |
| Semantic color shifts (`success_green`, `error_red`) cause visual mismatch with expectations | Low | User confusion | Colors match web app exactly; users familiar with web will see consistency |
| Build breaks due to unused color removal | None | N/A | `grep` verification confirms no stale references before removal |
| `surface_dark_elevated` change (`#353535` → `#3a3a3a`) barely visible | Low | Subtle UI change | The 5-hex difference is minor; it brings Android in line with web `--color-bg-tertiary` |
| `primary_blue` removal breaks `item_server.xml` | Low | Build failure if missed | Task explicitly includes changing this reference to `hd_homey_blue` |

**Overall assessment**: Low risk. The work is contained to resource XML files with no logic changes. All changes are value/name swaps with `grep`-verified completeness. The only risk of build failure is if a reference is missed — mitigated by the final verification task.
