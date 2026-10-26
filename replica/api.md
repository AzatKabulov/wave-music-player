# API contract — regional music app

Architecture target, 2026-10-24. These are routes for the new application, not Spotify/Aydym/Belet endpoints. Canonical inventory: **44 listener/media method-path pairs, 8 operator pairs, 2 health pairs = 54**. Handler families now exist in the local pilot, with DTO/pagination/receipt differences explicitly listed in [backend.md](backend.md); this target document must not be mistaken for a fully implemented contract. Nothing is hosted. Optional payments/download routes are not included in this count.

## Common contract

- Base: `/v1`; JSON properties use camelCase, enum strings use lower_snake_case. Database columns remain snake_case.
- `U`: authenticated listener; verified subject determines ownership. `O`: server-verified operator with a fresh admin session. `G`: scoped opaque playback token. All routes except health require U/O/G as specified.
- Requests are validated at the HTTP boundary; unknown body fields are rejected. Parameterize SQL and explicitly allowlist response properties. Client-supplied schema definitions and URLs are never executed/fetched.
- UUIDs are validated strings; timestamps are RFC 3339 UTC strings; revisions are nonnegative integers returned as decimal strings to avoid JavaScript bigint precision loss. The API parses/compares revisions as bigint; SQL stores bigint.
- Lists use `limit` (default 20, max 100) and an opaque signed `cursor`. Cursors bind actor, route, filters, sort, and tie-breaker ID. Search uses a query fingerprint and a stable rank/ID order. Ordered playlist pages bind the playlist revision; changed revision returns 409 so the client restarts, not a mixed snapshot.
- `Page<T> = { data: T[], nextCursor: string | null }`. Playlist item pages also contain `revision`. Playback queues are bounded full snapshots, not paginated playback state.
- Error: `{ error: { code: string, message: string, requestId: string, details?: { field: string, code: string }[] } }`. No raw SQL, stack traces, tokens, or rejected secret values in responses/logs.
- Statuses: 400 malformed request, 401 missing/invalid auth, 403 known forbidden operation, 404 absent or inaccessible private resource, 409 revision/in-flight conflict, 410 expired media lease, 416 invalid byte range, 422 invalid values/key reuse with changed payload, 429 quota. Respect `Retry-After` for 429/503.
- Read/desired-state library PUT/DELETE operations are naturally retryable. Creates, CAS edits, imports, and deletion requests require `Idempotency-Key: <UUID>` generated once per intent. See architecture.md for the atomic receipt algorithm. A retry must reuse the same key and body.
- Playback-grant issuance is an explicit exception: retries may create another equivalent lease, bounded to five live grants per installation. Do not cache bearer secrets in operation receipts. GET/HEAD media requests create no durable effect.
- Upload preparation records/replays the asset intent, then regenerates a short-lived upload ticket when needed. Do not persist the secret upload URL as the receipt's response_body.
- Default JSON body cap 32 KiB; full playlist/queue replacement cap 1 MiB and 5,000 entries. Listening-event batches: max 100. Binary uploads bypass JSON routes through a narrowly scoped operator upload URL.

## Named payloads and response types

These definitions supplement every route below. Optional means omitted or nullable only where stated. Implementation must turn these into runtime request/response schemas and generated mobile types before creating handlers.

| Type | Shape / constraints |
| --- | --- |
| Profile | `{ userId: UUID, displayName: string, countryCode: ISO2, state: 'active'|'deleting' }`; country is user preference, not trusted territory proof |
| ProfileInput | `{ displayName: string(1..80 trimmed), countryCode?: ISO2 }`; patch accepts a nonempty subset; state/userId are never writable |
| Artist | `{ id: UUID, name: string, bio?: string, imageUrl?: HTTPS_URL }` |
| ArtistRef | `{ id: UUID, name: string }` |
| Album | `{ id: UUID, title: string, releaseDate?: YYYY-MM-DD, coverUrl?: HTTPS_URL }`; tracks fetched separately |
| Track | `{ id: UUID, title: string, artists: ArtistRef[], durationMs: int, explicit: boolean, languageCode?: string, artworkUrl?: HTTPS_URL, available: boolean }`; never storage keys or stream URLs |
| UnavailableTrack | `{ id: UUID, available: false }`; preserve saved references when catalog metadata is withdrawn; UI supplies an unavailable label |
| Playlist | `{ id: UUID, title: string, description: string, kind: 'personal'|'editorial', isOwner: boolean, revision: Revision, itemCount: int, coverUrl?: HTTPS_URL }` |
| PlaylistInput | `{ title: string(1..160 trimmed), description?: string(0..2000) }` |
| PlaylistPatch | Nonempty subset of PlaylistInput plus `{ expectedRevision: Revision }`; cannot change owner/kind/publication |
| PlaylistItem | `{ id: UUID, track: Track|UnavailableTrack, position: int, addedAt: UTC }`; identity is the entry ID, not track ID |
| EntryInput | `{ id: UUID, trackId: UUID }`; client allocates a new ID once for a new item; existing IDs retain track identity |
| PlaylistAppend | `{ id: UUID, trackId: UUID, expectedRevision: Revision }` |
| PlaylistReplace | `{ items: EntryInput[0..5000], expectedRevision: Revision }` |
| PlaylistEditResult | `{ revision: Revision, itemCount: int }`; append also returns the created PlaylistItem |
| LibraryItem | `{ kind: 'track'|'album'|'playlist'|'artist', savedAt: UTC, item: matching Track/Album/Playlist/Artist DTO or unavailable-ID placeholder }` |
| SearchHit | `{ kind: 'track'|'album'|'playlist'|'artist', item: matching DTO }`; playlists include own personal and published editorial only |
| SearchQuery | `{ q: string(1..120), type?: 'all'|'track'|'album'|'artist'|'playlist', cursor?: string, limit?: int(1..100) }` |
| Home | `{ collections: { id: UUID, title: string, items: SearchHit[] }[] }`; at most 10 rows of 20 tiles in one response |
| QueueEntry | `{ id: UUID, trackId: UUID, origin: 'explicit'|'context', position: int }` |
| QueueInput | `{ id: UUID, trackId: UUID, origin: 'explicit'|'context' }`; array order determines position; no client position field |
| PlaybackState | `{ id: UUID, installationId: UUID, revision: Revision, entries: QueueEntry[], currentEntryId: UUID|null, positionMs: int, shuffle: boolean, repeatMode: 'none'|'all'|'single', context?: { kind: 'album'|'playlist', id: UUID } }` |
| PlaybackPut | PlaybackState write fields except server id/revision, with `{ expectedRevision: Revision|null }`; null means create-only; zero or more entries up to 5,000; current entry must be a member; position clamped to current duration |
| PlaybackPatch | `{ expectedRevision: Revision, currentEntryId?: UUID|null, positionMs?: int, shuffle?: boolean, repeatMode?: enum }`; at least one change; current ID must belong to this session |
| QueueAppend | `{ id: UUID, trackId: UUID, expectedRevision: Revision }`; server sets origin to explicit and inserts after existing explicit requests, ahead of remaining context |
| QueueReplace | `{ expectedRevision: Revision, entries: QueueInput[], currentEntryId: UUID|null }`; omit only entries intentionally removed; preserve all other stable IDs |
| PlaybackLease | `{ token: secretString, expiresAt: UTC, mediaBaseUrl: HTTPS_URL }`; one-time plaintext response, hash stored; valid at most 24h; not an offline entitlement |
| Preferences | `{ explicitAllowed: boolean, locale: string, audioQuality: 'standard'|'data_saver', librarySort: 'recent'|'title'|'creator', libraryLayout: 'list'|'grid' }`; nonempty subset for PATCH; unavailable audio variants must not be advertised |
| ListeningEventInput | `{ id: UUID, trackId: UUID, occurredAt: UTC, playedMs: int(0..7200000) }`; occurrence within 7 days past/5 min future; counts are untrusted engagement events, not payable royalties |
| RecentItem | `{ track: Track|UnavailableTrack, lastPlayedAt: UTC }`; deduplicated for display, backed by retained events |
| AcceptedJob | `{ jobId: UUID, status: 'ready'|'running'|'succeeded'|'failed' }` |
| Job | AcceptedJob plus `{ kind: string, attempts: int, createdAt: UTC, lastErrorCode?: string }`; no internal payloads/secrets |
| SourceInput | `{ name: string(1..160), kind: 'direct'|'supplier'|'test', agreementRef?: string }` |
| UploadInput | `{ sourceId: UUID, kind: 'audio'|'image'|'evidence', mimeType: allowlisted string, byteSize: positive int, sha256: hex64 }`; max 100 MiB audio/5 MiB image/10 MiB evidence |
| UploadTicket | `{ assetId: UUID, uploadUrl: HTTPS_URL, expiresAt: UTC }`; pending asset only; successful upload does not publish a track |
| ImportInput | `{ sourceId: UUID, manifestAssetId: UUID, supplierBatchId: string(1..160) }`; manifest must already be in controlled storage, not an arbitrary external URL |
| PermissionInput | `{ trackSourceId: UUID, territory: ISO2|'*', allowStream: boolean, allowDownload: boolean, validFrom: UTC, validUntil?: UTC, evidenceRef: string(1..1000) }`; operator review required before active status |
| PublishInput | `{ status: 'draft'|'published'|'withdrawn' }`; publishing validates processed assets, credits, supplier mapping, and permission evidence |
| HomeInput | `{ title: string(1..160), locale: string, position: int, isPublished: boolean, items: { kind: enum, id: UUID }[0..100] }`; targets must be visible published catalog/editorial items |
| WithdrawalInput | `{ trackIds: UUID[1..1000], reasonCode: string(1..100), evidenceRef?: string }`; disable fresh access synchronously, enqueue cleanup after |

All UUID path parameters, including installationId, require validation. Installation IDs are random per installation and scoped to the verified user; knowing one is not authorization. Response artwork URLs may be short-lived links for permitted images only; audio always goes through the playback lease path.

## F01 — account entry and maintenance

Use official Supabase Auth SDK operations for signUp, signInWithPassword, resetPasswordForEmail, updateUser after recovery, and signOut. These five provider operations are not custom routes. Use an allowlisted HTTPS Universal/App Link recovery callback and secure native session storage. No Spotify login.

| ID | Method path | Does / caller | Input | Output |
| --- | --- | --- | --- | --- |
| A01 | PUT /v1/me | Bootstrap/update own profile; U | ProfileInput | Profile; 200; insert only caller's user_id |
| A02 | GET /v1/me | Read own profile; U | none | Profile; 200 |
| A03 | PATCH /v1/me | Edit own profile; U | partial ProfileInput | Profile; 200 |
| A38 | DELETE /v1/me | Request account erasure; U + recent reauthentication | Idempotency-Key; no body | AcceptedJob; 202; immediately mark deleting and revoke leases |

## F02 — browse and play a collection

| ID | Method path | Does / caller | Input | Output |
| --- | --- | --- | --- | --- |
| A04 | GET /v1/home | Editorial rows; U | locale?: string | Home; 200 |
| A06 | GET /v1/artists/:id | Artist details; U | id: UUID | Artist; 200 |
| A07 | GET /v1/artists/:id/albums | Artist releases via credit relationships; U | id + cursor/limit | Page<Album>; 200 |
| A08 | GET /v1/albums/:id | Album metadata; U | id | Album; 200 |
| A09 | GET /v1/albums/:id/tracks | Ordered release tracks; U | id + cursor/limit | Page<{track: Track, discNumber: int, trackNumber: int}>; 200 |
| A11 | GET /v1/playlists/:id | Owned/published editorial playlist; U | id | Playlist; 200 |
| A12 | GET /v1/playlists/:id/items | Ordered item page; U | id + cursor/limit | Page<PlaylistItem> + revision; 200 |

Playback itself uses A28/A32/A34. Opening a card does not start audio.

## F03 — search for music

| ID | Method path | Does / caller | Input | Output |
| --- | --- | --- | --- | --- |
| A05 | GET /v1/search | Search visible repertoire and permitted playlist metadata; U | SearchQuery | Page<SearchHit>; 200 |
| A10 | GET /v1/tracks/:id | Track details/availability; U | id | Track; 200 |
| A44 | GET /v1/search/suggestions | Prefix suggestions; U; should | q: string(2..120), limit<=10 | {data: string[]}; 200 |

No search provider calls to Spotify/Aydym/Belet. Debounce/cancel superseded requests on the phone; disregard older responses even if cancellation races. Cross-script aliases must be supplied or intentionally generated, not promised by the database tokenizer.

## F04 — player controls

| ID | Method path | Does / caller | Input | Output |
| --- | --- | --- | --- | --- |
| A29 | PATCH /v1/playback-sessions/:installationId | Checkpoint player cursor/options; U | PlaybackPatch | PlaybackState; 200 |

Play, pause, seek, and transport on already acknowledged entries act on the local native engine immediately. They do not wait for an HTTP round trip. Coalesce cursor/options checkpoints; a failed checkpoint never stops already authorized audio. New context/membership/order edits require server acknowledgement before native installation, as specified under F09/F11. Serialize those edits and checkpoints through one per-installation command pipeline; reconcile 409 responses rather than automatically overwriting newer state.

## F05 — save music and return to Library

| ID | Method path | Does / caller | Input | Output |
| --- | --- | --- | --- | --- |
| A13 | GET /v1/library | Mixed saved collection; U | kind?, q?, sort?, cursor/limit | Page<LibraryItem>; 200 |
| A14 | GET /v1/library/tracks | Liked tracks; U | q?, sort?, cursor/limit | Page<Track|UnavailableTrack>; 200 |
| A15 | PUT /v1/library/tracks/:id | Save track; U | id; no body | 204; unique user/track |
| A16 | DELETE /v1/library/tracks/:id | Unsave track; U | id | 204 |
| A17 | PUT /v1/library/albums/:id | Save album; U | id | 204 |
| A18 | DELETE /v1/library/albums/:id | Unsave album; U | id | 204 |
| A19 | PUT /v1/library/playlists/:id | Save accessible playlist; U | id | 204; validate target visibility first |
| A20 | DELETE /v1/library/playlists/:id | Unsave playlist; U | id | 204 |
| A41 | PUT /v1/library/artists/:id | Follow artist; U; should | id | 204 |
| A42 | DELETE /v1/library/artists/:id | Unfollow artist; U; should | id | 204 |

Saving an album must not insert saved_tracks. Personal playlists owned by the caller also appear in Library independently of saved_playlists. Account and private-library responses are never shared-cacheable.

## F06 — create a playlist

| ID | Method path | Does / caller | Input | Output |
| --- | --- | --- | --- | --- |
| A21 | POST /v1/playlists | Create personal playlist; U | PlaylistInput + Idempotency-Key | Playlist; 201 |
| A43 | GET /v1/me/playlists | Owned destinations for picker; U | q?, cursor/limit | Page<Playlist>; 200 |

## F07 — add a track to a playlist

| ID | Method path | Does / caller | Input | Output |
| --- | --- | --- | --- | --- |
| A24 | POST /v1/playlists/:id/items | Append one entry; owner U | PlaylistAppend + Idempotency-Key | PlaylistEditResult + item; 201 |

Use A43 for destinations and A21 for creating a destination. Intentional track duplicates are permitted, with a UI indication and distinct entry IDs. Network retries reuse the same entry ID and operation key.

## F08 — edit/reorder/remove a playlist

| ID | Method path | Does / caller | Input | Output |
| --- | --- | --- | --- | --- |
| A22 | PATCH /v1/playlists/:id | Rename/update description; owner U | PlaylistPatch + Idempotency-Key | Playlist; 200 |
| A23 | DELETE /v1/playlists/:id | Delete owned personal playlist; owner U | expectedRevision query + Idempotency-Key | 204 |
| A25 | DELETE /v1/playlists/:id/items/:itemId | Remove one entry; owner U | expectedRevision query + Idempotency-Key | PlaylistEditResult; 200 |
| A26 | PUT /v1/playlists/:id/items | Replace ordered snapshot; owner U | PlaylistReplace + Idempotency-Key | PlaylistEditResult; 200 |

A26 calls the delivered music.replace_playlist_items SQL function. A22–A25 must use the same row-lock/CAS and receipt transaction pattern. Those route handlers are not delivered by this stage. Editorial writes are operator-only. No caller can transfer ownership.

## F09 — manage the play queue

| ID | Method path | Does / caller | Input | Output |
| --- | --- | --- | --- | --- |
| A30 | POST /v1/playback-sessions/:installationId/queue | Append explicit request; owner U | QueueAppend + Idempotency-Key | PlaybackState; 201 |
| A31 | PUT /v1/playback-sessions/:installationId/queue | Reorder/remove/clear snapshot; owner U | QueueReplace + Idempotency-Key | PlaybackState; 200 |

Clear queued requests removes only upcoming origin=explicit entries. It preserves the current entry and remaining context. A deliberate “stop and clear all” is a separate local action plus A28 with an empty state. Queue edits first clear/reassign current_entry safely, then mutate entries within one transaction; the deferred composite FK must hold at commit.

The UI may render an optimistic pending change, but do not pass a new entry URI or changed queue order to the native player before A28/A30/A31 commits and returns acknowledgement. On failure keep the previous acknowledged engine queue and surface/reconcile the pending edit. Position/options checkpoints may be coalesced; membership changes may not be fire-and-forget, because A34/A35 authorize against persisted membership.

## F10 — reopen and resume

| ID | Method path | Does / caller | Input | Output |
| --- | --- | --- | --- | --- |
| A27 | GET /v1/playback-sessions/:installationId | Read owned checkpoint; U | installationId | PlaybackState; 200 or 404 |
| A28 | PUT /v1/playback-sessions/:installationId | Create/replace context and checkpoint; U | PlaybackPut + Idempotency-Key | PlaybackState; 200/201 |

Local SQLite owns immediate restore on that installation. A server checkpoint provides recovery; it is not remote speaker control. On restart restore paused, revalidate availability and issue a fresh lease before sound. Position and current item are written atomically with queue revision. Do not restore a prior user's queue after sign-out.

## F11 — background and system playback

| ID | Method path | Does / caller | Input | Output |
| --- | --- | --- | --- | --- |
| A32 | POST /v1/playback-sessions/:installationId/grants | Issue scoped media lease; owner U | installationId; empty body | PlaybackLease; 201; retry can issue equivalent new lease |
| A33 | DELETE /v1/playback-sessions/:installationId/grants | Revoke this installation's leases; owner U | installationId | 204 |
| A34 | GET /v1/media/:token/:queueEntryId | Validate grant + membership + current permission; G | token, queueEntryId; optional single Range | audio stream; 200/206; no storage redirect exposed |
| A35 | HEAD /v1/media/:token/:queueEntryId | Same authorization without audio body; G | same parameters | authorized metadata headers; 200/206 |

Media URI for an entry: mediaBaseUrl + `/` + queueEntryId. The lease path works while the JS UI is suspended; native automatic-next must not depend on a per-track React callback. Validate every new range request and abort upstream reads on disconnect. Forward only necessary audio/range headers. No full-file buffering in the API. A bearer URI is a credential: redact the token from CDN/origin/application logs and error reports.

## F12 — Recents and history

| ID | Method path | Does / caller | Input | Output |
| --- | --- | --- | --- | --- |
| A39 | GET /v1/recents | Return recent unique tracks; U; should | cursor/limit | Page<RecentItem>; 200 |
| A40 | POST /v1/listening-events | Record bounded engagement batch; U; should | {events: ListeningEventInput[1..100]} + Idempotency-Key | {accepted: int, duplicates: int}; 200 |

The same client event ID with different payload is 422, not another listen. Event batch receipts and rows commit together. Background collection is best-effort; do not promise complete listening histories or use client-reported duration for settlements.

## Settings — shared by F01/F04/F05

| ID | Method path | Does / caller | Input | Output |
| --- | --- | --- | --- | --- |
| A36 | GET /v1/preferences | Read preferences/defaults; U | none | Preferences; 200 |
| A37 | PATCH /v1/preferences | Change explicit/locale/library/player preference; U | nonempty partial Preferences | Preferences; 200 |

F13 paid plans and F14 offline downloads are deferred capability contracts. No payment webhook, store receipt trust path, download entitlement, or offline media route is enabled by this schema. Add migrations and explicit contracts after selecting the commercial model and content supplier requirements.

## Operator catalog routes — support F02/F03/F11

| ID | Method path | Does / caller | Input | Output |
| --- | --- | --- | --- | --- |
| B01 | POST /v1/admin/catalog-sources | Register approved source; O | SourceInput + Idempotency-Key | {id: UUID}; 201 |
| B02 | POST /v1/admin/imports | Queue controlled manifest import; O | ImportInput + Idempotency-Key | AcceptedJob; 202 |
| B03 | GET /v1/admin/imports/:jobId | Read job outcome; O | jobId | Job; 200 |
| B04 | POST /v1/admin/tracks/:id/permissions | Record reviewed permission; O | PermissionInput + Idempotency-Key | {id: UUID, status: string}; 201 |
| B05 | PATCH /v1/admin/tracks/:id/status | Publish/unpublish after checks; O | PublishInput + Idempotency-Key | {id: UUID, status: string}; 200 |
| B06 | PUT /v1/admin/home/:collectionId | Edit editorial collection; O | HomeInput + Idempotency-Key | {id: UUID}; 200 |
| B07 | POST /v1/admin/uploads | Prepare a controlled upload; O | UploadInput + Idempotency-Key | UploadTicket; 201 |
| B08 | POST /v1/admin/withdrawals | Block new playback and schedule follow-up; O | WithdrawalInput + Idempotency-Key | AcceptedJob; 202 |

The operator tool can initially be a local CLI calling these routes; no extra website is required. Never accept supplier credentials, arbitrary fetch hosts, or operator status from listener input. Stable source/external IDs identify import retries; cross-source recording merges are reviewed separately. No feeds or audio from competitor apps are ingested.

## Operational routes

| ID | Method path | Does / caller | Input | Output |
| --- | --- | --- | --- | --- |
| O01 | GET /healthz | Process liveness; public | none | {status:'ok'}; 200 |
| O02 | GET /readyz | Bounded DB/storage dependency readiness; internal probe | none | {status:'ready'|'unavailable'}; 200/503; no configuration details |

## External events and jobs

Webhooks in/out: **none initially**. Provider auth operations are SDK calls, not custom inbound webhooks. A future supplier notification must use its official signature/replay protocol and durable deduplication before changing the catalog; a future billing provider must get its own verified event ledger. Do not add unverified placeholder webhook handlers.

The same API deployment runs a bounded worker loop against music.jobs with row locks, leases, and SKIP LOCKED. Schedules, failure recovery, retention, and media delivery tradeoffs are specified in architecture.md.

## QA contract correction — 2026-10-24

The implemented `GET /v1/playback-sessions/:installationId` returns HTTP 200 JSON `null` when this listener has no saved session for that installation. An existing own session returns the unchanged queue DTO. This treats normal first-run absence without an HTTP resource error and discloses no foreign queue. Authentication remains mandatory. Mutation, ownership and revision checks remain enforced; a nullable read is not permission to mutate another listener's session.

## Playback responsiveness additions — 2026-10-27

`PATCH /v1/playback-sessions/:installationId/position` accepts `{expectedRevision,currentEntryId,positionMs}` and returns `{saved:boolean}`. It changes only an owned existing queue's cursor at the expected membership revision and does not advance that revision. Stale/foreign entry writes return `saved:false`. A background client writer coalesces these checkpoints independently of interactive commands.

`PUT` and `PATCH /v1/playback-sessions/:installationId` accept an optional boolean `includeGrant` (omitted/false preserves the old response). After a successful queue commit and owned-session validation, true adds `playbackGrant:{token,expiresAt,mediaBaseUrl}` to the existing queue DTO. The grant has the same scope, expiry and revocation rules as the standalone POST grant endpoint. Failed or stale mutations do not mint a grant. Media requests still check current entry membership, profile/preferences and streaming permission. GET never returns a grant. If grant issuance fails after a committed queue write, clients reconcile the acknowledged server queue before retrying rather than assuming rollback.

The client consumes an inline grant once from private process memory, checks its shape/expiry and clears it on account change. Grants never enter QueueState, snapshots, persistent caches or timing records. An absent/expired inline grant uses the existing POST grant endpoint. This removes one network round trip on first play while retaining access checks; it does not establish a physical audible-start timing claim.
