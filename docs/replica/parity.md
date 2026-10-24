# Parity assessment — 2026-10-24

**71.0/100 weighted feature coverage; 19/32 must-haves complete. Not ready to ship.** Local QA fixes are committed at `23a200c`. Passing tests verify implemented behavior; they do not turn missing or unverified requirements into complete features.

This score covers the agreed recon matrix, not every capability of Spotify. Its weights are must=3, should=2, could=1; partial earns half credit; twelve explicit exclusions are not scored. The tool counts `original=unknown` target requirements as well as documented original features: these are independent product requirements, not observed facts about the original. The documented-original-only subset scores **77.0/100 across 31 features**; must-only scope scores **79.7/100**. New research-derived product additions will use `original=no` and remain outside parity.

## Visual comparison boundary

No layout score or combined feature/layout score is claimed. `screens/README.md` records that there are no measured original native captures. Our `clone-screens/` are usable prototype captures, but there is no corresponding original at the same viewport, platform, state and data shape. Running `imgdiff.py` against a tilted store advertisement would measure the advertisement. Obtain authorized matching Home, Search, Album, Library, Player, Queue and Edit screenshots on 390×844 (or a real shared device viewport) before a numerical layout comparison. Keep original reference media outside shipped assets.

## Behavior comparison

The publisher pages below were re-read on 2026-10-24. These comparisons use documented behavior, not a logged-in original-app session or measured original tap counts.

| Area | Documented original | Own app observed in QA | Remaining difference |
| --- | --- | --- | --- |
| Player | Mini bar expands; pause/skip/save/shuffle/repeat/queue | Mini/full player and these controls work in browser | Physical background/interruption matrix and robust playback error recovery unverified |
| Queue | Mobile drag reorder, swipe remove, explicit queue clear | Arrow-based reorder/remove and scoped “Clear requests”; duplicate occurrences fixed | No drag/swipe interaction; native transitions not fully validated |
| Search | Songs/artists/albums/playlists plus broader content and advanced search | Four music result types over bounded catalog; Unicode and empty result tested | First 100 items only; no full-catalog paging or advanced/lyrics search |
| Playlists | Create/name, add destination, remove and drag order | Creation, deliberate duplicates, arrow reorder/remove, rename/delete and CAS tested | No drag gesture, cover upload, collaboration or public sharing |
| Library/resume | Saved music organization; own restart behavior is a target requirement | Likes, independent saves/follows, list filters/sort, committed seek restore | No grid, playlist-local search, offline checkpoint or downloads |

Sources: [Now Playing](https://support.spotify.com/us/article/now-playing/), [Queue](https://support.spotify.com/gh/article/play-queue/), [Search](https://support.spotify.com/us/article/search/), [Playlists](https://support.spotify.com/ie/article/create-playlists/). Original queue/reorder plan restrictions differ by tier; this app has no implemented paid tier.

## Top five next gaps in dependency order

1. **Managed account lifecycle and support** — stage provider confirmation/recovery/deep links, deletion, support contact and real policies (M01/M02/M31). Verify on both phones.
2. **Reliable mobile listening** — execute lock-screen/call/headset/Bluetooth matrix, handle unavailable audio and stalled buffering with actionable recovery (M14–M16/M25–M27). Test actual signed builds rather than web or Hermes output.
3. **Catalog/media readiness** — full-catalog server search/paging and visible unavailable states, managed Storage and trusted territory resolution (M05/M06/M29). Demo audio is not a commercial supply agreement.
4. **Accessibility and regional usability** — largest text sizes and VoiceOver/TalkBack, Turkmen/Russian localization and search normalization (M30/S09). Axe and token contrast are useful partial evidence.
5. **Collection quality** — playlist-local search, persisted sorting/grid, conflict recovery/undo and current queue gesture polish (S02/S03/S04/S06/S12). Keep save/queue/playlist operations distinct.

There are no open reproduced S1/S2 defects in the local QA register. Thirteen partial must-haves independently fail the release gate. Billing, downloads and sharing remain optional later scope. Continuing to the requested entrepreneur and brand stages does not change this verdict.

## Generated matrix detail

## Parity: 71.0 / 100

features 71.0  (50 counted, must-haves 19 of 32 done)

Not shippable yet: 13 must-have features are not done.

## By area, weakest first
- sharing                        0.0  (1 features)
- monetization                   0.0  (1 features)
- offline                        0.0  (1 features)
- catalog operations            41.7  (3 features)
- account                       50.0  (3 features)
- search                        50.0  (3 features)
- queue                         50.0  (1 features)
- mobile                        50.0  (2 features)
- accessibility                 50.0  (1 features)
- settings                      50.0  (2 features)
- regional                      50.0  (1 features)
- resilience                    50.0  (1 features)
- player                        78.6  (7 features)
- persistence                   80.0  (2 features)
- discovery                     83.3  (3 features)
- playlists                     84.2  (7 features)
- library                       85.7  (6 features)
- navigation                   100.0  (1 features)
- catalog                      100.0  (3 features)
- access                       100.0  (1 features)

## Missing, in build order
- [must] accessibility: M30 Accessible labels scaling and long-text layouts, partial  (All core surfaces; target requirement; not original audit; Build 2026-10-24: 48dp targets and labels; 18 contrast pairs pass; VoiceOver/TalkBack and large-text acceptance pending)
- [must] account: M01 Register an account, partial  (S01-S03; F01; D01; independent auth; Build 2026-10-24: Local registration tested; provider confirmation not staged)
- [must] account: M02 Sign in recover access and sign out, partial  (S03/S18; F01; D23; exact native forms unobserved; Build 2026-10-24: Local login/global sign-out tested; provider email recovery pending)
- [must] account: M31 Account deletion entry and support access, partial  (S18; D20/D23; new product launch requirement; Build 2026-10-24: Real deletion job and UI entry; production support details missing)
- [must] catalog operations: M29 Gate media by recorded content permissions, partial  (E13/E14; independent launch requirement; catalog not acquired; Build 2026-10-24: Local media lease reads recheck permission and withdrawal; managed Storage/territory resolver pending)
- [must] mobile: M25 Continue audio in background and on lock screen, partial  (S20; F11; target requirement; not device observed; Build 2026-10-24: Native background plugin and lock-screen metadata configured; no physical phone test)
- [must] mobile: M27 Handle audio interruptions and route changes, partial  (S20; F11; real iOS and Android tests required; Build 2026-10-24: Playback-only interruption configuration; headset/Bluetooth/call testing pending)
- [must] player: M14 Seek within a track, partial  (S12; F04; target behavior; device validation needed; Build 2026-10-24: Browser seek control and API ranges tested; native seek needs device evidence)
- [must] player: M15 Shuffle and repeat modes, partial  (S12; F04; D06; define state transitions; Build 2026-10-24: Shuffle/repeat code and shuffle-order tests; complete native engine transition matrix pending)
- [must] player: M26 Recover from buffering and playback failure, partial  (S12; F02/F04; target requirement; Build 2026-10-24: Buffering indication and generic operation errors; unavailable-track skipping and native network recovery incomplete)
- [must] queue: M16 Display and manage upcoming queue, partial  (S13/S14; F09; D07; queue reorder and clear explicit additions; Build 2026-10-24: Queue entry movement/removal and CAS implemented; all queue UI edge cases not exhaustively tested)
- [must] search: M05 Search tracks artists albums and playlists, partial  (S05/S06; F03; D02; Build 2026-10-24: All four types over a bounded 100-item catalog; full-catalog server search/pagination outstanding)
- [must] search: M06 Handle pending empty and failed search, partial  (S05/S06; F03; target acceptance states; Build 2026-10-24: Empty state and root connection retry implemented; exhaustive pending/failure search acceptance outstanding)
- [should] playlists: S03 Search within an owned playlist, no  (S09; D08; mobile scope only)
- [should] settings: S10 Network-aware audio settings, no  (S18; target design; measure local connections)
- [should] catalog operations: S11 Independent catalog import and unpublish tools, partial  (Operational surface outside listener screen count; permitted sources only; Build 2026-10-24: Guarded WAV/JSON import and publish/withdraw handlers implemented; hosted intake unverified)
- [should] library: S02 Library filters sorting and list grid modes, partial  (S10; D08; Build 2026-10-24: Filters and three sort choices implemented; grid mode absent)
- [should] persistence: S06 Restore last playback position and queue, partial  (F10; define restart behavior; no cross-device control promise; Build 2026-10-24: Server queue/cursor restore implemented; offline SQLite queue checkpoint absent)
- [should] playlists: S07 Playlist description and custom cover, partial  (S16; D05/D23; permitted user assets; Build 2026-10-24: Descriptions implemented; custom cover upload absent)
- [should] regional: S09 Localized UI and Turkmen-character search, partial  (User target Turkmenistan; languages and scripts to confirm; Build 2026-10-24: Unicode storage/search works; current UI is English only)
- [should] resilience: S12 Retry and undo for collection edits, partial  (S10-S17; define safe retry and conflict behavior; Build 2026-10-24: Create receipts and revision conflict checks implemented; undo/outbox absent)
- [should] search: S04 Search suggestions and recent queries, partial  (S05; D03; store only own users history; Build 2026-10-24: Bounded suggestions API exists; suggestions/recent-query UI not completed)
- [could] catalog operations: C06 Verified artist and label release submissions, no  (D29; regional benchmark Belet Music Studio; later operational workflow outside listener screen count)
- [could] discovery: C05 Rule-based related music, no  (Independent recommendations over own catalog; no model parity)
- [could] library: C04 Playlist folders, no  (D16; later organization feature)
- [could] monetization: C02 Paid plan and entitlement management, no  (S21; F13; D11; business model provider and market availability unresolved)
- [could] offline: C03 Offline album and playlist downloads, no  (S22; F14; D12; permission and technical design pending)
- [could] sharing: C01 Public playlist links and native sharing, no  (D14; deferred; MVP playlists private by proposal)

## Left out on purpose (not scored)
- X01 Spotify audio catalog and cached files: No catalog rights conveyed by recon; use permitted audio supply
- X02 Spotify covers lyrics and editorial content: Reference only; not shipped or copied into catalog
- X03 Spotify name marks and proprietary code: Original brand and fresh implementation
- X04 Spotify APIs or SDKs as replacement backend: D19 section III.11; no permission assumed for replacement experience
- X05 Spotify recommendation models and listener data: Independent curation; their private models and network not available
- X06 Podcasts audiobooks and music video: D14/D15; outside user-selected music slice
- X07 Jam and collaborative social listening: D11/D14; beyond MVP
- X08 Connect handoff car TV and watch apps: D11/D14; native phone playback only
- X09 AI DJ and generated playlists: D10/D11; outside core
- X10 Ad delivery and ad-sales platform: D15; monetization unselected
- X11 Review-specific catalog and misleading local-only listing: D20/D21; actual functionality and catalog must be accurately disclosed
- X12 Unverified regional exemption as music permission: D22; user premise unverified; individual rights assessment remains open
