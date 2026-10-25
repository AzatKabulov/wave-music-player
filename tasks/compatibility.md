# Runtime compatibility

SDK 58 stays in place. Applied Expo's recommended compatible patch updates: Expo ~58.0.19, Router ~58.0.26, Dev Client ~58.0.15, SQLite ~58.0.14. Motion/image modules were installed through expo install: Reanimated 4.7.1, Worklets 0.13.0, Gesture Handler ~3.3.0, Expo Image ~58.0.17, Haptics ~58.0.7, Linear Gradient ~58.0.3, Localization ~58.0.5 and Slider 5.2.1. Plugins are in app.json; generated native folders remain unedited.

iOS uses Expo Go SDK 58 for this personal preview. Background audio/lock-screen behavior requires an own iOS build and is not certified by Expo Go. The fresh Android APK contains the native dependencies; the old 0.1.0 APK cannot demonstrate this redesign. Existing native iOS playlist insert operations rebuild the underlying playlist, so Android-only source patching is deliberately not applied on iOS.

The LAN browser preview now generates UUIDs with Web Crypto getRandomValues plus RFC 4122 v4 formatting; it no longer relies on randomUUID being present on a non-secure LAN HTTP origin. Native UUIDs still use Expo Crypto.

Final export/build and device results are recorded in implementation-status.md and performance-results.md; dependency checks must be rerun after a dependency change.
