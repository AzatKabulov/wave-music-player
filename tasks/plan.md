# Musify: mobile design, motion, and performance improvement plan

Date: 2026-10-25. Status: proposed implementation plan; no redesign implemented in this planning pass.

## 1. Outcome and confirmed direction

Make Musify feel like a finished music app: recognizable Spotify-style mobile layouts, confident artwork and contrast, controls that respond immediately, coherent navigation, and continuous playback during browsing and library changes.

The owner explicitly chose **match Spotify's layouts as closely as possible** and **fast, subtle everyday motion with richer player and sheet transitions**. Keep Musify as the working name. Prioritize phones; preserve web usability as a secondary surface. Preserve existing accounts, library, playlists, queues, and media.

This is a coordinated redesign of the listening experience, not a promise that adding animation alone will fix speed. Visual hierarchy, interaction behavior, state architecture, data loading, and audio continuity each have their own acceptance criteria.

Task tracking is in [todo.md](todo.md). This plan does not replace the unfinished production backlog in `replica/tasks/todo.md`. Launch, billing, advertising, catalog acquisition, downloads, lyrics, social features, and recommendation algorithms remain separate work. Controls for unavailable capabilities must not be shown as functioning features.

## 2. What the audit establishes

Evidence: current source at commit `3050ab1`; package manifest; existing recon and test records; historical 390px browser captures of Home, Player, and Library. Those captures predate the latest palette/artwork and are useful for structure only. A live preview connection was unsuccessful during planning; no fresh native screen capture, frame trace, startup timing, or hardware playback result was obtained. The user did confirm earlier that Expo Go opens.

| Before: source-backed observation | After: planned change | Why / evidence |
| --- | --- | --- |
| Navy background `#101623`, slate surfaces, warm cream text and amber `#F5BD72` accent | Neutral near-black surfaces, crisp text, stronger action color, artwork-derived atmosphere | Current `src/design/tokens.json`; the user finds the palette dull. Exact replacement colors are a proposal. |
| Home spends a large area on slogan and a minimum 280-unit promotional panel | Compact profile/filter row, quick-access tiles, then music shelves | `src/ui/screens/Home.tsx` and `common.tsx`; the phone viewport should expose playable content earlier. |
| Every bottom destination calls `router.push`; a catch-all route chooses screen components | Real tab navigation with preserved tab state, hierarchy routes, and modal routes | `src/ui/Shell.tsx:28`, `src/ui/Screens.tsx`, `src/app/[...route].tsx`; avoid accumulating tab visits as detail history. |
| Player is rendered inside the ordinary shell, including bottom navigation | Immersive full-screen player connected to the mini-player | `src/ui/screens/Playback.tsx`; separate browsing from focused playback. |
| App-defined motion tokens exist, but no animation implementation consumes them | Shared native motion primitives and consistent transitions | Search across `src` found motion only in tokens; existing native-stack defaults may still animate, so this is not a claim of literally zero OS transitions. |
| Button feedback is an immediate opacity change; many card/tab pressables have no custom feedback | Immediate tonal/scale feedback, visible selected states, restrained haptics | `src/design/Primitives.tsx`, `Home.tsx`, `Shell.tsx`. |
| Native seek control handles taps but not dragging | Continuous scrubbing with thumb, time preview, and accessible adjustments | `src/ui/Seek.tsx:28`; web's separate slider is not evidence of native drag support. |
| Queue and overflow are full pages; queue editing uses arrow buttons in large cards | Compact queue rows and modal action sheets; drag reorder plus accessible move controls | `src/ui/screens/Playback.tsx`. |
| One context carries catalog, account, queue, notices, actions, and 500ms audio status | Separate stable data/actions from current track and progress subscriptions | `MusicProvider.tsx:64,447,450`; consumers are notified by the changing context. Actual render cost still needs profiling. |
| Mutations refresh the entire snapshot; playing a track records a recent event then refreshes | Targeted updates, optimistic saves, deduplicated revalidation | `MusicProvider.tsx:89,239`; measure request cost and preserve error recovery. |
| Queue commands call an install routine that pauses, clears, and re-adds all sources | Update only what changed where the SDK supports it | `MusicProvider.tsx:113–156`; confirmed rebuild path, possible audible interruption not yet measured. |
| A root ScrollView contains `.map()` lists; search filters the whole snapshot during render | Screen-owned virtualized lists and separately scheduled search results | `Shell.tsx:152`, `common.tsx:82`, `Search.tsx`; scalability risk, not a measured present-day frame-rate result. |
| Catalog queries cap entities at 100; playlist items are queried once per playlist | Cursor-based catalog/search and batched playlist summaries | `apps/api/src/catalog.mjs`, `app.mjs`; connecting the existing search endpoint alone would retain its bounded-catalog limitation. |
| Artwork has a fallback, but queue/artist paths still omit available image URLs or lack portrait data | Consistent image component, variants, caching and honest fallbacks on every surface | `Artwork.tsx`, `Playback.tsx`, `Home.tsx`; avoid assuming every artist has a portrait. |
| Most labels and accessibility strings are hard-coded English | Shared locale keys and layout verification for English, Russian, and Turkmen | Existing product requirement; include error, state, and accessibility text. |

## 3. Visual direction and reference discipline

Use a music-first Spotify mobile structure. Before implementing, freeze a small dated reference set for Home, Search, Library, album/playlist, Now Playing, queue, and overflow. Record platform, screen size, and source. Public documentation confirms behaviors, not precise current spacing; Spotify varies by platform/account/version. Any unavailable gesture/reference is marked inferred instead of called pixel-exact.

Retain Musify's name and own assets. Use references to match layout, density, hierarchy, and interaction placement. Do not transplant Spotify's logo or proprietary typeface. Existing media remains the test content, with no new sourcing work in this phase.

### Proposed color and typography system

These are starting values for the first Home/Player visual review, not already approved final tokens:

| Role | Starting proposal | Use |
| --- | --- | --- |
| Canvas | `#0B0B0D` | Quiet neutral background rather than blue-grey everywhere |
| Surface / raised surface | `#18181C` / `#25252B` | Cards, sheets, and state separation |
| Primary / secondary text | `#FAFAFC` / `#B5B5BF` | Clear title and metadata hierarchy |
| Action accent / foreground | `#41E2B1` / `#071A13` | Proposed vivid mint for primary play/save states; final hue reviewed on-device |
| Dividers | `#33333A` | Subtle grouping; do not use as the sole required control boundary |
| Album atmosphere | Precomputed darkened artwork palette | Player and collection background; keep text on tested contrast surfaces |

Choose accent use deliberately: primary actions and selected states, not every heading. Album artwork supplies most of the color. Missing artwork gets a restrained, consistent placeholder, not the same decorative record image everywhere. No expensive live blur is required to achieve depth.

Use system fonts initially, with strong 24–32-unit headings, 16-unit main labels, 13–14-unit metadata, and 11–12-unit compact navigation/time labels. These are base sizes that scale with accessibility settings. Keep a consistent 4/8-unit rhythm, approximately 16-unit phone gutters, 56–64-unit compact track rows, and 48-unit minimum shared touch targets. Small visual icons may sit within larger touch areas. Define semantic roles and platform adaptations rather than scattering raw values through screens.

Normal text must reach 4.5:1 contrast; large text and meaningful control boundaries/states 3:1. Check dynamic album backgrounds and all pressed/disabled/focus variants. Selected state also needs shape/icon/text cues. Dark appearance is the first redesign target; a complete light theme is deferred, not implied by this plan.

## 4. Screen-by-screen specification

| Surface | Target layout and behavior | Required states |
| --- | --- | --- |
| Entry / sign-in / recovery | Clean Musify identity, compact forms, obvious primary action, keyboard-aware fields, show/hide password, demo entry where enabled | Busy, invalid field, incorrect credentials, expired recovery, network failure, completion |
| Home | Profile + compact filter row; 2-column recent/favourite shortcuts; artwork-led shelves with readable titles and consistent card sizes; recent listening above generic discovery | First listener, populated, partial shelf failure, empty catalog, cached content, refresh |
| Search entry | Prominent search field, recent queries with individual removal, colorful catalog-backed category tiles | No history, keyboard open, category empty, offline/cached |
| Search results | Top result when meaningful; song rows and artist/album/playlist sections; horizontally scrolling type chips; clear-query control | Loading, no result for selected type, stale request discarded, retry, unavailable track |
| Library | Compact title/actions, single-row filters, sort menu, list-first collection rows, optional grid, prominent Liked Songs entry | Empty library, empty filter, pending save, failed save rollback, persisted sort/view |
| Album | Large square artwork, title/artist/release info, compact save/options row and prominent circular Play; ordered tracks and sticky title on scroll | Missing art, partial availability, saved, loading, removed release |
| Playlist | Artwork or cover mosaic, title/owner/description, play/shuffle/actions, compact tracks; owner edit actions | Empty, owned/read-only, long title, pending mutation, stale revision conflict |
| Artist | Portrait where available, name/follow action, popular tracks and releases; honest metadata | No portrait, no releases, followed, unavailable |
| Mini-player | Persistent rounded bar above tabs, artwork, title/artist, immediate play/pause and thin progress; tap opens player | Playing, paused, buffering, failed item, no selection; no layout jump on updates |
| Full player | Dismiss control and source context at top, large cover, metadata/save, draggable progress, prominent circular transport, queue/options below | Buffering, seek-in-progress, paused, unavailable/retry, long metadata, reduced motion |
| Queue | Current item separated from Up Next; dense rows with drag handles, remove/undo, clear contextual scope | Duplicate songs as distinct entries, drag cancel, failed reorder rollback, empty, conflict |
| Track actions / add-to-playlist | Bottom sheet with track summary and relevant actions; picker can search playlists and create one | Disabled/unavailable actions explained, save pending, empty picker, keyboard, dismissal |
| Playlist create/edit | Focused form with compact inputs, clear Save/Cancel, unsaved-change protection; reordering in a dedicated mode | Validation, saving, duplicate requests, failed update, cancel, delete confirmation |
| Liked / history | Shared virtualized track rows and correct recent order; search/filter when useful | Empty, removed items, new save, restoration after navigation |
| Settings | Grouped account, playback, language, appearance/motion and support sections; concise descriptions | Preference saving/failure, language override, sign-out, deletion confirmation |
| Global feedback | Stable skeleton shapes; inline retry for failed sections; small accessible feedback with Undo where implemented | First load, partial error, disconnected, reconnecting, mutation success/failure |

Remove repeated slogan/eyebrow blocks from task screens. Replace speculative recommendations with truthful labels such as Recently played or Featured. Only render category filters backed by the catalog; adding popular music must not leave the app organized solely around its instrumental fixtures.

The player should fit the main artwork/transport within a normal phone viewport where possible. At large text sizes or short landscape heights, allow useful scrolling rather than shrinking controls or clipping them. Queue, actions and library must use the same artwork and saved-state conventions.

## 5. Motion and touch specification

Use one shared motion vocabulary. Touch feedback starts on press-down; the command does not wait for its animation to finish. Animations must be interruptible, reversible, and safe under rapid repeated input. These are proposed timing ranges, tuned once on devices.

| Interaction | Motion | Starting range | Reduced motion / fallback |
| --- | --- | --- | --- |
| Button / artwork press | Small scale to about 0.97 plus tonal change, gentle release | 80–120ms press; 120–160ms release | Tonal change without scale |
| Tab change | Immediate destination selection, optional short content fade | 100–160ms maximum | Instant; no lateral slide between unrelated tabs |
| Hierarchical navigation | Native stack transition and normal Back behavior | Platform default | Follow OS setting |
| Mini-player → player | Single coordinated vertical expansion with artwork continuity where stable | About 240–300ms / controlled spring | Short crossfade, same destination |
| Player dismiss | Follow finger; release based on distance and velocity; interrupted gesture settles predictably | Interactive; about 180–260ms settle | Accessible dismiss button; restrained transition |
| Bottom sheet | Backdrop fade + slide, proper drag handle and scroll handoff | About 220–280ms opening, shorter dismissal | Crossfade or platform reduced motion |
| Save / follow | Immediate selected icon; small confirmation motion; optional light haptic | 120–180ms | Icon/text change; failure visibly reverses |
| Track change | Art and metadata crossfade; keep transport positions fixed | 120–180ms | Instant or very short fade |
| Scrubbing | Thumb follows finger; preview time independent of server response | Frame-driven, no delay | Fully usable adjustable control |
| Queue reorder | Dragged row follows finger; neighboring rows settle | Short controlled spring | Move up/down accessibility actions |
| Loading | Skeleton matching final geometry; gentle pulse only while pending/visible | Slow, low-amplitude | Static skeleton |
| Toast / Undo | Small fade/translation above player; no content reflow | 160–220ms | Fade/instant, screen-reader announcement |

Avoid perpetual decorative motion, entrance cascades on every scroll, vibrating every tap, animating all layout dimensions, or moving controls during buffering. A playing indicator may animate only when visible, playing, and allowed by motion settings. Do not use animation to disguise an unbounded loading operation.

Implementation candidates: Expo SDK-compatible Reanimated with worklets, Gesture Handler, and Expo Haptics; native stack for ordinary navigation. Expo's SDK 58 documentation lists Reanimated and Gesture Handler for Expo Go. Verify exact installed compatibility and each package's runtime needs before adoption. Use `npx expo install`; do not upgrade the entire framework to add polish. A richer sheet library is an optional compatibility spike, not a predetermined dependency.

Use a coordinated player overlay if stable shared-element support is unavailable. Do not make experimental transitions a prerequisite for reliable playback. Android system Back, iOS edge-swipe Back, keyboard dismissal, screen-reader focus return, and gesture conflicts are part of the design.

## 6. Engineering work that makes the design feel fast

### Navigation and state

Replace the catch-all screen dispatcher incrementally with explicit Expo Router routes: Home/Search/Library tabs; album/artist/playlist hierarchy; full player and actions/pickers as modals. Preserve existing URLs and authentication/recovery deep links. Give each screen ownership of its scrolling; Shell must not wrap a FlatList in another vertical ScrollView. Keep one audio engine above navigation so screens never recreate it.

Split session/catalog/library state, queue state/actions, current-track state, and high-frequency progress. Prefer focused contexts/selectors or a small external store only if the profile justifies it. Stabilize command references. A progress tick must not rerender Home shelves, Library rows, or unrelated screens. Interpolate visible progress locally between engine updates; do not increase global state frequency to make the slider look smooth.

### Loading, mutations, and search

Render cached session/catalog information promptly, then revalidate. Cache metadata by account/locale/catalog version, with bounded storage and explicit invalidation. Clear private data on sign-out/account switch. Preserve availability and media authorization checks; cached UI does not authorize playback.

Apply saved-state and playlist mutations locally with a pending marker, request deduplication, and rollback/reconciliation. Refresh the changed collection rather than every entity. Preserve server revisions and idempotency behavior. Coalesce foreground refreshes and token renewal; prevent stale responses overwriting newer state. Add timeouts and cancellable reads, with restrained retries for retryable failures. Never blindly retry non-idempotent writes.

Keep typing immediate. Separate query input from results work; debounce remote requests roughly 180–250ms, cancel stale requests, and preserve filters/scroll when revisiting Search. The current local filter is acceptable for the tiny test catalog; full-catalog search requires a real query/pagination path, not merely wiring the currently capped endpoint.

### Lists, artwork, and rendering

Use FlatList/SectionList as the initial native list implementation, stable IDs, bounded page sizes, and appropriately sized windows. Queue rows use queue-entry IDs, since duplicate songs are valid. Home uses a vertical feed with bounded horizontal shelves. Fixed-height optimizations apply only where text/accessibility actually guarantees the height. Consider FlashList only if a representative trace shows it is needed.

Adopt `expo-image` if compatibility checks pass, with explicit image dimensions, stable cache keys, recycling identities, placeholders, and bounded prefetch. Produce small row thumbnails, medium cards, and larger player covers according to physical pixel requirements; do not repeatedly decode the full cover for a 48-unit row. Store/cache palette metadata once per artwork asset. Avoid per-frame extraction, live blur, and unbounded image preloading. Supply image URLs consistently to Queue and other missing paths.

### Audio continuity

First record the current engine behavior for repeat/shuffle/enqueue/reorder. Separate transport-only changes from source membership edits. Set repeat mode without clearing sources; update future entries incrementally only where the current SDK permits it. Preserve current entry ID, play state, position, queue ordering, and conflict recovery. If an operation cannot be applied safely, design a deliberate fallback and document its cost rather than masking a pause.

Keep local play/pause/seek responsive. Starting a new authorized stream may still require the queue/grant round trip; measure that path and prepare the next valid source only within existing authorization rules. This is bounded buffering, not offline downloading. On poor connections, retain stable controls, distinguish buffering from paused/error, offer retry/skip, and avoid infinite automatic retry loops. Test interruption, headphones, background return, expired grants, and unavailable tracks separately from motion.

### API and packaging

Batch playlist-summary reads to remove the per-playlist query loop. Add genuine cursor pagination for catalog, collections, library, history, and search as each screen migrates. Query by stable ordering and filter before pagination; hydrate referenced entities beyond the first 100. Preserve row-level access rules and revision checks. Use query plans and timings before adding indexes. Profile payload size and server time separately from device/network time.

Keep the local personal-test architecture during this redesign. CDN hosting, geographic deployment and production streaming infrastructure can be evaluated later using real regional measurements. Review release bundle/assets and Android size by contribution; the existing universal APK is about 108 MB and is not a target to shrink blindly. Do not trade away working codecs or device support without evidence and an explicit scope decision.

## 7. Proposed performance acceptance budgets

These are targets to validate, **not measured results or guarantees**. Establish the baseline first. Name device model/OS, screen refresh rate, build commit/profile, battery/thermal state, dataset, cache state, and network conditions for every run. The user's exact phone models remain to be recorded during baseline testing.

| Metric | Initial target | Measurement |
| --- | --- | --- |
| Press acknowledgement | p95 ≤100ms | Touch to first visible state change, 30 repetitions per primary control |
| Warm tab change | p95 ≤200ms to usable cached content | 30 transitions after warm-up; no loading gate for unchanged content |
| Cold usable Home | Median ≤2.5s, p95 ≤4s on reference Android release build | 20 cold launches, same local API/network; first install/cache hydration logged separately |
| Scrolling / player gestures | At 60Hz, ≤1% frames miss budget in the defined trace; no repeatable >100ms UI stall | Five 30-second scripted scroll/gesture runs; inspect JS and UI threads separately |
| Cached artwork | No blank flash when revisiting an already cached collection | Navigate away/back 20 times under memory pressure test |
| Audio start on LAN | p95 ≤1.5s tap to first audible sample | 30 starts, cache state explicit; preserve honest buffering feedback |
| Audio start on constrained network | p95 ≤3s under 1.5Mbps down / 150ms RTT, if source bitrate permits | Same sample set; report network and authorization wait separately |
| Local search typing | p95 ≤100ms input response | Representative 10k metadata fixture, with results processing isolated |
| Remote search | p95 ≤500ms request-to-visible results on LAN, excluding debounce | 30 queries including accented, Cyrillic, and Turkmen text |
| Read API latency | p95 ≤200ms on named local host at reference dataset | Separate DB/server measurement from image/audio transfer |
| Memory stability | No monotonic retained growth; after warm-up, repeated cycles return within 15% of stable baseline | 30-minute listening/navigation session; record native image/audio memory and JS heap |
| Audio continuity | No app-caused pause/reset for save, tab switch, sheet, or repeat-mode change | Listen/record while exercising each action repeatedly |

60Hz has approximately 16.7ms per frame; on high-refresh phones record the real budget and aim for the device refresh rate. Do not claim 120fps from a 60fps trace. If the initial target cannot be met, record the measured bottleneck and adjust scope transparently, rather than weakening a test silently.

Use Android release/profileable builds for performance evidence. Expo Go is useful for iPhone layout and gesture feedback, but is not a production-performance or background-playback sign-off. An own iOS build remains necessary later. Browser screenshots and Lighthouse scores cannot certify native smoothness.

Maintain an experiment ledger: hypothesis, baseline, change, matched result, variance, verdict. Keep optimizations only when they improve the intended metric beyond measurement noise without correctness regressions. Visual and accessibility corrections have their own acceptance criteria and do not need an artificial speed gain.

## 8. Delivery order and review checkpoints

| Milestone | Work | Demonstrable result |
| --- | --- | --- |
| M0 — reference and baseline | Freeze layout references, record current phone behavior, create reusable stress data, establish measurement scripts | Agreed screen targets and honest before numbers |
| M1 — first complete listening experience | Tokens, responsive primitives, state isolation, real tabs, new Home, mini-player and full player; basic sheet behavior | Home → collection → Play → expand player → seek → collapse → change tab, with music continuing |
| M2 — core browsing and organization | Search, Library, collection pages, actions/picker, queue interaction, playlist forms | Find a track → save → add to playlist → reorder queue → return to listening |
| M3 — speed and resilience | Targeted loading, images, pagination/search, queue/engine continuity, failure recovery | Stable performance with large data and poor network, with trace evidence |
| M4 — complete product polish | Auth/settings/history, TK/RU/EN, accessibility, remaining states, responsive secondary layouts | All existing flows share the same visual and interaction system |
| M5 — device release candidate | Regression flows, visual comparison, performance rerun, native audio checks, new APK and iOS preview | Reviewable improved build plus a report of passed and still-unverified checks |

Performance work begins in M0/M1; M3 is where measured bottlenecks and data scale are completed. Each milestone is split into small tasks in `todo.md`. Keep each source commit focused and the app runnable. Establish the Home/player quality bar before spreading the new design across every screen.

At M1, compare Home and Player against the frozen references on the same viewport/content. Review spacing, density, artwork, typography, control placement, and transition video. Address the observed issues in one batch, then confirm. At later milestones use the same bounded review pattern. No feature count or automated parity percentage alone establishes design quality.

## 9. Test coverage and definition of done

Use datasets for empty state, current 15-track catalog, 1000-track playlists, 10k searchable track metadata, 500 saved items, and 30 playlists. Large fixtures may reuse approved test audio; they do not require collecting thousands of recordings. Include duplicate titles/queue entries, very long titles, emoji, missing covers, removed tracks, explicit filtering, slow responses and stale revisions.

Run each principal flow at narrow phone widths and large text. Check landscape/short heights, keyboard insets, notches and bottom gestures. At least one real Android phone and iPhone are required for gesture/touch acceptance. Verify VoiceOver/TalkBack labels, focus order, modal focus restoration, adjustable scrubber, reorder alternatives, contrast and reduced motion. Review Turkmen diacritics and Russian line expansion without truncating primary actions.

Behavior tests focus on risk: rapid save toggles and rollback, cancelled search responses, duplicate queue-entry moves, old seek completion after track change, optimistic conflict recovery, expired media grants, interrupted playback and cross-account cache isolation. Avoid tests that merely mirror implementation constants.

Existing quality commands: `npm run typecheck`, `npm run lint`, `npm test`, `npm run format:check`; relevant web flow checks via `npm run test:e2e` with its documented test servers. Native gestures/audio require native/device evidence. Export checks must include Android and iOS whenever native dependencies or platform code change. Preserve the existing security and queue-revision tests.

Completion means: all scoped screens redesigned; every visible control has correct normal/pending/error/disabled feedback; no navigation-induced audio reset; performance targets measured or explicitly reported unmet; no critical/major regressions in core flows; locales/accessibility verified; new installable APK and working iOS preview produced. Record remaining own-build iOS checks separately. This is a personal-test quality milestone, not public-launch clearance.

## 10. Risks, decisions, and constraints

| Risk / open detail | Treatment |
| --- | --- |
| Exact Spotify version/layout not captured | First task freezes reference evidence. Mark inferred states. Avoid asserting pixel accuracy from public text. |
| Proposed accent differs from what the owner expects | Review concrete Home + Player designs before propagating; keep color tokens easy to change. |
| More motion worsens low-end performance | UI-thread motion, limited visible animations, profile release build, reduced-motion fallback. |
| Routing migration loses Back/deep links/tab position | Incremental explicit routes, compatibility map, auth callback tests and repeated navigation checks. |
| Queue optimization breaks sequencing | Keep revision/idempotency rules; verify current entry identity and audible continuity before adopting. |
| Cache serves stale/private state | Account-scoped keys, expiry/invalidation, sign-out purge, recheck availability at play time. |
| Native dependency incompatible with Expo Go | Verify SDK 58 compatibility early; choose stable fallback or explicitly schedule a development build. |
| Reference phones / build constraints unknown | Record models in baseline. Windows + Expo Go is current iOS limit; own iOS profiling requires the later build route. |
| Localization expands controls | Extract keys early, test text expansion throughout; human language review before public release. |

Implementation effort is not estimated as a fixed number of hours yet: native gesture compatibility, audio engine update support, and release-device baselines determine it. M1 is the first reviewable deliverable; do not start a whole-stack rewrite or production migration to achieve it.

## 11. Technical and behavioral references

Reviewed on 2026-10-25. These support framework choices and interaction behavior, not a claim of current pixel-perfect Spotify matching.

- [Expo SDK 58](https://docs.expo.dev/versions/v58.0.0/) — install packages compatible with the existing SDK.
- [Expo Router tabs](https://docs.expo.dev/router/advanced/tabs/) — tab layouts and navigation alternatives.
- [Reanimated for Expo SDK 58](https://docs.expo.dev/versions/v58.0.0/sdk/reanimated/) — supported animation integration and worklets.
- [Gesture Handler for Expo SDK 58](https://docs.expo.dev/versions/v58.0.0/sdk/gesture-handler/) — gesture support and Expo Go compatibility.
- [Expo Image](https://docs.expo.dev/versions/v58.0.0/sdk/image/) — explicit caching and bounded image prefetch.
- [Expo Haptics](https://docs.expo.dev/versions/v58.0.0/sdk/haptics/) — native feedback and conditions where it is unavailable.
- [React Native performance overview](https://reactnative.dev/docs/performance) — JS/UI thread distinction, frame budgets and release-mode measurement; APIs must still be checked against installed RN 0.88.
- [Spotify Now Playing](https://support.spotify.com/us/article/now-playing/) — mini-player expansion, transport, save, queue, and options behavior.
- [Spotify Your Library](https://support.spotify.com/us/article/your-library/) — saving and following behavior.
