# Musify improvement tasks

> Active second-cycle plan: [improvement-plan-v2.md](improvement-plan-v2.md). New ordered tasks are in [Cycle 2](#cycle-2--implementation-backlog); the first-cycle checklist below is retained.

Status: implementation active since 2026-10-26. See [implementation-status.md](implementation-status.md) for delivered code and evidence. An unchecked task can have its software implemented while still awaiting the explicit native/device acceptance criteria; these checkboxes do not mean no work has happened. Read [plan.md](plan.md) for the screen, motion, performance and acceptance contracts. Estimates below describe scope, not elapsed-time promises. Paths are relative to the app repository. Preserve the separate unfinished production backlog in `replica/tasks/todo.md`.

Common verification: run lint/typecheck for source changes, focused behavior tests for changed logic, and the affected flow on the relevant platform. Run broader regression checks at milestones. For new native dependencies, verify SDK compatibility and both platform exports. Screenshots prove appearance only; gestures, haptics, sound and frame times need appropriate device evidence.

## M0 — Reference and baseline

### [ ] T01 — Freeze the mobile reference set

**Work:** Assemble dated, platform-labelled references for Home, Search, Library, collection, player, queue and sheets; relate each to current Musify routes. Mark any inferred state.
**Acceptance:** A comparison matrix names hierarchy, density, controls and important behaviors; no old screenshot is represented as current native evidence.
**Verification:** Review every reference and its source/date; compare against current source and recon.
**Dependencies:** None. **Scope:** S, 1–2 documents plus evidence assets.
**Files:** `tasks/reference-map.md`, `tasks/evidence/reference/`.

### [ ] T02 — Capture reproducible performance and phone baselines

**Work:** Record phone models/OS/build, first-play and navigation timings, rendering trace, API timings, and memory behavior. Define fixtures and repeatable journeys.
**Acceptance:** Baseline separates Android release results from iPhone Expo Go observations; missing measurements remain explicitly unmeasured; datasets/conditions are reproducible.
**Verification:** Repeat a sample run and compare variance; retain traces and build identifier.
**Dependencies:** T01. **Scope:** M, 3–5 files.
**Files:** `tasks/performance-baseline.md`, `scripts/seed-ui-stress.mjs`, `scripts/measure-api.mjs`, `tasks/evidence/baseline/`.

### Checkpoint A

- [ ] Reference boundaries and baseline evidence are recorded; no invented speed scores.
- [ ] Personal library/media are backed by existing persistence and test-only stress data is isolated.

## M1 — One complete polished listening flow

### [ ] T03 — Establish the Home and Player visual target

**Work:** Produce concrete Home/Player designs with the requested close Spotify layout and proposed color system, using realistic metadata, then review the pair together.
**Acceptance:** Compact first viewport exposes music; full player hierarchy is clear; exact color and composition decisions are recorded instead of silently assumed.
**Verification:** Compare same-size frames with T01; check contrast and long metadata; obtain feedback on the concrete pair before spreading the design.
**Dependencies:** T01. **Scope:** M, 3–4 design artifacts.
**Files:** `tasks/visual-target.md`, `tasks/evidence/target/`, `src/design/tokens.json` (proposal until implementation).

### [ ] T04 — Validate motion and image dependencies

**Work:** Verify SDK 58 compatibility for Reanimated/worklets, Gesture Handler, Expo Image and Haptics; run a small isolated press/drag/image example. Assess sheet-library compatibility only if needed.
**Acceptance:** iPhone Expo Go and Android supported paths are documented; no unnecessary SDK upgrade; reduced-motion and non-haptic fallback work.
**Verification:** SDK dependency check, lint/typecheck, platform exports, phone smoke test.
**Dependencies:** T02. **Scope:** M, 4–5 files.
**Files:** `package.json`, lockfile, `src/app/_layout.tsx`, `src/app/design.tsx`, `tasks/compatibility.md`.

### [ ] T05 — Implement shared visual and press primitives

**Work:** Apply selected semantic colors/type/spacing, button sizes, icon states, press response and motion settings in the component gallery.
**Acceptance:** Primary/secondary/quiet/destructive, selected/disabled/busy/focus states are complete; 48-unit touch areas and text scaling work; motion does not delay commands.
**Verification:** Gallery at narrow/large-text settings; contrast checks; rapid press/cancel and reduced motion on phones.
**Dependencies:** T03, T04. **Scope:** M, 4–5 files.
**Files:** `src/design/tokens.json`, `theme.ts`, `Primitives.tsx`, new `src/design/motion.ts`, `src/app/design.tsx`.

### [ ] T06 — Isolate playback progress subscriptions

**Work:** Separate stable data/actions, queue, current-track and progress state without changing queue semantics; migrate the core listening subscribers first.
**Acceptance:** Progress-only updates do not rerender Home shelves/track rows; one audio engine survives route changes; existing queue and authentication behavior remains intact.
**Verification:** React render profile before/after plus queue tests; browse while playing and confirm engine instance continuity.
**Dependencies:** T02. **Scope:** M, up to 5 files per slice; migrate remaining consumers within their screen tasks.
**Files:** `src/data/MusicProvider.tsx`, new focused state modules, `src/ui/TrackRow.tsx`, `src/ui/Shell.tsx`.

### Checkpoint B

- [ ] New component states and motion are reviewable on both platforms.
- [ ] State isolation has render-count evidence and unchanged audio behavior.

### [ ] T07 — Introduce persistent top-level tabs

**Work:** Create real Home/Search/Library tab routes, move shell chrome to the shared layout, retain URL compatibility and per-tab scroll/input state.
**Acceptance:** Repeated tab taps do not accumulate stack entries; back/navigation is predictable; mini-player space and safe areas remain correct.
**Verification:** Twenty alternating tab switches, Back gestures, restored query and scroll; web deep-link smoke check.
**Dependencies:** T05, T06. **Scope:** M per slice, 4–5 files; separate tab adapters from dispatcher removal.
**Files:** `src/app/_layout.tsx`, new tab layout/route adapters, `src/ui/Shell.tsx`.

### [ ] T08 — Introduce hierarchy and modal routes

**Work:** Migrate collections and player/actions routes in small groups; preserve old deep links and authentication callbacks.
**Acceptance:** Detail Back returns to the right tab/context; player is modal and does not recreate the engine; recovery and signed-out routes still work.
**Verification:** Direct links, cold navigation, iOS edge Back and Android Back; focused auth callback regression.
**Dependencies:** T07. **Scope:** M per route group, ≤5 files each.
**Files:** `src/app/` route adapters, `src/ui/Screens.tsx`, `src/ui/Shell.tsx`.

### [ ] T09 — Rebuild Home around playable music

**Work:** Implement compact header/filter row, recent/favourite shortcuts, bounded shelves, real cover art and useful first-listener layout.
**Acceptance:** No large slogan block displaces primary content; catalog-backed filters only; mini-player remains reachable and state changes do not reset feed position.
**Verification:** Current catalog, empty/partial states, long labels, fast vertical/horizontal scrolling and Home → Play.
**Dependencies:** T05, T07. **Scope:** M, 3–4 files.
**Files:** `src/ui/screens/Home.tsx`, `common.tsx`, new feed/list component, `src/design/Artwork.tsx`.

### [ ] T10 — Build the mini-player and full player composition

**Work:** Extract persistent mini-player and full-screen player; implement artwork atmosphere, stable transport hierarchy, metadata and correct buffering/error presentation.
**Acceptance:** Main transport fits normal phone heights; player has no browsing tab bar; mini/full player reflect the same track and never remount audio.
**Verification:** Playing/paused/buffering/empty states, long metadata, small/large text, track changes during navigation.
**Dependencies:** T05, T06, T08. **Scope:** M, 4–5 files.
**Files:** new `src/ui/player/MiniPlayer.tsx`, `NowPlaying.tsx`, `src/ui/Shell.tsx`, `screens/Playback.tsx`, player styles.

### [ ] T11 — Add player gestures and genuine scrubbing

**Work:** Coordinate open/dismiss animation and continuous scrub gesture; maintain local preview time, clamp values and coalesce persistence.
**Acceptance:** Gesture reverses/cancels cleanly; seek follows finger without global rerenders; changing track mid-seek cannot apply an old completion to the new track.
**Verification:** Rapid drag/release/reverse, boundary taps, zero/unknown duration, track-change race, screen-reader increment/decrement and reduced motion.
**Dependencies:** T04, T10. **Scope:** M, 4–5 files.
**Files:** player transition component, `src/ui/Seek.tsx`, `src/data/MusicProvider.tsx`, focused seek test, player integration.

### [ ] T12 — Deliver a reusable action sheet

**Work:** Add a modal sheet foundation and migrate track actions with compact header and relevant options.
**Acceptance:** Swipe/Back/dismiss work; sheet scrolling does not steal player gestures; focus is contained and restored; actions execute once.
**Verification:** Open/dismiss repeatedly while playing, reduced motion, keyboard and screen-reader checks.
**Dependencies:** T04, T08, T10. **Scope:** M, 3–5 files.
**Files:** new `src/ui/sheets/ActionSheet.tsx`, track actions screen, modal route, shared feedback component.

### Checkpoint C — First reviewable build

- [ ] Home → collection → play → full player → scrub → collapse → switch tabs works on phones.
- [ ] Side-by-side Home/Player captures and transition recording reviewed; fixes confirmed once.
- [ ] Touch/transition trace compared with baseline; known gaps recorded, no premature claim of full redesign completion.

## M2 — Browse and organize with the same quality

### [ ] T13 — Establish virtualized music rows

**Work:** Extract list-friendly track and collection rows with stable identities, shared artwork, selected/blocked states and visible feedback. Remove enclosing vertical ScrollView on list-owned screens.
**Acceptance:** 1000-item lists mount only a bounded window; duplicate queue entries retain identity; large text can increase row height safely.
**Verification:** Fast scrolling and memory trace, unavailable items, duplicate IDs by entity versus entry, accessibility focus.
**Dependencies:** T05, T06, T07. **Scope:** M, 4–5 files.
**Files:** `src/ui/TrackRow.tsx`, new music list/collection row, `screens/common.tsx`, `Shell.tsx`.

### [ ] T14 — Redesign Search and query interaction

**Work:** Implement focused field/clear/cancel, catalog-backed browse, recent queries, results hierarchy and horizontal type filters. Keep input independent from results work.
**Acceptance:** Selected type has its own correct empty state; query/filter/scroll survive return; stale responses never replace current results.
**Verification:** Rapid typing/deletion, Cyrillic/Turkmen queries, empty/failed/cancelled results; later rerun against T23 server search.
**Dependencies:** T05, T07, T13. **Scope:** M, 3–5 files.
**Files:** `screens/Search.tsx`, search state/hook, recent-query storage, focused search tests.

### [ ] T15 — Redesign Library and sorting

**Work:** Introduce compact filters, sort sheet, collection rows, Liked Songs, create action and persisted list/grid preference.
**Acceptance:** Saved items update immediately; sort reflects real ordering and persists; empty filter differs from empty library.
**Verification:** Save on another screen then return; 500-item library, failed preference write, account switch.
**Dependencies:** T12, T13. **Scope:** M, 3–5 files.
**Files:** `screens/Library.tsx`, library state/selectors, sort sheet, preference type/adapter as needed.

### [ ] T16 — Redesign collection pages

**Work:** Apply artwork/title/action hierarchy to album and playlist, then artist in a separate slice; add sticky context and consistent virtualized rows.
**Acceptance:** Correct artwork shapes and order; large titles remain readable; missing entity/artwork and partial availability have usable states.
**Verification:** Album/playlist/artist samples, owned/read-only playlists, removed item, long titles, scroll-to-title transition.
**Dependencies:** T09, T13. **Scope:** M per collection kind, 3–5 files.
**Files:** `screens/Collection.tsx`, extracted collection header, track list, collection route.

### [ ] T17 — Improve queue editing

**Work:** Compact Current/Up Next sections, drag handles, remove with Undo, and accessible move controls; keep optimistic order separate from confirmed server revision.
**Acceptance:** Current track/position stays stable; duplicate songs move by entry ID; failed/conflicting edits reconcile visibly without data loss.
**Verification:** Reorder while playing, rapid edits, cancel drag, removal undo, rejected revision, screen-reader actions.
**Dependencies:** T11, T13. **Scope:** M, 4–5 files.
**Files:** extracted queue screen/row, queue gesture helper, controller integration, queue behavior tests.

### [ ] T18 — Improve playlist creation and picking

**Work:** Searchable add-to-playlist sheet, create-and-add path, focused edit form and unsaved-change protection.
**Acceptance:** One tap produces one mutation; failed save retains input; ownership and revision rules remain correct.
**Verification:** Empty picker, keyboard covering lower content, double submit, conflict, dismiss with edits, successful return to player.
**Dependencies:** T12, T15, T16. **Scope:** M per picker/form slice, 3–5 files.
**Files:** `screens/PlaylistForm.tsx`, new playlist picker, playlist actions adapter, focused flow tests.

### Checkpoint D

- [ ] Search → play → save → playlist → queue → return to player is coherent and preserves music.
- [ ] Every migrated screen supports loading, empty, error, pending and unavailable content.
- [ ] Existing behavior tests and affected browser flows pass; native drag/Back evidence is recorded separately.

## M3 — Measured speed and resilience

### [ ] T19 — Replace broad refreshes with targeted state updates

**Work:** Implement account-scoped normalized entities and targeted revalidation; optimistic save/follow with rollback; deduplicate overlapping requests and token refresh.
**Acceptance:** A save does not refetch the catalog; latest intent wins rapid toggles; sign-out purges private caches and pending effects cannot leak across accounts.
**Verification:** Request counts before/after, rejection rollback, two-account isolation, 401 renewal race.
**Dependencies:** T06, T14, T15. **Scope:** M per mutation/cache slice, 3–5 files.
**Files:** `src/data/http.ts`, data state/cache modules, relevant focused tests.

### [ ] T20 — Optimize artwork delivery and consistency

**Work:** Use the validated image component, size variants and stable caching; add bounded prefetch and asset-palette metadata; wire queue/artist fallbacks consistently.
**Acceptance:** Revisited covers do not flash blank; thumbnails avoid full-size decoding where variants exist; cache stays bounded and failure/recycling never shows the wrong cover.
**Verification:** Request/decode comparison, rapid list recycling, missing art, memory pressure and warm revisit.
**Dependencies:** T04, T13, T16. **Scope:** M per client/server slice, 3–5 files.
**Files:** `Artwork.tsx`, artwork API/import helpers, media metadata types, artwork tests.

### [ ] T21 — Remove avoidable audio playlist rebuilds

**Work:** Profile then separate repeat/transport/cursor updates from membership edits; apply supported minimal engine changes, preserving current entry and authorization.
**Acceptance:** Repeat and unrelated state changes do not clear sources; enqueue/reorder preserves current playback where supported; conflicts retain correct server revision semantics.
**Verification:** Audible continuity recording, engine command trace, shuffle/repeat/duplicates, lease expiry and failed queue write.
**Dependencies:** T02, T06, T17. **Scope:** M, 3–5 files.
**Files:** `MusicProvider.tsx`, `audioCommands.ts`, queue engine adapter, focused playback tests.

### [ ] T22 — Batch and paginate catalog reads

**Work:** Add cursor-based catalog/collection/library/history reads and batch playlist summaries; migrate one entity type per slice. Keep row-level access restrictions.
**Acceptance:** Referenced content beyond the first 100 is reachable; stable page boundaries have no duplicates/omissions; playlist query count does not grow linearly with playlist count.
**Verification:** 10k metadata/30-playlist fixtures, cursor invalidation tests, two-user isolation and before/after query timings/plans.
**Dependencies:** T02, T19. **Scope:** M per endpoint group, 3–5 files.
**Files:** API catalog/query handlers, shared types/client adapter, API pagination tests, schema/index migration only if measured.

### [ ] T23 — Implement real catalog search

**Work:** Query published accessible catalog data before pagination, normalize terms consistently, provide typed results and wire cancellable/debounced requests into Search.
**Acceptance:** A song outside the snapshot cap is found; category/type filtering precedes pagination; late responses are discarded and typing stays immediate.
**Verification:** 10k metadata queries in three languages, p95 timings, rapid query changes, empty pages and unavailable entities.
**Dependencies:** T14, T22. **Scope:** M per server/client slice, 3–5 files.
**Files:** search API query module, relevant migration if justified, `http.ts`, search hook, focused tests.

### [ ] T24 — Make connection and playback recovery usable

**Work:** Bounded read timeouts, explicit reconnect/buffering/error states, retained cached metadata, retry/skip controls and safe lifecycle persistence.
**Acceptance:** No indefinite blocking spinner; failed source has recovery; app return/restored connection does not lose the current queue or replay stale actions.
**Verification:** PC API off/on, dropped Wi-Fi, 1.5Mbps/150ms RTT, expired grant, headphones interruption and app background/foreground on supported native builds.
**Dependencies:** T19, T21, T23. **Scope:** M per network/audio slice, 3–5 files.
**Files:** request/controller recovery modules, state components, error scenario tests.

### Checkpoint E

- [ ] Performance experiments have matched before/after measurements and kept/reverted verdicts.
- [ ] Data scale, privacy, queue revision and audio continuity tests pass.
- [ ] Any target missed is documented with measured cause; no target silently weakened.

## M4 — Complete the surrounding product

### [ ] T25 — Finish account, settings and listening history

**Work:** Apply the system to auth/recovery, grouped settings, history/liked views and confirmation dialogs in separate small slices; remove prototype-heavy copy from listening surfaces.
**Acceptance:** Keyboard/focus and invalid fields are clear; destructive actions retain explicit confirmation; history order and saved counts are accurate.
**Verification:** Existing auth/delete/recovery tests, long content, failed preferences, keyboard-inset review.
**Dependencies:** T05, T13, T19. **Scope:** M per screen family, 3–5 files.
**Files:** `screens/Auth.tsx`, `Settings.tsx`, history/liked routes, shared field/dialog components.

### [ ] T26 — Add locale foundation and screen translations

**Work:** Device-language resolution with English fallback, persisted user override, dictionary keys and formatting; migrate each screen family incrementally to EN/RU/TK.
**Acceptance:** All visible and accessibility strings resolve; language switches preserve navigation/playback; long Russian and Turkmen text fits.
**Verification:** Three-language screen matrix, unsupported-language fallback, restart persistence, plural/date/time examples and native-language review notes.
**Dependencies:** T05; apply progressively through M2–M4. **Scope:** M per locale infrastructure/screen slice, 3–5 files.
**Files:** locale resolver/provider, language dictionaries, Settings selector, screen-family keys.

### [ ] T27 — Complete accessibility and layout adaptation

**Work:** Verify and repair screen-reader order, modal focus, large text, contrast, reduced motion, touch areas and gestures; adapt wide layouts without compromising phones.
**Acceptance:** Core listening flow is usable without drag gestures; no clipped primary action at large text; all decorative motion honors OS setting.
**Verification:** VoiceOver/TalkBack journeys; narrow/large/landscape phone sizes; web keyboard checks, all three languages, safe-area/IME checks.
**Dependencies:** T11, T12, T17, T25, T26. **Scope:** M per defect batch, ≤5 files; record evidence per screen.
**Files:** components/screens named by findings, `tasks/accessibility-report.md`, visual evidence.

### Checkpoint F

- [ ] Every existing screen and important state uses the new system.
- [ ] EN/RU/TK, larger text and reduced motion have explicit coverage.

## M5 — Device release candidate

### [ ] T28 — Run visual and functional regression review

**Work:** Compare the scoped screen set with T01, replay core flows and failure scenarios, resolve observed defects, and document the implemented design system.
**Acceptance:** No critical/major defects in scoped flows; reference differences are intentional or recorded; design rules describe the actual build.
**Verification:** Lint/typecheck/unit/API/relevant E2E tests; native screen captures and motion recordings; one bounded repair/confirmation pass.
**Dependencies:** Checkpoints C–F. **Scope:** M per defect batch, ≤5 files.
**Files:** affected source/tests, `DESIGN.md`, `tasks/review-report.md`.

### [ ] T29 — Re-measure performance and audio behavior

**Work:** Repeat T02 under identical conditions, complete the performance ledger and 30-minute session; identify any iOS checks unavailable in Expo Go.
**Acceptance:** Each budget has measured pass/fail/not-tested; no claimed improvement within noise; background/interruptions checked only on appropriate own-build platforms.
**Verification:** Release-device traces, request logs, audio continuity and memory evidence, compare baseline and candidate artifacts.
**Dependencies:** T28. **Scope:** S, 1–2 reports plus traces.
**Files:** `tasks/performance-results.md`, `tasks/evidence/candidate/`.

### [ ] T30 — Package and hand off the improved test build

**Work:** Build a fresh Android APK with the new native dependencies; verify install/launch; refresh iOS Expo Go entry and instructions; retain the prior artifact for rollback.
**Acceptance:** Downloadable APK is the improved build, with version/hash; iOS instructions use validated runtime; remaining device/public-release gates are explicit.
**Verification:** APK identity/hash, physical Android installation and main flow, iPhone launch/main flow, clear report of unverified own-build iOS behavior.
**Dependencies:** T28, T29. **Scope:** M, 3–5 configuration/handoff files plus build artifact.
**Files:** build metadata/config as needed, `replica/personal-testing.md`, sibling testing guide, artifact verification report.

### Final checkpoint

- [ ] All scoped tasks have evidence; visual and speed goals assessed separately.
- [ ] Improved APK and iPhone preview supplied; first test build remains recoverable.
- [ ] Deferred production, catalog, monetization and own-iOS-build work remains tracked without implying launch approval.

## Candidate handoff update — 2026-10-26

T30 packaging is now available: signed 0.2.0 APK with verified hash, emulator install/startup, working private HTTP download, validated SDK-58 iPhone manifest/bundle and retained 0.1.0 rollback. Physical Android and redesigned-iPhone main-flow acceptance remain open, so T30 is not marked fully accepted. See `implementation-status.md` for the current implemented scope and device limitations. The catalog additionally contains 30 popular recordings plus 12 engineering fixtures; `catalog-expansion.md` records the import and all-track checks.

## Cycle 2 — implementation backlog

Prepared 2026-10-26 against 0.2.0 (`5cf66f2`). Active plan: [improvement-plan-v2.md](improvement-plan-v2.md); catalog plan: [catalog-expansion-plan-v2.md](catalog-expansion-plan-v2.md). All tasks below are pending. The original T01–T30 checkboxes above retain their historical state; source implementation and completed evidence are summarized in `implementation-status.md`.

The order below satisfies dependencies. Phase letters refer to the main plan; catalog preparation is deliberately interleaved. The first 60 tasks (V01–V48 and C01–C12) define the planned personal music experience; E01–E06 track later ecosystem work and include specification/prototype gates rather than pretending to be single-session full products.

**Sizing rule:** each implementation slice is S (1–2 files) or M (3–5 files including focused tests); data-only batches change manifests/assets/reports. File lists are intended boundaries, with proposed modules marked new. If the actual change exceeds five source/test files or combines independent capabilities, split it into numbered child tasks before implementation and keep the parent open. Final audits produce bounded repair tasks; an audit passing is not inferred from the existence of its report.

**Common verification for source changes:** focused behavior tests, `npm run lint`, `npm run typecheck`, formatting, and relevant API/E2E/platform checks. New UI includes EN/RU/TK, large-text and reduced-motion acceptance in its own slice. Avoid re-running unrelated expensive suites without a reason. Performance tasks use matched baseline/result measurements. Catalog batches follow the complete acceptance and backup rules in the catalog plan.

**Checkpoint rule:** after each three tasks, verify the resulting slice remains usable; record measured/observed outcomes and unresolved constraints. Dependency/input gates are resolved when reached. Reviewable work continues under existing authorization; checkpoints do not impose blanket permission requests.

### [ ] V01 — Freeze references and reconcile feature status

**Phase:** A. **Dependencies:** None. **Scope:** M: 3–5 source/test files, or S for an evidence-only task.

**Work:** Capture matched Home, Search, Library, album, playlist, artist, player, queue and menu references; update stale feature claims using source and observed behavior.

**Acceptance:** Every surface has platform/version/state and observed/inferred/unknown status; existing functionality is not reclassified as missing from stale CSV notes.

**Verification:** Review paired screen inventory and current routes; run the parity script only after feature statuses are reconciled, and label unobserved native behavior.

**Likely files:** tasks/reference-map.md; replica/features.csv; tasks/v2-reference-audit.md.

### [ ] V02 — Establish release-device performance baselines

**Phase:** A. **Dependencies:** V01. **Scope:** M: 3–5 source/test files, or S for an evidence-only task.

**Work:** Instrument and measure the defined listening journey on Android release and iPhone preview/own-build lanes separately.

**Acceptance:** Startup, touch, search, audio start, frame and memory results include device/build/cache/network metadata; unavailable physical measurements remain pending.

**Verification:** Repeat the plan's sample counts; save raw traces and timings plus variance, without substituting emulator or web timing for phone results.

**Likely files:** scripts/measure-mobile.mjs (new); tasks/v2-performance-baseline.md; tasks/evidence/v2/ (artifacts).

### [ ] V03 — Prove advanced audio capability

**Phase:** A. **Dependencies:** V02. **Scope:** M: 3–5 source/test files, or S for an evidence-only task.

**Work:** Spike playlist insertion/removal, current-source preservation, preload, gapless transitions, crossfade feasibility and background controls using isolated test audio.

**Acceptance:** A capability matrix distinguishes iOS/Android/Expo Go/own build; each engine decision has a recorded native test or explicit unresolved prerequisite.

**Verification:** Record track boundaries and queue edits; check SDK-58 APIs and installed native implementation; do not replace the production engine during the spike.

**Likely files:** tasks/v2-audio-capabilities.md; scripts/audio-capability-fixture.mjs (new); disposable test harness.

#### Checkpoint 01 — after V01, V02, V03

- [ ] The three task-specific acceptance/verification records are complete or their exact external dependencies are still explicitly open.
- [ ] The core browse/play/save journey remains usable; relevant regressions pass.
- [ ] Any changed UI, performance or catalog data has the required evidence; no threshold, source status or pending native check was silently weakened.

### [x] C01 — Audit and preserve the existing catalog

**Phase:** E. **Dependencies:** V01. **Scope:** Data/report batch; bounded intake tooling as needed.

**Work:** Inventory the thirty recordings, twelve fixtures, IDs, source metadata, album completeness, art and private user references before changing intake.

**Acceptance:** Baseline counts/hashes and user references are captured; partial albums and uncertain editions/explicit states are identified without renaming IDs.

**Verification:** Compare provenance with API and a safely captured database inventory; verify the backup procedure while no second PGlite process is open.

**Likely files:** tasks/catalog-baseline-v2.md; private batch manifest; catalog inventory helper (new).

### [ ] C02 — Add canonical catalog and completeness fields

**Execution:** C02.1–2 implemented: tracked additive upgrades, backup-copy/live migration, release/artist/artwork contracts and access-isolation tests. Fixture feed policy, expanded credits and rendition capabilities remain open. See [execution record](v2-execution.md).

**Phase:** E. **Dependencies:** C01. **Scope:** M: 3–5 source/test files, or S for an evidence-only task.

**Work:** Introduce release types/completeness, recording credits/aliases, fixture classification and scope-aware rendition fields using additive migrations.

**Acceptance:** Existing saved/queue IDs resolve after migration; normal feeds can exclude fixtures without deleting them and partial releases are labeled accurately.

**Verification:** Migrate a backup copy of 0.2.0 data; test release editions, mixed credits, unknown explicit state and fixture visibility.

**Likely files:** new additive catalog migration; apps/api/src/catalog.mjs; apps/api/src/catalog-query.mjs; src/data/types.ts; migration/catalog tests.

### [x] C03 — Prepare a ranked source-backed wishlist

**Execution:** Ranked 181 stable candidates across ten complete metadata release manifests and thirteen three-track artist packages. The validated adapter separates metadata/artwork identification from missing audio/lyrics. Repeated cached dry runs preserve candidate IDs and output; no new audio is published. C02's remaining credits/rendition fields do not prevent this metadata preparation. See `catalog-intake-v2.md`.

**Phase:** E. **Dependencies:** C02. **Scope:** Data/report batch; bounded intake tooling as needed.

**Work:** Create the C1 artist/release wishlist and source adapters with a dry-run manifest that distinguishes audio, metadata, artwork and lyrics.

**Acceptance:** Each candidate has intended identity/version and source status; ambiguous or unavailable matches remain unpublished rather than substituted silently.

**Verification:** Review first candidate pack for exact editions and source provenance; repeat dry run to confirm stable candidate IDs.

**Likely files:** catalog wishlist/report; intake adapter module (new); private candidate manifests; adapter tests.

#### Checkpoint 02 — after C01, C02, C03

- [ ] The three task-specific acceptance/verification records are complete or their exact external dependencies are still explicitly open.
- [ ] The core browse/play/save journey remains usable; relevant regressions pass.
- [ ] Any changed UI, performance or catalog data has the required evidence; no threshold, source status or pending native check was silently weakened.

### [ ] V04 — Bound bootstrap and Home metadata

**Phase:** B. **Dependencies:** V01,C02. **Scope:** M: 3–5 source/test files, or S for an evidence-only task.

**Work:** Introduce versioned summary/page contracts so initial Home does not embed every saved playlist's track graph.

**Acceptance:** A useful first page is bounded independently of catalog size; saved and queued identities remain recoverable and account-isolated.

**Verification:** API regressions with 150 playlists, 500 saves and 1k-item collections; measure response bytes and query count against the 250KiB proposal.

**Likely files:** apps/api/src/catalog.mjs; apps/api/src/app.mjs; src/data/types.ts; src/data/http.ts; apps/api/test/catalog-hydration.test.mjs.

### [ ] V05 — Persist account-scoped metadata cache

**Execution:** V05.1 implements native session-scoped disk metadata with validation, quota, expiry and logout invalidation; seven cache tests and platform exports pass. Bounded V04 contracts and physical cached-start evidence remain open. See `v2-execution.md`.

**Phase:** B. **Dependencies:** V04. **Scope:** M: 3–5 source/test files, or S for an evidence-only task.

**Work:** Add a versioned disk bootstrap cache with quotas, expiry and explicit account-switch invalidation.

**Acceptance:** Restart can render a coherent cached feed; another account never sees private cached state and corrupt cache recovers cleanly.

**Verification:** Cache restore/corruption/expiry/account-switch tests; inspect stored data for absence of bearer tokens and grants.

**Likely files:** src/data/bootstrapCache.ts (new); src/data/bootstrapCache.test.ts (new); src/data/storage.ts; src/data/MusicProvider.tsx.

### [ ] V06 — Separate usable Home from queue restoration

**Execution:** V06.1 implemented and browser-tested: Home no longer waits for queue restoration; a newer selection wins. Persistent cache and physical timings remain pending.

**Phase:** B. **Dependencies:** V05. **Scope:** M: 3–5 source/test files, or S for an evidence-only task.

**Work:** Show cached useful content promptly and schedule refresh, detail hydration and queue restoration without a global blocking spinner.

**Acceptance:** Cached Home remains usable while restoration is slow; late restore cannot replace a new user-selected queue.

**Verification:** Cold/warm start tests with delayed/failing queue requests and immediate user playback; compare matched startup traces.

**Likely files:** src/data/MusicProvider.tsx; src/ui/Screens.tsx; src/data/bootstrap.test.ts (new); e2e startup cases.

#### Checkpoint 03 — after V04, V05, V06

- [ ] The three task-specific acceptance/verification records are complete or their exact external dependencies are still explicitly open.
- [ ] The core browse/play/save journey remains usable; relevant regressions pass.
- [ ] Any changed UI, performance or catalog data has the required evidence; no threshold, source status or pending native check was silently weakened.

### [ ] V07 — Trace playback latency stages

**Execution:** V07.1 tracing is implemented with three deterministic tests and normal/delayed browser evidence. Native status is an explicitly labelled proxy; physical audible-start and release-device overhead measurements remain pending.

**Phase:** B. **Dependencies:** V02. **Scope:** M: 3–5 source/test files, or S for an evidence-only task.

**Work:** Add bounded local timing markers for tap, queued command, server acknowledgement, grant, native install and audible-start observation.

**Acceptance:** Every slow start is attributable to a stage; diagnostics contain IDs/timings without credentials and do not flood release logs.

**Verification:** Inspect one normal and one delayed request trace; validate clock units and instrumentation overhead.

**Likely files:** src/data/playbackTiming.ts (new); src/data/MusicProvider.tsx; apps/api/src/app.mjs; tasks/v2-performance-experiments.md.

### [ ] V08 — Prioritize interactive commands

**Execution:** Implemented cursor-only revision-guarded API and coalesced independent client writer. Writer/API and delayed-response browser tests pass; see execution record.

**Phase:** B. **Dependencies:** V07. **Scope:** M: 3–5 source/test files, or S for an evidence-only task.

**Work:** Separate periodic position persistence from the interactive queue pipeline; coalesce redundant checkpoints and bound pending work.

**Acceptance:** Rapid taps do not wait behind obsolete checkpoint writes; final acknowledged state and position remain correct after retries.

**Verification:** Inject slow checkpoint responses while skipping/seeking; test latest-wins coalescing, ordering and account change.

**Likely files:** src/data/commandScheduler.ts (new); src/data/commandScheduler.test.ts (new); src/data/MusicProvider.tsx; src/data/http.ts.

### [ ] V09 — Make authorized transport responsive

**Phase:** B. **Dependencies:** V03,V08,V04. **Scope:** M: 3–5 source/test files, or S for an evidence-only task.

**Work:** Design and implement the acknowledged/pre-authorized queue window needed for prompt local transport and later server reconciliation.

**Acceptance:** No new source plays without valid access; pause/seek and eligible transitions respond promptly while stale revisions recover without duplicate entries.

**Verification:** Delayed network and expired-grant tests plus native sound timing; reject the change if speed comes from bypassing access or losing queue correctness.

**Likely files:** src/data/MusicProvider.tsx; src/data/http.ts; apps/api/src/app.mjs; src/data/types.ts; focused queue/lease regression tests.

#### Checkpoint 04 — after V07, V08, V09

- [ ] The three task-specific acceptance/verification records are complete or their exact external dependencies are still explicitly open.
- [ ] The core browse/play/save journey remains usable; relevant regressions pass.
- [ ] Any changed UI, performance or catalog data has the required evidence; no threshold, source status or pending native check was silently weakened.

### [ ] V10 — Preserve active audio during queue changes

**Phase:** B. **Dependencies:** V03,V09. **Scope:** M: 3–5 source/test files, or S for an evidence-only task.

**Work:** Apply the proven native source-edit strategy, bounded upcoming sources and explicit recovery state machine.

**Acceptance:** Unrelated edits preserve current ID/position/play state; gapless-capable fixtures and real-track transitions are measured rather than assumed.

**Verification:** Native recording of enqueue, reorder, remove, repeat, lease renewal and failure recovery on both platforms; sourcePatch regressions.

**Likely files:** src/data/sourcePatch.ts; src/data/sourceUpdate.ts; src/data/MusicProvider.tsx; src/data/sourcePatch.test.ts; tasks/v2-audio-results.md.

### [ ] V11 — Paginate collection and library detail

**Phase:** B. **Dependencies:** V04. **Scope:** M: 3–5 source/test files, or S for an evidence-only task.

**Work:** Add bounded detail/library/history/release page contracts with summary counts and stable cursors; migrate consumers in a first vertical collection slice.

**Acceptance:** No source is silently truncated at the discovery cap; opening a long collection does not hydrate all its tracks before first paint.

**Verification:** 1k-item page traversal, cursor invalidation, saved-reference and two-account access tests; first-page byte/latency check.

**Likely files:** apps/api/src/catalog-query.mjs; apps/api/src/app.mjs; src/data/types.ts; src/data/http.ts; API pagination tests.

### [ ] V12 — Improve search plans and ranked retrieval

**Phase:** B. **Dependencies:** V04. **Scope:** M: 3–5 source/test files, or S for an evidence-only task.

**Work:** Measure the existing substring query and implement justified indexed canonical/alias matching with stable pagination.

**Acceptance:** Exact artist/title matches rank predictably across EN/RU/TK; no index or search service is added without a before/after query plan and latency result.

**Verification:** 10k/100k metadata fixtures, absent terms, aliases and identical titles; compare query plans and p95 with unchanged visibility rules.

**Likely files:** apps/api/src/catalog-query.mjs; new additive search migration; apps/api/test/search.test.mjs; scripts/measure-search.mjs.

#### Checkpoint 05 — after V10, V11, V12

- [ ] The three task-specific acceptance/verification records are complete or their exact external dependencies are still explicitly open.
- [ ] The core browse/play/save journey remains usable; relevant regressions pass.
- [ ] Any changed UI, performance or catalog data has the required evidence; no threshold, source status or pending native check was silently weakened.

### [ ] V13 — Reduce measured render and list work

**Phase:** B. **Dependencies:** V02,V06,V11. **Scope:** M: 3–5 source/test files, or S for an evidence-only task.

**Work:** Profile providers and active screens; normalize hot lookups and isolate subscriptions or list windows where the trace justifies it.

**Acceptance:** Progress and unrelated saves do not rerender entire shelves; virtualized rows retain correct state, dynamic height and accessibility.

**Verification:** React/native traces before and after one change at a time; long-list navigation and account-switch regression.

**Likely files:** src/data/MusicProvider.tsx; src/data/catalogCache.ts; src/ui/MusicList.tsx; src/ui/screens/common.tsx; performance evidence.

### [ ] V14 — Unify shuffle and repeat semantics

**Phase:** B. **Dependencies:** V09. **Scope:** M: 3–5 source/test files, or S for an evidence-only task.

**Work:** Replace biased collection sorting with the shared shuffle engine; preserve canonical order, duplicate entry identity and current song.

**Acceptance:** Collection and player shuffle controls agree; turning shuffle off restores the remaining canonical context without restarting the current track.

**Verification:** Deterministic seeded permutation/invariant tests; repeat-one/all/off and rapid mode-change native checks.

**Likely files:** src/data/queue.ts; src/data/queue.test.ts; src/data/MusicProvider.tsx; src/ui/screens/Collection.tsx.

### [ ] V15 — Refine shared visual primitives

**Phase:** C. **Dependencies:** V01. **Scope:** M: 3–5 source/test files, or S for an evidence-only task.

**Work:** Tune type roles, icon weight, compact rows, spacing and pressed/selected/loading states against the frozen references.

**Acceptance:** Normal rows feel consistent across screens; 48-unit targets, contrast and 130/160% text layouts remain usable.

**Verification:** Component state board in EN/RU/TK and paired captures; no global token change accepted from one screenshot alone.

**Likely files:** src/design/tokens.json; src/design/Primitives.tsx; src/ui/TrackRow.tsx; src/ui/screens/common.tsx; DESIGN.md.

#### Checkpoint 06 — after V13, V14, V15

- [ ] The three task-specific acceptance/verification records are complete or their exact external dependencies are still explicitly open.
- [ ] The core browse/play/save journey remains usable; relevant regressions pass.
- [ ] Any changed UI, performance or catalog data has the required evidence; no threshold, source status or pending native check was silently weakened.

### [ ] C04 — Build audio validation and rendition staging

**Phase:** E. **Dependencies:** C03. **Scope:** M: 3–5 source/test files, or S for an evidence-only task.

**Work:** Turn the personal preparation prototype into bounded resumable staging with full decode, checksum, duration/version checks and truthful rendition metadata.

**Acceptance:** Corrupt, partial, preview and mislabeled files cannot publish; replay reuses validated staged assets without duplicate downloads.

**Verification:** Fixtures for HTML response, truncated MP4/MP3, wrong duration/version, network interruption and failed decode; inspect rendition output.

**Likely files:** audio intake module (new); media inspection module (new); staged manifest schema; intake tests.

### [ ] C05 — Prepare artwork and artist enrichment

**Phase:** E. **Dependencies:** C02,C03. **Scope:** M: 3–5 source/test files, or S for an evidence-only task.

**Work:** Build correct release/portrait mappings, art variants, palettes and source-attributed biographies/credits for the accepted artist packages.

**Acceptance:** Artist portrait and release-cover identities stay separate; variants decode, palettes pass contrast and missing information stays honest.

**Verification:** Mixed aspect ratios, cover replacement, duplicate image hashes, no-portrait and low-resolution fixtures.

**Likely files:** artwork intake module (new); artwork-variants.mjs; metadata manifest schema; enrichment tests.

### [ ] V16 — Use real artwork palettes and image identities

**Execution:** V16.1: cover-derived contrast-checked colors and content-versioned image URLs implemented; 30 covers measured. Visual/native acceptance remains open.

**Phase:** C. **Dependencies:** C05,V15. **Scope:** M: 3–5 source/test files, or S for an evidence-only task.

**Work:** Wire persisted cover palettes and stable asset versions into rows, headers, mini-player and full player.

**Acceptance:** Covered content uses its own palette; missing/changed art falls back without flash and text contrast is preserved.

**Verification:** Variant/cache-hit checks, cover replacement and no-art cases; inspect image memory under repeated navigation.

**Likely files:** src/data/types.ts; apps/api/src/catalog-query.mjs; src/design/Artwork.tsx; src/data/artworkSource.ts; artwork tests.

#### Checkpoint 07 — after C04, C05, V16

- [ ] The three task-specific acceptance/verification records are complete or their exact external dependencies are still explicitly open.
- [ ] The core browse/play/save journey remains usable; relevant regressions pass.
- [ ] Any changed UI, performance or catalog data has the required evidence; no threshold, source status or pending native check was silently weakened.

### [ ] V17 — Finish the Home experience

**Execution:** V17.1: virtualized horizontal shelves; scale/fixture-library browser tests pass at both widths. Independent Home feed pagination/context ranking remains pending.

**Phase:** C. **Dependencies:** V04,V13,V16. **Scope:** M: 3–5 source/test files, or S for an evidence-only task.

**Work:** Build bounded virtualized shelves, useful shortcuts and category/release destinations with independent loading.

**Acceptance:** No duplicate shortcut IDs or normal-feed engineering fixtures; warm tab return preserves position and shelf failure leaves other music usable.

**Verification:** First-listener and returning-listener flows; slow one shelf, expand beyond 100 tracks and compare matched Home frames.

**Likely files:** src/ui/screens/Home.tsx; src/ui/screens/common.tsx; src/data/homeFeed.ts (new); apps/api/src/app.mjs; Home E2E cases.

### [ ] V18 — Build a dedicated album page

**Execution:** V18.1: dedicated adaptive album header, numbered/disc rows, partial-release labels and retained play control implemented. Phone web album/save/navigation/axe tests pass; credits and native review remain open.

**Phase:** C. **Dependencies:** V11,V16. **Scope:** M: 3–5 source/test files, or S for an evidence-only task.

**Work:** Add release-specific header, sticky title/play actions, disc/track numbering, credits and explicit completeness state.

**Acceptance:** Order matches the chosen edition; partial albums show available/total and Play does not silently claim a complete release.

**Verification:** Complete/partial/multi-disc/withdrawn/long-title fixtures; play a track and return to the same row.

**Likely files:** src/ui/screens/Collection.tsx; src/ui/screens/Album.tsx (new); src/ui/MusicList.tsx; src/data/types.ts; album E2E cases.

### [ ] V19 — Finish Now Playing layout and context

**Phase:** C. **Dependencies:** V10,V16,V18. **Scope:** M: 3–5 source/test files, or S for an evidence-only task.

**Work:** Add actual playback-source context, responsive controls, smooth seek/progress display and meaningful lower panels.

**Acceptance:** Context returns to the initiating playlist/album/search; seek preview never fights stale status and controls stay reachable on short/large-text screens.

**Verification:** Start from four context types; rapid seek/skip and source removal tests; native player recordings.

**Likely files:** src/ui/player/NowPlaying.tsx; src/ui/Seek.tsx; src/data/types.ts; src/data/MusicProvider.tsx; player tests.

#### Checkpoint 08 — after V17, V18, V19

- [ ] The three task-specific acceptance/verification records are complete or their exact external dependencies are still explicitly open.
- [ ] The core browse/play/save journey remains usable; relevant regressions pass.
- [ ] Any changed UI, performance or catalog data has the required evidence; no threshold, source status or pending native check was silently weakened.

### [ ] V20 — Coordinate mini-player and player motion

**Phase:** C. **Dependencies:** V15,V19. **Scope:** M: 3–5 source/test files, or S for an evidence-only task.

**Work:** Implement a reliable expansion/collapse transition and refine mini-player progress, art and touch geometry.

**Acceptance:** Interrupted gestures settle correctly; tab/seek/scroll gestures are not stolen and reduced motion keeps the same actions.

**Verification:** Repeated open/cancel/dismiss/rotate and reduced-motion recordings; verify no engine remount or cover flash.

**Likely files:** src/ui/player/MiniPlayer.tsx; src/ui/player/NowPlaying.tsx; src/design/Motion.tsx; relevant route layout; motion evidence.

### [ ] V21 — Complete contextual action sheets

**Execution:** V21.1: working menus for album/artist/playlist play, shuffle, save/follow, queue-all and owner edit. Album menu/queue identity browser test passes; credits/share and platform acceptance remain open.

**Phase:** C. **Dependencies:** V14,V15,V20. **Scope:** M: 3–5 source/test files, or S for an evidence-only task.

**Work:** Replace placeholder collection overflow behavior with typed menus; add save/next/last/artist/album/credits and working local share where supported.

**Acceptance:** Each visible action is contextual and functional; sheets return focus and retain source-screen context, and pending writes affect only their row.

**Verification:** Track/artist/album/owned/read-only playlist menus; Back/backdrop/keyboard/rapid actions and invalid deep link checks.

**Likely files:** src/ui/screens/Playback.tsx; src/ui/screens/Collection.tsx; src/ui/sheets/Sheet.tsx; src/data/actions.ts (new); menu tests.

### [ ] V22 — Build rich artist pages

**Phase:** C. **Dependencies:** C05,V11,V15. **Scope:** M: 3–5 source/test files, or S for an evidence-only task.

**Work:** Create portrait hero, follow/play, ordered popular selection, typed discography and factual about/credit sections.

**Acceptance:** Artist pages extend beyond initial catalog limits; missing portraits/bios use honest fallbacks and no fabricated statistics.

**Verification:** Artist with several editions, no art, mixed credits and long Cyrillic/Turkmen name; native scroll/header review.

**Likely files:** src/ui/screens/Artist.tsx (new); src/ui/screens/Collection.tsx; src/data/types.ts; apps/api/src/catalog-query.mjs; artist tests.

#### Checkpoint 09 — after V20, V21, V22

- [ ] The three task-specific acceptance/verification records are complete or their exact external dependencies are still explicitly open.
- [ ] The core browse/play/save journey remains usable; relevant regressions pass.
- [ ] Any changed UI, performance or catalog data has the required evidence; no threshold, source status or pending native check was silently weakened.

### [ ] V23 — Correct Library ordering and persistence

**Phase:** C. **Dependencies:** V11,V15. **Scope:** M: 3–5 source/test files, or S for an evidence-only task.

**Work:** Expose timestamped library entries and implement true recently-added/last-played/title/creator order with coherent list/grid state.

**Acceptance:** Mixed entity kinds sort by real dates; layout/filter preferences restore with the correct scope and saves update visible ordering immediately.

**Verification:** Save album/artist/playlist in interleaved order, restart and switch account; inspect both list/grid layouts.

**Likely files:** src/ui/screens/Library.tsx; src/data/types.ts; apps/api/src/catalog.mjs; src/data/libraryState.ts; library tests.

### [ ] V24 — Add Library search and pins

**Phase:** C. **Dependencies:** V23. **Scope:** M: 3–5 source/test files, or S for an evidence-only task.

**Work:** Implement account-scoped collection search and persistent pinned order with accessible pin/unpin controls.

**Acceptance:** Pinned items remain stable across sorting/restart; search finds the entire library rather than only the current page.

**Verification:** 150-collection library, duplicate titles, removing a pinned item and account isolation tests.

**Likely files:** src/ui/screens/Library.tsx; new library-pin migration; apps/api/src/app.mjs; src/data/http.ts; pin/search tests.

### [ ] V25 — Finish mixed search presentation

**Phase:** C. **Dependencies:** V12,V15. **Scope:** M: 3–5 source/test files, or S for an evidence-only task.

**Work:** Add a useful top result, bounded sections and dedicated type results; refine focus, clear, recent history and keyboard behavior.

**Acceptance:** A relevant artist/album is not buried beneath every track; stale pages cannot replace a newer query and history persists only for its account.

**Verification:** Exact/empty/slow/absent/multilingual searches; selecting from each type and returning preserves query/filter/position.

**Likely files:** src/ui/screens/Search.tsx; src/data/useCatalogSearch.ts; src/ui/screens/common.tsx; search UI tests.

#### Checkpoint 10 — after V23, V24, V25

- [ ] The three task-specific acceptance/verification records are complete or their exact external dependencies are still explicitly open.
- [ ] The core browse/play/save journey remains usable; relevant regressions pass.
- [ ] Any changed UI, performance or catalog data has the required evidence; no threshold, source status or pending native check was silently weakened.

### [ ] V26 — Make genre and alias discovery complete

**Phase:** C. **Dependencies:** C02,V12,V25. **Scope:** M: 3–5 source/test files, or S for an evidence-only task.

**Work:** Add real paginated category pages and canonical aliases/transliteration ranking; keep editorial freshness labels distinct.

**Acceptance:** Categories include matching items outside bootstrap; ambiguous aliases do not merge different artists and explicit/hidden availability is respected.

**Verification:** 10k metadata with out-of-page genres, diacritics, Cyrillic/Latin aliases and withdrawn tracks.

**Likely files:** apps/api/src/catalog-query.mjs; src/ui/screens/Search.tsx; src/ui/screens/Category.tsx (new); src/data/types.ts; category/search tests.

### [ ] V27 — Finish playlist detail and internal search

**Phase:** C. **Dependencies:** V11,V15. **Scope:** M: 3–5 source/test files, or S for an evidence-only task.

**Work:** Add cover/mosaic, owner/context, sticky transport, internal search and view sorting with preserved source order.

**Acceptance:** View sorting never rewrites stored playlist order; playback context follows the declared filtered/sorted selection and duplicate entries remain distinct.

**Verification:** Large playlist, duplicate tracks, filtered play, read-only access and return-position tests.

**Likely files:** src/ui/screens/Playlist.tsx (new); src/ui/screens/Collection.tsx; src/ui/MusicList.tsx; src/data/types.ts; playlist detail tests.

### [ ] V28 — Upgrade playlist editing

**Phase:** C. **Dependencies:** V27. **Scope:** M: 3–5 source/test files, or S for an evidence-only task.

**Work:** Add cover selection, multi-select operations, drag edge-scroll and explicit stale-revision reconciliation.

**Acceptance:** Edit saves once or cancels without loss; another writer's changes cannot be silently overwritten and upload failures retain the prior cover.

**Verification:** Duplicate entries, large lists, concurrent edits, failed save, discard and cover replacement; focused API ownership tests.

**Likely files:** src/ui/screens/PlaylistForm.tsx; src/data/http.ts; apps/api/src/app.mjs; playlist mutation module (new); edit tests.

#### Checkpoint 11 — after V26, V27, V28

- [ ] The three task-specific acceptance/verification records are complete or their exact external dependencies are still explicitly open.
- [ ] The core browse/play/save journey remains usable; relevant regressions pass.
- [ ] Any changed UI, performance or catalog data has the required evidence; no threshold, source status or pending native check was silently weakened.

### [ ] V29 — Finish add-to-playlist workflow

**Phase:** C. **Dependencies:** V27,V28,V21. **Scope:** M: 3–5 source/test files, or S for an evidence-only task.

**Work:** Virtualize the picker, show artwork/membership and support create-and-add without leaving listening context unnecessarily.

**Acceptance:** A successful add keeps the source screen and confirms the destination; duplicate policy is explicit and retries do not add unintended copies.

**Verification:** Add existing/new/duplicate, cancel and delayed response cases with ongoing playback.

**Likely files:** src/ui/screens/Playback.tsx; src/ui/screens/PlaylistForm.tsx; src/data/actions.ts; picker tests.

### [ ] V30 — Finish queue gestures and grouping

**Phase:** C. **Dependencies:** V10,V14,V15. **Scope:** M: 3–5 source/test files, or S for an evidence-only task.

**Work:** Separate current/manual/context/history rows; add reliable edge-scroll drag, swipe remove and scoped clear/undo.

**Acceptance:** Current audio survives moves/removals elsewhere; undo restores the exact entry and group while conflicts produce a coherent state.

**Verification:** Long dynamic-height queue, duplicate song entries, drag cancel, reduced motion, failed save and undo after a concurrent edit.

**Likely files:** src/ui/screens/Playback.tsx; src/data/queueDropTarget.ts; src/data/queue.ts; queue tests; native gesture evidence.

### [ ] V31 — Upgrade Liked Songs

**Phase:** C. **Dependencies:** V23,V24,V27. **Scope:** M: 3–5 source/test files, or S for an evidence-only task.

**Work:** Add internal search/sort, count/duration, clear play context and select-to-playlist with unsave undo.

**Acceptance:** Unsave does not accidentally change album/artist follows; filtered/sorted playback and restoration remain predictable.

**Verification:** Empty/500-liked/long-text/withdrawn tracks and undo/retry cases.

**Likely files:** liked route; src/ui/MusicList.tsx; src/data/libraryState.ts; liked-song tests.

#### Checkpoint 12 — after V29, V30, V31

- [ ] The three task-specific acceptance/verification records are complete or their exact external dependencies are still explicitly open.
- [ ] The core browse/play/save journey remains usable; relevant regressions pass.
- [ ] Any changed UI, performance or catalog data has the required evidence; no threshold, source status or pending native check was silently weakened.

### [ ] V32 — Polish account and Settings foundations

**Phase:** C. **Dependencies:** V15,V23. **Scope:** M: 3–5 source/test files, or S for an evidence-only task.

**Work:** Finish auth validation, keyboard/autofill, editable profile and grouped settings; establish per-account versus device preference scope.

**Acceptance:** No first-run form or account error traps the user; settings shown as active have real persistence and account-switch cleanup.

**Verification:** Invalid/expired/offline auth, interrupted profile save, first-run language and sign-out/delete cache isolation.

**Likely files:** src/ui/screens/Auth.tsx; src/ui/screens/Settings.tsx; src/data/http.ts; account/profile handler; account E2E cases.

### [ ] C06 — Publish and roll back validated batches

**Phase:** E. **Dependencies:** C04,C05,V11. **Scope:** M: 3–5 source/test files, or S for an evidence-only task.

**Work:** Implement dry run, transactional publish, deterministic deduplication, resume and manifest rollback through the existing DB owner connection or stopped-server maintenance.

**Acceptance:** A replay creates no duplicates; failures leave old catalog and user data intact and no two processes open personal PGlite.

**Verification:** Fault injection before/after asset copy and during DB commit; replay, user-reference inventory and rollback on a backup copy.

**Likely files:** catalog batch module (new); personal intake entry point (new); batch manifest schema; batch integration tests.

### [ ] C07 — Reach the first useful catalog gate

**Phase:** E. **Dependencies:** C06. **Scope:** Data/report batch; bounded intake tooling as needed.

**Work:** Publish accepted content toward 150 tracks, 25 artists and ten complete releases, deepening core existing artists first.

**Acceptance:** Every count includes validated available content only; every partial album is declared and all existing user references survive.

**Verification:** Run batch acceptance from catalog plan; API search/hash/ranges plus sampled native start/seek/transition checks and preservation inventory.

**Likely files:** private C1 manifests/media; tasks/catalog-c1-report.md; catalog verification helper.

#### Checkpoint 13 — after V32, C06, C07

- [ ] The three task-specific acceptance/verification records are complete or their exact external dependencies are still explicitly open.
- [ ] The core browse/play/save journey remains usable; relevant regressions pass.
- [ ] Any changed UI, performance or catalog data has the required evidence; no threshold, source status or pending native check was silently weakened.

### [ ] C08 — Publish coherent editorial collections

**Phase:** E. **Dependencies:** C07,V17. **Scope:** Data/report batch; bounded intake tooling as needed.

**Work:** Create eight useful editorial playlists with covers, descriptions, ordering and overlap review; wire sections into Home/categories.

**Acceptance:** Playlists have real distinct intent and working contents; new-to-Musify and release-date labels are accurate.

**Verification:** Open/play each collection, inspect first/last tracks and covers, compare overlap and check Home duplication/ordering.

**Likely files:** editorial manifests; tasks/catalog-c1-report.md; editorial ingestion/validation helper.

#### Scoped 0.3 candidate — after C08

- [ ] Package the responsive core and completed screen work with the C1 catalog using the V45–V48 verification procedure scoped to this candidate.
- [ ] Record physical-device results or their explicit pending status; keep the full-cycle V45–V48 parents open.
- [ ] Collect owner feedback on Home → collection → player → save/queue before moving deeper into optional daily-use features.

### [ ] V33 — Add a reliable sleep timer

**Phase:** D. **Dependencies:** V10,V19. **Scope:** M: 3–5 source/test files, or S for an evidence-only task.

**Work:** Implement selected duration and end-of-track timer using a persistent deadline and supported native background behavior.

**Acceptance:** The timer pauses once at the intended boundary, cancels clearly and does not resume audio after expiry.

**Verification:** Accelerated deadline tests plus real background/lock-screen tests; distinguish Expo Go preview from own-build behavior.

**Likely files:** src/data/sleepTimer.ts (new); src/data/sleepTimer.test.ts (new); src/ui/player/NowPlaying.tsx; playback integration.

### [ ] V34 — Record useful listening history

**Phase:** D. **Dependencies:** V11,V32. **Scope:** M: 3–5 source/test files, or S for an evidence-only task.

**Work:** Introduce qualified listening events and date-grouped paginated history with replay protection and clear-history control.

**Acceptance:** Failed starts/retries do not become duplicate listens; genuine repeated plays retain timestamps and clearing history updates recommendations appropriately.

**Verification:** Interrupted start, repeat, reconnect replay, pagination boundaries and account isolation tests.

**Likely files:** new listening-events migration; API history module; src/data/MusicProvider.tsx; history screen/route; history tests.

#### Checkpoint 14 — after C08, V33, V34

- [ ] The three task-specific acceptance/verification records are complete or their exact external dependencies are still explicitly open.
- [ ] The core browse/play/save journey remains usable; relevant regressions pass.
- [ ] Any changed UI, performance or catalog data has the required evidence; no threshold, source status or pending native check was silently weakened.

### [ ] V35 — Add song/artist radio and autoplay

**Phase:** D. **Dependencies:** C08,V10,V34. **Scope:** M: 3–5 source/test files, or S for an evidence-only task.

**Work:** Build deterministic available-catalog radio and a separate autoplay preference with bounded next-track selection.

**Acceptance:** Queues diversify artists, avoid immediate repeats and honor explicit/hidden choices; empty candidate sets stop or offer a clear fallback.

**Verification:** Small and 500-track fixtures; exhausted queue, skip loops, unavailable candidates and autoplay-off behavior.

**Likely files:** apps/api/src/recommendations.mjs (new); src/data/MusicProvider.tsx; src/ui/screens/Playback.tsx; src/ui/screens/Settings.tsx; recommendation tests.

### [ ] V36 — Add recommendation feedback and personal mixes

**Phase:** D. **Dependencies:** V17,V34,V35. **Scope:** M: 3–5 source/test files, or S for an evidence-only task.

**Work:** Use follows/saves/listening signals and hide/less-like-this feedback for explainable personal shelves and optional recommendation shuffle.

**Acceptance:** Inserted recommendations are identified and removable; ordinary shuffle is independent and cold-start output is labeled editorial.

**Verification:** Deterministic ranking fixtures, diversity/repeat tests and feedback persistence; review actual personal usefulness before claiming personalization quality.

**Likely files:** recommendation module; src/ui/screens/Home.tsx; src/ui/screens/Playback.tsx; preference/feedback contract; ranking tests.

### [ ] V37 — Define offline manifests and access lifecycle

**Phase:** D. **Dependencies:** V03,C02,V04. **Scope:** M: 3–5 source/test files, or S for an evidence-only task.

**Work:** Implement download-capable rendition manifests with checksums, account scope, expiry/withdrawal policy and versioned status.

**Acceptance:** A cached metadata row cannot authorize a download; manifest changes reconcile without marking an incomplete file playable.

**Verification:** Unauthorized/expired/withdrawn/account-switch tests and a clear own-build platform capability record.

**Likely files:** new download-manifest module; apps/api/src/app.mjs; src/data/types.ts; src/data/http.ts; download contract tests.

#### Checkpoint 15 — after V35, V36, V37

- [ ] The three task-specific acceptance/verification records are complete or their exact external dependencies are still explicitly open.
- [ ] The core browse/play/save journey remains usable; relevant regressions pass.
- [ ] Any changed UI, performance or catalog data has the required evidence; no threshold, source status or pending native check was silently weakened.

### [ ] V38 — Implement the bounded download manager

**Phase:** D. **Dependencies:** V37. **Scope:** M: 3–5 source/test files, or S for an evidence-only task.

**Work:** Add resumable staged transfers, checksum verification, atomic completion, quotas and recovery after process termination.

**Acceptance:** Completed means fully verified; retries/resume cannot corrupt files and active/pinned audio survives disposable-cache eviction.

**Verification:** Interrupt at multiple byte offsets, fill storage, corrupt a chunk, restart and cancel; native file/transfer tests.

**Likely files:** src/data/downloads.ts (new); src/data/downloadStorage.ts (new); src/data/downloads.test.ts (new); download provider/integration.

### [ ] V39 — Deliver offline playback and download UI

**Phase:** D. **Dependencies:** V38,V10,V27. **Scope:** M: 3–5 source/test files, or S for an evidence-only task.

**Work:** Wire download states into collections/library and route playback to validated local files; provide pause/resume/remove management.

**Acceptance:** Completed music plays in airplane mode; absent files are visibly unavailable and local playback preserves queue/seek behavior.

**Verification:** Own-build airplane-mode album/playlist journey, low storage, file removal, account switch and restart.

**Likely files:** src/ui/screens/Downloads.tsx (new); src/ui/screens/Library.tsx; collection actions; src/data/MusicProvider.tsx; offline journey tests.

### [ ] C10 — Prepare verified lyrics and discovery metadata

**Phase:** E. **Dependencies:** C05,C07. **Scope:** Data/report batch; bounded intake tooling as needed.

**Work:** Acquire and match source-backed plain/timed lyrics where available and improve genre/mood/credit fields for the accepted recordings.

**Acceptance:** Recording edition/language mappings are explicit; missing or conflicting lyrics remain unavailable and editorial tags have a defined meaning.

**Verification:** Known-version match/mismatch fixtures, timed-line validation and native-language spot review where available.

**Likely files:** private enrichment manifests; lyrics/metadata validation helper; tasks/catalog-enrichment-report.md.

#### Checkpoint 16 — after V38, V39, C10

- [ ] The three task-specific acceptance/verification records are complete or their exact external dependencies are still explicitly open.
- [ ] The core browse/play/save journey remains usable; relevant regressions pass.
- [ ] Any changed UI, performance or catalog data has the required evidence; no threshold, source status or pending native check was silently weakened.

### [ ] V40 — Add matched plain lyrics

**Phase:** D. **Dependencies:** C10,V19. **Scope:** M: 3–5 source/test files, or S for an evidence-only task.

**Work:** Implement a source-backed recording/edition/language lyrics contract and lower-player/full-screen presentation.

**Acceptance:** Wrong-version lyrics are rejected or unavailable; no-content and untimed states are clear and scrolling does not break dismissal.

**Verification:** Known matched, mismatched, absent and multilingual fixtures with navigation/accessibility checks.

**Likely files:** lyrics API module (new); src/data/types.ts; src/data/http.ts; lyrics screen/panel (new); lyrics tests.

### [ ] V41 — Add timed lyrics interaction

**Phase:** D. **Dependencies:** V40. **Scope:** M: 3–5 source/test files, or S for an evidence-only task.

**Work:** Support active-line following, user scroll override, return-to-current and seek-by-line for verified timing data.

**Acceptance:** Seek/track change repositions correctly; long lyrics do not create a global per-frame rerender and reduced motion is usable.

**Verification:** Timing-boundary, manual-scroll, seek/skip and large-text tests; native frame trace with lyrics open.

**Likely files:** lyrics screen/panel; src/data/lyricTiming.ts (new); src/data/lyricTiming.test.ts (new); Now Playing integration.

### [ ] V42 — Deliver proven track transitions

**Phase:** D. **Dependencies:** V03,V10. **Scope:** M: 3–5 source/test files, or S for an evidence-only task.

**Work:** Implement measured gapless refinements and, only where the engine spike proves it, adjustable crossfade with correct overlapping-source lifecycle.

**Acceptance:** Transitions preserve queue/repeat/seek behavior; unsupported crossfade remains an explicit capability gap rather than a decorative setting.

**Verification:** Recorded boundaries on local and streamed fixtures; rapid skip during overlap, interruptions and background transitions.

**Likely files:** audio transition adapter (new); src/data/MusicProvider.tsx; src/ui/screens/Settings.tsx; transition tests; native results.

#### Checkpoint 17 — after V40, V41, V42

- [ ] The three task-specific acceptance/verification records are complete or their exact external dependencies are still explicitly open.
- [ ] The core browse/play/save journey remains usable; relevant regressions pass.
- [ ] Any changed UI, performance or catalog data has the required evidence; no threshold, source status or pending native check was silently weakened.

### [ ] V43 — Implement truthful playback quality controls

**Phase:** D. **Dependencies:** C04,V03,V37. **Scope:** M: 3–5 source/test files, or S for an evidence-only task.

**Work:** Expose real available renditions and data-saving choices; evaluate normalization only with usable loudness metadata and native support.

**Acceptance:** Quality selection changes delivered bytes without relabeling the same file; normalization has measured behavior or remains a tracked gap.

**Verification:** Compare selected rendition MIME/bytes/bitrate, switching/retry behavior and loudness samples where implemented.

**Likely files:** rendition resolver; src/data/http.ts; src/data/types.ts; src/ui/screens/Settings.tsx; quality tests.

### [ ] V44 — Finish storage and data settings

**Phase:** D. **Dependencies:** V32,V38,V39,V43. **Scope:** M: 3–5 source/test files, or S for an evidence-only task.

**Work:** Show actual streaming-cache/download usage, clear-cache scope, Wi-Fi/mobile-data preferences and useful connection diagnostics.

**Acceptance:** Displayed usage matches stored files; clear-cache preserves user-pinned downloads and active playback, and preference changes affect transfers.

**Verification:** Storage inventory comparison, low-disk and clear-cache tests during playback; localized confirmation and failure states.

**Likely files:** src/ui/screens/Settings.tsx; src/data/downloadStorage.ts; src/data/downloads.ts; storage/settings tests.

### [ ] C09 — Expand to a substantial personal library

**Phase:** E. **Dependencies:** C07,C08,V12,V35. **Scope:** Data/report batch; bounded intake tooling as needed.

**Work:** Add accepted batches toward 500 tracks, 60 artists and thirty complete releases; grow to fifteen editorial collections.

**Acceptance:** Core artists have useful depth and catalog diversity increases; search/feed/audio budgets still pass after publication.

**Verification:** Repeat intake/rollback checks and 10k/100k metadata scale tests; review radio repeat/diversity behavior with the expanded real catalog.

**Likely files:** private C2 manifests/media; tasks/catalog-c2-report.md; coverage/scale evidence.

#### Checkpoint 18 — after V43, V44, C09

- [ ] The three task-specific acceptance/verification records are complete or their exact external dependencies are still explicitly open.
- [ ] The core browse/play/save journey remains usable; relevant regressions pass.
- [ ] Any changed UI, performance or catalog data has the required evidence; no threshold, source status or pending native check was silently weakened.

#### Scoped 0.4 candidate — after C09

- [ ] Package the accepted daily-use additions and C2 catalog with the same bounded release checks.
- [ ] List any capability still awaiting engine/content/device prerequisites; retain the last stable APK and data backup.
- [ ] Expand to C3 only after quality, usefulness and performance gates remain satisfied.

### [ ] C11 — Reach discovery-scale coverage

**Phase:** E. **Dependencies:** C09,V11,V12. **Scope:** Data/report batch; bounded intake tooling as needed.

**Work:** Publish accepted batches toward 1,500 tracks, 120 artists, eighty complete releases and twenty-five playlists only after C2 quality gates pass.

**Acceptance:** The catalog remains browsable beyond bootstrap limits; coverage growth does not introduce empty artists, duplicate recordings or budget failures.

**Verification:** Batch acceptance, full page traversal, storage accounting, 100k synthetic metadata test and device journeys on the actual larger catalog.

**Likely files:** private C3 manifests/media; tasks/catalog-c3-report.md; coverage/storage/scale evidence.

### [ ] C12 — Establish ongoing catalog maintenance

**Phase:** E. **Dependencies:** C06,C11. **Scope:** M: 3–5 source/test files, or S for an evidence-only task.

**Work:** Add a dated freshness/withdrawal/duplicate report, source-health checks and safe orphan retention/cleanup workflow.

**Acceptance:** Withdrawn content stops new playback/downloads consistently; reports distinguish pending/rejected/published and preserve rollback mappings.

**Verification:** Withdraw a staged test recording, verify caches/search/queue state, restore via manifest and audit an orphan-cleanup dry run.

**Likely files:** catalog maintenance helper (new); availability handler; catalog operations tests; tasks/catalog-operations.md.

### [ ] V45 — Audit all locales and accessibility

**Phase:** F. **Dependencies:** V20,V30,V32,V39,V41,V44. **Scope:** M: 3–5 source/test files, or S for an evidence-only task.

**Work:** Run the full EN/RU/TK, large-text, reduced-motion, VoiceOver/TalkBack and keyboard/focus matrix; file bounded repair tasks per defect.

**Acceptance:** Every changed screen has explicit results; no critical or major accessibility/localization defect is silently waived.

**Verification:** Real screen-reader journeys and 130/160% text checks; native-speaker review recorded where available; rerun only affected flows after repairs.

**Likely files:** tasks/v2-accessibility-report.md; src/i18n/messages.ts; bounded 1–3 affected UI files per repair.

#### Checkpoint 19 — after C11, C12, V45

- [ ] The three task-specific acceptance/verification records are complete or their exact external dependencies are still explicitly open.
- [ ] The core browse/play/save journey remains usable; relevant regressions pass.
- [ ] Any changed UI, performance or catalog data has the required evidence; no threshold, source status or pending native check was silently weakened.

### [ ] V46 — Run full functional and visual regression

**Phase:** F. **Dependencies:** V45,C11. **Scope:** M: 3–5 source/test files, or S for an evidence-only task.

**Work:** Reconcile the feature matrix and run normal/failure/scale/migration journeys, paired screen captures and motion review.

**Acceptance:** No critical/major defect remains in the chosen release scope; visual, functional and catalog coverage are reported independently.

**Verification:** npm test, relevant npm run test:e2e, lint/typecheck/format/export; upgrade a backup copy of 0.2.0 data and inject service failures.

**Likely files:** replica/features.csv; regression tests; tasks/v2-review-report.md; tasks/evidence/v2/ (artifacts).

### [ ] V47 — Prove phone performance and audio endurance

**Phase:** F. **Dependencies:** V46,V02. **Scope:** M: 3–5 source/test files, or S for an evidence-only task.

**Work:** Repeat the exact baseline journey, budgets and 30-minute audio session on physical reference devices.

**Acceptance:** Targets have measured pass/fail with matched conditions; no noisy/unmeasured speedup or Expo Go release-performance claim is accepted.

**Verification:** Repeat sampling, interruptions/headphones/background and memory-pressure tests; unresolved failures become scoped repair tasks and are remeasured.

**Likely files:** tasks/v2-performance-results.md; tasks/v2-audio-results.md; tasks/v2-performance-experiments.md; native traces.

### [ ] V48 — Package the accepted candidate

**Phase:** F. **Dependencies:** V46,V47. **Scope:** M: 3–5 source/test files, or S for an evidence-only task.

**Work:** Create a signed versioned Android test APK and appropriate iPhone preview/own-build handoff; preserve previous artifacts and data rollback.

**Acceptance:** Artifact hash/package/version match tested source; user instructions and remaining capability gaps are current and upgrade preserves data.

**Verification:** Signature/archive/install/main-flow checks on reference devices; validate links and server readiness, plus iPhone bundle/runtime.

**Likely files:** app.json; eas.json; replica/personal-testing.md; sibling testing guide; versioned artifact evidence.

#### Checkpoint 20 — after V46, V47, V48

- [ ] The three task-specific acceptance/verification records are complete or their exact external dependencies are still explicitly open.
- [ ] The core browse/play/save journey remains usable; relevant regressions pass.
- [ ] Any changed UI, performance or catalog data has the required evidence; no threshold, source status or pending native check was silently weakened.

### [ ] E01 — Plan and implement sharing beyond the LAN

**Phase:** G. **Dependencies:** V48. **Scope:** S/M: bounded specification/prototype; decompose before full implementation.

**Work:** Define hosted app links and content previews, authenticated opening and public/private visibility before enabling remote sharing.

**Acceptance:** Shared URLs contain stable content IDs rather than media leases; private items remain private and unsupported/deleted links recover safely.

**Verification:** Installed/uninstalled/logged-out/private/deleted content link matrix; verify domain association on real devices after hosting is chosen.

**Likely files:** sharing ADR; link router; public preview route; sharing contract/tests; domain configuration.

### [ ] E02 — Specify collaborative playlist editing

**Phase:** G. **Dependencies:** E01,V28. **Scope:** S/M: bounded specification/prototype; decompose before full implementation.

**Work:** Define owner/editor/viewer roles, invitation lifecycle and revision/conflict behavior; implement the smallest two-account edit slice.

**Acceptance:** Invites can be revoked; edits cannot escape role scope and concurrent changes are visible rather than silently overwritten.

**Verification:** Two-account invite/edit/revoke/conflict tests and audit of persisted playlist ownership.

**Likely files:** collaboration spec; additive membership migration; invitation API; collaboration UI slice; permission tests.

### [ ] E03 — Specify Musify device handoff

**Phase:** G. **Dependencies:** E01,V09. **Scope:** S/M: bounded specification/prototype; decompose before full implementation.

**Work:** Design presence, active-device ownership, acknowledged transfer and reconnect behavior before a small two-device prototype.

**Acceptance:** Only the intended active session plays after transfer; stale devices cannot hijack the queue and position handoff is measured.

**Verification:** Disconnect/reconnect during transfer, two simultaneous transfers, expired session and offline device tests.

**Likely files:** device-session ADR; presence/transfer contract; prototype transport adapter; two-device test harness.

#### Checkpoint 21 — after E01, E02, E03

- [ ] The three task-specific acceptance/verification records are complete or their exact external dependencies are still explicitly open.
- [ ] The core browse/play/save journey remains usable; relevant regressions pass.
- [ ] Any changed UI, performance or catalog data has the required evidence; no threshold, source status or pending native check was silently weakened.

### [ ] E04 — Specify shared listening sessions

**Phase:** G. **Dependencies:** E02,E03. **Scope:** S/M: bounded specification/prototype; decompose before full implementation.

**Work:** Define host/guest queue permissions, authoritative timeline, drift limits and failure behavior for a shared-listening prototype.

**Acceptance:** Participants receive clear join/leave/host-change states; synchronization is measured and queue permissions are enforced.

**Verification:** Two-device delay/jitter/disconnect/rejoin scenarios; report drift and recovery rather than claiming synchronized playback from matching UI.

**Likely files:** shared-listening spec; realtime prototype; session permission tests; timing evidence.

### [ ] E05 — Evaluate recap and advanced discovery products

**Phase:** G. **Dependencies:** V34,V36. **Scope:** S/M: bounded specification/prototype; decompose before full implementation.

**Work:** Write separate bounded specs for a listening recap and an optional conversational/DJ experiment using real history and measured recommendation usefulness.

**Acceptance:** Recap counts are reproducible and private; an AI experiment has a cost/evaluation/data contract before integration.

**Verification:** Replay known listening fixtures for statistics; evaluate discovery relevance, exclusions, empty context and failure/cost behavior.

**Likely files:** recap spec; discovery experiment spec; evaluation fixtures/report.

### [ ] E06 — Map remaining platform and media gaps

**Phase:** G. **Dependencies:** V48,V03. **Scope:** S/M: bounded specification/prototype; decompose before full implementation.

**Work:** Create separate future specs for equalizer/output routing, local files, animated art/video, podcasts/audiobooks, car/watch/TV clients and commercial billing/ads.

**Acceptance:** Each capability has a real platform/content prerequisite and an explicit scope decision; no unsupported settings or fake destinations are added to the current app.

**Verification:** Official platform/API checks and a dependency/effort review per capability; implementation begins only as a separately bounded vertical slice.

**Likely files:** ecosystem roadmap; per-capability ADR/spec files; compatibility notes.

#### Checkpoint 22 — after E04, E05, E06

- [ ] The three task-specific acceptance/verification records are complete or their exact external dependencies are still explicitly open.
- [ ] The core browse/play/save journey remains usable; relevant regressions pass.
- [ ] Any changed UI, performance or catalog data has the required evidence; no threshold, source status or pending native check was silently weakened.
