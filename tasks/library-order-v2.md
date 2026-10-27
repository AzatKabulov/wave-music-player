# V23.1 — real Library order and scoped layout

Previously, Recently added concatenated owned playlists, saved playlists, albums and artists in type groups. It now interleaves those collections using real server timestamps. Snapshot adds optional `libraryEntries: {kind, id, addedAt}[]`; saved-table creation dates and owned-playlist creation dates are read under the current account's row-level access. Existing response fields and old clients remain compatible. No database migration is needed. Repeated saves retain their original server date.

Optimistic saves update ordering immediately; serialized failure recovery restores the confirmed membership and date. The native account cache validates and whitelists this metadata, preserving it for restart without copying extra entry properties. Old caches and old servers can omit the field; missing dates have a deterministic fallback, rather than invented history. The mock lane follows the same metadata contract.

Library title/creator sorting uses locale-aware natural text order with stable ties. Related catalog records use maps instead of repeated full-array scans. Owned-and-saved copies of the same playlist appear once. Artist artwork is used when available, with the existing honest fallback otherwise.

Grid preference is stored per account, late reads are ignored after unmount and Library state resets on account change. The previous installation-wide grid value is retained but is not assigned to an unknown account. Failed sort persistence restores the confirmed UI choice; repeated sort requests are prevented while the existing request is pending. Filters still reset to All; filter persistence and last-played order remain follow-ups. The V23 parent is not complete.

Verification so far:

- API regression first failed because timestamp entries were absent, then passed for interleaved dates, owned creation, idempotent saves, removal and another account. Full API pass: **40/40**.
- Client/data/locale/cache pass: **46/46**. New cases cover mixed dates, deterministic fallback/natural order, independent kind identity, date rollback and cache metadata validation/secret exclusion.
- Four new browser cases pass across 390×844 and 1440×900: mixed order, grid reload, title persistence, account switching and failed sort recovery. The complete **74/74 browser suite** passed afterward without retries or skipped assertions.
- Lint, typecheck, formatting and Android/iOS/web 0.2.2 exports pass. Source version is 0.2.2/build 4; the downloadable installer remains the verified 0.2.1 until the next artifact is checked.
- Four real-artwork list/grid captures inspected: `evidence/v2/library/`. Both temporary accounts were deleted. Artist portraits are absent from the current catalog sample and correctly show the fallback. These are browser layout checks, not native performance acceptance.
- Restarted personal services and verified the SDK-58 iPhone 0.2.2 manifest plus a 14,007,197-byte iOS bundle containing the new Library code. Physical device acceptance remains open.
