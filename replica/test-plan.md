# Replica QA plan

Run date: 2026-10-24. Target: the independent music app in `../music-app`, local Fastify/PGlite API and Expo web preview. Native iOS/Android acceptance is a separate, unexecuted gate. Public Spotify accounts/services are not test targets.

## Reproduce

In the app directory, run `npm ci --ignore-scripts`, `npm --prefix apps/api ci --ignore-scripts`, then start `npm run web`. Run `npm run test:e2e` (installed Microsoft Edge), `npm test`, `npm run lint`, and `npm run typecheck`. Playwright starts disposable in-memory QA APIs on loopback 4101/4102 and routes the test browser's API traffic to its project's server, preserving real handlers and normal rate limits. Each test has a fresh browser context and demo account. No request uses the persistent preview library at 4100. Schema checks: `replica/tests/README.md`.

Each executable spec covers one recon flow. Both 390×844 and 1440×900 projects run the same assertions. Axe scans use WCAG 2 A/AA and 2.1 A/AA tags on the screens reached by the tests; this does not establish screen-reader or native accessibility compliance. Every flow fails on JS page errors, console errors, and HTTP 5xx responses.

## Flow coverage

| Case | Expected behavior | Execution/evidence |
| --- | --- | --- |
| F01-H1 | Register with a valid email/name/password; return to Home | `e2e/f01-account.spec.ts`; local auth only |
| F01-E1 | Blank registration explains validation; Unicode display name retained | Same spec |
| F01-E2 | Wrong password rejected, global sign-out invalidates old sessions | API auth regression |
| F01-E3 | Private writes fail while signed out; second user's data inaccessible | API ownership and schema isolation regressions |
| F01-E4 | Recovery/confirmation link delivered, expires, opens app and changes password | Pending own Supabase/email staging and native link test |
| F02-H1 | Home → album → playable track → artist; follow changes state | `f02-browse.spec.ts` |
| F02-E1 | Empty catalog offers refresh; removed collection offers return | Browser resilience cases |
| F02-E2 | Withdrawn permission and explicit filter deny even an already issued media lease | API media regressions |
| F03-H1 | Search track and artist, then navigate/play | `f03-search.spec.ts` |
| F03-E1 | Empty/long/non-Latin/emoji query produces a readable no-match state | Same spec |
| F03-E2 | Refresh or route failure offers connection retry; offline startup recovers | Browser resilience cases |
| F03-E3 | More than 100 catalog results and query paging | Known scope gap; no false pass from twelve fixtures |
| F04-H1 | Pause/play, accessible seek, next/previous, shuffle, all repeat modes | `f04-player.spec.ts`; browser engine |
| F04-E1 | Queue end, repeated commands and seek error | Browser controls + queue/API tests; native error recovery pending |
| F05-H1 | Like track → Library → Liked; unlike removes it | `f05-library.spec.ts` |
| F05-E1 | Track save does not save album; user B cannot see user A's library | API library regression |
| F06-H1 | Create named playlist with description and empty state | `f06-create.spec.ts` |
| F06-E1 | Blank validation; 160-character limit; Unicode/emoji; double submission creates one playlist | Same spec + API receipt regression |
| F07-H1 | Track options → destination → add; explicit duplicate adds another item | `f07-add.spec.ts` |
| F07-E1 | Destination removed or owned by someone else cannot be edited | API ownership regression |
| F08-H1 | Reorder/remove entries, rename and persist | `f08-edit.spec.ts` |
| F08-E1 | Stale tab cannot overwrite newer revision, including delete | API CAS regressions; browser conflict presentation separately checked |
| F08-E2 | Remove last item; cancel delete; confirm fixture deletion | Browser edit case; test-only local fixture |
| F09-H1 | Add explicit request, reorder/remove and clear explicit entries without changing saved collections | Browser queue case + three queue unit regressions |
| F09-E1 | Selecting a repeated song starts the selected occurrence | `f09-queue.spec.ts` regression |
| F09-E2 | Membership acknowledged before obtaining media; stale revision and changed identity fail | API queue/media regression |
| F10-H1 | Refresh restores queue and last committed seek position, paused | `f10-resume.spec.ts` |
| F10-E1 | New installation has no queue without a browser error | API empty-session regression + every fresh browser fixture |
| F10-E2 | Expired/revoked grant cannot read media; replacement rechecks availability | API grants; physical-device long-running renewal pending |
| F11-H1 | Audio continues under lock, OS transport controls metadata correct | Pending physical iOS and Android builds/devices |
| F11-E1 | Call/audio-focus loss, wired unplug, Bluetooth switch, background termination | Pending physical devices; browser is not evidence |
| F12-H1 | Listening creates Recents entry; choose it to play again | `f12-recents.spec.ts` |
| F12-E1 | Empty history and removed item remain navigable | Empty/history browser state; media authorization API |

Time zones/DST do not determine playlist or queue order. Listening events use UTC timestamps; local display-time/date filters are not implemented, so there is no date-booking workflow to exercise. F13 billing and F14 offline downloads are deferred recon flows, absent from this build and not counted as passed.

## Manual release gates

Pending: VoiceOver/TalkBack; largest platform font scales; native keyboard/back/safe-area behavior; lock-screen/background/call/headset controls; production Supabase confirmation/recovery/deletion, private Storage, CDN/proxy and territory resolver. Record OS/device/build and evidence when executing. Hosted monitoring, real catalog acquisition and support contacts are launch work, not local QA results.

See `test-results.md` for actual executed counts and `bugs.md` for reproduced defects. A planned row is not a passing test.
