# V24.2 — persistent Library pins

Pinned albums, artists and playlists stay at the top of Your Library regardless of the chosen sort, per account and across restarts and devices. This slice is split by the sizing rule: **V24.2a backend (done)**, V24.2b client data, V24.2c Library UI.

## V24.2a — backend contract

- **Migration `005_library_pins.sql`** (additive): `music.library_pins(user_id, kind, entity_id, created_at)`, unique per account/collection, `kind` limited to `albums | artists | playlists`, cascade-deleted with the profile, fail-closed row-level security and a `music_user` own-rows policy. `entity_id` is deliberately not a foreign key because the targets live in different tables; the snapshot reports a pin only while its collection is still in the Library.
- **`PUT /v1/library/pins/:kind/:id`** → `{ pinned: true, pinnedAt }`. The collection must already be in the account's Library (saved, or an owned playlist) or the answer is `404`. Idempotent: a repeat keeps the original `pinnedAt`, so a pin never reorders itself. At most **8** pins per account (`maxLibraryPins`); the ninth is `409 pin_limit`. Pin writes are serialized per account with a transaction-scoped advisory lock so a burst cannot exceed the cap.
- **`DELETE /v1/library/pins/:kind/:id`** → `{ pinned: false }`, idempotent and account-scoped.
- **Snapshot:** `libraryEntries[]` gains `pinnedAt` only on pinned entries, so existing clients and tests see unchanged payloads. The pin is read with a `left join` on the existing saved-collection and owned-playlist queries: **no extra query**; the fixed 14-query budget in `catalog.test.mjs` is unchanged and still passes.
- **Cleanup:** removing a saved album/artist/playlist clears its pin, so saving it again never resurrects the pin. An owned playlist stays in the Library when its saved copy is removed, so its pin is kept; deleting the playlist clears it.

## Verification

Three new API cases (`library-pins.test.mjs`): library-only and idempotent pinning with unpinned entries untouched, tracks/malformed identities/anonymous rejected; unsave and playlist deletion clearing pins (including the owned-playlist exception and an out-of-band removal being ignored); the cap under a burst of 12 concurrent requests, re-pinning at the cap, slot reuse after unpin and cross-account isolation. The migration-history test now expects `005`. Full API suite **49/49**; lint, typecheck and formatting pass.

## Personal database gate — do before the personal API restarts

The personal API applies pending migrations when it starts, so `005` will run against the owner's database on the next launch. It is additive (one new table, no change to existing rows), but follow the same discipline used for `004`: stop the specific controller, take a consistent backup of `apps/api/data/personal-postgres`, apply `005` to a copy and compare per-table counts/hashes (see `evidence/v2/playback-source/migration.json` for the format), and only then launch one instance. Never open the live PGlite directory from a second process. Not yet done; no personal data has been touched.

## Remaining

- **V24.2b** client data: `pinnedAt` on `LibraryEntry`, snapshot-cache validation, `http.ts` calls, provider pin/unpin with optimistic update, rollback and `pin_limit` message, merged into refresh like in-flight saves.
- **V24.2c** UI: pinned-first ordering in every sort and filter, a visible pinned indicator, an accessible pin/unpin control in list and grid, EN/RU/TK strings, browser tests at both viewports.
