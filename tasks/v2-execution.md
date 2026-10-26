# Improvement cycle 2 — implementation record

Started 2026-10-26 from `ccca75c`. The owner authorized the full improvement and catalog plans. Work proceeds in independently verified slices; parent tasks remain open until their complete acceptance criteria pass.

## C02.1 — durable additive database upgrades

Implemented a version/checksum ledger and shared local/managed migration runner. Existing 001 databases adopt their baseline; later SQL runs transactionally once. Runtime identities cannot edit the ledger. Checksums normalize Windows line endings. Migration 002 adds release edition/type/expected count/completeness, artist/recording aliases, explicit-state provenance, fixture classification and measured media/artwork fields. Unknown metadata stays unknown; existing IDs, account data and playlist membership stay in place.

Verification: new tests cover existing-001 upgrades with saved tracks and playlist entry identities, fresh databases, repeat execution, checksum drift and ledger access isolation. Full regression and integration results are recorded with each checkpoint below. The live personal database has not yet been migrated; a stopped-service backup and copied-database validation precede that step.

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
