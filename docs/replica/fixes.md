# Evidence-led fixes and positioning — 2026-10-24

This stage proposes work; it does not silently add a subscription, acquire a catalog, promise offline playback, or mark these features delivered. Ranked problem/request/job lists and linked verbatim evidence are in `feedback.md`. Pricing/billing hypotheses go to replica-launch when requested.

## Build order: evidence × cost

| Order | Independent proposal and acceptance | Size | Evidence | Owner skill | Current status |
| --- | --- | --- | --- | --- | --- |
| 1 / N01 | Explicit reshuffle and queue modes: no recommendations inserted into a chosen playlist without opt-in; preserve the acknowledged queue until the listener changes it; show the actual mode | S | Shuffle/order 15 entries / 3 families | replica-build + replica-test | Existing basic shuffle/queue; richer controls proposed |
| 2 / N02 | Resume reliability: save seeks and pauses, preserve entry identity on reopen, exercise slow networks and device interruptions | M | Playback 8 / 2; queue 15 / 3 | replica-build + replica-test | Seek and duplicate bugs fixed in QA; native matrix pending |
| 3 / N03 | Buffering recovery: bounded stalled state with retry/skip; retry keeps the confirmed queue and tells the listener what failed | M | Playback 8 / 2 | replica-build + replica-backend | Proposed, must-have recovery gap |
| 4 / N04 | Playlist-local search with remove/undo from filtered results; preserve duplicate item IDs and order; empty/no-match states | M | Search/sort 2 / 2, thin; Belet large-list report | replica-build + replica-test | Proposed; validate with large fixtures |
| 5 / N05 | Keep unavailable saved items visible with a useful reason; do not silently erase personal collection history; refresh access before retry | M | Availability 3 / 2, mixed/weak; Aydym catalog complaint | replica-backend + replica-build | Media authorization exists; explanatory UI proposed |
| 6 / N06 | Measured low-data listening: selectable encoded bitrate, explicit estimates and connection failure handling; download claims only after implementation | L | Playback evidence plus regional download complaints; market applicability is an inference | replica-architect + replica-backend + replica-test | Current original WAV pilot cannot claim low-data efficiency |
| 7 / N07 | Stable localized music surface: Turkmen/Russian translation review, persistent personal sorting and preferences, optional discovery kept separate from chosen collections | M | UI control 7 / 2; localization is a regional-product hypothesis | replica-design + replica-build + replica-test | English UI; localization/stability work proposed |

These rows are added to `features.csv` with `original=no`, marking our independent product proposals rather than asserting that the original never has an equivalent. They are excluded from parity. Existing overlapping parity requirements remain in the original matrix; do not count the same delivery twice when planning capacity.

## Three positioning angles

1. **Recommended: “Keep your own rhythm.”** For listeners who want their chosen music and queue to stay under their control, this app puts clear playback modes and a durable personal collection first. Evidence: shuffle/queue theme, 15 entries across 3 source families. Local-language service can become the regional layer after validation. Prove dependable mobile listening before claiming it in a launch.
2. **“A quieter place for music.”** For listeners frustrated by intrusive promotion and forced interface changes, offer a focused music surface with deliberate discovery. Evidence: ads 12 / 2 and UI control 7 / 2, overlapping samples. Business model and sustainable pricing remain unresolved; an ad-free promise cannot precede that choice.
3. **“A library that travels with you.”** For regional listeners maintaining larger collections, make search, ordering and availability understandable. Evidence: playlist search/sort 2 / 2 (thin), availability 3 / 2 (heterogeneous). Offline downloads and universal repertoire are not delivered and cannot be implied by the name or store listing.

Choose angle 1 as the working direction for replica-brand: **clear, warm, steady**. Its current proof is controllable queue editing, deliberate duplicate identity and acknowledged seek restore. Its remaining proof is real phone playback and recovery. Use original music/visuals and accurate catalog claims.

## Validate locally before launch

Recruit 5–8 consenting Turkmenistan listeners when the user is ready to do so; no outreach has been sent. Have them find a local and international release from the actual acquired catalog, reorder a 1000-item playlist, leave/return to playback and explain shuffle mode. Record task completion and connection conditions, then test willingness to pay using a real cost model. This research did not establish regional network cost, catalog permissions or a viable subscription price.
