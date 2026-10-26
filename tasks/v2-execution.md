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
