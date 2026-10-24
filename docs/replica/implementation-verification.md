# Implementation verification — 2026-10-24

The authorized order was followed: design primitives/tokens, mobile build against a mock adapter, then the persistent API and production adapters. Source is in `../music-app`. This record distinguishes runnable local behavior from unperformed hosted/native acceptance.

| Check | Result | Boundary |
| --- | --- | --- |
| Strict mobile TypeScript | Pass | Includes app/source/tests. Generated `dist` bundles and dependency/data directories are excluded, not source files. |
| Queue behavior tests | 3 passed | Reorder bounds/identity, duplicate-safe shuffle, explicit insertion order. |
| API integration tests | 13 passed | Real local Postgres engine, Fastify injection, own/other users, password hashing, CSRF/cookies, receipts/CAS, duplicate playlist reorder, range/HEAD/suffix/416, revocation/withdrawal/explicit preference, erasure, idle cleanup, exhausted job lease, and controlled import integrity/retry/quarantine. |
| Schema/RLS tests | 27 passed | PGlite PostgreSQL 18.6; managed-provider roles are local fixtures. |
| Migration integrity | Pass | Migration 001 and architecture schema have SHA-256 `8225f0e2649f867dcce0431c2a573e03d5671a32c294f2c7ee3be266641684ac`. |
| Design contrast | 18 pairs passed | Includes Home/browse text on colored panels. No claim of a full accessibility audit. |
| Production web export | Pass | Expo bundle export, no hosting/deployment. |
| Android and iOS Hermes exports | Pass | JavaScript compilation only; no APK, IPA, simulator, or device run. |
| Mobile frozen install | Pass | Fresh scratch `npm ci --ignore-scripts`, 563 packages; five known toolchain entries remain. |
| API frozen install | Pass | Fresh scratch `npm ci --ignore-scripts`, 78 packages, audit zero. |
| Expo bundled dependency map | Pass | Local SDK map used in offline check; latest-release validation was not claimed. |
| API audit | Zero advisories | Current committed package boundary. |
| Mobile toolchain audit | Five high package entries | Two advisory roots; details and release gate in dependency-review.md. |

## Browser flows observed

At 390×844 and 1440×900, 16 listener surfaces were loaded and their expected headings checked before screenshots. Files are in `clone-screens/S04…S19-390.png` and `-1440.png`; search entry/results are distinct captures. Auth, OS, exhaustive error variants, and deferred screens do not have a completed screenshot acceptance matrix.

- Home → album → real audio through the lease/range API → mini player → full player. Playback time advanced to 21 seconds of an original 24-second recording.
- Keyboard seeking, next-track transport, queue reorder preserving the current track, shuffle toggle, and repeat off/all/one/off UI transitions.
- Save track → library count; empty search → matching search → track options → playlist picker.
- Create with a blank name showed a validation error. A long title containing `ýol` and `şäher` saved successfully; adding a track updated the playlist. Reload and API process restart retained the account/library/playlist/queue.
- Artist, album, library, liked tracks, player, queue, options, picker, create/edit playlist, settings, and recents routes rendered at both widths.
- The final verification tab reported no browser console errors. Earlier transient bundler errors while files were being written were resolved; they are not hidden as unexplained runtime successes.

The phone Home banner originally squeezed its title next to decorative art; the phone variant now omits that art. A contrast check found the light decorative color insufficient for normal panel text; actual text now uses the AA-passing text role. A post-build TypeScript crash came from checking minified generated `dist` JavaScript; generated output is excluded while application source stays under strict checking.

## Independent review

An independent reviewer inspected the API and client boundary and reran the initial suite. Required findings were corrected: separate Supabase clients for session operations versus privileged Storage/admin operations; refresh an anonymous startup snapshot when a provider refresh session may exist; reconcile the root queue after CAS failure; run housekeeping during idle periods; terminalize exhausted crashed job leases. Job fixes have regression tests. Hosted Auth/Storage behavior still requires staging evidence.

## Remaining acceptance

Nineteen must-have rows are locally implemented; thirteen are partial. The matrix is not a claim of Spotify feature parity or launch readiness. Main gaps: full-catalog paging/search, complete retry/unavailable-track behavior, provider email/Storage/MFA testing, native background/interruption/accessibility tests, final support/brand/privacy details, actual repertoire intake, and the toolchain advisory release gate. See features.csv and backend.md.
