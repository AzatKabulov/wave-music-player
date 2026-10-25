# Personal catalog expansion — 2026-10-26

Added 27 tracks to the original three: **30 popular full-length recordings across 12 artists and 27 album entries**, with album artwork. The 12 engineering fixtures remain (42 published tracks total). This is the isolated personal test catalog; broad on-demand sourcing is still unimplemented.

Collections: **Popular picks** (30), **Pop essentials** (16), **Rap rotation** (6), **After dark** (8). Existing Popular picks ID, user accounts, saved items and user-created playlists were preserved. Audio streams from the PC; catalog growth does not enlarge the APK.

## Track list

| Artist            | Track                                         | Album                                                                                | Duration |
| ----------------- | --------------------------------------------- | ------------------------------------------------------------------------------------ | -------- |
| Adele             | Rolling in the Deep                           | 21                                                                                   | 3:48     |
| Adele             | Someone Like You                              | 21                                                                                   | 4:45     |
| Billie Eilish     | bad guy                                       | WHEN WE ALL FALL ASLEEP, WHERE DO WE GO?                                             | 3:14     |
| Billie Eilish     | lovely                                        | lovely - Single                                                                      | 3:20     |
| Bruno Mars        | Just the Way You Are                          | Doo-Wops & Hooligans                                                                 | 3:41     |
| Bruno Mars        | Locked Out of Heaven                          | Unorthodox Jukebox                                                                   | 3:53     |
| Dua Lipa          | New Rules                                     | Dua Lipa (Complete Edition)                                                          | 3:29     |
| Dua Lipa          | Physical (feat. Troye Sivan)                  | Physical (feat. Troye Sivan) - Single                                                | 3:13     |
| Ed Sheeran        | Perfect                                       | ÷ (Deluxe)                                                                           | 4:23     |
| Ed Sheeran        | Shape of You                                  | ÷ (Deluxe)                                                                           | 3:54     |
| Eminem            | Lose Yourself                                 | 8 Mile (Music from and Inspired By the Motion Picture)                               | 5:22     |
| Eminem            | Mockingbird                                   | Encore (Deluxe Version)                                                              | 4:11     |
| Eminem            | The Real Slim Shady                           | The Marshall Mathers LP                                                              | 4:45     |
| Eminem            | Without Me                                    | The Eminem Show                                                                      | 4:50     |
| Harry Styles      | As It Was                                     | Harry's House                                                                        | 2:47     |
| Harry Styles      | Watermelon Sugar                              | Fine Line                                                                            | 2:54     |
| Post Malone       | Better Now                                    | beerbongs & bentleys                                                                 | 3:51     |
| Post Malone       | Sunflower (Spider-Man: Into the Spider-Verse) | Spider-Man: Into the Spider-Verse (Soundtrack From & Inspired by the Motion Picture) | 2:38     |
| Sabrina Carpenter | Espresso                                      | Espresso - Single                                                                    | 2:55     |
| Sabrina Carpenter | Nonsense                                      | emails i can't send                                                                  | 2:44     |
| Shawn Mendes      | Señorita                                      | Señorita - Single                                                                    | 3:11     |
| Shawn Mendes      | Stitches                                      | Handwritten (Revisited)                                                              | 3:27     |
| Shawn Mendes      | There's Nothing Holdin' Me Back               | Illuminate (10th Anniversary Edition)                                                | 3:19     |
| Shawn Mendes      | Treat You Better                              | Illuminate                                                                           | 3:08     |
| Taylor Swift      | Blank Space                                   | 1989                                                                                 | 3:52     |
| Taylor Swift      | Cruel Summer                                  | Lover                                                                                | 2:58     |
| The Weeknd        | Blinding Lights                               | After Hours                                                                          | 3:22     |
| The Weeknd        | Can't Feel My Face                            | Beauty Behind the Madness                                                            | 3:34     |
| The Weeknd        | Save Your Tears                               | After Hours                                                                          | 3:36     |
| The Weeknd        | Starboy (feat. Daft Punk)                     | Starboy                                                                              | 3:50     |

## Import and verification

- Downloaded selected audio through ordinary public download links. Cached Apple catalog metadata/artwork supplied titles, album labels, track ordering and cover URLs. Each new audio file was parsed for codec/channels/sample rate, checked for complete MP4 boxes and matched to official listed duration within five seconds. No preview clip was substituted for a full track. Recording editions were not independently audio-fingerprinted.
- Unavailable or invalid selections were replaced: Don't Start Now → New Rules; Please Please Please → Nonsense; Circles → Better Now; Hello → Someone Like You. A live Levitating candidate was excluded; Physical (feat. Troye Sivan) was selected instead. These are curated choices, not a claim that every requested song is available.
- New artist and album IDs are stable; existing artists and matching album collections are reused. Album track ordering uses cached catalog track/disc numbers. All provenance, hashes and personal scope remain in `apps/api/data/personal-media/provenance.json` (gitignored and excluded from EAS uploads).
- Before import, the API was stopped and the database/media copied to `apps/api/data/catalog-backups/before-expansion-20261026-070549/`. No simultaneous PGlite processes were used. The first transaction changed 15 → 42 published tracks; repeating the import left 42 → 42. Playlist membership and stream eligibility were asserted in the transaction.
- After restart, all 30 popular tracks passed exact-title search, full served-audio SHA-256, served-cover SHA-256, MIME and both beginning/end HTTP 206 range checks. All 12 artist searches and all three new collection resolutions passed. Temporary verification accounts were deleted after testing.
- All original cover files decoded. Source dimensions vary (600×600, 600×597, 585×600); the published 128px cached variants decoded at 128×128. Unreferenced duplicate asset IDs correctly remain unavailable through the artwork endpoint; album tracks use the reused published cover asset. See `catalog-artwork-dimensions.json`.
- The iOS SDK-58 manifest/bundle and the 0.2.0 APK download passed private-interface HTTP checks. Physical phone playback and performance remain unmeasured.

Evidence: `tasks/evidence/candidate/catalog-import-first-run.json`, `catalog-import.json` (repeat run), and `catalog-verification.json`. Private preparation/replay helpers are retained in the task workspace `../../work/prepare-catalog-expansion.mjs`, `import-catalog-expansion.mjs` and `verify-catalog-expansion.mjs`; the importer refuses to open PGlite while the personal API responds. Stop the API and take a fresh backup before any offline replay. Do not apply this personal manifest to the production importer.

Refresh Musify on each phone to load the new snapshot, then open Popular picks or search an artist. The PC and its services must remain running.
