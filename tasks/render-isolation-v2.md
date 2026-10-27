# V13.1 — measured song-row work

The 58-song personal playlist at 390×844 mounted 33 action rows in a Chromium development preview. An external, test-only React DevTools hook recorded committed fiber work using `actualStartTime`; no profiler, global counter or logging was added to the app. These are individual diagnostic samples, not native frames, exact component invocation counts or release latency percentiles. Parent/child work overlaps and durations must not be summed into a claimed user latency.

Playback progress already caused zero `TrackRow` work visits during the six-second baseline. A single save produced 69 row-container visits, 232 `Touch` visits, 156 `Label` visits and 70 `Artwork` visits. Progress subscriptions were therefore left in place.

TrackRow now separates connected selection state from its visual row. Stable play/save handlers and a layout-effect-updated selection reference keep the latest expanded collection context without invalidating every row's visual props. Only active/saved/blocked state is passed into presentation. The ordinary React memo boundary has no custom deep comparison. Locale changes still reach the visual row through its own locale context. See the [React memo guidance](https://react.dev/reference/react/memo#updating-a-memoized-component-using-a-context).

The matched save sample still has 69 connected-container visits, while press-control visits fall **232 → 40**, labels **156 → 28**, and artwork **70 → 6**. Outer subscription checks remain; this is reduced child work, not a claim that only one component executes. Both samples have five save-period commits and 33 mounted rows. Raw records: `evidence/v2/performance/list-renders-before.json` and `list-renders-after.json`. Startup/image timing differs between these development samples, so broader commit counts and durations are not used to claim speed improvement.

Verification: lint/typecheck pass; **14 affected browser cases** pass at phone and desktop widths. The added regression starts with one search result, appends the next page while retaining the original row, then proves that row plays the full updated queue context and keeps independent save/unsave state. Existing search, library saves, queue duplicate identity and EN/RU/TK switching pass. No audio engine or queue persistence behavior changed.

This source slice follows the delivered Android 0.2.1 checkpoint; it is available in the development preview and belongs in the next packaged build. Physical frame/memory measurements and the remainder of V13 remain open.
