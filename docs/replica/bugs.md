# Reproduced QA defects

2026-10-24. Build under test began at `5b99a2d`; local API/PGlite and Microsoft Edge, 390×844. Severity: S1 blocker/security/data loss; S2 broken core flow; S3 limited UX/accessibility defect; S4 cosmetic/noise. Regression specs remain in the app. Final verification and fixing commit are recorded in `test-results.md`.

### BUG-001: A repeated song starts its first occurrence

- Severity: S2
- Flow/case: F09-E1
- Screen: S09 playlist → S13 queue
- Build/browser/device: baseline, Edge phone viewport
- Steps: create a fixture playlist with Open Road, First Light, Open Road; press the second Open Road row; inspect the acknowledged queue.
- Expected: current entry is the third entry's unique ID.
- Actual: current entry is the first entry's ID. The implementation searched by track ID after filtering.
- Evidence: the corrected failing regression returned different expected/actual UUIDs; `e2e/f09-queue.spec.ts` retains the assertion against entry 3.
- Status: fixed. Select by original list index through availability filtering, preserving occurrence identity.

### BUG-002: Fast keyboard seeks lose increments

- Severity: S2
- Flow/case: F04-H1
- Screen: S12 player, web range control
- Build/browser/device: baseline, Edge phone viewport
- Steps: pause; focus seek; press Home then ArrowRight 80 times.
- Expected: advance to eight seconds at 0.1-second increments.
- Actual: approximately four seconds; controlled input reverted between the audio engine's 500 ms status ticks.
- Evidence: failing browser screenshot had slider 4.1 and elapsed 0:04; test requested 0:08. `e2e/fixtures.ts` exercises actual keyboard events.
- Status: fixed. Keep a short optimistic seek draft until the next engine status update; no change to audio permissions.

### BUG-003: Account entry from Settings does not return Home

- Severity: S3
- Flow/case: F01-H1
- Screen: S18 → signed-out account surface → S04
- Build/browser/device: baseline, Edge phone viewport
- Steps: open Settings; sign out; join with valid test-only account details.
- Expected: successful entry opens Home.
- Actual: account is created successfully but Settings reappears, because the underlying route stays `/settings`.
- Evidence: failing regression snapshot showed the new listener's name on “Your space” while expecting Home.
- Status: fixed. Navigate to Home only after successful registration/sign-in; recovery stays in its flow and errors do not navigate.

### BUG-004: Accessible names omit visible button text

- Severity: S3
- Flow/case: F02-H1/F03-H1/F05-H1/F09-E1
- Screens: S04/S06/S08/S10/S13 and mini player
- Build/browser/device: baseline, Edge phone viewport
- Steps: run an Axe WCAG 2.1 AA scan on Home, an album with mini player, Library and Queue.
- Expected: accessible names include visible titles/subtitles, allowing speech input to identify controls.
- Actual: `label-content-name-mismatch` on hero, cards, liked tile, track rows, queue and mini player. Separate text blocks also lacked a space in their DOM text.
- Evidence: pre-fix Axe failures in browser regression output; scans remain required in the flow specs.
- Status: fixed. Derive composite names from visible text where appropriate; include all visible row metadata and explicit text spacing for transport entries.

### BUG-005: A fresh installation produces an expected HTTP 404 console error

- Severity: S4
- Flow/case: F10-E1
- Screen: startup
- Build/browser/device: baseline, Edge phone viewport
- Steps: open the app as a new listener/installation with no saved queue.
- Expected: normal empty restore result and clean console.
- Actual: GET playback session responds 404, caught by the client but logged as a failed resource by the browser.
- Evidence: every initial browser fixture logged the same 404; API regression now explicitly tests fresh and foreign-user restore.
- Status: fixed. GET returns HTTP 200 JSON `null` for no session owned by the current user. Unauthorized calls still fail; mutation CAS and missing/foreign-session writes still fail. Client accepts nullable restore.

### BUG-006: Reopening soon after a seek restores an old position

- Severity: S3
- Flow/case: F10-H1
- Screen: S12 player → app refresh
- Build/browser/device: baseline cursor scheduling, Edge phone viewport
- Steps: pause; seek to nine seconds; reopen before the ten-second background checkpoint.
- Expected: the acknowledged seek restores at nine seconds, paused.
- Actual: the queue restores at 0:00, losing the recent seek.
- Evidence: corrected keyboard-seek test reached nine seconds, then its post-refresh assertion failed with a zero slider. The regression now waits for the seek's specific server acknowledgement, then reloads.
- Status: fixed. Debounce seek cursor saves and serialize them with queue edits; reject old seek completions after a newer seek, stop or unmount. Native out-of-order promise completion requires a native harness/device beyond the browser run.

## To check, not claimed reproduced bugs

Native buffering/error and interrupted route recovery; potential audible gaps while replacing an active queue; managed provider confirmation/recovery and long-running lease renewal; stale edit recovery UX. These are incomplete acceptance work, not fabricated bug reports. Feature gaps remain in `features.csv` and `parity.md`.
