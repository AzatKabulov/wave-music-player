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

## V23.1 — chronological Library and scoped layout

Snapshot now adds optional account-isolated `libraryEntries` carrying real saved dates and owned creation dates; no migration or existing-field removal. Mixed collections sort chronologically, optimistic saves retain confirmed-date rollback, and native cache validates/whitelists these entries. Title/creator order is natural and deterministic. Grid state is account-scoped with safe late-read cancellation; failed sort writes restore the UI choice. Library joins use maps and duplicate owned/saved playlists are removed. See `library-order-v2.md`.

Verified: **74/74 browser cases**, **46/46 client/data/locale/cache cases**, **40/40 API cases**, lint/typecheck/formatting and Android/iOS/web exports. Four inspected browser captures and two deleted temporary accounts are recorded under `evidence/v2/library/`. Restarted personal services and verified the 0.2.2 SDK-58 iPhone manifest/bundle (14,007,197 bytes). Current source is 0.2.2/build 4; Android download is still the verified 0.2.1. Last-played sorting/filter persistence, native measurements and parent V23 acceptance remain open. Continue Library collection search as V24.1 before the next packaged checkpoint.

## V24.1 — Library collection search

Search now filters the entire currently hydrated owned/saved collection set before virtualization, with Unicode title/creator matching, existing kind/sort composition, Liked-tracks name matching, translated accessible labels, keyboard-friendly rows and clear/close/no-match states. Query resets with account identity. The 150-collection regression initially failed at the absent control and now finds an initially unmounted collection. Both sizes and axe pass. Ten affected Library/language cases pass, with two final search cases after the focus correction; 47 client/data/locale tests pass. The unchanged backend remains at 40 passing API cases, and the preceding full browser checkpoint is 74/74. Final lint/typecheck/formatting and all-platform exports pass. Six inspected real-cover captures are under `evidence/v2/library-search/`. See `library-search-v2.md`.

Source 0.2.2/build 4 is ready for a personal Android build. The installed/served Android 0.2.1 remains verified and unchanged until that new artifact is checked. Next: commit this slice, submit exactly one 0.2.2 build, record its ID, then prepare the signature/package/version/hash verifier and continue at reset if the allowance ends. Native physical acceptance and the remainder of the roadmap stay open.

## 0.2.2 build and reset handoff

Clean source commit **`b85ee01`** was submitted as personal Android build **`88d9a965-c99f-4d8a-8fe7-af79b1b62b9f`**, version 0.2.2/build 4. Initial status NEW; do not submit a duplicate. Metadata/log: `../../work/android-build-v022.json` and `.log`. Use `eas build:view` to write current status to `../../work/android-build-v022-status.json`. The prepared `../../work/verify-android-v022.py` expects `../Musify-0.2.2.candidate.apk` and verifies the finished build, exact version/package, ZIP/bundle markers and full signature against the prior certificate. After it succeeds, copy to `../Musify-0.2.2.apk` and both existing aliases, then run `../../work/verify-v022-download.mjs` to check the full served size/hash. Retain 0.2.1. No 0.2.2 installer is claimed ready while queued.

Final search source: 47 client tests, 40 unchanged API tests, 74-case broad browser checkpoint plus ten affected Library/language cases and two final search/axe cases. Final lint/typecheck/formatting and all-platform exports pass. The PC serves iPhone 0.2.2 with a 14,011,234-byte bundle. Continue with V04 bounded-bootstrap baseline/contract; catalog stays at 58. Native physical checks remain pending. The owner's one-time 09:07 continuation is already active; do not create another.

## V04 measured next bottleneck

The disposable 150-playlist / 500-save / five 1k-item-collection baseline returned **676,369 bytes**, exceeding the proposed 250KiB budget, with 14 user queries and 126.4 ms in a single local sample. Evidence is `evidence/v2/performance/bootstrap-before-v2.json`; reproducer is `../../work/measure-bootstrap-v2.mjs`. No personal data was touched. `bootstrap-baseline-v2.md` records the next summary/detail slice and its critical edit gate: an unhydrated playlist summary must never be saved as an empty playlist. This is the next implementation target; V04 is still open.

## 09:07 continuation — 0.2.2 delivered

Resumed at the scheduled reset. Build `88d9a965-c99f-4d8a-8fe7-af79b1b62b9f` finished; full signature/certificate, package/version 0.2.2/code 4, ZIP and bundle checks passed. The 115,671,200-byte file has SHA-256 `54f0d7700af43c58a5537733a3a9b5727a73b484873c70a2200c01f0ae89b57b`. Versioned installer and aliases are updated and the full private HTTP download matched. Evidence: `evidence/v2/performance/android-0.2.2-verification.json`. No physical-device smoothness or installation claim follows. The previous final checkpoint append was rejected because automatic approval review could not run after usage exhaustion; it did not execute. All implementation commits were already saved. The reset resolved that limit and work resumed without bypassing review.

V04.1 is now in progress in the working tree: opt-in `playlistShape=summary`, count/completeness DTOs, summary-aware refresh/cache and an edit hydration gate. The API regression reproduces 5,000 unnecessary item rows before the change and passes below the scenario's 250KiB budget afterward. Full API suite passes 41 cases; 49 client cases pass after the owned-playlist merge correction. Focused edit/collection browser tests are running (`../../work/summary-focused-browser-green.log`). Do not package or mark this new slice complete before those and the broad regressions pass.

## V04.1 verified summary/detail checkpoint

The complete **82-case browser suite passes**, alongside **49 client/cache cases**, **41 API cases**, lint/typecheck/formatting and Android/iOS/web exports. The final matched baseline is **681,808→210,261 bytes (69.2% less)**, 14→13 user queries, with saved IDs/dates and 5,000 item counts preserved. No native latency claim follows. Cold route authorization reference ordering, draft revision retention, safe edit hydration, same-revision detail retention and append-without-replacement all have regressions. Home recording hints preserve discovery when item arrays are absent. See `bootstrap-summary-v2.md`.

Personal services are restarted. Live 58-track/six-playlist counts/covers, Home discovery and detail/play pass through a deleted temporary account; live payload is 87,714→76,361 bytes. Two inspected captures and report are in `evidence/v2/bootstrap/`. iPhone serves **0.2.3/build 5**, bundle 14,013,136 bytes. Android **0.2.2/build 4** remains the verified served installer; no 0.2.3 EAS build has been submitted. Keep catalog at 58 and preserve the previous APK archives. Full V04 paging, native acceptance and the rest of the roadmap remain open.

The scheduled reset continuation completed this checkpoint and the one-time automation resume-musify-improvements-after-reset was deleted after firing. There is no recurring follow-up schedule. Git source is clean at 489c6e4 before this documentation note. Next independent work remains Library/Home paging and the rest of the v2 backlog; physical phone acceptance is still pending.

## Owner follow-up — player cadence, direction and notch insets

The owner reports the old player too fast/stiff on both phones and its header under the iPhone Dynamic Island. Repaired acknowledgement-time animation restarts with stable cover coordinates and a single 420 ms settle; entry is 440 ms, exit 240–360 ms, and return spring gentler. Buttons share the right-next/left-previous artwork path; previous selects the prior entry even after three seconds. Explicit intent disambiguates a two-entry repeat queue. Rapid next presses reproduced a 75.6 px visual gap; retained outgoing covers now preserve image identity until settlement, including held gestures. Burst retention is bounded. Native SafeAreaView inside the translated surface is replaced by explicit provider insets and initial window metrics, with inset-aware artwork sizing.

Source verification: **90/90 browser cases**, **51/51 client/data/locale/cache cases**, lint/typecheck/formatting and Android/iOS/web exports pass. API unchanged from 41 passing cases. Ten final distinct-cover captures, two final videos and frame sheet are in `evidence/v2/player-motion-v3/`. iPhone 0.2.3 delivery is verified at 14,018,550 bytes with repair markers. No physical phone smoothness claim. See `player-motion-repair-v3.md`. Commit and package this checkpoint as 0.2.3/build 5; do not replace verified 0.2.2 aliases before signature/version/full-download checks.

Player source committed as `f21afcb`; archive-only follow-ups `5bb5bf8` / `6fe4e38` explicitly exclude Git history (EAS's special-case requires `/.git`, without trailing slash). Automatic review initially rejected the cloud source upload; the owner then explicitly approved the reviewed Expo EAS upload. The final local archive review contains 135 client files, no backend/personal data/audio/secrets/keystores/tests/evidence/history; manifest/zip are under `../../work/android-v023-client-review.*`. Approved build **`8f913d24-05c1-43ea-91b2-b008426ee52d`** is submitted from **`6fe4e38`**, version 0.2.3/code 5, and was IN_PROGRESS at the last check. Do not submit a duplicate. Status: `../../work/android-build-v023-status.json`. Prepared verifier/download scripts: `../../work/verify-android-v023.py` and `../../work/verify-v023-download.mjs`. The former expects `../Musify-0.2.3.candidate.apk`. Verify before updating aliases; retain 0.2.2. The approval block is resolved, not pending.

V23.2 follows in source **0.2.4/build 6**, independently of the submitted 0.2.3 archive: Library filters and existing grid preference restore per account; late reads do not overwrite intent; pending writes survive screen changes and serialize across remounts. Red browser case proved reload reset Albums to All (three rows instead of one). A deterministic completion-boundary test also caught competing writers; revision-guarded cleanup fixes it. Ten affected browser cases and 55 client cases pass; full 92-case browser checkpoint and final platform checks are running. See `library-view-v2.md`. Do not claim this slice is in the 0.2.3 APK.

V23.2 final checkpoint: **92/92 browser cases**, **55/55 client cases**, lint/typecheck/formatting and Android/iOS/web exports pass. Live three-capture view restoration passes with temporary-account cleanup; Expo Go 0.2.4 bundle is 14,022,755 bytes. The 0.2.3 build finished: 115,678,568 bytes, SHA-256 `1aae7ddee4425d544513bbfc359009d6eaf96b477274531303b2d8183318ae63`. Full signature, package/version, ZIP, embedded markers and complete served hash pass; versioned file and download aliases are updated. Evidence: `evidence/v2/player-motion-v3/android-apk-verification.json`.

**Latest owner clarification supersedes earlier swipe mapping:** next must move the outgoing cover left and bring the next cover from the right; left swipe = next. Previous moves the outgoing cover right and brings the previous cover from the left; right swipe = previous. Keep actual queue order and button handlers correct. The just-built 0.2.3 retains the earlier right-next visual axis, so finish this correction in 0.2.4 and package a replacement before claiming the direction issue resolved. New direction regression is being run red; do not swap engine next/previous to repair a visual-axis bug.

V23.2 saved as `fe8d6ee`. V20.3 direction correction is now implemented in the working tree: inverse screen projection, inverse finger-to-queue movement/return velocity and left-next/right-previous gesture policy. The revised previous-side DOM-identity regression failed before the fix; **20/20 affected browser cases**, **55/55 client cases**, lint/typecheck/formatting and Android/iOS/web exports pass. The 94-case final suite is running. Real-cover capture/video evidence is in `evidence/v2/player-motion-v4/`; two temporary capture accounts were deleted. Expo Go 0.2.4 serves a 14,022,875-byte iOS bundle and its actual gesture/axis code was checked, not just version text. Owner's optional iPhone direction confirmation is pending; do not wait on it to finish the authorized installer.

Packaging review found that the 0.2.3 source archive included 16 client unit-test files and web-only generated WAV fixtures, although browser tests/backend/personal media were excluded. The archive record's exclusion labels were corrected; these were not embedded audio in the APK (zero WAV files verified). 0.2.4 `.easignore` now excludes source tests and `/public/audio/` as well, preserving all local fixture files. Final local review at `../../work/android-v024-client-final` contains **109 files / 893,372 uncompressed bytes**, with no backend, personal data/audio, secrets/keystores, Git history, tests or evidence. Manifest: `../../work/android-v024-client-review.json`. Finish final suite, commit, submit one 0.2.4/code-6 EAS build using the already approved Expo workflow, record its ID, then verify signature/package/code/source and full served hash before changing aliases.

Direction source checkpoint: **94/94 browser cases**, **55/55 client cases**, lint/typecheck/formatting and Android/iOS/web exports all pass. The active mapping is left-next/right-previous, incoming next from right and previous from left. No physical smoothness claim. Commit this source and package 0.2.4/code 6 now; no 0.2.4 build exists yet. Do not resubmit completed 0.2.3.

Committed direction repair as **`35c9846`**. Approved Expo workflow submitted **one 0.2.4/code-6 build `41c00e4e-1918-435e-b12b-fb904d868080`**; initial status NEW. Upload is 278 KB after mobile-archive exclusions; all 109 reviewed client-file hashes match the frozen source. Request/expected commit: `../../work/android-build-v024-request.json`; CLI result/log: `../../work/android-build-v024.json` / `.log`. Prepared `../../work/verify-android-v024.py` checks that exact build ID/commit, package/code/signature, ZIP and player/Library markers against `../Musify-0.2.4.candidate.apk`; `../../work/verify-v024-download.mjs` checks full served hash after alias publication. Existing aliases serve verified 0.2.3, whose axis is superseded, until this new artifact is verified. No 0.2.4 installer is claimed ready while building.

**Physical iPhone direction accepted:** after Reload in Expo Go 0.2.4, the owner answered “Да, теперь правильно” to next entering from right / previous from left. Do not retune the accepted axis. Android installation/direction, physical smoothness, frame/memory budgets and long playback remain open. Only an Android test emulator (`sdk_gphone64_x86_64`) is connected via ADB; no physical Android phone is available to this agent. No emulator window was opened or test account changed during that read-only check.

The owner then requested one self-contained transfer file immediately and will continue later. Entry point: **`ROOT/MUSIFY-HANDOFF.md`** (workspace root, outside this nested app Git repo). It records the accepted axis, complete state, tooling, preservation rules and exact continuation procedure for the already-running 0.2.4 build. No new feature work started after that handoff request. Build was last observed IN_PROGRESS; do not create a duplicate.
