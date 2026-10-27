# Player motion and inset repair — 2026-10-27

**Direction superseded by later owner clarification:** use left swipe = next, right swipe = previous; next enters from right, previous from left. See `player-direction-v4.md`. The earlier direction below describes that checkpoint's history, not the active specification.

Owner reports fast, unsmooth transitions and incorrect transport/swiping on both iPhone and Android; the header is also obscured by the Dynamic Island on iPhone 15 Pro. This repair takes priority over further v2 features. Personal catalog stays at 58 recordings.

| Before | After | Why |
| --- | --- | --- |
| Artwork starts a 180 ms exit, then restarts a 200 ms animation when audio acknowledges the entry | One 420 ms UI-thread settle on stable cover coordinates | Acknowledgement must change the visible window without resetting position, velocity or image identity |
| Two-entry repeat infers both directions as next | Explicit previous/next intent shared by artwork and transport | Both neighbors can have the same entry ID; identity alone cannot identify direction |
| Previous button restarts after three seconds | Previous selects the adjacent entry; first-entry boundary restarts current | Owner wants unambiguous previous-song behavior; artwork and buttons should agree |
| 260 ms entry and 110–210 ms exit with steep easing | 440 ms entry, 240–360 ms distance-aware exit, gentler return spring | Owner explicitly requests a slower cadence; this overrides generic sub-300 ms UI advice |
| An 18 px fast touch can skip | Flick requires 36 px and 800 px/s, or the full distance threshold | Short tentative gestures should settle back rather than skip accidentally |
| Native SafeAreaView sits inside the translated player | Insets read from the provider and applied explicitly, with 8 pt header breathing room | Inset measurements should not change while the surface translates; protect notch/system bar areas |

Three covers stay mounted around the active entry, keyed by queue-entry ID and stable coordinate. Right remains next, left remains previous, per the owner's explicit direction. Paused state, duplicate queue identity, accessibility actions, reduced motion, unavailable boundaries and stale expected-entry guards remain required. No per-frame React state updates or new dependency.

The first regression run reproduced both the post-seek previous restart and the wrong previous-cover direction in a two-entry repeat queue. Those failures are recorded in `../../../work/player-direction-red.log`; they were not inferred from a screenshot alone. Next/previous native Expo implementations themselves were checked and do not reverse the index.

The follow-up rapid-next test also reproduced a 75.6 px uncovered strip. Outgoing covers now retain stable keys through overlapping transitions and are released after settlement, including a held gesture. Burst retention is bounded with a crossfade fallback. No animation is restarted at audio acknowledgement; delayed calls after unmount are ignored and failed acknowledgements restore the cover/fade.

Verified: **90/90 browser tests**, **51/51 client/data/locale/cache tests**, lint/typecheck/formatting and Android/iOS/web production exports. The backend is unchanged from the 41-case passing checkpoint. The eight new browser cases cover three-entry transport after seeking, two-entry repeat direction and actual incoming DOM-node identity, measured slower cover movement, simulated portrait/landscape notch insets and held interruption with no uncovered strip or retained-cover leak. No assertions were weakened or skipped.

Ten real-cover captures, two final videos with distinct album artwork and an inspected frame sheet are under `evidence/v2/player-motion-v3/`; final temporary capture accounts were deleted. The 0.2.3 iPhone endpoint serves the repaired 14,018,550-byte SDK-58 bundle, with the header/window/cleanup markers verified. This is PC-to-private-interface delivery evidence.

Native acceptance on the owner's iPhone/Redmi is still required; do not claim Spotify parity or measured native smoothness. Android packaging follows this source checkpoint; 0.2.2 remains the verified installer until its replacement passes artifact checks.

Sources checked against installed Expo 58 / safe-area 5.10 / Reanimated 4 / Gesture Handler 3:

- [Expo SDK 58 safe-area context](https://docs.expo.dev/versions/v58.0.0/sdk/safe-area-context/)
- [React Navigation safe areas](https://reactnavigation.org/docs/handling-safe-area/) recommends inset hooks for animated screens and describes jumpy SafeAreaView updates.
- [Reanimated springs](https://docs.swmansion.com/react-native-reanimated/docs/animations/withSpring/)
- [Gesture Handler 3 pan](https://docs.swmansion.com/react-native-gesture-handler/docs/gestures/use-pan-gesture/)
