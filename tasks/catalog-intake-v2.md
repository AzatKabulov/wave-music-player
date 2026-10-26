# C03 candidate preparation — 2026-10-27

The current playable personal catalog remains **30 recordings**. The C1 wishlist contains **181 candidate recordings**, including 14 possible existing matches and an estimated 167 additions. These are intended identities and metadata, not acquired audio. At 128 kbps their estimated audio payload is about 626 MB before artwork, alternate renditions, backups and overhead.

The ranked list targets ten complete release editions for existing artists, then three recordings each for thirteen additional international artists. See [wishlist](catalog-wishlist-v2.json) and [dry-run manifest](catalog-intake-dry-run-v2.json). The first pack is The Weeknd's *After Hours*, followed by Shawn Mendes' *Illuminate* and Eminem's *The Eminem Show*. Each release records its explicit collection identity, expected count and disc/track order.

`apps/api/src/catalog-intake.mjs` validates the cached public Apple lookup/search payloads. Candidate IDs derive from source recording IDs and remain stable across repeated runs. Release manifests reject conflicting identities or positions and retain incomplete status when counts/discs/positions differ. Only song records enter the audio candidate path; previews and videos never become full recordings. Metadata/artwork origins are validated against the corresponding official hosts.

Every candidate separately describes audio, metadata, artwork and lyrics capability. Metadata and artwork URLs are identified; artwork bytes still require validation. Audio and lyrics are missing. Existing title/artist/duration matches are review hints, not automatic merges. C04 must verify full audio decoding, hashes, duration and intended version before any recording is published; complete albums require all intended ordered members.

Source review changed the Taylor Swift target to *Lover* because the queried *1989* metadata count did not match its returned songs. Frank Ocean's *Lost* and *Nights* searches did not identify the intended versions, so those requests are explicitly deferred and *White Ferrari* is named as the third package choice. No fallback recording is silently substituted.

Verification: four adapter tests pass, including exact edition/order, genuine short intros, duplicate/colliding IDs, incomplete manifests, untrusted origins, video exclusion and preview exclusion. All ten real cached release payloads produce complete metadata manifests; thirteen artist packages contain three candidates each with no unresolved metadata gaps. Repeated cached preparation produces identical output hashes. C1's 150 playable tracks, 25 artists, ten complete playable albums and eight playlists are still pending acquisition and validation.

Metadata source: [Apple lookup documentation](https://developer.apple.com/library/archive/documentation/AudioVideo/Conceptual/iTuneSearchAPI/LookupExamples.html). Source URLs are retained per candidate in the dry-run manifest.
