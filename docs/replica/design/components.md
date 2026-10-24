# Saz: provisional native component system

Design phase started 2026-10-24. Identity is an original working name/palette, not a commercially cleared final brand. The product is a music app; sample releases and sound fixtures are original test content.

## Reference and measurement limits

Source: Spotify's publisher Google Play listing, https://play.google.com/store/apps/details?id=com.spotify.music. Public promotional images are tilted/scaled device composites. They establish compact transport, prominent artwork, muted secondary metadata, and persistent navigation, but do not support exact native pixel/color measurements. Record chosen numeric values below as independent design decisions. No proprietary assets/copy are bundled. Native account-specific states remain unobserved.

## Layout contract

At phone widths: Home/Search/Library bottom navigation, persistent mini player immediately above it, 20dp content inset, 48dp interaction targets. Artwork leads collection screens; no oversized marketing hero inside the app. At tablet/wide preview widths: the same destinations in a 240dp navigation rail and a bounded content region; player remains persistent. The shared native UI supports text scaling, long multilingual names, safe areas, and accessible labels. Transport is not unmounted when a detail view closes.

Tokens are in tokens.json; app code consumes a generated native mapping. tokens.css and tailwind.config.mjs are interoperability exports, not an extra styling dependency. Component colors and dimensions come from the mapping. Decorative artwork may use only the named art palette.

## Primitives and states

| Component | Variants / sizes | States / behavior | Accessibility | Screens |
| --- | --- | --- | --- | --- |
| Action button | Filled neutral accent, secondary, quiet, danger; 48dp minimum | Press, focus, disabled, pending with stable label | button role, disabled/busy state, label on icon-only forms | all |
| Text / heading | xs/sm/base/lg/xl/display; hero for collection titles only | Wrap or truncate with complete accessible label | Font scaling enabled; semantic headings on web/native accessibilityRole | all |
| Icon button | Transport, overflow, dismiss; 48dp | Press/focus/disabled; selected where toggle | Describe action and current state, not glyph | all |
| Query / form input | Search, account, playlist | Label, clear, focus, submitting, inline validation | Visible persistent label, error association, keyboard submit | S02/S03/S05/S06/S16 |
| Artwork | Track/album/collection squares; artist circle | Original geometric art; unavailable fallback | Decorative art hidden when adjacent text names item | S04–S12/S19 |
| Track row | Search, album, playlist, liked, queue | Current marker, explicit indicator, saved state, disabled/unavailable, overflow | Separate play and overflow targets; long names keep actions reachable | S06–S13/S17 |
| Section header | Collection title + optional action | No filler copy; action aligned consistently | Heading semantics | S04/S10/S19 |
| Filter chip | Content kind / library sort | Active has visible shape/text cue; nonactive remains readable | selected state and label | S05/S06/S10 |
| Mini player | Track art/title/artist + play/pause | Loading/buffering/playing/paused/error; opens full player | transport is separate from open-player target | S04–S11/S19 |
| Full player | Artwork, metadata, progress, transport, queue | Loading, buffering, elapsed/duration, repeat/shuffle and unavailable | Labeled seek adjustment; OS controls configured separately | S12 |
| Queue list | Current, explicit requests, context | Reorder/remove/clear explicit; stable IDs | Move up/down alternatives to drag | S13 |
| Action sheet / modal | Track actions, playlist picker, forms, confirms | Dismiss/back, pending, error, success; retain context | Accessible modal; initial focus; Escape on web; return focus | S14–S17 |
| Feedback | Inline error, status toast, empty view, skeleton | Actionable retry/undo; no indefinite spinner or fake success | polite live region on web; announcement equivalent on native | all |
| Navigation | Bottom tabs / wide rail | Persistent destination + current state | tab/button labels and selected state | all core |
| Preference row | Link, switch, destructive action | Save pending/error, sign out/delete confirmation | Actual switch semantics; destructive action named | S18 |
| Auth panel | Welcome/register/login/recovery | Missing/invalid input, request pending, invalid session | Autocomplete/input purpose; no secret in URL/log | S01–S03 |

An isolated /design screen must render primitives and error/empty/loading specimens before full screen work. Reference captures and clone preview captures remain separate. Native background/lock-screen success is not inferred from web playback.
