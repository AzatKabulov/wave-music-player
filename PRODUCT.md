# Musify

<!-- impeccable:product-schema 1 -->

## Platform

adaptive

Native iOS and Android are the product targets. The web preview supports development and secondary desktop use.

## Users

The owner is the only current personal tester, using an iPhone and Android phone. The eventual commercial audience is music listeners in Turkmenistan.

## Product Purpose

Find music, play it, manage the listening queue, save favourites, and organize playlists. The owner wants a polished mobile experience with screen layouts as close as possible to Spotify.

## Operating Context

Windows development PC; phones initially use the same Wi-Fi with the PC awake. iPhone uses Expo Go; Android has a signed installable personal-test APK. On 2026-10-25 the owner confirmed Musify opens in Expo Go. Playback, Android installation, and native performance are not confirmed by that launch report.

## Capabilities and Constraints

- Existing Expo 58 / React Native 0.88 client, Expo Router, expo-audio, Fastify API, local PostgreSQL-compatible persistence, and production adapter groundwork.
- Current functionality includes catalog browsing, full-catalog paginated search, playback, queue edits, library saves, playlist management, account flows, and basic preferences.
- First testing costs should stay on free/local infrastructure where practical. No Apple or Google developer membership has been arranged.
- English, Turkmen and Russian interface dictionaries are implemented and need native-speaker/device acceptance; initial language follows the phone with English fallback and a Settings override.
- Keep existing libraries, playlists, account data, queue semantics, and imported test media through the redesign.
- Broad catalog sourcing is unresolved. Personal test media is not evidence of public distribution permission.
- Public monetization remains undecided: compare subscriptions and advertising after personal testing.

## Brand Commitments

Musify is the owner-selected working name. The old navy/amber design is explicitly unsatisfactory. On 2026-10-25 the owner selected close Spotify layout fidelity and fast, subtle everyday motion, with richer player and sheet transitions. The implemented near-black/mint direction is reviewable in the running candidate. Maintain Musify's own name and assets.

## Evidence on Hand

Source implementation; earlier browser screenshots in `replica/clone-screens`; API/QA reports under `replica` and sibling `../replica`; personal-test APK; three imported popular tracks with covers plus synthesized fixtures. Historical screenshots predate some branding/artwork changes and are not current native captures. No release-device performance measurements exist yet.

## Product Principles

1. Hearing the chosen music and controlling it are the primary tasks.
2. Preserve playback while navigating or organizing music.
3. Respond immediately to touch, with truthful pending and failure feedback.
4. Familiar layouts must remain usable with platform Back, accessibility, and larger text.
5. Measure smoothness on actual phones; distinguish development previews from release behavior.

## Current Work

The redesign is implemented as a personal-test candidate. `DESIGN.md` records the current source-backed visual system; `tasks/plan.md` and `tasks/todo.md` track the broader work. The six scored finish-review fixes are resolved in `tasks/finish-verdict.md`, scoped to the web/source candidate. The 16 current `.impeccable/review` frames are web layout captures, not native phone evidence; no approved bitmap comp exists and no detector ran for this native project. Native APK/emulator validation is being prepared; physical-device accessibility, gestures, audio continuity and release-device performance remain unmeasured. Earlier unfinished production work in `replica/tasks/todo.md` remains intact.
