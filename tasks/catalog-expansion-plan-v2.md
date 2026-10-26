# Musify catalog expansion plan v2

**Owner update, 2026-10-27:** Personal testing now needs **50–70 popular tracks**, targeting about 60 total including the existing 30. The larger 150 → 500 → 1,500 stages below are deferred growth plans, not prerequisites for this test build. Accurate metadata, source provenance and complete-file validation still apply. Prioritize a focused selection of familiar songs over completing ten albums at this stage.

Prepared 2026-10-26. Planning document; no additional audio was downloaded or published in this planning pass.

Part of the [second improvement cycle](improvement-plan-v2.md). Implementation tasks C01–C12 are in [todo.md](todo.md#cycle-2--implementation-backlog).

## 1. Current catalog and target

The isolated personal catalog has **30 full-length popular recordings, 12 artists and 27 album entries**, plus **12 synthetic engineering recordings**. Popular picks contains all 30 real tracks; Pop essentials has 16, Rap rotation 6, and After dark 8. The existing import verified duration/format, hashes, artwork delivery, search and range streaming. It did not independently fingerprint every recording edition.

The next goal is a collection that supports normal listening sessions and discovery: recognizable songs, multiple useful releases per core artist, complete albums, correct credits, rich images and sensible playlists. Thirty songs scattered over 27 albums create thin detail pages even when the interface is polished.

### Proposed coverage gates

Counts below are minimum targets for accepted content, not a commitment to accept low-quality files to hit a number. Albums/EPs counted as complete must have every expected track for their declared edition, with availability recorded explicitly.

| Gate                              |                Real tracks |   Artists |       Complete albums/EPs |   Editorial playlists | Product outcome                                                                                   |
| --------------------------------- | -------------------------: | --------: | ------------------------: | --------------------: | ------------------------------------------------------------------------------------------------- |
| C0 — clean baseline               |                         30 |        12 | Audit actual completeness | 4 current collections | Consistent metadata, accurate partial-album indicators, fixtures separated from ordinary browsing |
| C1 — useful personal beta         |                        150 |        25 |                        10 |                     8 | Several complete listening sessions; deeper coverage for the owner's familiar artists             |
| C2 — substantial personal library |                        500 |        60 |                        30 |                    15 | Genre/mood browsing and artist radio have enough candidates to avoid constant repeats             |
| C3 — discovery-scale test         |                      1,500 |       120 |                        80 |                    25 | Larger searches, feeds, recommendations and offline management can be tested meaningfully         |
| Engineering scale                 | 10k and 100k metadata rows | Synthetic |                 Synthetic |             Synthetic | API/query/render stress tests; not represented as acquired music                                  |

For C1, prioritize depth in approximately six existing artists, then add breadth. A core artist should have a complete chosen release plus recognizable tracks from another era where available. Secondary artists should have at least three useful songs or a coherent release. Do not create empty artist/album cards solely to inflate counts.

## 2. Editorial direction and candidate selection

**First priority remains popular international artists**, as the owner selected. These are candidate coverage groups, not claims about current chart rankings or confirmed available downloads.

| Group                 | Existing artists to deepen                                            | Candidate additions                                    |
| --------------------- | --------------------------------------------------------------------- | ------------------------------------------------------ |
| Pop                   | Taylor Swift, Dua Lipa, Sabrina Carpenter, Harry Styles, Shawn Mendes | Ariana Grande, Justin Bieber, Olivia Rodrigo, Rihanna  |
| R&B / alternative pop | The Weeknd, Billie Eilish, Bruno Mars                                 | SZA, Lana Del Rey, Frank Ocean                         |
| Rap / hip-hop         | Eminem, Post Malone                                                   | Kendrick Lamar, Drake, Travis Scott, J. Cole           |
| Acoustic / ballads    | Adele, Ed Sheeran                                                     | Sam Smith, Lewis Capaldi, Hozier                       |
| Rock / alternative    | Expand from the current pop-heavy mix                                 | Coldplay, Imagine Dragons, Linkin Park, Arctic Monkeys |
| Electronic / dance    | Selected relevant tracks from the current artists                     | Daft Punk, Avicii, Calvin Harris, David Guetta         |

Build a ranked wishlist with artist, requested recording/release, why it helps the catalog, expected edition and source status. Start with core hits and full releases; add verified new releases through a separate freshness lane. Record the chart/editorial source and date whenever a collection is described as current or trending. “Newly added to Musify” and “newly released” are different labels.

Regional Turkmen, Russian-language and neighboring-market collections form a later deliberate branch with local metadata and native-language review. The app already supports the interface languages; that does not establish music coverage in those languages.

### Playlist design

- C1 examples: International favorites, Pop essentials, Rap rotation, After dark, Acoustic favorites, Dance energy, Focus, and Newly added. Choose final localized titles once contents are known.
- Give each playlist an intent, artwork, short description, an ordered track list and a version. Start with roughly 15–30 suitable tracks where the catalog permits.
- Avoid several near-identical playlists containing the same songs. Record overlap and adjust editorial selections; a broad favorites collection is the intentional exception.
- Sequence by energy/mood where useful. Do not describe BPM/key-aware mixing or personal recommendations unless those data and behaviors exist.
- “For you” requires an actual ranking signal. Before sufficient history, use honest editorial labels and offer optional favorite-artist selection.

## 3. Catalog data required by the improved screens

| Entity               | Required fields / behavior                                                                                                                                              | Why it matters                                                                     |
| -------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| Recording            | Stable ID, canonical title, display title, primary/featured credits, duration, explicit state, language, genre, edition/version, source references; ISRC when available | Search accuracy, duplicate detection, correct explicit controls and credits        |
| Audio rendition      | Container, codec, true bitrate/sample rate/channels, bytes, checksum, storage key, validation state and measured duration                                               | Reliable streaming, quality labels, downloads and integrity checks                 |
| Release              | Stable edition identity, title, album/EP/single type, release date, ordered disc/track listing, expected/available track counts and completeness state                  | Real album pages rather than an unlabeled one-song subset                          |
| Artist               | Stable ID, canonical name, aliases/transliterations, portrait/hero, short factual biography and source attribution                                                      | Search, artist pages, localized discovery and related releases                     |
| Artwork              | Content hash, original source, dimensions, variants, focal point, dark/light palette and contrast overlay                                                               | Fast lists, attractive headers and consistent player atmosphere                    |
| Credits              | Recording-to-artist roles and release contributors when supplied                                                                                                        | Featured artists should be discoverable without corrupting the primary artist name |
| Lyrics               | Recording/edition/language mapping, provider/source, plain or timed content, revision and availability                                                                  | Correct lyrics and timing; absent content gets an explicit state                   |
| Editorial collection | Stable ID, intent, cover, localized text, order, visibility, version and update date                                                                                    | Coherent Home/search categories and refresh behavior                               |
| Availability         | Territory, stream/download capability, personal/public scope, withdrawal and source status                                                                              | UI and playback agree about what can be played or downloaded                       |
| Listening signals    | Qualified start, progress/completion/skip, source context and event idempotency                                                                                         | Honest history, better recommendations and fewer repeats                           |

Use `unknown` for unresolved explicit state rather than silently declaring a track clean. With explicit filtering enabled, unknown recordings should be withheld until reviewed or handled by an explicit documented policy. Do not deduplicate on title alone: live, clean, explicit, remaster, acoustic, remix and featured-artist versions can be different recordings.

A recording may appear on several releases. Keep release ordering/edition relationships separate from the recording itself. Cross-release duplicates should not create multiple copies in a user's liked songs unless they truly represent distinct recordings. Existing IDs remain stable so queues and libraries survive cleanup.

## 4. Source and intake strategy

Keep the existing personal-test collection and provenance. Continue selected private intake through verified ordinary file sources or user-supplied files, with a reviewable manifest. Artist/label delivery folders and a managed provider adapter are separate intake routes for later catalogs. Do not make playback depend on searching third-party pages every time a song starts.

Metadata, artwork, lyrics and audio are separate inputs. A catalog search result or preview URL is not a full-audio rendition. Each input records its source, retrieved date, identity and scope. Existing private-test access records do not become a public distribution agreement when the database is copied elsewhere.

Current preparation scripts in `../../work/` are useful prototypes. Turn the repeatable parts into a controlled intake tool with dry run, validation report, bounded fetch/decode work and resumable batches. Keep personal intake isolated from the production importer; do not weaken the existing managed-provider WAV checks to accommodate arbitrary files.

### Intake lifecycle

1. **Select:** a wishlist entry identifies the intended artist/title/version/release before any file is accepted.
2. **Resolve candidates:** find source files and metadata, recording the exact candidate identity; prefer exact artist/title/edition matches. Stop ambiguous matches for review.
3. **Stage:** download/copy into an unpublished staging directory with size/time limits, safe filenames, retries and a persistent job ID. Fetch failures do not create catalog entries.
4. **Inspect:** sniff bytes, parse the actual container/codec, decode the complete audio, check duration/channels/rate and detect corruption/truncation. Reject HTML responses, video mislabeled as audio, previews and unexpected variants.
5. **Match:** compare recording identity and edition, duration and available identifiers. Use a fingerprint only where a suitable matching service/collection exists; do not treat a duration match as proof of identity.
6. **Review:** flag clean/explicit uncertainty, conflicting metadata, partial releases, unexpectedly long silence and suspicious duplicates. Audition representative beginning/middle/end excerpts, every ambiguous candidate and the first batch from a new source.
7. **Prepare:** retain originals; produce only useful supported renditions, artwork sizes and palettes. Do not upscale/transcode a low-quality file and label it higher quality. Advanced loudness processing is a separate measured pipeline.
8. **Publish atomically:** validated assets, recording/release mappings, scope/availability and collection membership are committed together. A failed database transaction must leave the old published catalog usable.
9. **Verify:** exact/alias search, release order, artwork, full audio hash, range/seek behavior, queue playback and withdrawal behavior through the app API.
10. **Record:** persist the batch manifest, duplicate decisions, rejected candidates, source metadata and rollback mapping. Replaying the same manifest must not create duplicates.

### Operational safeguards

- Stop the personal API before any separate process opens its embedded PGlite database. Back up database and media while stopped, then import and close the database before restarting. For routine growth, prefer an in-process admin job using the server's existing connection rather than multiple PGlite processes.
- An importer never clears user accounts, saves, playlists or queue entries. Corrections use stable ID mappings and deliberate tombstones/aliases where appropriate.
- Limit concurrent downloads/decodes; start with two fetch jobs and one CPU-heavy job, then measure. Intake should not compete with personal playback for disk, CPU or LAN bandwidth.
- Logs store source IDs and job state, not session credentials or bearer media URLs. Downloads use a restrictive protocol/host policy and defend against redirects into local/internal services if remote URLs become user input.
- Keep a failed batch unpublished; allow a successful batch to be rolled back by manifest. Unreferenced staging files can be removed only after a retention window and a checked inventory.

## 5. Artwork and metadata quality

Use the correct edition cover for each release and map recordings to that cover through their release. Artist portraits are separate assets; album art must not be passed off as a portrait. User playlists may use a selected image or a deterministic four-cover mosaic with an attractive empty fallback.

Retain the original cover and prepare 128/320/768px variants where the original supports them, without unnecessary upscaling. The current source covers include 600×600, 600×597 and 585×600 images; square display variants already work. Higher-quality source art can be added for full-screen viewing when available. Select variant size using display dimensions and device density, and cache by asset hash/revision.

Extract palettes once during processing: dominant/accent/dark background and an appropriate text overlay. Check contrast before publication. Do not run pixel sampling on every render or every frame.

Metadata cleanup acceptance: correct artist/title/version, known source and hash, verified duration, valid artwork, consistent genre/language, explicit status review, valid release relationship, no duplicate exact recording, and search through canonical names plus selected aliases. Complete-release acceptance additionally requires expected disc/track count and ordered membership.

## 6. Storage, delivery and offline planning

Audio stays outside the app binary. Catalog expansion should update the PC server and catalog revision; the app fetches new metadata and refreshes affected sections. Mobile downloads are a separate product feature with quota, pinning, eviction and integrity behavior.

For planning, assume a four-minute track. Decimal storage estimate:

`tracks × 240 seconds × bitrate in bits/second ÷ 8 ÷ 1,000,000,000 = GB`

| Tracks | One 128kbps rendition | One 256kbps rendition |
| -----: | --------------------: | --------------------: |
|    150 |              0.576 GB |              1.152 GB |
|    500 |              1.920 GB |              3.840 GB |
|  1,500 |              5.760 GB |             11.520 GB |

These estimates exclude originals, images, database, container overhead and backups. Keeping multiple renditions and a full backup can multiply storage; measure actual files before each expansion gate. Stream delivery for one four-minute track has the same approximate byte cost. Free hosting suitability depends on both stored data and repeated listening egress, not song count alone.

Initial personal architecture: local files + range-capable API + validated source metadata. Do not add a public CDN or switch audio formats merely to appear production-ready. For away-from-PC testing, evaluate a hosted database and object storage using actual regional latency/availability, private access and monthly bandwidth measurements. Preserve the private test catalog separately during that transition.

Offline design should distinguish disposable streaming cache from user-pinned downloads. A proposed initial disposable cache quota is 250MB, configurable after device measurements; pinned downloads use a separate explicit quota. Never evict an active audio source or silently delete pinned music to satisfy the streaming-cache limit. Download rights/state and expiry are checked independently of metadata caching.

## 7. Discovery and freshness

Start with deterministic ranking using chosen genres, followed artists, accepted listening history, saves, recent skips and editorial tags. Favor available recordings, diversify artists, exclude hidden/explicit-disallowed content and reduce immediate repeats. Store a recommendation reason so the UI can describe why a mix exists.

At C1, curated radio with a fallback is sufficient. At C2/C3, evaluate whether personalized ranking improves saves/completion and diversity using actual personal feedback. One listener's data is not evidence of population-wide recommendation quality. No large model or vector service is required before simpler ranking is useful.

Maintain a dated ingestion wishlist and a release-watch report as part of future catalog operations. Newly discovered releases enter staging; publication remains gated by metadata/audio verification. This plan does not create a recurring automation or schedule downloads.

## 8. Batch acceptance and rollback

For each batch:

- 100% of published files pass complete decode/container checks, hash checks and metadata validation; no preview clips masquerade as full tracks.
- 100% of new published covers decode and their requested display variants work.
- 100% of exact artist/title lookups return the intended published item; chosen alias/typo cases pass the search suite.
- Complete releases have correct disc order and counts; partial releases disclose their state.
- Full served-file integrity and first/last ranges pass; seek and queued transitions are checked on representative native devices and every newly introduced format.
- No unexplained duplicate recordings, empty editorial collections or broken saved references remain.
- Repeating the import changes no entity counts or playlist membership; failure injection leaves the previously published catalog intact.
- Snapshot/first-page bytes and query/render budgets remain within the improvement plan. Use metadata-only scale fixtures before collecting more audio to test performance.
- Account/library/playlist counts and stable IDs match the pre-import preservation inventory, except for explicitly intended catalog/editorial additions.
- The batch report records accepted, rejected, pending and withdrawn counts, storage delta, coverage progress and rollback location.

Only advance from C1 to C2/C3 after the previous batch is useful and reliable in the app. A large catalog with thin artist pages, bad matches and slow startup does not meet this plan.
