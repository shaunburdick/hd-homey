# PR: Android Phase 2 Backend + Comprehensive Planning

## Push Branch First

```bash
git push -u origin 013-android-app-phase2-backend
```

## Create PR

```bash
gh pr create --title "feat(api): Android Phase 2 backend endpoints + comprehensive planning" --base main --head 013-android-app-phase2-backend
```

Or use this PR body:

---

## Summary

Implements backend API endpoints required for Android TV App Phase 2 (Channel Browsing & Video Streaming) and includes comprehensive Phase 2 planning documentation.

**Phase 2 Scope**: Channel list UI, HLS video playback, favorites integration, MVVM architecture

## Backend Implementation ✅

### New API Endpoints

#### 1. POST /api/stream-token
- Generates HMAC-SHA256 signed tokens for HLS video streaming
- Token expiry: Configurable (default 12 hours)
- Validates JWT session authentication (Cookie-based)
- Verifies tuner and channel exist
- Returns: `{ token, expiresAt, tunerId, channelId }`

**Test Result**: ✅ Working
```bash
curl -X POST http://localhost:3000/api/stream-token \
  -H "Content-Type: application/json" \
  -H "Cookie: better-auth.session_token=<TOKEN>" \
  -d '{"tunerId": 1, "channelId": 1}'
```

#### 2. GET /api/preferences/channels
- Fetches user channel preferences (favorites, hidden)
- Optional tunerId query parameter for filtering
- Returns only channels with explicit preferences
- INNER JOIN channels with user_channel_preferences

**Test Result**: ✅ Working (4 favorites returned)
```bash
curl -X GET "http://localhost:3000/api/preferences/channels?tunerId=1" \
  -H "Cookie: better-auth.session_token=<TOKEN>"
```

### Code Quality
- ✅ Lint clean (0 errors)
- ✅ Type safe (TypeScript passes)
- ✅ Follows existing patterns (Better-Auth, Drizzle, Next.js)
- ✅ Comprehensive error handling (400, 401, 404, 500)
- ✅ OpenAPI contract compliance (100%)

### Authentication: Cookie-Based (By Design)
HD Homey uses Better-Auth with JWT sessions in HTTP-only cookies. This is intentional:
- More secure for web (XSS-proof)
- Works great for mobile (simple Cookie header)
- Better-Auth native implementation

See: `specs/013-android-app-phase2/WHY-COOKIE-AUTH.md` for detailed explanation.

## Phase 2 Planning Documentation ✅

### Planning Documents Created (8 files, 4,160 lines)

1. **plan.md** (800 lines) - Implementation strategy
   - Architecture evolution: Repository → MVVM + Hilt DI
   - 6 sub-phases, 15-21 day timeline
   - Technology stack (Retrofit, Media3, Coil, DataStore, Hilt)

2. **research.md** (650 lines) - Technology research
   - AndroidX Media3 1.9.0 (ExoPlayer for HLS)
   - Retrofit 2.11.0 (type-safe HTTP)
   - Complete version catalog

3. **data-model.md** (800 lines) - Entity definitions
   - Three-layer architecture: API → Domain → UI
   - Channel, ChannelPreferences, StreamToken entities
   - UI state models

4. **contracts/** (3 OpenAPI specs, 695 lines)
   - channel-api.yaml
   - stream-token-api.yaml
   - preferences-api.yaml

5. **quickstart.md** (500 lines) - Manual testing guide
   - 16 test scenarios
   - ADB commands, performance metrics

6. **BACKEND-TESTING.md** (347 lines) - API testing guide
   - curl commands for all scenarios
   - Postman setup
   - Test data setup

7. **WHY-COOKIE-AUTH.md** (325 lines) - Architecture explanation
   - Why Cookie auth vs Bearer tokens
   - Android implementation pattern
   - Security comparison

8. **BACKEND-COMPLETE.md** (316 lines) - Completion summary

### Phase 1 Cleanup
- Archived Phase 1 completion docs
- Created comprehensive Phase 1 summary (525 lines)
- Updated main spec to v1.3

## Files Changed

### New API Endpoints
```
apps/web/src/app/api/stream-token/route.ts               (124 lines)
apps/web/src/app/api/preferences/channels/route.ts       (105 lines)
```

### Phase 2 Planning
```
specs/013-android-app-phase2/
├── plan.md                           (800 lines)
├── research.md                       (650 lines)
├── data-model.md                     (800 lines)
├── contracts/
│   ├── channel-api.yaml              (239 lines)
│   ├── stream-token-api.yaml         (202 lines)
│   └── preferences-api.yaml          (254 lines)
├── quickstart.md                     (500 lines)
├── BACKEND-TESTING.md                (347 lines)
├── WHY-COOKIE-AUTH.md                (325 lines)
├── BACKEND-COMPLETE.md               (316 lines)
└── PLANNING-COMPLETE.md              (390 lines)
```

### Phase 1 Cleanup
```
specs/013-android-app-phase1/
├── PHASE1-SUMMARY.md                 (525 lines)
└── archive/                          (10 completion docs archived)

.specify/features/013-android-app.md  (updated to v1.3)
```

**Total**: 23 files changed, 8,896 lines added

## Testing

### Live Testing Performed ✅
- POST /api/stream-token: Token generated successfully
- GET /api/preferences/channels: 4 favorites returned
- tunerId filtering: Works correctly
- Cookie authentication: Verified working

### Test Environment
- Server: HD Homey dev server (localhost:3000)
- User: Admin account
- Data: 4 favorite channels (WSTMNBC, WSYR-HD, WKOFCBS, FOX68)

## Next Steps After Merge

1. **Update Android Phase 2 branch**: Merge main to get backend changes
2. **Generate task breakdown**: Run `/speckit.tasks` 
3. **Begin Android implementation**: 3-4 weeks (15-21 days)

## Related

- **Main Spec**: `.specify/features/013-android-app.md` (v1.3)
- **Channel Favorites**: SPEC-012
- **Phase 1 Summary**: `specs/013-android-app-phase1/PHASE1-SUMMARY.md`

## Checklist

- [x] Endpoints implemented and tested
- [x] Lint passes (0 errors)
- [x] Type checking passes
- [x] OpenAPI contracts followed
- [x] Live testing successful
- [x] Documentation complete
- [x] Architecture decisions documented
- [x] Phase 2 planning complete
- [x] Phase 1 cleanup complete
