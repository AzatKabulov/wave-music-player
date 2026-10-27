# Improvement cycle 2 — implementation record

Started 2026-10-26 from `ccca75c`. The owner authorized the full improvement and catalog plans. Work proceeds in independently verified slices; parent tasks remain open until their complete acceptance criteria pass.

## C02.1 — durable additive database upgrades

Implemented a version/checksum ledger and shared local/managed migration runner. Existing 001 databases adopt their baseline; later SQL runs transactionally once. Runtime identities cannot edit the ledger. Checksums normalize Windows line endings. Migration 002 adds release edition/type/expected count/completeness, artist/recording aliases, explicit-state provenance, fixture classification and measured media/artwork fields. Unknown metadata stays unknown; existing IDs, account data and playlist membership stay in place.

Verification: new tests cover existing-001 upgrades with saved tracks and playlist entry identities, fresh databases, repeat execution, checksum drift and ledger access isolation. Full regression and integration results are recorded with each checkpoint below. The personal database was subsequently upgraded after stopped-service backup and copied-database validation; see C01 and C02.2 below.

Remaining C02: wire the richer public contracts, canonical source/release enrichment, multiple rendition capability records and import validation. These are separate slices; adding columns does not complete the catalog plan.

## Dependency evidence and sequencing

- V01: Existing 0.2 web captures and current source establish the incumbent implementation. Current matched Spotify native captures are unavailable. No new pixel-parity score is claimed.
- V02: The owner has an iPhone 15 Pro and an unidentified Redmi “10 Pro”. OS/build/refresh/network baselines and release-device traces remain pending. Source-level timing and deterministic race tests can proceed independently.
- V03: SDK 58.0.10 installed `ios/AudioPlaylist.swift` calls `rebuildPlaylist` on insert and on current/earlier removal; that recreates AVPlayerItems and calls `removeAllItems`. Android delegates insert/remove to Media3 item operations. Therefore Android's active-item patch cannot simply be enabled on iOS. Physical continuity and transition measurements remain pending.
- Reference: [Expo SDK 58 audio](https://docs.expo.dev/versions/v58.0.0/sdk/audio/). Installed native implementation is the authority for the queue-edit behavior above. Preload and crossfade support are not inferred from unrelated player APIs.

The first source slices address data preservation and startup/command races. Physical acceptance stays open while independent implementation continues. Existing 0.2 APK and catalog backups are retained.

## V06.1 / V08 — independent startup restoration and cursor persistence

Home becomes available as soon as account/catalog metadata arrives. Delayed queue restoration is invalidated by a new playback selection or sign-out. A late HTTP restore cannot replace the last acknowledged queue revision. Restoration still loads paused; media remains tied to authorized server entries.

Cursor checkpoints now use a revision-guarded endpoint that does not increment membership revisions. A single background writer coalesces pending positions; queue commands do not wait for it. Stale writes cannot change membership, modes, another account, or a newer queue. Checkpoint failures no longer reconcile/reinstall the player. Sign-out clears pending checkpoints and drains the in-flight write.

Verification: 3 deterministic writer tests; API test covering cursor/revision preservation, stale writes, foreign entries/accounts and unauthenticated/extra fields; phone-width browser delayed-restore/new-selection and held-cursor/shuffle tests pass. Existing player/seek/repeat/shuffle and paused-resume browser tests pass. Lint and typecheck pass. One intermediate browser run was contaminated by a live source reload; stable-source rerun passed. These are functional browser results, not physical-device timing claims.

Remaining V06: persistent cached Home (V05), offline/bootstrap cache measurements and release-device timings. V08 source behavior is implemented; physical responsiveness remains part of V47.

## C01 — preserved personal catalog inventory

Created a full stopped-service database/media backup at `apps/api/data/catalog-backups/v2-2026-10-26T12-28-51-204Z/`. A separate validation copy passed the migration with identical hashes for protected account/library/playlist/queue tables and identical recording-to-audio IDs. All 60 provenance audio/artwork hashes passed. The phone service restarted successfully and the existing APK aliases remain valid. See `catalog-inventory-v2.json`: 30 full recordings, 12 artists, 27 releases, plus 12 explicitly classified fixtures. Completeness stays unknown pending source-backed release manifests; no album is falsely marked complete.

## V14.1 — consistent collection shuffle

Collection shuffle now uses the same Fisher–Yates model as player shuffle and enables the visible shuffle state. It retains canonical order for disabling shuffle in the current session, keeps duplicate recording entries distinct, and maps row selection through availability/explicit filters. Five queue tests, lint and typecheck pass. Durable canonical order across restarts and the full native repeat/transition matrix remain open under V14.

## C02.2 / C05.1 / V16.1 — real release and cover presentation data

The live personal database now uses migrations 001–003. Snapshot/search/detail return release type, edition/date, expected count/completeness, explicit-state provenance, fixture classification, disc/track numbers, artist aliases/portrait references and cover-derived color. Image metadata access is limited to safe columns on ready images linked to published releases/artists; private paths and audio assets stay inaccessible. All 28 API regression cases passed before the additional artwork decoder test, which also passes.

Thirty existing covers were fully decoded and measured; 27 existing releases were enriched from cached Apple metadata (23 are confirmed partial; 4 retain unknown completeness). Audio container metadata was preserved without claiming full decode validation. No additional recordings were added. The player and mini player use cover-derived surfaces with measured contrast against both text colors. See `catalog-enrichment-v2.md`.

## V18.1 / V21.1 — album composition and working collection actions

Albums have their own adaptive cover/artist/release header, numbered tracks, disc headings, partial-catalog disclosure and a play control retained in the top bar while scrolling. Artist links work and save icons now agree with the player. Collection menus provide play, shuffle, save/follow, queue-all, artist navigation and owner editing. Queue-all sends one membership update and retains duplicate entry identities and the active entry.

Verification: phone-width browser album → artist/follow flow, empty catalog recovery, album save/options/queue-all and axe checks pass (3 cases). Number columns are presentation outside the song button; its accessible name matches the actionable visible title/artist. Lint/typecheck passed before the last presentational row correction; final batch checks/captures follow. Native continuity and full V18/V21 criteria remain pending.

## V17.1 — bounded Home rendering and fixture discovery policy

Horizontal album/playlist/artist shelves now use bounded FlatList windows instead of eagerly mounting every card. The scale regression reproduced 200 mounted added album cards before the change and passes with at most 12 after it, including album navigation. A second browser case verifies that protected fixture metadata remains accessible in Liked tracks while Home excludes it. Both cases pass at phone and desktop widths after the artist-card width correction.

Personal snapshot/search/Home feeds exclude fixtures from discovery; saved and queued references remain hydrated and resolvable. The ordinary disposable QA catalog remains available. Editorial shelves use an honest discovery title. V17 still requires independent paginated Home sections and stronger context ordering.

## Verified screen checkpoint — 2026-10-27

- 50/50 browser flows passed across 390×844 and 1440×900, including account, search, playback, seeks, shuffle/repeat, library, playlist CRUD, queue duplicates/undo, resume, locales, race recovery and the new album/Home cases.
- Final artist-width correction: 4/4 focused Home scale/fixture cases passed. Lint, typecheck and formatting all pass.
- Thirty data/locale tests pass. The full API pass had 29 passing cases and one artwork-fixture setup mismatch after fixture exclusion; that setup was corrected and its targeted tests pass. Subsequent artwork version/palette tests pass (3 cases). Full API verification will repeat when the next API slice lands.
- The visual round caught versioned artwork URLs being rejected by the image route. The route now validates the content hash and thumbnail width together; matching content loads, invalid/mismatched versions fail, and the regression test covers both. Cover extraction now ignores dark/neutral borders where representative color is available.
- All eight corrected Home/album/menu/player images were inspected once in the confirmation batch: `tasks/evidence/v2/visual/`. They show real covers and final source layouts. They are web captures, not native acceptance or Spotify pixel-parity evidence.
- Physical iOS/Android motion, background continuity, frame timing and native finish review remain open. The existing 0.2 APK is still the last packaged installer; source/Expo preview changes do not imply a rebuilt APK.

## V05.1 / V06.2 — native cached startup

Native startup can display the last coherent account snapshot before refreshing from the server. The disposable cache is scoped to a SHA-256 digest of the API/session identity, has a schema version, 24-hour expiry and a 2 MiB UTF-8 quota. It validates nested identities and shapes, excludes profile email and auth fields, and clears on explicit authentication changes. Serialized storage operations prevent an older pending write from repopulating the cache after logout. Browser startup continues to validate its httpOnly-cookie session with the server before showing private state.

The cache contains metadata only; playback still requires current server authorization. Oversized or corrupt records become cache misses without deleting installation identity or preferences. The current full snapshot remains a scaling limit until V04's bounded bootstrap contract lands; the cache does not mark V04 or the whole V05 complete.

Verification: seven cache tests cover restore, account isolation, secret exclusion, expiry/corruption, malformed nested values, Unicode byte quota, storage failure and write/logout ordering. Four focused phone-width browser account/resume/race checks passed. Typecheck and Android/iOS/web exports passed. The initial restricted Hermes export failed; the same export succeeded outside the sandbox. Actual native cached-start latency is unmeasured and remains in V47.

## V07.1 — bounded playback-stage diagnostics

Local diagnostics retain at most 32 attempts with relative monotonic milliseconds and allowlisted recording/entry UUIDs. They mark the tap handler, pipeline start, queue request/acknowledgement, grant, synchronous native install calls and the first loaded/nonbuffering advancing player-status observation. No network/disk sink or release-log stream is added. Diagnostics are enabled for development/personal testing, and cleared with playback on logout. The debug inspector is `globalThis.__musifyPlaybackTimings()`.

Three deterministic tests cover timing, injected delay attribution, invalid/nonadvancing status, retention, copy isolation, ID sanitization and the zero-clock-work disabled path. Four browser cases pass: normal and 350 ms delayed queue traces plus delayed restore and stalled cursor regressions. The queue stage grows from 42.1 ms to 403.4 ms in these individual browser samples, identifying the injected delay. These are development browser samples, not native budgets or physical audible-start measurements; the status proxy also includes the 500 ms polling cadence. Evidence: `evidence/v2/performance/playback-before-v2.json`.

Full API verification now passes 35/35 cases with one embedded-database worker. The earlier parallel suite exhausted host memory; the serial run also needed loopback access for its controlled import HTTP server. Every case remains enabled.

## Owner catalog scope update — 2026-10-27

The owner reduced personal testing to **50–70 popular recordings**. Target approximately 60 total, including the existing 30. The 181-candidate wishlist remains useful intake preparation; larger C1/C2/C3 milestones are deferred and no longer block this personal test batch. Keep per-file validation and accurate version/artwork requirements. Selected popular songs do not imply complete playable albums.

## V09.1 — first play saves the queue and obtains a grant in one response

Queue PUT/PATCH can optionally include a grant after successful membership commit and owned-session validation. Existing grant scope, revocation and current-media checks remain enforced. The client consumes the response grant from private memory and excludes it from all queue/cache/timing DTOs. Missing/expired response grants use the existing endpoint. This removes the separate first-play grant round trip; pause/resume keeps using the loaded authorized source.

Verification: the API test covers normal/optional issuance, failed and stale mutations, foreign accounts, removed entries, revocation and unauthenticated requests. Browser tests prove zero separate grant POSTs on ordinary first play and one fallback POST for an intentionally expired response grant. All **58/58** browser cases pass across phone/desktop widths. New traces in `evidence/v2/performance/playback-after-v2.json` show the grant stage using the response (~0–0.1 ms in four individual samples); physical audible speed remains unmeasured. The initial full browser run exposed ambiguous test selectors and shared auth-window exhaustion; QA now resets only its disposable auth bucket between cases. Normal API throttling and absence of that QA-only route have a dedicated regression test.

V09's full bounded pre-authorized native queue window and expired-active-source transition matrix remain open. This slice does not claim that whole task complete.

## V09.2 — batch queue validation and insertion

A 1,000-entry synthetic start exposed 2,007 user SQL queries in queue PUT. The server now validates distinct recording IDs with the same row-level access/preferences in one query and inserts ordered entries in one JSON-to-recordset statement within the existing transaction. An ID lookup also replaces the quadratic identity comparison and normalizes UUID case so an existing entry cannot change its recording by using uppercase letters.

The regression proves order, duplicate recording entries with distinct IDs, cursor/modes, rollback for unavailable recordings, immutable entry identity with either UUID case, and clearing an empty queue. It caps the user-query count at 12; observed count is nine. Separate single in-memory server samples were 1,476.4 ms before and 118.5 ms after; these are synthetic samples, not p95 or physical sound timing. See `evidence/v2/performance/queue-batching.json`. All **39/39 API tests** and seven affected phone-width browser queue/grant/restore cases pass. The unchanged client previously passed the complete 58-case browser suite.

## Focused catalog test batch — 58 recordings

Added 28 full-decoded popular recordings and matched decoded covers, bringing the personal catalog to **58 recordings, 24 artists, 51 release entries and six playlists**. A stopped-service backup and copied-database import preceded the live transaction. User/account/library/queue hashes stayed unchanged and all 75 existing playlist entry identities and positions were retained. The service restarted successfully.

All 58 tracks passed exact search, full served audio/artwork hashes, 128-pixel thumbnails and beginning/end range checks using a deleted temporary verification account. The personal snapshot was 87,474 bytes. Replaying staging revalidated all 28 audio/cover files without downloading again. Reusable local media inspection and real short/truncated-audio evidence are documented in `audio-intake-v2.md`. The owner-requested 50–70 recording test scope is met; larger catalog expansion stays deferred.

## 0.2.1 delivery checkpoint

Client source is tagged in configuration as 0.2.1/build 3. All-platform production export passes (native Hermes bundles ~6.6 MB each). The restarted iPhone Expo Go endpoint serves an SDK-58 manifest for 0.2.1 and a 13,966,234-byte iOS bundle containing the intended API, metadata cache and local timing code. This verifies delivery from the PC, not physical iPhone rendering/audio. See `evidence/v2/performance/iphone-v021-delivery.json`.

Android build `113eedf7-450a-4a8b-81c7-039401094061` was submitted to the existing personal Expo project with versionCode 3 and the same package. The old 0.2.0 APK remains served until the new artifact passes integrity, signature, package/API and download verification. No new APK is claimed available while Expo queues it. The post-submit backend-only queue batching change is excluded from the mobile archive and is already served by the PC API.

## Owner player-motion addition and scheduled continuation

The owner added specific player-motion and seek complaints and requested artwork swipes right-next / left-previous. The still-queued Android build above was successfully canceled before it ran, so its replacement can contain these fixes. See `player-motion-v2.md` for the specification and current verified expansion/dismissal/artwork implementation. Seek repair and replacement packaging remain pending; the old APK remains served.

At the owner's request, an active one-time continuation named `resume-musify-improvements-after-reset` was created in this same chat for 2026-10-27 **09:07 Asia/Singapore**, after the usage reset reported by the account tool at 09:06:41. The prompt resumes these files and the working tree, avoids duplicate services/builds and retains the 50–70 track scope. PC/app must remain available for local work. This schedule is a continuation, not a pause request; work continues now.

## V19.1 / V20.1 — final player interaction checkpoint

The native seek bar now previews position/elapsed time on the UI thread and commits once on release, with cancellation, stale-status acknowledgement recovery and unmount guards. Mini-player and native progress interpolate between audio samples. Player opening/closing, short/canceled drags, right-next / left-previous artwork swipes, paused previous selection, end boundaries and reduced motion have browser regressions. The single moving surface includes its background and keeps the browsing layout stable. Native background accessibility is hidden while the player is focused.

The complete 66-case browser suite passed. Real-image verification then exposed default browser image dragging, absent from the placeholder fixtures; a dedicated regression reproduced it and the source now disables image dragging. The final 12-case affected player run passes at both widths. All 43 client tests pass, the unchanged API remains at 39 passing cases, and final lint/typecheck/formatting/Android/iOS/web exports pass. Ten confirmed real-cover captures and the review/evidence summary are in `evidence/v2/player-motion/`. Temporary capture accounts were deleted. The iPhone endpoint serves the final source in its 13,999,813-byte bundle. Native physical smoothness and the complete V19/V20 criteria remain open.

The replacement personal Android APK was submitted from clean commit `849b399`: build **`c9619f20-161b-42de-af66-2f4238341a5d`**, version 0.2.1/build 3, status **IN_QUEUE** at the initial post-submit check. The archive is 8.3 MB and excludes backend, private catalog and evidence. Do not resubmit or resume the earlier canceled build. The 0.2.0 download aliases remain intact. When the replacement finishes, `../../work/verify-android-v021.py` verifies package/version, ZIP, embedded API/player markers and full APK signature against the prior certificate. Only then publish the versioned file and replace aliases; verify the full served SHA-256. Current status JSON: `../../work/android-build-v021-motion-status.json`. This is queued, not a verified new installer.

## 0.2.1 Android delivery completed

The replacement above finished and passed full APK signature verification against the previous certificate, ZIP CRC, package `com.local.musifytest`, versionCode 3, embedded API/player/cache markers and absence of bundled MP3/M4A files or microphone permission. Artifact: 115,664,692 bytes; SHA-256 `ba9f7f455d10490ed83d9965d59083954cb638a67089867758a97d50e15a9b60`. The versioned `../Musify-0.2.1.apk` and both download aliases now contain it. The complete private HTTP download matched its size/hash and returned 200. Earlier installer archives remain intact. See `evidence/v2/player-motion/android-apk-verification.json` and the updated sibling phone-testing guide. Physical install and native smoothness remain unverified.

The owner explicitly requested continuing with the remaining allowance before the already scheduled 09:07 run. Continue implementation now; do not stop merely because a delivery checkpoint is reached. Catalog growth remains deferred at 58 recordings.

## V13.1 — reduce song-row child work on saves

Measured the 58-song personal playlist with a test-only external React DevTools hook. Playback progress already left rows alone, so its subscriptions were preserved. Stable actions and separated visual row props reduce save-period press-control work visits from 232 to 40, labels 156 to 28 and artwork 70 to six; the 69 connected wrapper checks remain. These single browser samples are not native speed claims. No diagnostic code was added to the app. See `render-isolation-v2.md` and the before/after records.

Fourteen affected browser cases and lint/typecheck pass. A new pagination regression proves a retained row uses the updated collection context, not its earlier one-song context, and saves remain independent. This later source slice is excluded from the already-delivered 0.2.1 installer and should enter the next packaged checkpoint. Native performance acceptance remains open.
