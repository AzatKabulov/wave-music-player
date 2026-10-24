# Recon map: Spotify music experience — iOS and Android

Date: 2026-10-24. Research: public documentation and publisher store listings.

Scope confirmed by the user: a commercial mobile product for listeners in Turkmenistan, with music playback, search, a personal library, and playlists. The desired catalog spans local and international music. Podcasts, audiobooks, and social listening are outside the first version.

Regional benchmark update: the user selected **Aydym and Belet Music** as operating-model references. The target is a broad music service for a regional audience, not a local-repertoire-only app. Catalog capacity and actual track availability are separate requirements. See [regional-competitors.md](regional-competitors.md) for the public evidence and its limits.

This is a functional recon and proposed build scope, not a pixel measurement report. No native app session was inspected, no account was accessed, and no screen states or tap counts were measured on a device. All routes below are proposed routes for the new product, not Spotify's internal routes. All database fields are independent design proposals.

## Sources

Each source was read on 2026-10-24. Help pages sometimes resolve to different English-language markets; feature availability can differ by region, plan, OS, and rollout.

| ID | Source | URL | Evidence used |
| --- | --- | --- | --- |
| D01 | Getting started | https://support.spotify.com/om-en/article/getting-started/ | Account entry, discovery, basic listening |
| D02 | Search | https://support.spotify.com/us/article/search/ | Music result types and optional search syntax |
| D03 | Search autocomplete | https://support.spotify.com/us/article/search-autocomplete/ | Suggestions during query entry |
| D04 | Your Library | https://support.spotify.com/uk/article/your-library/ | Saved items, artist following, Liked Songs |
| D05 | Create and edit playlists | https://support.spotify.com/ie/article/create-playlists/ | Creation, adding, editing, ordering, deletion |
| D06 | Now Playing | https://support.spotify.com/us/article/now-playing/ | Mini player, expanded controls, save, repeat |
| D07 | Play Queue | https://support.spotify.com/gh/article/play-queue/ | Explicit next-up management |
| D08 | Sort and filter | https://support.spotify.com/au/article/sort-and-filter/ | Library and playlist organization |
| D09 | Recent activity | https://support.spotify.com/ca-en/article/recent-activity/ | Mobile Recents entry |
| D10 | Premium benefits | https://support.spotify.com/us/article/your-premium-benefits/ | On-demand and offline feature differentiation |
| D11 | Premium marketing/pricing, US reference | https://www.spotify.com/us/premium/ | Paid feature positioning; not a Turkmenistan price benchmark |
| D12 | Listen offline | https://support.spotify.com/us/article/listen-offline/ | Download and unavailable-content states; deferred |
| D13 | Explicit content | https://support.spotify.com/tj-en/article/explicit-content/ | Content labels and playback filtering |
| D14 | Publisher iOS listing | https://apps.apple.com/us/app/spotify-music-and-podcasts/id324684580 | Advertised mobile capabilities; reference screenshot location |
| D15 | Publisher Android listing | https://play.google.com/store/apps/details?id=com.spotify.music | Advertised mobile capabilities; reference screenshot location |
| D16 | Product update, May 28, 2026 | https://newsroom.spotify.com/2026-05-28/playlist-folders-mobile-queue-controls-updates/ | Recent mobile organization changes; not all are MVP scope |
| D17 | Spotify Terms of Use | https://www.spotify.com/us/legal/end-user-agreement/ | Personal service access and ownership boundaries |
| D18 | Spotify User Guidelines | https://www.spotify.com/us/legal/user-guidelines// | Restrictions relevant to account-based investigation |
| D19 | Spotify Developer Policy | https://developer.spotify.com/policy | Restrictions on using Spotify's platform for a replacement experience |
| D20 | Apple App Review Guidelines | https://developer.apple.com/app-store/review/guidelines/ | Accurate metadata, reviewer access, original product presentation |
| D21 | Google Play deceptive behavior | https://support.google.com/googleplay/android-developer/answer/17006354?hl=en | Actual functionality/content must match disclosures |
| D22 | WIPO treaty status, Turkmenistan | https://www.wipo.int/wipolex/en/treaties/ShowResults?code=TM | Berne Convention status; no blanket regional exception established |
| D23 | Spotify support index | https://support.spotify.com/us/ | Account, settings, privacy, and support topic discovery |
| D24 | Aydym public catalog | https://aydym.com/ | Local and foreign music sections; catalog breadth benchmark |
| D25 | Aydym about page | https://aydym.com/about-us | Regional positioning and advertised listening features |
| D26 | Aydym user agreement | https://aydym.com/useragreement | User responsibilities; section 2.1.3 addresses copyright |
| D27 | Aydym rights-holder page | https://aydym.com/law | Self-described user-posted content and complaint process |
| D28 | Belet Music Android listing | https://play.google.com/store/apps/details?id=com.sanlytilsimat.musicapp | Broad music discovery positioning and public terms link |
| D29 | Belet Music Studio listing | https://play.google.com/store/apps/details?hl=en&id=com.sanlytilsimat.studio | Artist/label release submission and management tools |
| D30 | Belet music service terms | https://st.com.tm/ru/legal/terms-of-use | Listening permissions, reuse restrictions, rights-holder contact |
| D31 | Belet Music iOS listing | https://apps.apple.com/ru/app/belet-music/id6503349020 | Publisher description and mobile feature context |
| D32 | Aydym Android listing | https://play.google.com/store/apps/details?hl=en_US&id=com.gozleg.aydym | Regional positioning and submission contact |

## Product decisions and unresolved catalog

The core loop is: **find music → start listening → save or organize it → return and resume**. The new app should support on-demand listening within its own permitted catalog, independently of Spotify's Free/Premium rules.

Turkmenistan is the confirmed initial market, not a confirmed content license. The user described a possible regional loophole and a local-music-only store description despite an international catalog. This research does not substantiate that exception. WIPO records Turkmenistan's Berne Convention participation from May 29, 2016 [D22]. That fact alone does not determine the rights for any individual recording. The proposed exception needs qualified local review before it becomes a launch assumption.

Apple requires the listing to reflect the actual experience and features to be accessible for review; Google similarly requires accurate functionality and content disclosures [D20, D21]. The working product plan therefore describes the real catalog and does not depend on a reviewer-specific catalog, hidden remote switch, or misleading local-only claim.

Spotify's Developer Policy section III.11 restricts using its platform to mimic or replace its core experience without prior written permission [D19]. **Do not choose Spotify API/SDK access as the catalog or streaming backend for this plan.** No Spotify account investigation, audio extraction, code inspection, or private endpoint discovery was performed [D17, D18].

Recommended first playable slice: a small supplied catalog of audio and artwork with documented permission for the intended use. Keep catalog size independent of player development. This is a recommendation, not an assumption that the user already has content agreements. Rights coverage, catalog supplier, and monetization remain open.

The regional comparison supports building metadata, search, discovery, and imports for **any genre and language**, including international releases, from the beginning. It does not establish permission for every requested song. Aydym publicly groups foreign music [D24]; Belet publishes release-management tools for artists and labels [D29]. Their private supplier agreements and per-track coverage were not established by the reviewed sources. Artist/label intake and supplier imports are candidate sourcing routes; copying a competitor catalog or assuming that complaint handling grants permission is not the proposed route.

## Screen inventory

Evidence labels: **D** = behavior described in a public source; **P** = proposed decomposition or target behavior. Neither means the native screen was visually observed. States in the last column are requirements to implement/verify, not states already seen. The inventory contains **20 core surfaces** and **2 optional later surfaces**. Sheets and OS media controls are counted as surfaces so their behavior is not lost.

| ID | Screen / surface | Proposed route or entry | Purpose and components | Evidence | Required states; none device-observed |
| --- | --- | --- | --- | --- | --- |
| S01 | Welcome | App launch while signed out | Original identity; sign-in and registration entry | D01; P layout | Fresh install, returning user, session checking, service unavailable |
| S02 | Register | `/auth/register` | Account form and validation | D01; P form | Blank, invalid input, submitting, account exists, success |
| S03 | Sign in / recovery | `/auth/login`; recovery subflow | Session entry and recovery | D23; P form | Invalid credentials, recovery sent, expired link, network failure |
| S04 | Home | Home tab `/home` | Curated collections and return-to-listening shortcuts | D14/D15; P grouping | New listener, populated, loading, partial failure, empty catalog |
| S05 | Browse / search entry | Search tab `/search` | Query field, category entry points, optional recent queries | D02/D03; P grouping | Keyboard open, no history, suggestions, disconnected |
| S06 | Search results | `/search?q=…` | Tracks, artists, albums, playlists; result chips | D02; P layout | Results, no match, pending, error, unavailable item |
| S07 | Artist | `/artist/:id` | Artist identity, releases, track access, follow action | D02/D04; P grouping | Followed/unfollowed, no releases, removed artist |
| S08 | Album | `/album/:id` | Release metadata, ordered tracks, play/save actions | D02/D04; P layout | Saved/unsaved, partial availability, missing artwork |
| S09 | Playlist | `/playlist/:id` | Header, ordered tracks, play and edit entry | D05; P layout | Owner/non-owner, empty, populated, stale, deleted, private denial |
| S10 | Library | Library tab `/library` | Saved collections, type filters, sort, create entry | D04/D08 | Empty, populated, loading, filter with no matches |
| S11 | Liked tracks | `/library/liked` | Dedicated view of saved tracks | D04; P route | Empty, populated, unsave pending, unavailable track |
| S12 | Now Playing | Tap persistent mini player | Artwork, title, transport, seek, repeat, shuffle, save | D06; P additional states | Loading, buffering, playing, paused, ended, playback error |
| S13 | Queue | Now Playing → queue | Current track and editable upcoming list | D07 | Empty, context queue, manually queued, reordered, unavailable item |
| S14 | Track actions | Overflow on a track | Add to playlist, queue, artist/album navigation | D05/D07; P grouping | Owner-sensitive actions, unavailable track, disabled action |
| S15 | Playlist picker | Track actions → add | Existing destinations, new playlist entry | D05; P layout | No playlists, selection, already present, save failure |
| S16 | Create / edit playlist | Library create or owner menu | Name and optional description/artwork | D05; P form | Blank, valid, long text, submitting, failure, cancelled |
| S17 | Edit playlist tracks | Owner playlist → edit | Remove/reorder tracks and commit edits | D05; P save behavior | Edit mode, pending changes, conflict, item removed remotely |
| S18 | Profile / settings | Avatar entry; `/settings` | Account, playback preferences, support, sign out | D13/D23; P grouping | Loaded, unsaved change, save error, deletion confirmation |
| S19 | Recents | Home avatar → Recents | Return to prior listening | D09; P layout | No history, populated, missing catalog item |
| S20 | System media surface | Lock screen / OS playback controls | Background transport and media metadata | P mobile acceptance surface | Locked, interrupted, resumed, route changed, controls unavailable |
| S21 | Plan / entitlement — later | Settings → plan | Monetization presentation if subscriptions are chosen | D11; P target flow | Eligible, active, purchase pending, restore, expired |
| S22 | Downloads — later | Album/playlist download entry | Manage permitted offline availability | D12; P layout | Pending, downloading, paused, downloaded, expired, storage full |

Navigation proposal: Home, Search, Library as stable destinations; Create accessible from Library; mini player persists above navigation. D05 documents a configurable Create entry in Spotify, so exact tab parity is intentionally not claimed. Use separate platform-appropriate sheets/back behavior while preserving the same information structure.

## User flows

All counts below are **proposed target tap counts**, excluding typing, scrolling, permission prompts, and network wait. They are not measured Spotify benchmarks. Revalidate on physical iOS/Android devices during the build.

| ID | Goal and surfaces | Target taps | Important edge cases |
| --- | --- | --- | --- |
| F01 | Create an account: S01 → S02 → S04; return via S03 | 3–5 plus form entry | Duplicate email, expired recovery, interrupted signup, signed-out write attempt |
| F02 | Play a home collection: S04 → S08 or S09 → playback; S12 optional | 2 to start | Empty catalog, blocked/removed track, slow first audio |
| F03 | Find a particular song: S05 → S06 → playback | 3 plus query entry | No matches, changed query responses, alternate scripts, duplicate titles |
| F04 | Control listening: mini player → S12 → seek/skip/shuffle/repeat | 2 for one control | Unknown duration, failed seek, queue end, repeated taps |
| F05 | Save and revisit a track: S12 save → S10 → S11 | 3 | Save retry, unsave, session expiry; liked track must not imply a saved album [D04] |
| F06 | Create a named playlist: S10 create → S16 → S09 | 3 plus naming | Blank name, duplicate request, empty playlist, cancel |
| F07 | Add a track: overflow → S14 → S15 → select → confirm | 4 | No owned playlist, duplicate track decision, stale destination [D05] |
| F08 | Maintain a playlist: S09 → S17 → reorder/remove → commit | 3 plus edits | Permission loss, concurrent edits, delete last item, failed save |
| F09 | Choose what plays next: S14 add to queue; mini player → S12 → S13 | 4 to add and inspect | Duplicate queue entries, clear explicit queue, context order, track removed [D07] |
| F10 | Resume after reopening: restore session → mini-player play | 1 after launch | Expired audio URL, rights changed, resume position beyond new duration; target P |
| F11 | Continue outside app: playback → S20; return → S12 | 0 to continue; 1 to pause | Call/audio focus loss, headphones unplugged, Bluetooth route change; target P |
| F12 | Return to a recent listen: S04 avatar → S19 → item | 3 | No history, removed content, replay should use current permission [D09] |
| F13 | Optional paid plan: S18 → S21 → purchase/restore | Not sized until billing choice | Pending purchase, retry, cancellation, device/account mismatch; P |
| F14 | Optional offline play: S08/S09 → download → S22 → play disconnected | Not sized until rights/implementation choice | Storage full, revoked permission, expired entitlement, interrupted download [D12] |

Core: F01–F12. Later: F13–F14. Track saving, playlist membership, queue membership, and play history are separate operations. A clear-queue action should have an explicit scope rather than silently deleting saved collections.

## Reusable components

These are independent implementation specifications; pixel geometry, colors, fonts, assets, gestures, and exact native placement require later visual reference work.

| Component | Variants | Required states | Used on |
| --- | --- | --- | --- |
| Bottom navigation | Home, Search, Library | Selected, unselected, screen-reader labeled, safe-area adjusted | S04–S11, S19 |
| Mini player | Compact artwork + transport | Hidden before first play, buffering, playing, paused, error | Browsing surfaces |
| Artwork tile | Track, release, collection; artist portrait | Placeholder, load failure, long title | S04–S11, S19 |
| Track row | Result, album, playlist, liked, queue | Playing, saved, explicit, unavailable, editable | S06–S13, S17 |
| Collection header | Album / playlist / artist | Owner actions, saved/followed, missing art | S07–S09 |
| Query input | Global search / collection filter | Focus, clear, pending, suggestions, no match | S05/S06/S10 |
| Filter chips / sort sheet | Content kind, order | Selected, no result, persisted choice | S06/S10/S11 |
| Transport controls | Mini / full / OS | Disabled, buffering, playing, paused, repeat off/all/one | S12/S20 |
| Seek control | Known duration / live-unavailable | Seeking, buffered, duration unknown, accessible adjustment | S12 |
| Save control | Track / album / playlist; follow separate | Saved, unsaved, request pending, failed | S07–S12 |
| Overflow and action sheet | Track, playlist, artist | Dismissed, owner-only, pending | S07–S15 |
| Destination picker | Existing playlist / create | Empty, selected, already present, saving | S15 |
| Playlist form | Create / rename | Validation, keyboard, submitting, cancelled | S16 |
| Reorderable list | Playlist / queue | Dragging, accessible move actions, conflict | S13/S17 |
| Feedback | Toast, inline error, full state | Retry, undo where practical, announcement | All |
| Account/settings row | Link, toggle, destructive action | Saving, disabled, failure, confirmed | S18 |
| Optional purchase/download UI | Plan, restore, progress | Pending, success, failure, expired | S21/S22 |

## Inferred domain model

This is a model for the new product. **Concept confidence** measures support for the user-facing concept, not knowledge of Spotify storage. Every field name and relationship implementation is proposed. Types, indexes, access rules, billing provider, and migrations belong to replica-architect.

| ID | Entity and candidate fields | Evidence and confidence |
| --- | --- | --- |
| E01 | User: id, auth_subject, display_name, created_at, account_state | S01–S03/S18; D01/D23. Concept high; fields proposed. Do not add unnecessary demographic fields. |
| E02 | Artist: id, display_name, image_asset_id, short_bio | S06/S07; D02/D04. Concept high; biography/fields proposed. |
| E03 | Album: id, title, release_date, cover_asset_id | S08; D02/D04. Concept high; exact metadata proposed. |
| E04 | Track: id, title, duration_ms, explicit, album_id, availability_state | S06/S08/S12; D02/D06/D13. Concept high; fields proposed. |
| E05 | Playlist: id, owner_id, title, description, cover_asset_id, visibility, revision | S09/S16; D05. Concept high; revision and private-default policy proposed. |
| E06 | PlaylistItem: id, playlist_id, track_id, position, added_at | S09/S17; D05. Concept high; item identity permits deliberate duplicates. |
| E07 | LibraryEntry: user_id, item_kind, item_id, saved_at | S10/S11; D04. Concept high; implementation should preserve separate save/follow semantics. |
| E08 | PlaybackSession: id, user_id, context_kind, context_id, current_queue_entry_id, position_ms, shuffle, repeat_mode, updated_at | S12/F10; D06. Concept medium; persistence/fields proposed. Not cross-device streaming control. |
| E09 | QueueEntry: id, session_id, track_id, origin, position | S13; D07. Concept high; explicit/context origins proposed. |
| E10 | ListeningEvent: id, user_id, track_id, session_id, occurred_at, played_ms | S19; D09. Concept medium; retention and event rules to decide. Not a claim about royalty accounting. |
| E11 | UserPreferences: user_id, explicit_allowed, library_sort, library_layout | S10/S18; D08/D13. Concept high; fields proposed. |
| E12 | HomeCollection: id, title, collection_kind, ordered_item_refs, locale, published | S04; D14/D15. Concept medium; initial editorial curation is a proposed substitute for recommendation algorithms. |
| E13 | MediaAsset: id, storage_key, media_kind, mime_type, checksum, processing_state | Playback and artwork imply assets; independent operational proposal, confidence medium. Store original/permitted assets only. |
| E14 | ContentPermission: id, asset_or_track_id, evidence_ref, allowed_uses, territories, valid_from, valid_until, status | Independent commercial requirement from unresolved catalog; not an observed Spotify schema. Coverage must be assessed rather than assumed. |
| E15 | Entitlement — later: user_id, provider, product_id, status, expires_at, verified_at | S21; D11. Concept medium; monetization not selected. |
| E16 | DownloadRecord — later: user_id, installation_id, track_id, state, bytes, valid_until | S22; D12. Concept medium; offline storage and permission checks not designed yet. |

Relationships: artists and tracks are many-to-many for credits; albums contain ordered tracks; users own playlists; PlaylistItem relates playlists to tracks without conflating them with saved tracks. Users have library entries, preferences, and listening history. A playback session has ordered queue entries. Tracks reference media assets and applicable content permissions. E15/E16 are later extensions. There are **14 core concepts + 2 optional concepts**; junction tables are not separately counted at this stage.

Model constraints to carry forward: stable IDs through catalog edits; playlist edits restricted to the owner for MVP; independent library saves; explicit queue entries with stable identity; deterministic repeat/shuffle behavior; no media access granted solely by a displayed availability badge. Permission revocation must disable fresh playback even when an old item remains visible.

## Feature matrix

See [features.csv](features.csv). Stable feature IDs are included at the start of each feature name because the Replica CSV format has no ID column. Notes link features to screen IDs, flow IDs, evidence IDs, and uncertainty.

Verified matrix counts: **32 must, 12 should, 6 could, 12 skipped**. There are 50 planned rows and 62 rows overall. All planned rows remain unimplemented. The regional update adds broad-catalog support and an optional verified artist/label intake workflow; the latter is future operational tooling outside the listener screen inventory.

The columns remain `feature,area,priority,original,clone,notes`. `original=yes` means publicly documented functionality; `original=unknown` means a target requirement not verified in the original. Every planned feature begins at `clone=no`. Intentionally excluded rows have `clone=skip` and are excluded from the build denominator. Priority for those rows is only a CSV placeholder. No feature has been implemented by this recon.

## Out of scope and boundaries

- Spotify's music/audio files, artwork, lyrics, editorial copy, playlists as content, name, marks, and proprietary code are not deliverables. Use independently supplied catalog and original product assets [D17].
- Spotify streaming/API integration as the backend for this replacement product is excluded under the current permission assumptions [D19].
- An unverified regional loophole is not a content-permission strategy [D22]. Accurate catalog disclosure is part of the proposed product scope [D20/D21].
- Recommendation-model parity, Spotify's listener network and historical data, global label deals, and partner-device infrastructure cannot be obtained by rebuilding screens.
- Podcasts/audiobooks, Jam/social collaboration, ads, AI DJ, lyrics, music videos, car/TV/watch clients, cross-device handoff, and public user uploads are excluded from the first release. These are scope decisions, not assertions that similar functionality cannot be built independently.
- Offline downloads, paid subscriptions, and playlist sharing are later choices. Their product/operational cost must be estimated separately.
- A verified artist/label submission portal is an optional later supply workflow, distinct from anonymous public uploads. Competitor references do not add it to the first listener release automatically.

## Size, first slice, and handoff

Inventory: **20 core surfaces, 12 core flows, 14 core domain concepts**; later **2 surfaces, 2 flows, 2 concepts**. This is a scoped inventory rather than all of Spotify. Sheets, editing modes, and the OS media surface account for several surface IDs.

Size: **L** for a dependable commercial iOS/Android core, before catalog acquisition, payment operations, and store release. A limited playable prototype is **M**. These are scope classes, not delivery commitments; a worldwide catalog plus broad Spotify parity is **XL** and needs further rescoping.

The three hardest parts are:

1. **Catalog supply and permission coverage:** local and international repertoire, audio/artwork provenance, availability changes, and the still-unverified regional premise.
2. **Mobile playback reliability:** background/lock-screen controls, audio interruptions, buffering, queue semantics, and recoverable sessions on both OSes. This needs real device testing; a browser demo does not verify it.
3. **Persistent user state:** robust playlist edits, independent saved collections, search quality, and recovery from stale data and failed requests. Offline sync is an additional later cost.

Recommended first slice: supplied permitted tracks → search → play → background/lock-screen controls → save → create a playlist → reopen and resume. Deliver actual sound and persistent data before expanding the catalog or adding billing.

Turkmenistan-specific discovery still needed: launch languages and search scripts (including Turkmen characters), measured local network conditions, actual distribution/payment availability for the chosen developer entity, content agreements, and local legal review of the claimed exception. Do not infer any of those from the user's location. Measure network behavior on the intended audience's devices before selecting audio defaults.

Visual reference gap: publisher listing URLs are recorded, but no native screenshots were captured or visually measured. `screens/README.md` describes the reference-only capture list for replica-design. Current states, gestures, and accessibility behavior remain unverified on iOS and Android.

Next step: **replica-architect**, using this directory as the project handoff. Select the mobile stack and independent catalog pipeline, define playback/session rules and playlist access, then size the first vertical slice. Support local and international repertoire without a hardcoded local-only restriction. Treat Aydym and Belet Music as regional product and operational benchmarks; validate the supply arrangements before adopting any claimed strategy. Keep catalog clearance, accurate listing, and payment/distribution decisions visible as unresolved commercial launch dependencies.
