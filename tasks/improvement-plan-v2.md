# Musify improvement plan v2 — a complete, fast music experience

Prepared 2026-10-26 against Musify 0.2.0, source checkpoint `5cf66f2`.

**Status: implementation in progress.** See [execution record](v2-execution.md) for verified slices and remaining acceptance. This is the second improvement cycle, responding to the owner's report that the app is better but still feels raw, incomplete and slow. It extends the first plan and carries forward its unfinished device acceptance. It does not mark the first plan's unchecked tasks complete.

Companion documents: [catalog expansion plan](catalog-expansion-plan-v2.md), [ordered implementation tasks](todo.md#cycle-2--implementation-backlog), [current implementation evidence](implementation-status.md), and [existing performance evidence](performance-results.md).

## 1. Product target

Make the everyday music experience feel as close to Spotify's mobile experience as possible: familiar screen structure and content density, predictable controls and gestures, detailed artist/album/playlist pages, smooth transitions, immediate feedback, reliable playback and a catalog worth exploring. Keep the Musify name, independent implementation and existing personal libraries.

The target includes **visual fidelity, interaction fidelity, feature completeness, content quality and measured speed**. Each needs its own acceptance evidence. A darker background, more animation or a higher song count alone will not satisfy this plan.

The primary journey is:

> Open instantly into useful music → find a familiar artist or song → start playback → expand/collapse the player → save or organize music without interrupting playback → discover the next song → return later with state intact.

Use Spotify's music experience as the reference. Freeze a dated iOS and Android reference set before detailed implementation; layouts and feature availability vary by version, account and market. Match control placement, hierarchy, density and behavior against that set. Exact visual claims require paired captures; this document does not claim a current pixel-parity percentage.

### Existing decisions retained

- Mobile first: iPhone 15 Pro and the owner's Redmi described as “10 Pro”; confirm the Redmi model and both OS versions during device baselining.
- Fast, subtle everyday motion; richer but interruptible player and sheet transitions.
- English, Russian and Turkmen; phone-language selection with English fallback and a Settings override.
- Personal testing on the Windows PC's Wi-Fi; Expo Go remains useful for iPhone preview. Own-build iOS testing is required for native release performance and background behavior.
- Popular international artists are the first catalog priority. Regional expansion follows without displacing that preference.
- Local/free infrastructure for this stage; subscription versus advertising remains a later product decision.

## 2. Audit: what still makes the current app feel unfinished

Evidence inspected: current source, current test/build reports, the 0.2.0 catalog report, and four existing phone-width web captures. Those captures predate the 30-track expansion and establish layout only. No new physical-device trace or live Spotify account comparison was captured during this planning pass. The old `replica/features.csv` still contains pre-redesign statements and must be reconciled before a new parity score is meaningful.

| Finding                                                                                                                  | Evidence                                                  | Consequence                                                                           | Planned correction                                                                           |
| ------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------- | ------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| Album, playlist and artist pages share a mostly identical template                                                       | `src/ui/screens/Collection.tsx`                           | Each entity feels like a generic list                                                 | Distinct artist, album and playlist compositions with shared lower-level controls            |
| Collection overflow redirects to Edit/Artist or shows a track-count notice                                               | `Collection.tsx`                                          | The menu does not deliver the expected actions                                        | Real context-specific sheets with working save, queue, share, credits and owner actions      |
| Collection shuffle uses `sort(() => Math.random() - 0.5)`                                                                | `Collection.tsx`                                          | Biased ordering and a separate path from player shuffle                               | One tested shuffle model preserving current entry and canonical order                        |
| Artist API/type/UI omit portrait delivery and richer discography data                                                    | `src/data/types.ts`, API catalog modules, Home/Collection | Artist pages remain sparse despite added songs                                        | Portrait/hero, release types, fuller discography, credits and honest biographies             |
| Player atmosphere comes from an ID-derived palette                                                                       | `apps/api/src/catalog.mjs`, `NowPlaying.tsx`              | Background color can conflict with the actual cover                                   | Persisted cover-derived palette with contrast-tested overlays                                |
| Player source label uses the album title                                                                                 | `NowPlaying.tsx`                                          | Starting from a playlist/search loses meaningful context                              | Explicit playback context and a return link to its source                                    |
| Home derives shelves/categories from a shared snapshot and maps horizontal rows eagerly                                  | `Home.tsx`, `common.tsx`                                  | Limited curation, repeated content and a scale risk                                   | Bounded home sections, independent loading and useful personalized ordering                  |
| Library “recent” is a concatenation of entity groups rather than a unified dated order                                   | `Library.tsx`                                             | Recently saved content can appear in the wrong place                                  | Timestamped library entries, true recency sorting, search and pins                           |
| Search has pagination but mixed results put track rows before other sections; category browsing uses the loaded snapshot | `Search.tsx`, `catalog-query.mjs`                         | Exact artists/albums can be buried; categories become incomplete as the catalog grows | Ranked top result, bounded mixed sections, server-backed categories and indexed matching     |
| Metadata cache is in memory; startup waits for snapshot and queue restoration                                            | `MusicProvider.tsx`, `catalogCache.ts`                    | No durable cached Home path after a process restart                                   | Account-scoped persistent bootstrap and deferred restoration work                            |
| Queue edits await server persistence before installing the engine state                                                  | `MusicProvider.tsx: command/install`                      | A plausible source of delayed play/skip/reorder; latency has not been isolated        | Measure command stages; design responsive transport plus safe acknowledgement/reconciliation |
| Periodic position persistence shares the serialized command pipeline                                                     | `MusicProvider.tsx`                                       | Slow checkpoints may delay interactive commands                                       | Separate/coalesce checkpoints and prioritize user commands                                   |
| Some iOS queue membership changes clear/rebuild the player                                                               | `MusicProvider.tsx`                                       | Potential audible disruption; not yet measured                                        | Native compatibility spike and an uninterrupted active-source strategy                       |
| Initial discovery is capped while owned/saved collections can hydrate very large graphs                                  | `apps/api/src/catalog.mjs`, `catalog-query.mjs`           | Discoverability and bootstrap size have different scaling problems                    | Independent paginated feed/library/detail contracts; preserve reference correctness          |
| Thirty popular tracks occupy 27 album entries across 12 artists                                                          | Catalog import evidence                                   | Most album pages contain one selected song, and artists lack depth                    | Complete-album batches, richer artist packages and explicit partial-album states             |
| Lyrics, offline downloads, radio/autoplay, sleep timer, sharing and cross-device control lack complete product flows     | Inspected routes, UI, state and API surface               | Basic listening works, but expected daily-use capabilities are missing                | Staged functional slices below, each with an actual data/engine path                         |
| Native smoothness is unmeasured                                                                                          | `performance-results.md`                                  | No defensible claim that the current build meets phone-speed goals                    | Reproducible release-device baselines before optimization                                    |

These are source-backed observations or explicitly labeled hypotheses. Existing improvements—virtualized track lists, optimistic saves, split playback-progress subscriptions, image variants, search pagination and locale dictionaries—should be retained and refined, not rebuilt automatically.

## 3. Priority and delivery structure

| Milestone                       | Deliverable                                                                        | Main work | Exit gate                                                                                          |
| ------------------------------- | ---------------------------------------------------------------------------------- | --------- | -------------------------------------------------------------------------------------------------- |
| A — trustworthy baseline        | Reference pack, current gap matrix, device/performance ledger                      | V01–V03   | Scope and measurements distinguish observed, inferred and untested behavior                        |
| B — responsive listening core   | Fast startup/transport, bounded requests, correct queue/shuffle                    | V04–V14   | Critical listening journey works under delay without unrelated UI freezes or source resets         |
| C — Spotify-close daily screens | Unified polish across Home, Search, Library, collections, player and sheets        | V15–V32   | Paired screen/interaction review; all primary actions work and state survives navigation           |
| D — complete daily listening    | Timer, history, discovery, offline, lyrics and appropriate playback options        | V33–V44   | End-to-end behavior, failure recovery and platform-specific evidence for each shipped capability   |
| E — catalog depth and scale     | Clean existing catalog, 150 → 500 → 1,500-track gates                              | C01–C12   | Coverage and quality gates pass; browsing/playback remain within budgets                           |
| F — personal release candidate  | Locale/accessibility sweep, full regressions, own-device soak and updated builds   | V45–V48   | No unresolved critical/major defect in the selected release scope; device limits stated explicitly |
| G — connected ecosystem         | Sharing beyond LAN, collaboration, device handoff and other service-dependent work | E01–E06   | Separate implementation specs and operational prerequisites met                                    |

Recommended first implementation batch: **V01–V03 → V04–V08**, while preparing **C01–C03**. Then deliver one complete Home → album → play → player → save journey before applying the visual system to every remaining screen. Engine feasibility is investigated early, before committing to an offline/crossfade design.

Proposed packaging: 0.3 for the responsive core and visual completion; 0.4 for accepted daily-use additions; later versions for ecosystem capabilities. Package a scoped 0.3 candidate after C08 (the core screens plus C1 catalog), and a scoped 0.4 candidate after C09 (accepted daily-use work plus C2). Run the relevant acceptance/build checks at each boundary; the final V45–V48 pass closes the whole selected cycle. Do not wait for 1,500 songs or ecosystem features to let the owner test the improved core. Version names are planning labels, not promises that every optional feature will be ready simultaneously. No calendar estimate is reliable until native profiling and the engine spike establish the work.

## 4. Screen-by-screen improvement specification

Every row includes normal, empty, loading, stale, unavailable, error, retry, pending-write, large-text and reduced-motion states where relevant. Use stable layouts and retain playable/cached content when a secondary request fails.

| Surface                   | Required upgrade                                                                                                                                         | Definition of a finished interaction                                                                                                                                      |
| ------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Entry and onboarding      | Clean identity, keyboard-aware auth, concise validation, first-run language and optional artist preferences                                              | Existing users reach cached Home without onboarding again; back/cancel preserves inputs; recovery and expired-session routes resolve correctly                            |
| Home                      | Compact profile/filter header, 2-column context-aware shortcuts, recent listening, useful editorial/genre/release sections, “See all” destinations       | No duplicate shortcut IDs or fixture-led categories; each shelf has an explicit source/order and independent retry; scroll position survives tab switching                |
| Search landing            | Recent queries, recent selected entities, curated category art and real category destinations                                                            | Search focus/clear/cancel works with the keyboard; removing history persists per account                                                                                  |
| Search results            | Relevant top result, compact type sections, sticky chips, exact-title/artist ranking, aliases/typos, paginated “See all”                                 | A known exact match appears above weaker substring hits; canceled queries cannot replace newer results; selecting a song preserves the displayed result context           |
| Your Library              | Search, pins, real recent/recently-added/title/creator order, list/grid consistency and clear downloaded filters when supported                          | Save from any screen is reflected immediately; ordering follows stored timestamps; account switch cannot inherit another user's collection or history                     |
| Liked Songs               | Strong cover identity, count/duration, internal search/sort, play/shuffle, select-to-playlist                                                            | Sorting/filtering changes the listening context intentionally; unsave offers undo; saved album and liked-song membership remain independent                               |
| Listening history         | Date groups, listening events, resume/open-source actions and a clear-history path                                                                       | Failed starts and replayed network events do not fabricate listens; repeated real listens can be represented without losing time information                              |
| Artist                    | Hero/portrait, follow, prominent Play, curated popular tracks, albums/singles/EPs, related artists, about/credits                                        | “Popular” has a documented basis; no invented follower/listener statistics; discography loads beyond the first feed page                                                  |
| Album                     | Cover-derived header, release type/date, artist link, compact action row, track numbers/discs, explicit/version indicators and credits                   | Correct recorded order; whole-release Play uses all available tracks; incomplete albums disclose available versus total tracks                                            |
| Playlist                  | Cover/mosaic, owner/context, description expansion, count/duration, sticky Play, internal search/sort                                                    | Owned and read-only capabilities are explicit; playing a filtered/sorted view is predictable; returning from a track keeps scroll/filter state                            |
| Playlist editor           | Rename/description/cover, long-press drag with edge scrolling, multi-select removal, duplicate handling and conflict recovery                            | Changes save once; discard retains the original; a stale revision never silently overwrites a newer edit                                                                  |
| Add-to-playlist           | Searchable virtualized picker with covers, existing-membership state, create-and-add, optional multi-selection                                           | Adding completes in context with confirmation/undo where safe; it does not force a jump to the destination playlist                                                       |
| Track/collection menus    | Consistent summary and rows: save, add, next/last, album/artist, radio, share, credits; owner operations where appropriate                               | Each visible row has a real destination or operation; no count-only placeholder under an overflow affordance                                                              |
| Mini-player               | Cover-tinted surface, stable title/artist, smooth local progress, clear buffering state and a reliable expansion target                                  | Audio state stays synchronized with the full player; touches do not hit the tab bar beneath it; track change does not remount the engine                                  |
| Now Playing               | Cover-derived atmosphere, actual source context, polished art/transport spacing, smooth seek preview, queue/timer/output actions and lower detail panels | Thumb follows the finger immediately; state does not snap backward on stale status; dismissal restores the source screen; title/controls fit short and large-text screens |
| Queue                     | Playing now, user-added next, source queue and history distinction; swipe/remove/undo, edge-scroll drag and clear-scope actions                          | Duplicate songs keep distinct entry IDs; reorder preserves current playback; clear affects the advertised group; failures restore a coherent queue                        |
| Lyrics                    | Collapsed panel and full screen, timed following, seek by line when supported, return-to-current control                                                 | Track/edition/language match; untimed text is labeled; no fabricated words/timestamps or indefinite placeholder                                                           |
| Downloads                 | Album/playlist download, progress, pause/resume/cancel, Wi-Fi preference, storage page and unavailable states                                            | Airplane-mode playback works for completed authorized downloads; partial/corrupt files never appear completed; eviction respects pinned downloads                         |
| Radio and recommendations | Song/artist radio, related tracks, recent/favorite mixes, hide/dislike feedback and explicit autoplay preference                                         | Recommendations come from available music, respect explicit/hidden preferences, and avoid immediate repeats; small catalogs get a truthful fallback                       |
| Settings                  | Playback, quality/data, downloads/storage, language, accessibility, privacy/history, account and diagnostics                                             | Every setting changes behavior and persists at the correct device/account scope; unavailable engine functions are absent until implemented                                |
| Profile/account           | Editable display name/avatar, recovery, active-device/session visibility where implemented, sign-out and deletion                                        | Identity updates are reflected consistently; private caches are purged on account change; local versus hosted recovery capabilities are clear                             |
| Global states             | Contextual skeletons, inline failures, reconnect state, optimistic changes and compact undo feedback                                                     | A slow save does not disable unrelated transport; important errors are actionable; notices do not cover the seek bar or tab controls                                      |

### Layout and visual rules

1. Freeze Home, album and player as the first reference set. Use consistent density, icon weights, gutters and control placement across the remaining screens once that set passes review.
2. Keep near-black surfaces, crisp primary text, restrained secondary text and the established mint action color. Most color should come from music artwork and sampled header palettes. Replace ID-derived palette assignment on covered content.
3. Use one compact track-row family with variants for album numbering, queue drag, playlist selection and search metadata. Do not put every row inside a separate raised card.
4. Default phone geometry: 16-unit screen gutters, 4/8-unit spacing rhythm, 56–64-unit compact rows where content allows, and at least 48-unit shared touch targets. Content may grow with text scale; never force fixed row measurements onto wrapped text.
5. Use semantic type roles with controlled weights and truncation. Titles, artist metadata, counts and actions should not all compete at the same emphasis. Long titles stay accessible in the detail/overflow context.
6. Collection headers collapse into a compact title/action bar without jumping. Preserve safe areas, Android navigation/gesture insets and keyboard visibility. Avoid blocking the last list item with the mini-player.
7. Artist portraits, playlist covers and category art must describe their actual content. Use a neutral fallback when data is absent; never display a stock portrait as an artist or fabricate popularity statistics.
8. Contrast acceptance remains 4.5:1 for ordinary text and 3:1 for large text/meaningful controls. Test sampled palettes and every pressed/selected/error state.

### Motion rules

| Interaction           | Intended behavior                                                                                | Acceptance                                                                                                               |
| --------------------- | ------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------ |
| Press                 | Immediate tonal feedback, optional approximately 0.98 scale; 80–120ms in and 120–160ms release   | Command fires independently of animation; rapid taps do not leave a scaled control                                       |
| Tabs                  | Immediate cached destination; at most a subtle short fade                                        | No replayed entrance sequence, scroll reset or loading overlay on a warm tab                                             |
| Mini-player expansion | One coordinated 240–300ms transition with stable cover/control continuity                        | Interruptible; no double cover, flash or engine recreation; use a reliable overlay if shared-element support is unstable |
| Player dismissal      | Finger-following drag and velocity/distance settle                                               | Does not steal seek or inner-scroll gestures; cancel restores geometry and focus                                         |
| Sheets                | Approximately 220–280ms opening, shorter exit, dimmed source and correct scroll/keyboard handoff | Back/backdrop/drag dismiss consistently; focus returns to the opening control                                            |
| Track changes         | Brief artwork/metadata crossfade and interpolated progress                                       | Transport stays fixed; progress resets only for the new entry                                                            |
| Row gestures          | Swipe-to-queue/save/remove where the reference and context agree; drag with edge autoscroll      | Vertical scrolling remains easy; accessible actions provide equivalent control                                           |
| Saves and undo        | Immediate selected state, small confirmation and purposeful haptic                               | Failure reverses the optimistic state; repeated actions are serialized safely                                            |

Reduced motion uses static state changes or short fades and keeps all features usable. No continuous animation is added just to make a quiet screen look active. The 500ms engine reporting interval should not produce visibly stepped progress; interpolation belongs in the visible player, not a global high-frequency render loop.

## 5. Performance and audio architecture

### P0: remove unnecessary waiting from the critical path

- **Bootstrap:** persist a small, versioned, account-scoped metadata cache; render usable cached Home, then refresh shelves and restore the queue independently. Never cache a session secret in ordinary metadata storage. A cached item does not authorize a new stream.
- **Transport:** measure tap → command enqueue → network acknowledgement → native command → first audible output. Pause/seek and already-authorized queue movement should use local transport promptly. New media still requires valid authorization.
- **Authorization dependency:** today's media URL is tied to a server queue entry. Do not simply move every server call into the background. Introduce an acknowledged/pre-authorized queue window or another explicit contract, with idempotency and version reconciliation, before local-first playback of new entries.
- **Command scheduling:** interactive commands take precedence over periodic position checkpoints. Coalesce checkpoints, bound pending work, handle rapid skip/seek and reject stale responses after account/track changes.
- **Updates:** scope pending state to the affected operation. Targeted mutations update the changed collection; avoid downloading a complete snapshot after every small operation.
- **State:** retain the separated progress subscription, then profile remaining provider/row renders. Normalize entity lookups and introduce selector subscriptions only where traces show broad rerender cost.

### Bounded data and rendering

- Paginate Home sections, category results, library entries, history, artist releases and playlist items separately. Return counts/cursors/summary artwork instead of embedding every playlist's contents in bootstrap.
- Preserve saved/queue metadata correctness when moving from eager hydration to lazy detail loading. Never fix payload size by dropping referenced items from a user's library.
- Give every page a stable tie-break order, account/filter scope, cancellation and stale-response handling. Cursor invalidation has a recoverable restart path.
- Inspect query plans for current normalized substring search. Evaluate indexed prefix/full-text/alias matching and optional trigram support against actual local/production capabilities before adding a service. Keep multilingual ranking and ownership rules intact.
- Virtualize Home's vertical sections and long horizontal rows; use stable IDs and bounded windows. Adopt a different list library only after a controlled comparison shows a benefit on representative devices.
- Produce cover variants and palettes at intake. Request the right physical-pixel size, reuse stable content hashes and prefetch only near-visible art. Keep cache quotas, account invalidation and withdrawal behavior explicit.
- Separate public asset caching from private metadata/media grants. Define cache keys, TTL/versioning and invalidation in each contract; measure before introducing Redis, a CDN or another dependency.

### Audio engine work

Retain Expo Audio initially. Its SDK-58 documentation describes playlist gapless support and source management; this does not establish that our streamed files, queue mutations or buffer behavior are gapless in practice. The current platform-specific rebuild path must be tested. The documented preload behavior also differs by consumer/platform; prove compatibility with `useAudioPlaylist` before relying on it. [Expo Audio, SDK 58](https://docs.expo.dev/versions/v58.0.0/sdk/audio/).

Implement a bounded upcoming-source window, explicit playback states, lease renewal, retry/backoff and a deliberate unavailable-track policy. Preserve current position and audible playback during save, sheet, tab, repeat and unrelated queue changes. Record whether native route changes should pause or resume; disconnecting headphones must not unexpectedly start the speaker.

Investigate crossfade, normalization and equalizer separately. Gapless sequencing and overlapping crossfade are different requirements. Do not replace the working engine until a small experiment proves the needed native feature, background controls, seek/queue stability and battery behavior. Features requiring native additions move to an own-build test lane while the supported Expo Go preview remains useful.

## 6. Performance contract

These are acceptance targets, **not current results**. Preserve the first cycle's budgets. Record build/commit, device model/OS, refresh rate, dataset, cache state, network, battery and thermal state. Use release/profileable Android and later an own iOS build; dev-mode timing is not release timing. [React Native performance guidance](https://reactnative.dev/docs/performance).

| Metric                           | Target                                                                          | Protocol                                                                                    |
| -------------------------------- | ------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| Press/typing acknowledgement     | p95 ≤100ms                                                                      | 30 actions of each type per run; include busy playback and long lists                       |
| Warm tab or cached collection    | p95 ≤200ms to useful content                                                    | 30 transitions with preserved scroll/filter state                                           |
| Cold usable Home                 | median ≤2.5s, p95 ≤4s                                                           | 20 launches per session, three matched sessions; first install separately                   |
| Scroll/player gesture pacing     | ≤1% missed 60Hz frame deadlines; no repeatable >100ms stall                     | Five 30-second traces; UI/JS separately; report actual high-refresh deadlines where active  |
| Tap to audible playback, LAN     | p95 ≤1.5s                                                                       | 30 cold/warm starts separately; report authorization, buffering and decode stages           |
| Constrained-network start        | p95 ≤3s at 1.5Mbps down / 150ms RTT when the rendition permits                  | Matched music sample; do not conceal buffering behind animation                             |
| Search request to visible result | p95 ≤500ms on LAN, excluding debounce                                           | 30 EN/RU/TK queries per run; exact, alias, typo and absent terms                            |
| Server metadata read             | p95 ≤200ms at the defined 10k reference dataset                                 | Independent DB/API timing; detail reads use a bounded first page                            |
| Audio continuity                 | No app-caused pause/reset on unrelated operations                               | Recorded 30-minute session with navigation, save, queue and preference changes              |
| Cached art                       | No blank flash on repeated visits                                               | 20 revisits, plus memory-pressure recovery                                                  |
| Memory                           | No monotonic retained growth; return within 15% of stable post-warm-up baseline | 30-minute cycle, JS heap and native image/audio memory separately                           |
| New bootstrap budget             | Proposed ≤250KiB decoded metadata for the initial useful Home slice             | Excludes media/artwork; compare 42, 1k and 10k catalog fixtures; no full playlist hydration |
| New repeat-entry cache budget    | Proposed ≤2 metadata requests to reopen an unchanged cached collection          | Short freshness window; authorization and actual changes can require revalidation           |

The new budgets are explicit proposals to verify during V02; they do not relax existing thresholds. If physical phones are unavailable, split measurement preparation from hardware acceptance: continue source profiling, isolated server tests, visual work and candidate builds, while keeping native performance verdicts pending. Missing hardware must not block independent work or be replaced by invented device results. Keep an experiment ledger with baseline, one change, matched results, variance and keep/revert decision. A neutral or noisy optimization does not justify permanent complexity. Rendering correctness, accessibility and media access remain mandatory.

## 7. Missing capabilities and ecosystem scope

The daily-use target includes real search-within-collection, pins, complete contextual menus, richer artist/album data, covers, sharing, sleep timer, history, radio/autoplay, offline/storage controls, lyrics and feasible playback options. Some require new contracts or content, so they are scheduled as vertical slices rather than visual placeholders.

For broader Spotify coverage, track these explicitly:

| Capability                       | Planned Musify direction                                                              | Dependency / readiness                                                                                                                       |
| -------------------------------- | ------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| Cross-device continuation        | Resume queue/position and transfer the active listener session between Musify devices | Hosted/session protocol, presence, exclusive playback ownership and reconnect/conflict handling; a normal account sync alone is insufficient |
| Device output picker             | Use supported OS route selection first; evaluate casting integrations separately      | Platform native APIs and physical speaker/headphone tests; do not label an imitation button “Spotify Connect”                                |
| Collaborative playlists          | Owner/editor/read roles, invitations, revoke, revisions and merge feedback            | Multiple accounts, hosted invitation links and conflict tests                                                                                |
| Shared listening                 | Explicit host session and participant queue permissions, then timing/sync work        | Realtime service and drift/reconnect handling; distinct from just sharing a playlist                                                         |
| Smart recommendation shuffle     | Opt-in recommendation insertion, visibly identified and removable                     | Catalog coverage, recommendation ranking and feedback; standard shuffle stays independent                                                    |
| Listening recap                  | Honest personal listening statistics from accepted events                             | Sufficient real history and privacy controls; do not fabricate a Wrapped-style result from seed data                                         |
| Local-file import                | User-selected files, metadata mapping and device/local availability                   | Document picker, storage policy and format validation                                                                                        |
| Animated artwork / videos        | Optional visual enhancement with static fallback and a data/battery switch            | Suitable assets, native performance and playback integration                                                                                 |
| Podcasts / audiobooks            | Separate content models, progress/speed/chapter/resume flows                          | New content supply and product scope; not silently counted as music parity                                                                   |
| AI DJ / conversational discovery | Later experiment after deterministic discovery is useful                              | Recommendation quality, model/provider cost, voice/content behavior and evaluation                                                           |
| Car / watch / TV / desktop apps  | Platform-specific navigation, transport and session behavior                          | Dedicated clients/integrations and hardware acceptance                                                                                       |
| Subscription / advertising       | Separate commercial release work                                                      | Owner's business-model decision, purchase/account flows and serving infrastructure                                                           |

Official behavior references confirm the distinction between [queue editing](https://support.spotify.com/us/article/play-queue/), [library organization](https://support.spotify.com/us/article/sort-and-filter/), [autoplay](https://support.spotify.com/us/article/autoplay/), [shuffle recommendations](https://support.spotify.com/us/article/shuffle-play/), [offline listening](https://support.spotify.com/us/article/listen-offline/), [track transitions](https://support.spotify.com/us/article/tracks-transitions/), [remote device control](https://support.spotify.com/us/article/spotify-connect/) and [shared listening](https://support.spotify.com/us/article/jam/). These references describe behavior; the Musify designs and infrastructure must implement their own working equivalents.

## 8. Catalog strategy integrated with the product

Start by separating the twelve engineering fixtures from the normal personal browsing feed, without deleting files or breaking saved references. Clean and enrich the thirty real tracks, then expand in gated batches: **150 tracks / 25 artists / 10 complete albums → 500 / 60 / 30 → 1,500 / 120 / 80**. Counts are proposed milestones, not existing acquisitions or a promise of a complete commercial catalog.

Depth matters: complete the most-used artists' releases, retain accurate editions and explicit indicators, add portraits/credits/genres/moods, and build coherent playlists before chasing a headline song count. Mark partial albums clearly. Keep technical scale fixtures separate from real music supply.

The [catalog expansion plan](catalog-expansion-plan-v2.md) specifies targets, candidate artists, metadata requirements, ingestion, duplicate handling, artwork, storage, verification and rollback. Curation and audio intake are separate from rendering; catalog updates should not require a new APK.

## 9. Verification and definition of done

Use the existing 24 client/data/locale tests, 23 API tests and 40 browser cases as the prior checkpoint, not a permanent test-count target. Add focused tests for new behavior. Run `npm run lint`, `npm run typecheck`, `npm test`, relevant `npm run test:e2e`, formatting and appropriate platform exports. Preserve existing assertions and thresholds.

Required datasets: empty account; current 42-track engineering/personal set; 150/500/1,500 real-catalog shapes; 10k and 100k synthetic metadata; 1,000-track playlist; 500 saved entities; 30 and 150 playlists; duplicates, withdrawn tracks, long EN/RU/TK text, unavailable covers and explicit filtering. Large fixtures reuse test audio; they do not require downloading that many songs.

Required journeys: first launch, return launch, login/recovery, browse/play, search/save/add, playlist edit/conflict, queue gestures/undo, repeat/shuffle, background/interruptions, network loss/reconnect, cache eviction, download/resume/offline and account switch/deletion. Test data integrity across migration and upgrade from 0.2.0.

Every completed slice needs:

1. Working normal and failure flows, with no dead or misleading visible actions.
2. Screen evidence against the frozen reference for changed UI; recordings for changed motion.
3. Accessibility and all three locale checks for changed controls.
4. Focused regression evidence; source/build identity in the report.
5. Matched measurements for performance claims; native results kept separate from browser/Expo Go results.
6. Backup/migration/rollback information for persistent data changes.

Do not claim 1:1 completeness from a limited feature matrix. Maintain separate **functional**, **visual**, **motion**, **performance** and **catalog coverage** scorecards, with observed/partial/missing/untested status. A release can be a strong personal music app while service-dependent ecosystem work remains explicit.

## 10. Carry-forward and first decision points

Carry forward first-cycle native accessibility, gestures, audio continuity, long-session performance and physical build acceptance. Keep the existing production backlog in `replica/tasks/todo.md`; this cycle does not silently close it.

No additional product interview is needed to begin the first implementation batch. Remaining inputs are collected when they affect the work: exact Redmi/OS details for profiling, Spotify reference captures when accessible, an own iOS build route for native-only testing, content sources for full album/lyrics/portrait coverage, and hosting/account choices for features that must work away from the PC.

The next implementation action is **V01–V03**, followed by the measured startup/playback bottleneck with the largest user-visible cost. Catalog preparation **C01–C03** can proceed independently; data publication waits for its validation gates.
