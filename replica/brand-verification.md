# Owaryn brand verification — 2026-10-24

The working identity is applied to the prototype and the four requested stages are complete. This is a local QA and brand deliverable, not native-device acceptance, name clearance or production release approval.

| Check | Result and evidence |
| --- | --- |
| Original-brand sweep | Zero matches in shipped source/config/assets using the pack's `sweep.py` and `brand.json`; machine result `brand-sweep.json` is `[]`. The tool excludes dependency/build output and the `replica/` planning evidence folder. |
| Public identity | Owaryn in app title, sidebar/header, account entry, settings, package names and original icon. Browser title and rendered Home checked in the existing preview. |
| Visual assets | Original angular mark, lockup, opaque 1024px icon, transparent Android foreground, favicon set, and 1200×630 social image. Mark/icon and social image inspected. Social asset is delivered for later publishing; no hosted OG endpoint or landing page is claimed. |
| Original-mark distinction | Open angular amber geometry and navy background checked against the benchmark's green disc and curved-bar structure. This is visual inspection, not trademark clearance. |
| Contrast | All 18 configured text/UI pairs pass WCAG AA. Ratios in `design/contrast-report.json`. |
| Final browser regression | 30/30 passed in a single post-brand run; 15 scenarios at phone-web 390×844 and desktop-web 1440×900; no skipped, unexpected or flaky results. Real disposable local APIs, not the persistent preview database. |
| Other regressions | API 14/14, queue 3/3, schema 27/27. Schema ran with disposable PostgreSQL 18.6 through PGlite. |
| Static checks | Expo lint zero warnings; strict TypeScript passed; formatting checked. |
| All-platform export | Web export and Android/iOS Hermes bytecode exports passed. No signed APK/IPA, simulator or physical-phone run is claimed. |
| Independent source review | No required source findings remain. Moved route imports, decorative SVG wrapper, package/lockfile name consistency and compatibility identifiers reviewed. |
| Preview evidence | `brand/home-wide.png`: actual 1280×720 Home capture, showing the Owaryn interface and the existing local playlist/session. |

## Compatibility and service boundaries

Routes now live in `src/app/`; benchmark/research evidence lives in `replica/`. Planning copies are included in the source package so the decisions and remaining work are reviewable.

Existing internal cookie/header/storage keys and the deep-link scheme remain stable to preserve sessions and links. They do not display the former prototype name. The example bundle namespace must be set for the owner before native distribution. A coordinated provider/native migration can replace compatibility keys later. The local demo uses original recordings, fictional artists and independently generated artwork.

There are no custom production email templates to rebrand: local recovery sends no email, and hosted provider email remains an unexecuted staging gate. No domain, handle, paid service, app listing or deployment was created.

## Open gates

- **Name:** Owaryn is provisional. Limited dated US Apple, indexed web/Play and .com RDAP screening is recorded in `brand-name-checks.csv`. US/EU/Canada/WIPO and relevant local trademark searches, native store/phonetic screening, exact handles and native-language checks remain to run. A registry 404 is not a reservation or purchase offer.
- **Native:** physical iOS/Android background, lock-screen, interruptions, seek races, Bluetooth/headset, VoiceOver/TalkBack and large text acceptance remain pending.
- **Services/product:** hosted auth/email/Storage/territory checks, support/policies, catalog supply, full-catalog paging and other partial must-haves remain open. See `parity.md`; the scoped score remains 71.0/100, with 19/32 must-haves complete.
- **Dependencies:** the fresh post-brand Expo audit still reports five high-severity package entries from node-forge and Zod advisory roots. No compatible fix was established; the suggested breaking Expo downgrade was not applied. API audit reported zero. See `dependency-review.md`. No clean mobile-toolchain or production security claim is made.

Next skill in the pack would be `replica-launch`, but it has not been run or treated as authorized deployment. Resolve these gates before publishing or spending on the working name.
