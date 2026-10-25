# Musify improvement tasks

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
