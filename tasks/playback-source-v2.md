# V19.2 — actual playback source

Persist an optional typed source on the playback session: album/artist/playlist UUID, bounded search query, or Liked tracks. Derive visible titles from current catalog data. The player header returns to that source using Expo Router 58 `dismissTo`; missing/deleted sources fall back to a neutral header. Do not infer source from the current song's album.

Contract: source is nullable and backward compatible. Queue edits, position writes, shuffle/repeat and skips preserve it; a legacy replacement with new entry IDs clears stale context. New selections explicitly set/clear it. Sources must pass access checks; no client URLs or arbitrary route strings are accepted. Existing accounts and queue identities must survive the additive migration.

Verification: source restore, edit/replacement semantics, invalid metadata and cross-account isolation; album/playlist/artist/search UI return and cold restore; preserve player motion and paused state. Installed APK 0.2.4 stays the verified checkpoint; this later source slice is not included in it. Docs checked: https://docs.expo.dev/versions/v58.0.0/sdk/router/.

## Result — 0.2.5 source checkpoint (2026-10-28)

Implemented and verified at source/browser level; **not** in the installed APK (0.2.4 remains the verified Android build and the rollback).

- The queue carries an optional typed source (album, artist, playlist, search query or Liked tracks). The player header shows the source's current title and returns to it with Expo Router `dismissTo`. A renamed playlist updates the header; a deleted source falls back to a neutral header; returning never resumes paused audio. The source is nullable and additive (`004_playback_source.sql`).
- The new source button's accessible name includes "Now playing"; decorative album images carry an accessible label on web; the older queue-undo test now waits for the visible queue before asserting removal and Undo.
- Eight source-navigation browser flows cover album, artist, playlist, search and Liked tracks, cold restore, rename and deletion.

**Verification**

| Check | Result |
| --- | --- |
| Browser (both viewports, nothing skipped) | 102/102, including the playback-timing probes |
| Client/data/locale | 57/57 |
| API | 49/49 (46 at the V19.2 checkpoint, plus the three library-pin tests added afterwards) |
| Lint, typecheck, Prettier | pass |
| Android, iOS, web production exports | pass |
| Expo Go iOS manifest/bundle | 0.2.5, 14,030,338 bytes, source-navigation markers present (`iphone-delivery.json`) |

**QA setup note.** The playback-timing probe is compiled in only when `__DEV__` is true or `EXPO_PUBLIC_PERSONAL_TEST=1`, so a production `dist/` export skips it and `expo export --dev` produces a bundle that cannot be served statically (it throws `Requiring unknown module` and expects Metro's hot-reload socket). Run the browser suite against `node scripts/start-preview.mjs` on port 8081 and warm its bundle first (request the entry bundle URL once; the cold compile can take ~30 s and otherwise consumes a test's 45 s budget). The first attempt in this session served the dev export statically and every test timed out; that was the harness, not the app.

**Not claimed:** physical-device smoothness, the Android header, TalkBack/VoiceOver, or any device playback evidence. Header evidence is four real-cover browser captures with emulated notch insets (`tasks/evidence/v2/playback-source/`).
