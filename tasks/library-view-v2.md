# V23.2 — persist the Library view

The Library currently restores its grid choice, but resets its collection filter to All. Persist both choices per account on this device, while keeping sort as the existing server preference. Search remains temporary. Preserve the existing `musify.library.grid.<account>` choice when adding filter persistence.

Acceptance: Albums/Artists/Playlists/All and list/grid restore after reload or return to Library; another account starts with its own choices. A late storage read cannot overwrite a newer user selection. Writes serialize per setting so an older slow operation cannot win. Invalid stored values safely use defaults. Storage failure keeps the current view usable. Account switches and unmounts ignore old asynchronous reads.

Verification: regression covers simultaneous grid/filter restoration, account switch and return, and a burst of filter changes; deterministic delayed-storage cases cover intent/read ordering and write sequencing. No API/schema change. This slice follows the separately verified player repair and must not be silently claimed as part of an earlier APK.

Implemented in source 0.2.4/build 6. Existing per-account grid keys are retained; filter is stored separately under the same account scope. Choice handlers update immediately and persist through a shared bounded pending writer. Reads wait for earlier writes, ignore superseded/disposed sessions, and never override newer intent. Completion cleanup is revision guarded: an added regression first reproduced two overlapping writes at one completion boundary and now verifies a range of completion timings without overlap.

Verified: **92/92 full browser cases**, **55/55 client/data/locale/cache cases**, lint/typecheck/formatting and Android/iOS/web exports. The API is unchanged from its 41-case passing checkpoint. Three inspected live-artwork captures and a successfully deleted temporary account are recorded under `evidence/v2/library-view/`. Expo Go serves 0.2.4 with the 14,022,755-byte verified bundle. Native persistence/performance acceptance and last-played sorting remain open. Android 0.2.3 excludes this later slice.
