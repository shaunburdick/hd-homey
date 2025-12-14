# Branch Cleanup Guide

**Date**: December 14, 2025  
**Purpose**: Clean up merged branches after PR #28

---

## Safe to Delete (Already Merged)

### Local Branches - Merged via PRs
```bash
# Phase 2 branches (merged in PR #28)
git branch -D 013-android-app-phase2
git branch -D 013-android-app-phase2-backend

# Other feature branches (merged in previous PRs)
git branch -D 010-user-invitations          # Merged in PR #23
git branch -D 011-github-pages-docs         # Merged in PR #24
git branch -D feature/005-video-transcoding # Merged in PR #17
```

### Remote Branches - Delete via GitHub
```bash
# These were merged and can be deleted from GitHub
# Option 1: Via gh CLI
gh api repos/shaunburdick/hd-homey/git/refs/heads/013-android-app-phase2 -X DELETE
gh api repos/shaunburdick/hd-homey/git/refs/heads/013-android-app-phase2-backend -X DELETE
gh api repos/shaunburdick/hd-homey/git/refs/heads/012-channel-favorites -X DELETE
gh api repos/shaunburdick/hd-homey/git/refs/heads/013-build-identification -X DELETE
gh api repos/shaunburdick/hd-homey/git/refs/heads/013-android-app -X DELETE

# Option 2: Manual via GitHub UI
# Go to: https://github.com/shaunburdick/hd-homey/branches
# Delete these branches:
# - 013-android-app-phase2
# - 013-android-app-phase2-backend
# - 012-channel-favorites
# - 013-build-identification
# - 013-android-app
```

---

## Investigate Before Deleting (No PRs Found)

These branches have commits but no corresponding PRs. They might be:
- Old WIP branches
- Experiments
- Abandoned features

**Recommendation**: Keep them for now until you verify they're not needed.

```bash
# Check what's in each branch before deleting:
git log --oneline main..feature/comprehensive-testing | head -10
git log --oneline main..feature/hardware-acceleration-video-quality | head -10
git log --oneline main..feature/stream-authentication | head -10

# If you decide to delete them:
# git branch -D feature/comprehensive-testing
# git branch -D feature/hardware-acceleration-video-quality
# git branch -D feature/stream-authentication
```

---

## Keep (Active Development)

```bash
# Current working branch - DO NOT DELETE
- 013-android-app-phase2-impl

# Main branch - DO NOT DELETE
- main
```

---

## Complete Cleanup Script

**Run this to clean up merged branches:**

```bash
#!/bin/bash
# Branch cleanup script - Run from repository root

echo "🧹 Cleaning up merged branches..."

# Delete local branches that are merged
echo "Deleting local merged branches..."
git branch -D 013-android-app-phase2
git branch -D 013-android-app-phase2-backend
git branch -D 010-user-invitations
git branch -D 011-github-pages-docs
git branch -D feature/005-video-transcoding

echo "✅ Local branches deleted"

# Prune remote-tracking references
echo "Pruning remote-tracking references..."
git fetch --prune

echo "✅ Remote references pruned"

# Show remaining branches
echo ""
echo "📋 Remaining branches:"
git branch -a

echo ""
echo "🎉 Cleanup complete!"
echo ""
echo "Current branch: $(git branch --show-current)"
echo "Ready to start Phase 2 implementation!"
```

---

## Verification

After cleanup, you should have:

**Local branches:**
- `main`
- `013-android-app-phase2-impl` (current)
- Possibly: `feature/comprehensive-testing`, `feature/hardware-acceleration-video-quality`, `feature/stream-authentication` (if not deleted)

**Remote branches:**
- `origin/main`
- `origin/HEAD -> origin/main`

---

## Remote Branch Cleanup (GitHub UI)

1. Go to: https://github.com/shaunburdick/hd-homey/branches
2. Look for "Merged branches" section
3. Delete these branches:
   - `013-android-app-phase2`
   - `013-android-app-phase2-backend`
   - `012-channel-favorites`
   - `013-build-identification`
   - `013-android-app`

Or use the bulk delete feature if available.

---

## Summary

**Before Cleanup**: 9 local branches + multiple stale remote branches  
**After Cleanup**: 2-5 local branches (main + impl + optional feature branches)

**Current Branch**: `013-android-app-phase2-impl`  
**Status**: ✅ Ready for Phase 2 implementation
