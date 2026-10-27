# Player axis correction — latest owner clarification

2026-10-27. This explicitly supersedes the earlier right-next / left-previous instruction recorded in `player-motion-v2.md` and `player-motion-repair-v3.md`.

| Action | Queue result | Visual movement |
| --- | --- | --- |
| Right-hand next button or left artwork swipe | Next queue entry | Current cover exits left; next enters from right |
| Left-hand previous button or right artwork swipe | Previous queue entry | Current cover exits right; previous enters from left |

The owner clarified that the next recording was selected but its cover moved in the visually backward direction. Keep semantic queue coordinates increasing toward next. Invert their screen projection and finger-to-coordinate conversion, including spring velocity. Buttons retain the correct queue offsets. Stable entry keys, interrupted motion, slower cadence, notch padding and paused intent stay intact.

The revised previous-cover regression failed against the old axis: the expected incoming cover on the left was not the cover made active. The new sequence regression checks A→B→C→B→A and the first-entry boundary by real artwork pointer gestures. Next-button verification also checks that the cover already on the right is the same node adopted as current. This tests recording order and spatial direction together, rather than swapping audio handlers to hide a visual bug.

Source version remains 0.2.4/build 6, not yet packaged. Android 0.2.3 is verified but contains the superseded axis; prepare the next signed installer after this correction passes. Functional browser evidence and native exports do not establish physical phone smoothness.

Final source checks pass: **94/94 full browser cases**, **55/55 client cases**, lint/typecheck/formatting and Android/iOS/web exports. This includes the 20-case affected player pass, correct three-recording order, incoming cover side/node identity, two-entry repeat direction, rapid/held interruption, real images, boundaries, paused state and emulated portrait/landscape insets. Ten inspected real-cover captures and two videos are under `evidence/v2/player-motion-v4/`; both temporary accounts were deleted. The actual Expo Go iOS bundle's gesture and screen-axis code is verified at 14,022,875 bytes. Owner's physical iPhone direction check remains pending.

The owner subsequently reloaded Musify 0.2.4 in Expo Go on iPhone and explicitly confirmed: **“Да, теперь правильно”** to next entering from the right / previous from the left. This is qualitative physical-device direction acceptance, not frame-time, long-playback or Android acceptance.

Signed replacement build **`41c00e4e-1918-435e-b12b-fb904d868080`**, source **`35c9846bf1b2f51a4c087a9178ed0e9f3a567026`**, version 0.2.4/code 6, is submitted. Check its existing ID; do not submit a duplicate. Keep 0.2.3 aliases until the 0.2.4 artifact passes its prepared verifier and full HTTP hash check.


## Android 0.2.4 delivery completed

Build `41c00e4e-1918-435e-b12b-fb904d868080` FINISHED. Package/version/code 6, source `35c9846`, ZIP, full signature against the previous certificate, API/player/Library markers and full private HTTP download hash pass. 115684088 bytes; SHA-256 `f2f219fe91c55cab8ec99591211b641386ef14aa720a364136817fd5722dd169`. Versioned APK and both aliases now serve 0.2.4; previous archives remain. Evidence: `evidence/v2/player-motion-v4/android-apk-verification.json`. Physical Android acceptance remains open. Resumed authorized improvement work; next slice is playback-source context/header/navigation.
