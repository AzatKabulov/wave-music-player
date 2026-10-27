# V04.1 — summary startup with safe detail hydration

The client requests `/v1/snapshot?playlistShape=summary`. Default snapshot responses keep full playlist items for installed 0.2.1/0.2.2 clients. The new projection carries real `trackCount`, explicit `itemsComplete: false`, cover metadata and an account-authorized recording-presence hint; it omits item arrays and the unrelated playlist-member track graph. Detail resolution still returns complete entries. Invalid projection values fail with 400. No schema or stored-account migration is needed.

The matched synthetic scenario (150 owned playlists, 500 saves, five 1k-item collections) changes **681,808 → 210,261 bytes**, a **69.2% response-byte reduction**, and 14 → 13 user queries. It preserves 650 membership/date entries, counts for 5,000 playlist members and authorized detail access. The 210,261-byte response is below the proposed 256,000-byte scenario budget. A single local request took 134.7 ms; this is not a percentile or evidence of native launch speed. See `evidence/v2/performance/bootstrap-summary-after-v2.json`. The earlier historical baseline was 676,369 bytes before completeness metadata was added to the legacy contract.

Summary data cannot be used as an editable empty playlist. Collection displays a loading/count state until detail arrives; PlaylistForm gates initial editing and seeds its draft only from detail. It retains the draft's original revision even if an AppState refresh observes a remote edit. A remote summary cannot silently replace the draft or let it overwrite a newer revision. Add-to-playlist now uses the existing revision-guarded append endpoint, preserving prior entry IDs rather than replacing from an incomplete local array.

Refresh preserves complete detail at the same revision, invalidates changed revisions and removes deleted collections. The resolve cache cannot treat an incomplete summary as resolved detail. Cache validation preserves completeness/count metadata and rejects an incomplete summary without a count. Library uses the real count, and Home uses the recording hint so summary playlists remain discoverable while protected fixtures remain excluded.

The new cold-load tests exposed a pre-existing effect-order problem: child passive effects could request detail before the provider published its account reference, returning without fetching. Publishing the reference during layout fixes direct cold playlist/detail routes; no polling or artificial delay was added. Regression tests also caught an owned-playlist refresh omission and append navigation's void success return; both were corrected before the final full run.

Verification:

- **82/82 browser cases**, no retries/skips, including cold edit gates, duplicate entry preservation, remote-edit/draft revision protection, cold-summary append, normal create/edit/delete, queue, playback, languages, Library and search.
- **49/49 client/data/locale/cache tests**, **41/41 API tests**, final lint/typecheck/formatting and Android/iOS/web exports pass.
- Personal live contract/browser checks retain all 58 recordings and six playlists, identical playlist counts/covers, working Home discovery and detail/playback. Live response bytes: 87,714 → 76,361. A temporary account was deleted; owner accounts/library/queue were not modified. `evidence/v2/bootstrap/` contains the report and two inspected captures.
- The restarted PC serves SDK-58 iPhone preview **0.2.3/build 5** and a 14,013,136-byte bundle with the summary and safe-append code. This is delivery evidence, not physical-device acceptance.

The downloadable Android checkpoint is the verified **0.2.2/build 4**, source `b85ee01`; this later 0.2.3 source has not been packaged as a new APK. Existing installers remain compatible with the updated API.

The complete V04 bound remains open. Large saved/queued metadata is still retained for compatibility, and library/Home cursor contracts must be added before removing those identity graphs. Future server-backed Library search must retain the current whole-library semantics. V04.1 does not claim a response bound independent of arbitrary saved counts or physical startup/frame/memory targets.
