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

## V24.2b — client data (done)

`LibraryEntry.pinnedAt` is validated and persisted by the snapshot cache (a malformed value rejects the cached snapshot). `libraryState.ts` adds `withPin`, `pinCount`, the `maxLibraryPins` mirror of the API cap and pin-first ordering: under every sort and filter pinned rows lead, most recently pinned first, and unpinned rows keep the chosen order. Saving an already-saved item keeps its pin; leaving the Library drops it, matching the server. The provider's `pin(kind, id, desired)` is optimistic, serialized per collection, rolls back to the confirmed state on failure and is merged into refreshes like in-flight saves; sign-out and account deletion wait for pending pin writes. `http` and `mock` adapters implement `pin`. Client suite **61/61** (four new cases).

## V24.2c — Library UI (done)

- **Where to pin:** the existing collection options sheet gains *Pin to top of library* / *Unpin from top of library* for collections that are in the Library (saved, or owned playlists). A long-press on a Library row opens that same sheet; screen readers get an equivalent *Options* custom action. This keeps Library rows uncluttered instead of putting a button on every row. A dedicated Library row menu (queue, share, remove) remains V21 work.
- **Indicator:** a pinned row shows an accent pin glyph beside its subtitle and its accessible name ends with ", Pinned".
- **Limit:** when 8 are already pinned the sheet shows an inline alert, "You can pin up to 8 Library items.", and changes nothing; a rejected write restores the confirmed state and shows the server's message.
- **Strings:** English, Russian and Turkmen added. The Turkmen wording uses the dictionary's existing "kitaphana" and needs native-speaker review like the rest of the Turkmen set.

## Verification (browser)

`e2e/v2-library-pins.spec.ts`, phone and desktop viewports: pin through the long-press sheet, pinned row leads and is labelled, still first after reload and after switching to Title sort, axe clean, unpin from the same menu; the ninth pin is refused with the inline alert and the Library is unchanged; a rejected write rolls back and explains why. Six cases pass. Full browser suite after this slice: **108/108** (both viewports, none skipped); client **61/61**; API **49/49**; lint, typecheck, formatting and Android/iOS/web exports pass.

## Not done

Physical-device long-press feel, TalkBack/VoiceOver reading of the *Options* action, and large-text layout of the pinned glyph row are unverified. Server-side Library search and `lastPlayed` ordering (V23.3) remain open. The personal-database gate above still applies before the personal API restarts.
