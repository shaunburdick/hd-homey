# Tasks: Android Color Design Alignment

**Branch**: `android-app-phase-2`  
**Work directory**: `apps/android/`  
**Spec**: `.specify/features/013-android-app.md` §"Design Alignment" (FR-029 through FR-045)  
**Plan**: `specs/013-android-app-design-alignment/plan.md`

---

## Color Value Reference

Use this table as the single source of truth across all tasks.

| Color Name | Old Value | New Value | Change Type |
|---|---|---|---|
| `hd_homey_blue` | `#007bff` | `#2563eb` | Value update |
| `hd_homey_blue_dark` | `#0056b3` | `#1d4ed8` | Value update |
| `hd_homey_accent` | `#00bcd4` | — | **REMOVE** |
| `surface_dark_elevated` | `#353535` | `#3a3a3a` | Value update |
| `text_primary` | `#ffffff` | `#f0f0f0` | Value update |
| `text_tertiary` | `#808080` | `#909090` | Value update |
| `success_green` | `#4caf50` | `#10b981` | Value update |
| `error_red` | `#f44336` | `#ff5555` | Value update |
| `warning_yellow` | `#ffc107` | `#f59e0b` | Value update |
| `primary_blue` | `#007fbf` | — | **REMOVE** (migrate to `hd_homey_blue`) |
| `color_border` | — | `#404040` | New |
| `color_border_hover` | — | `#505050` | New |
| `color_text_disabled` | — | `#666666` | New |
| `color_success_bg` | — | `#064e3b` | New |
| `color_error_bg` | — | `#7f1d1d` | New |
| `color_warning_bg` | — | `#78350f` | New |
| `color_info` | — | `#3b82f6` | New |
| `color_info_bg` | — | `#1e3a8a` | New |
| `text_secondary` | `#b3b3b3` | `#b3b3b3` | **No change** ✅ |
| `background_dark` | `#1a1a1a` | `#1a1a1a` | **No change** ✅ |
| `surface_dark` | `#2a2a2a` | `#2a2a2a` | **No change** ✅ |
| `shimmer_placeholder` | `#3a3a3a` | `#3a3a3a` | **No change** ✅ |
| `shimmer_highlight` | `#4a4a4a` | `#4a4a4a` | **No change** ✅ |

---

- [x] **T-001: Update `colors.xml` — value changes, additions, and removals**
  - **File**: `apps/android/app/src/main/res/values/colors.xml`
  - **Actions**:
    1. Change `hd_homey_blue` value from `#007bff` to `#2563eb`
    2. Change `hd_homey_blue_dark` value from `#0056b3` to `#1d4ed8`
    3. Remove the entire `<color name="hd_homey_accent">` line
    4. Change `surface_dark_elevated` value from `#353535` to `#3a3a3a`
    5. Change `text_primary` value from `#ffffff` to `#f0f0f0`
    6. Change `text_tertiary` value from `#808080` to `#909090`
    7. Change `success_green` value from `#4caf50` to `#10b981`
    8. Change `error_red` value from `#f44336` to `#ff5555`
    9. Change `warning_yellow` value from `#ffc107` to `#f59e0b`
    10. Remove the entire `<color name="primary_blue">` line
    11. Add a new "Borders" section after the HD Homey brand colors section:
        - `<color name="color_border">#404040</color>`
        - `<color name="color_border_hover">#505050</color>`
    12. Add a new "Text states" section after the UI colors section:
        - `<color name="color_text_disabled">#666666</color>`
    13. Add new semantic background entries after the Status colors section:
        - `<color name="color_success_bg">#064e3b</color>`
        - `<color name="color_error_bg">#7f1d1d</color>`
        - `<color name="color_warning_bg">#78350f</color>`
    14. Add new Info color entries after the Status colors section:
        - `<color name="color_info">#3b82f6</color>`
        - `<color name="color_info_bg">#1e3a8a</color>`
  - **Verification**: Run `grep -c 'hd_homey_accent' colors.xml` and confirm 0; run `grep -c 'primary_blue' colors.xml` and confirm 0; confirm all 8 new colors are present.

- [x] **T-002: Update `themes.xml` — remove `hd_homey_accent` references**
  - **File**: `apps/android/app/src/main/res/values/themes.xml`
  - **Actions**:
    1. In `Base.Theme.HdHomey` style: change `<item name="colorAccent">@color/hd_homey_accent</item>` to `<item name="colorAccent">@color/hd_homey_blue</item>`
    2. In `Theme.HdHomey.Leanback` style: change `<item name="android:colorAccent">@color/hd_homey_accent</item>` to `<item name="android:colorAccent">@color/hd_homey_blue</item>`
  - **Rationale**: `colorAccent` is the Material Design accent color for interactive elements. Replacing the orphaned teal with the canonical accent blue maintains consistent interactive styling across the app.
  - **Verification**: Run `grep -n 'hd_homey_accent' themes.xml` and confirm 0 matches.

- [x] **T-003: Update layout XML files — fix all color references**
  - **Grep patterns to find changed color references in layouts**:

    ```bash
    # Colors whose values changed (need no rename, but verify they compile)
    grep -rn '@color/hd_homey_blue\b' apps/android/app/src/main/res/layout/
    grep -rn '@color/hd_homey_blue_dark\b' apps/android/app/src/main/res/layout/
    grep -rn '@color/surface_dark_elevated\b' apps/android/app/src/main/res/layout/
    grep -rn '@color/text_primary\b' apps/android/app/src/main/res/layout/
    grep -rn '@color/text_tertiary\b' apps/android/app/src/main/res/layout/
    grep -rn '@color/success_green\b' apps/android/app/src/main/res/layout/
    grep -rn '@color/error_red\b' apps/android/app/src/main/res/layout/

    # Color being removed — confirm NO references in layouts
    grep -rn '@color/primary_blue\b' apps/android/app/src/main/res/layout/

    # Color being removed — confirm NO references in layouts
    grep -rn '@color/hd_homey_accent\b' apps/android/app/src/main/res/layout/
    ```

  - **Files to update** (colors in these files change value but keep the same resource name — no XML changes needed unless the spec says otherwise, except for `primary_blue`):
    - `layout/activity_player.xml` — `hd_homey_blue`, `text_primary`, `error_red` change values (no XML edit needed — values come from `colors.xml`)
    - `layout/fragment_add_server.xml` — `hd_homey_blue`, `error_red`, `text_primary` change values
    - `layout/fragment_server_list.xml` — `hd_homey_blue`, `text_primary`, `text_tertiary` change values
    - `layout/fragment_server_setup.xml` — only references `text_secondary` (no change) and `background_dark` (no change); **no edits needed**
    - `layout/fragment_channel_list.xml` — `hd_homey_blue`, `text_primary`, `text_tertiary`, `error_red` change values
    - `layout/fragment_authentication.xml` — `text_tertiary`, `error_red` change values
    - `layout/fragment_success.xml` — `hd_homey_blue`, `success_green`, `text_primary` change values
    - `layout/item_channel.xml` — `surface_dark_elevated`, `hd_homey_blue_dark`, `text_primary` change values
    - `layout/item_server.xml` — **requires XML edit**: change `@color/primary_blue` to `@color/hd_homey_blue` (since `primary_blue` is removed); also `success_green`, `text_primary` change values
    - `layout/player_controls.xml` — `text_primary` changes value
    - `layout/activity_main.xml` — no color references; skip
    - `layout/item_server_skeleton.xml` — only `surface_dark` (no change); skip
  - **Exception**: `item_server.xml` uses `@color/primary_blue` (line 29) — this must be changed to `@color/hd_homey_blue` because the `primary_blue` resource is being removed.
  - **Verification after changes**: `grep -rn '@color/primary_blue\b' apps/android/app/src/main/res/layout/` should return 0 matches.

- [x] **T-004: Update drawable files — fix color references**
  - **Grep pattern**:

    ```bash
    grep -rn '@color/hd_homey_blue\b' apps/android/app/src/main/res/drawable/
    grep -rn '@color/surface_dark_elevated\b' apps/android/app/src/main/res/drawable/
    grep -rn '@color/text_primary\b' apps/android/app/src/main/res/drawable/
    ```

  - **Files to update** (values change but resource names stay the same — no XML edits needed unless the resource is removed):
    - `drawable/bg_refresh_button.xml` — `hd_homey_blue`, `surface_dark_elevated` change values (no edit needed — values come from `colors.xml`)
    - `drawable/ic_player_pause.xml` — `text_primary` changes value (no edit needed)
    - `drawable/ic_player_exit.xml` — `text_primary` changes value (no edit needed)
    - `drawable/ic_player_play.xml` — `text_primary` changes value (no edit needed)
  - **Verification**: All color names stay the same; only values in `colors.xml` change. No drawable XML edits required — confirm with `grep -rn '@color/primary_blue\b\|@color/hd_homey_accent\b' apps/android/app/src/main/res/drawable/` expecting 0 matches.

- [x] **T-005: Update mipmap files — fix launcher icon color reference**
  - **Grep pattern**:

    ```bash
    grep -rn '@color/hd_homey_blue\b' apps/android/app/src/main/res/mipmap-anydpi-v26/
    ```

  - **Files to update**:
    - `mipmap-anydpi-v26/ic_launcher.xml` — `hd_homey_blue` changes value (no XML edit needed)
    - `mipmap-anydpi-v26/ic_launcher_round.xml` — `hd_homey_blue` changes value (no XML edit needed)
  - **Verification**: Color name stays the same; only value in `colors.xml` changes. No mipmap XML edits required.

- [x] **T-006: Final verification — sweep for old color values and stale references**
  - **Run these grep commands and confirm all return 0 matches:**

    ```bash
    # Removed colors — should have zero references outside colors.xml
    grep -rn 'hd_homey_accent' apps/android/app/src/main/res/
    grep -rn 'primary_blue' apps/android/app/src/main/res/

    # Old hex values — should have zero matches in colors.xml
    grep -rn '#007bff' apps/android/app/src/main/res/values/colors.xml
    grep -rn '#0056b3' apps/android/app/src/main/res/values/colors.xml
    grep -rn '#00bcd4' apps/android/app/src/main/res/values/colors.xml
    grep -rn '#353535' apps/android/app/src/main/res/values/colors.xml
    grep -rn '#ffffff' apps/android/app/src/main/res/values/colors.xml  # text_primary old value
    grep -rn '#808080' apps/android/app/src/main/res/values/colors.xml  # text_tertiary old value
    grep -rn '#4caf50' apps/android/app/src/main/res/values/colors.xml  # success_green old value
    grep -rn '#007fbf' apps/android/app/src/main/res/values/colors.xml  # primary_blue old value
    grep -rn '#f44336' apps/android/app/src/main/res/values/colors.xml  # error_red old value
    grep -rn '#ffc107' apps/android/app/src/main/res/values/colors.xml  # warning_yellow old value

    # New colors — confirm all present in colors.xml
    grep -c 'color_border">' apps/android/app/src/main/res/values/colors.xml
    grep -c 'color_border_hover">' apps/android/app/src/main/res/values/colors.xml
    grep -c 'color_text_disabled">' apps/android/app/src/main/res/values/colors.xml
    grep -c 'color_success_bg">' apps/android/app/src/main/res/values/colors.xml
    grep -c 'color_error_bg">' apps/android/app/src/main/res/values/colors.xml
    grep -c 'color_warning_bg">' apps/android/app/src/main/res/values/colors.xml
    grep -c 'color_info">' apps/android/app/src/main/res/values/colors.xml
    grep -c 'color_info_bg">' apps/android/app/src/main/res/values/colors.xml

    # New hex values — confirm they exist in colors.xml
    grep -n '#2563eb' apps/android/app/src/main/res/values/colors.xml  # new hd_homey_blue
    grep -n '#1d4ed8' apps/android/app/src/main/res/values/colors.xml  # new hd_homey_blue_dark
    grep -n '#3a3a3a' apps/android/app/src/main/res/values/colors.xml  # new surface_dark_elevated
    grep -n '#f0f0f0' apps/android/app/src/main/res/values/colors.xml  # new text_primary
    grep -n '#909090' apps/android/app/src/main/res/values/colors.xml  # new text_tertiary
    grep -n '#10b981' apps/android/app/src/main/res/values/colors.xml  # new success_green
    grep -n '#ff5555' apps/android/app/src/main/res/values/colors.xml  # new error_red
    grep -n '#f59e0b' apps/android/app/src/main/res/values/colors.xml  # new warning_yellow
    grep -n '#404040' apps/android/app/src/main/res/values/colors.xml  # color_border
    grep -n '#505050' apps/android/app/src/main/res/values/colors.xml  # color_border_hover
    grep -n '#666666' apps/android/app/src/main/res/values/colors.xml  # color_text_disabled
    grep -n '#064e3b' apps/android/app/src/main/res/values/colors.xml  # color_success_bg
    grep -n '#7f1d1d' apps/android/app/src/main/res/values/colors.xml  # color_error_bg
    grep -n '#78350f' apps/android/app/src/main/res/values/colors.xml  # color_warning_bg
    grep -n '#3b82f6' apps/android/app/src/main/res/values/colors.xml  # color_info
    grep -n '#1e3a8a' apps/android/app/src/main/res/values/colors.xml  # color_info_bg
    ```

  - **Build verification**: Run the Gradle build to confirm no resource-not-found errors:
    ```bash
    ./gradlew assembleDebug
    ```
  - **Sign-off criteria**: All grep checks pass; `./gradlew assembleDebug` succeeds.
