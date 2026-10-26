# Player motion repair — owner request, 2026-10-27

The owner reports stiff mini-player expansion, drag-down dismissal and seeking, and requests artwork swipes **right → next, left → previous**. This is an addition to V19/V20, not a new visual identity.

Motion thesis: the full player is one continuous surface rising from the bottom, following the finger directly and settling without bounce. Its background moves with its content. One animation owns entry/exit; remove the current content-exit followed by a second native navigation exit. Keep the browse surface and footer geometry stable underneath. Use a ~260 ms arrival, a shorter velocity-aware dismissal, and an interruptible bounded return spring. Reduce Motion uses a short fade.

Artwork gestures are horizontal and independent of vertical dismissal. Commit one authorized adjacent queue entry per swipe, preserve duplicate entry identity and play/pause intent, resist at unavailable/end boundaries, and slide the adjacent cover into place. The owner's direction overrides common carousel conventions. Previous-by-swipe goes to the previous entry even when the current song has played longer than three seconds; the existing previous button can retain restart semantics.

Seeking tracks the finger on the UI thread with a generous target, an expanding thumb/rail and immediate position feedback. Commit once on release, retain the local target until the engine acknowledges it, and cancel cleanly on a canceled gesture or track change. Continuous progress interpolates between engine samples instead of jumping every 500 ms. Keep keyboard and VoiceOver/TalkBack adjustment, reduced motion and touch cancellation.

Verify deterministic direction/threshold/boundary/coordinate policies, pointer/keyboard browser behavior, canceled/diagonal gestures, route Back, playback continuity and exports. Browser recordings are functional/layout evidence; smoothness on iPhone 15 Pro and Redmi still requires physical acceptance. Replace the canceled queued Android build only after these changes pass.

## Implementation checkpoint

Expansion/dismissal now uses one Reanimated surface (including its background), a 260 ms arrival, velocity-aware exit and interruptible return spring. Browse chrome lives in its scene so opening the transparent player route does not resize the underlying screen. Reduced Motion uses fade feedback; Android Back and accessibility escape use the same dismissal path.

Artwork renders a bounded current/previous/next window and follows a horizontal UI-thread gesture independently of vertical dismissal. Right selects the next entry; left selects the previous entry even after three seconds. Boundaries resist without changing the queue. Active entry UUIDs preserve duplicate recordings; paused state is retained. Images remain cached and the window rebases when the audio engine confirms the next entry.

Three deterministic gesture-policy tests pass. Three phone-width browser player cases pass: existing transport/seek/modes, cancel/complete dismissal with unchanged browse layout and uninterrupted playback, and both swipe directions including paused previous selection and the first-entry boundary. Lint/typecheck pass. A temporary gesture probe confirmed recognition before a test fixture was corrected: its initial song was the final album member, so it correctly had no next entry. The probe was removed. Native smoothness is not yet measured.

Remaining: replace native/web seek behavior, smooth mini-player progress, run broad regressions and final exports, inspect the bounded visual/motion batch, and submit/verify a replacement APK. The seek regression currently reproduces **16 engine seeks during one pointer drag**, where the intended behavior is zero until release and one afterward.
