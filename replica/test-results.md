# Test results — 2026-10-24

The local prototype QA stage is complete. Six reproduced defects were fixed: two S2, three S3 and one S4. No reproduced S1/S2 remains open. This is not a native or production release sign-off.

| Check | Result | Scope |
| --- | --- | --- |
| Browser regression scenarios | 30/30 passed | 15 scenarios at 390×844 and 1440×900; 11 browser-reachable core flows |
| API integration | 14/14 passed | Real local handlers, PGlite, loopback storage fixture; auth/ownership/CAS/media/import/deletion |
| Queue unit tests | 3/3 passed | Duplicate identity, bounded reorder, explicit insertion |
| Schema regressions | 27/27 passed | PostgreSQL 18.6 via PGlite; minimal provider auth fixture |
| Expo lint | Pass, zero warnings | Expo SDK 58 flat config; no rule suppressions added |
| Strict TypeScript | Pass | App, browser specs and source |
| Export | Web + iOS/Android Hermes passed | JS/bytecode exports, not signed native apps |
| Accessibility | Axe scans passed in executed scenarios | WCAG 2/2.1 A/AA tags; native assistive technology untested |
| Independent source review | Resolved, no required findings remain | Included generation guards for late seek completion |

The final post-brand run passed **all 30 cases in one run**, with zero skipped, unexpected or flaky results (264.6 seconds, two workers). Browser fixtures use disposable in-memory APIs on loopback 4101/4102, fresh contexts and fresh local listeners, preserving normal authentication rate limits. The user's persistent preview at 4100 is not their data target. `test-results.json` records this final run. Earlier test-authoring failures included an empty-catalog request bypassing the QA proxy and selectors seeing hidden navigation-stack fields; the fixture routing and role/visible selectors were corrected without weakening assertions.

Source fixes are in the app repository's `src/` and regressions in `e2e/`. The browser exercises the actual API and media handlers through a test-only URL proxy. No competitor account or endpoint was tested. The restricted export first failed because Hermes could not write a sandbox temporary file; the same export succeeded outside that restriction. The final Owaryn source also passed lint, strict type checking and all-platform export. See `brand-verification.md` for identity-specific checks and open dependency advisories.

Pending gates: F11 physical-phone background/lock-screen/call/headset behavior; VoiceOver/TalkBack and large native text; managed provider email/recovery and private Storage/territory integration; long-running native playback/error recovery. Billing and offline downloads remain deferred. Per-case unexecuted edge conditions in `test-plan.md` are planned checks, not passed tests.
