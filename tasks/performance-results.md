# Candidate performance evidence

Latest source checkpoint, 2026-10-27: the personal snapshot with 58 recordings is **87,474 bytes**. First play now needs **zero separate grant POSTs** when a valid grant accompanies queue acknowledgement, with one tested fallback POST for an expired response grant. Normal/delayed browser traces locate the 350 ms injected delay in the queue request stage; `evidence/v2/performance/playback-{before,after}-v2.json` retain individual samples. The after samples show ~0–0.1 ms for consuming the inline grant, rather than another network call. Native cached startup has bounded storage/identity tests, not a physical start-time measurement. None of these close the native latency, frame, memory or audible-continuity budgets.

A separate queue-write regression with 1,000 entries reduced user SQL queries from **2,007 to nine**. Single in-memory samples were 1,476.4 ms before and 118.5 ms after. This measures a specific server bottleneck and does not predict a whole-app speedup. See `evidence/v2/performance/queue-batching.json`.

2026-10-26. See evidence/candidate/search-scale.json for exact samples, host and scope.

| Check | Result | Limit |
| --- | --- | --- |
| Search processing, 10k added tracks, 30 queries across English/Russian/Turkmen | p95 169.61ms | PGlite in-memory + app.inject on Ryzen 7 4800H, 23GiB RAM; excludes network, debounce and rendering |
| Resolve a 1,000-item playlist | 479.58ms | Single server sample; not p95 and not a phone list-render timing |
| 30 playlist snapshot query budget | 13 user queries, previously 45 in the failing regression | Query count evidence; no matched wall-clock speedup claim |
| Progress subscriptions | Stable music context separated from 500ms progress context | Structural change + behavioral tests; React render trace still outstanding |
| Audio queue commands | Repeat/cursor reuse, tail append reuse; Android membership patches preserve active source identity in unit test | Audible native continuity/lease-recovery evidence still outstanding; iOS may rebuild on reorder |
| Cover loading | Across the 3 existing covers: 303,656 original bytes vs 11,999 bytes at 128px (96.05% less) and 47,104 bytes at 320px (84.49% less) | Same-source HTTP byte comparison in artwork-sizes.json; native decode-memory trace still outstanding |
| Native cold start, frame pacing, touch latency, memory, 30-minute listening | Not measured | iPhone/Redmi physical testing needed; emulator is not either owner's device |
| Constrained network, interruption/headphones, background/lock screen | Not measured | Requires physical devices/own iOS build where Expo Go differs |

No performance target has been lowered. No native budget is marked passed from browser screenshots or an in-memory API timing. The new native JS export is about 6.6MB versus about 4.0MB in the old APK; motion dependencies add code, so startup improvement is not inferred from bundle size.
