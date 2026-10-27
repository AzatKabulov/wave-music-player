# Changelog

## 0.2.3 development candidate — 2026-10-27

- Requests playlist summaries at startup, preserving real counts/artwork and loading full entries when needed. Installed clients retain their legacy response.
- Prevents editing an unhydrated summary as an empty playlist and keeps the original draft revision across remote refreshes.
- Appends playlist tracks through the revision-guarded endpoint, retaining previous entry identities.
- Fixes cold-route detail hydration ordering and preserves same-revision loaded detail across refresh.

This source is available in Expo Go. Android 0.2.2 remains the verified downloadable installer; native acceptance and the remaining bootstrap paging work are open.

## 0.2.2 personal test candidate — 2026-10-27

- Reduces song-row child work during saves while retaining the latest paginated playback context.
- Sorts mixed Library collections by real saved/created dates and preserves those dates in the native metadata cache.
- Restores Library grid mode for the correct account, uses natural title/creator sorting and recovers the previous choice after a failed sort write.
- Uses indexed metadata lookups and available artist artwork in Library.
- Adds Library collection search across saved titles/creators, including items outside the visible window, with EN/RU/TK controls and clear/close states.

Physical device frame/audio acceptance remains open. The verified downloadable installer is recorded separately from the development candidate.

## 0.2.1 personal test candidate — 2026-10-27

- Restores cached account metadata before live refresh and keeps queue restoration from blocking Home.
- Keeps playback position writes out of the interactive queue pipeline and combines first-play queue acknowledgement with authorization.
- Improves album presentation, cover-driven player colors, working collection actions and bounded Home shelves.
- Adds local bounded playback diagnostics for finding slow stages.
- Expands the PC-hosted personal catalog from 30 to 58 songs, with 24 artists, matching covers and six playlists. Audio remains on the PC.
- Preserves the library, playlists and queue identities during catalog updates.
- Moves the full player as one interruptible surface, keeps browse geometry stable underneath and supports artwork swipes right-next / left-previous while retaining play/pause intent.
- Previews seeking locally and commits once on release; interpolates native and mini-player progress between engine samples, with larger touch feedback and reduced-motion alternatives.

This is a personal-test checkpoint. Physical iPhone/Android motion, sound continuity, accessibility, frame/memory targets and the remaining v2 features still need acceptance. APK availability and verification are recorded separately in the phone-testing handoff.
