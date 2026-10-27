# V33 — sleep timer

A sleep timer in the player's bottom row (moon icon beside Queue). Tapping it opens a dialog with 5, 10, 15, 30, 45 and 60 minutes and **End of track**, plus **Turn off timer** while one is armed. Armed, the button shows the countdown (or "End of track") in the accent color.

## Behavior

- **Duration timers hold an absolute deadline** (`Date.now() + minutes`), not a tick count. The provider looks at the timer on every player status update, once a second while armed, and when the app returns to the foreground, so an app that was throttled or suspended and wakes late stops on its first look instead of waiting for a tick it missed.
- **Expiry is spent before it acts.** The timer is cleared first, then playback is paused once. It cannot pause again, and nothing ever resumes audio; pressing Play afterwards starts normal playback with no timer.
- **End of track** pauses inside the last 0.5 s of the song that was playing, so the next song never audibly starts; the position stays at the end, and Play resumes the remainder, then continues. A manual skip moves the timer to the song now playing. If the song finished between two looks (previous look within 2.5 s of its end) the timer stops at the start of the next song instead of following it. Emptying the queue ends the timer without a pause.
- **Not persisted across a restart.** Playback itself does not survive a restart (the queue restores paused), so a stored deadline would only ever fire on silence. Sign-out, account deletion and clearing playback cancel the timer.

## Verification

- `src/data/sleepTimer.test.ts`: six cases for the pure logic (deadline held and invalid lengths rejected, late first look fires once, end-of-track window and unloaded songs, skip re-arms, advance-between-ticks fallback, emptied queue). Client suite **67/67**.
- `e2e/v2-sleep-timer.spec.ts`, phone and desktop viewports, six cases: with Playwright's fake clock a 15-minute timer is still playing at 14:00, paused after 16:00, stays paused through further hours of fake time, and pressing Play afterwards keeps playing; turning a timer off keeps playback going past its old deadline; End of track on the real 24 s fixture pauses on the same song ("Actions for Open Road" still current) and does not start the next one. axe passes on the settled dialog and on the armed player.
- Full browser suite **120/120** (both viewports, none skipped); lint, typecheck and formatting pass.

## Test-harness notes

- The fake clock makes the client's timestamps run ahead of the API, which correctly rejects listening events dated more than five minutes in the future (422). The two fake-clock tests absorb `POST /v1/listening-events`; history is not under test there.
- react-native-web gives a Modal its dialog role only after its fade-in, and a fading dialog yields meaningless contrast readings (about 50 % blends). The audits therefore wait for the dialog to be active and, after it closes, for it to be gone.

## Not verified

Background and lock-screen behavior on real devices: JavaScript timers can be suspended when the app is backgrounded, and Expo Go behaves differently from an own build. The absolute deadline and the foreground check are designed for that, but only a phone test can confirm it. A fade-out before pausing, a fixed list that is localized beyond the new Russian and Turkmen strings (which need native-speaker review), and large-text layout of the bottom row are also untested.
